// socket.js
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Meeting = require('./src/models/meeting.model');
const ChatMessage = require('./src/models/chatMessage.model');
const { createRouterForRoom } = require('./src/utils/mediasoupServer');
const User = require('./src/models/users.model');

let io;

// Maps
const userSocketMap = new Map();      // userId → socket.id
const userNameMap   = new Map();      // userId → username
const rooms         = new Map();      // meetingId → { router, peers, audioLevelObserver, producerToUser }

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:5174', 'https://p-house-conference-room.vercel.app', 'https://192.168.121.113:5000'],
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  });

  // 1) Authenticate every socket using a JWT token
  io.use(async(socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.warn("❌ No token provided in socket handshake!");
    return next(new Error('No token provided'));
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id; // ← use 'id' not 'userId'
     const user = await User.findById(payload.id).select('username firstname lastname');
    if (!user) throw new Error('User not found');
    socket.username = user.username;  // or however you want to label them

    next();
    } catch (err) {
      console.error("❌ JWT verification failed:", err.message);
      next(new Error('Authentication error'));
    }
  });



  io.on('connection', socket => {
    const userId   = socket.userId;
    const username = socket.username;
    console.log('Client connected:', socket.id, 'userId=', userId);

    socket.on('join-meeting-room', async ({ meetingId }) => {
      console.log('[socket.js] ← join-meeting-room', { meetingId, userId, username });
      if (!userId || !username) return;

      if (!userSocketMap.has(meetingId)) {
        userSocketMap.set(meetingId, new Map());
      }
      userSocketMap.get(meetingId).set(userId, socket.id);
      if (!userNameMap.has(meetingId)) {
        userNameMap.set(meetingId, new Map());
      }
      userNameMap.get(meetingId).set(userId, username);

      socket.join(meetingId);

      socket.to(meetingId).emit('user-joined-meeting', {
        userId,
        username,
        timestamp: Date.now()
      });

      const peersMap = userSocketMap.get(meetingId) || new Map();
      const existing = [];
      for (const [otherId, sid] of peersMap.entries()) {
        if (otherId === userId) continue;
        const s = io.sockets.sockets.get(sid);
        if (s && s.rooms.has(meetingId)) {
          existing.push({
            userId: otherId,
            username: userNameMap.get(meetingId)?.get(otherId) || 'Unknown',
            socketId: sid
          });
        }
      }
      socket.emit('existing-peers', existing);

      if (!rooms.has(meetingId)) {
        const router = await createRouterForRoom();
        const audioLevelObserver = await router.createAudioLevelObserver({
          interval: 800
        });
        const producerToUser = new Map();

        audioLevelObserver.on('volumes', volumes => {
          if (volumes.length === 0) return;
          const { producer: loudestProducer, volume } = volumes[0];
          if (volume > 0.05) {
            const pid = loudestProducer.id;
            const speakerUserId = producerToUser.get(pid);
            if (speakerUserId) {
              io.to(meetingId).emit('speaker-changed', { userId: speakerUserId });
            }
          }
        });

        rooms.set(meetingId, {
          router,
          peers: new Map(),
          audioLevelObserver,
          producerToUser,
          subscriptionsForClient: new Map() 
        });
      }

      
      const room = rooms.get(meetingId);

      room.subscriptionsForClient.set(userId, new Set([userId]));

      console.log('[socket.js] Room peers after join:', Array.from(room.peers.keys()));
      console.log('[socket.js] subscriptionsForClient mapping:', 
        Array.from(room.subscriptionsForClient.entries()).map(
          ([uid, subs]) => [uid, Array.from(subs)]
        )
      );

      // ✅ 1a) Emit router RTP capabilities BEFORE creating any transport
      socket.emit('router-rtp-capabilities', {
        rtpCapabilities: room.router.rtpCapabilities
      });

      const sendTransport = await room.router.createWebRtcTransport({
        listenIps: [ { ip: '0.0.0.0', announcedIp: null } ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1_000_000
      });

      room.peers.set(userId, {
        sendTransport,
        recvTransport: null,
        producers: new Map(),
        consumers: new Map()
      });
      console.log('✅ [Server] Added peer to room.peers for userId=', userId, 'room.peers keys=', [...room.peers.keys()]);

      sendTransport.appData = { userId, socketId: socket.id, meetingId };

      socket.emit('mediasoup-send-transport', {
        id: sendTransport.id,
        iceParameters: sendTransport.iceParameters,
        iceCandidates: sendTransport.iceCandidates,
        dtlsParameters: sendTransport.dtlsParameters
      });
    });

    // ─── UPDATE SUBSCRIPTIONS ─────────────────────────────────────────────────────
    // Mirror whatever the client just sent (the newSubscriptions array) into our Map
    socket.on('update-subscriptions', ({ meetingId, newSubscriptions }) => {
      const room = rooms.get(meetingId);
      if (!room) return;
      console.log('[socket.js] 🔄 update-subscriptions from user', userId, '→', newSubscriptions);
      // Overwrite this user’s Set with whatever the client sent
      room.subscriptionsForClient.set(userId, new Set(newSubscriptions));

        console.log('[socket.js] subscriptionsForClient now:', 
          Array.from(room.subscriptionsForClient.entries()).map(
            ([uid, subs]) => [uid, Array.from(subs)]
          )
        );

      // ─── CATCH‑UP: for each newly‑subscribed‑to user, send them all existing producers
      for (const targetUserId of newSubscriptions) {
        if (targetUserId === userId) continue;
        const targetPeer = room.peers.get(targetUserId);
        if (!targetPeer) continue;

        // ...and for each of that user's producers, emit new-producer
        for (const producer of targetPeer.producers.values()) {
          io.to(socket.id).emit('new-producer', {
            producerId:      producer.id,
            producerUserId:  targetUserId,
            kind:            producer.kind
          });
        }
      }
    });

    // in socket.js
    socket.on('get-existing-producers', ({ meetingId }) => {
      const room = rooms.get(meetingId);
      if (!room) return;

      // For every userId that has already produced tracks:
      for (const [otherUserId, peer] of room.peers.entries()) {
        // skip yourself
        if (otherUserId === userId) continue;

        // for each producer that they created:
        for (const producer of peer.producers.values()) {
          io.to(socket.id).emit('new-producer', {
            producerId:      producer.id,
            producerUserId:  otherUserId,
            kind:            producer.kind
          });
        }
      }
    });


     // ─── PRODUCE TRACK ────────────────────────────────────────────────────────────
    socket.on('mediasoup-produce', async ({ meetingId, kind, rtpParameters }) => {
    const room = rooms.get(meetingId);
    if (!room) return;
    const peer = room.peers.get(userId);
    if (!peer) return;

    try {
      const produceOptions = {
        kind,
        rtpParameters,
        appData: { meetingId, userId },
      };

      // Explicitly allow simulcast for video
      if (kind === 'video' && rtpParameters.encodings && rtpParameters.encodings.length > 1) {
        produceOptions.keyFrameRequestDelay = 0; // optional, for immediate switching
      }

      const producer = await peer.sendTransport.produce(produceOptions);

      peer.producers.set(kind, producer);

      if (kind === 'audio') {
        room.audioLevelObserver.addProducer({ producerId: producer.id });
        room.producerToUser.set(producer.id, userId);
      }

      // Notify the client that the track was produced successfully
      room.peers.forEach((otherPeer, otherUserId) => {
        if (otherUserId === userId) return;
        console.log(`📣 [Server] Emitting new-producer to ${otherUserId} for ${userId}'s ${kind}`);
        const targetSocketId = otherPeer.sendTransport.appData.socketId;
        io.to(targetSocketId).emit('new-producer', {
            producerId: producer.id,
          producerUserId: userId,
            kind
          });
        });

      socket.emit('produced', { producerId: producer.id });
    } catch (err) {
      console.error('❌ mediasoup-produce error:', err);
      socket.emit('error', { message: 'Failed to produce track' });
    }
    });


    socket.on('mediasoup-consume', async ({ meetingId, producerId, rtpCapabilities }) => {
      const room = rooms.get(meetingId);
      if (!room) return;

      const router = room.router;
      if (!router.canConsume({ producerId, rtpCapabilities })) {
        socket.emit('cannot-consume', { producerId });
        return;
      }

      let peer = room.peers.get(userId);
      if (!peer) return;

      if (!peer.recvTransport) {
        const recvTransport = await router.createWebRtcTransport({
          listenIps: [ { ip: '0.0.0.0', announcedIp: null } ],
          enableUdp: true,
          enableTcp: true,
          preferUdp: true
        });
        recvTransport.appData = { userId, socketId: socket.id, meetingId };
        peer.recvTransport = recvTransport;

        socket.emit('mediasoup-recv-transport', {
          id: recvTransport.id,
          iceParameters: recvTransport.iceParameters,
          iceCandidates: recvTransport.iceCandidates,
          dtlsParameters: recvTransport.dtlsParameters
        });
      }

      try {
        const consumer = await peer.recvTransport.consume({
          producerId,
          rtpCapabilities,
          paused: false
        });
        peer.consumers.set(producerId, consumer);

        socket.emit('consumed', {
          producerId,
          id: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters
        });
      } catch (err) {
        console.error('❌ mediasoup-consume error:', err);
        socket.emit('error', { message: 'Failed to consume track' });
      }
    });

    
    socket.on('mediasoup-connect-transport', async ({ meetingId, transportId, dtlsParameters }) => {
      const room = rooms.get(meetingId);
      if (!room) return;
      const peer = room.peers.get(userId);
      if (!peer) return;

      let transport = null;
      if (peer.sendTransport && peer.sendTransport.id === transportId) {
        transport = peer.sendTransport;
      } else if (peer.recvTransport && peer.recvTransport.id === transportId) {
        transport = peer.recvTransport;
      }

      if (!transport) {
        console.error('❌ No matching transport found for:', transportId);
        return socket.emit('error', { message: 'Transport not found' });
      }

      try {
        await transport.connect({ dtlsParameters });
        socket.emit('transport-connected', { transportId });
      } catch (err) {
        console.error('❌ mediasoup-connect-transport error:', err);
        socket.emit('error', { message: 'Failed to connect transport' });
      }
    });

    //
    // ─── LEAVE MEETING ────────────────────────────────────────────────────────────
    //
    socket.on('leave-meeting-room', async ({ meetingId }) => {
      const userId = socket.userId;
      // 1) Verify user is actually in that meeting
      const meetingDoc = await Meeting.findById(meetingId).select('participants');
      if (!meetingDoc) {
        return socket.emit('error', { message: 'Meeting not found' });
      }
      if (!meetingDoc.participants.map(String).includes(userId)) {
        return socket.emit('error', { message: 'Not authorized to leave' });
      }

      // 2) Let everyone know
      socket.leave(meetingId);
      const name = userNameMap.get(meetingId)?.get(userId) || 'Unknown';
      io.to(meetingId).emit('user-left-meeting', {
        userId,
        username: name,
        timestamp: Date.now()
      });

      // 3) SFU cleanup for that peer
      const room = rooms.get(meetingId);
      if (room && room.peers.has(userId)) {
        const peer = room.peers.get(userId);
        if (peer.producers.has('audio')) {
          room.audioLevelObserver.removeProducerById(peer.producers.get('audio').id);
          room.producerToUser.delete(peer.producers.get('audio').id);
        }
        peer.producers.forEach((p) => p.close());
        peer.consumers.forEach((c) => c.close());
        peer.sendTransport.close();
        if (peer.recvTransport) peer.recvTransport.close();
        room.peers.delete(userId);
      }

      // 4) Remove from DB participants
      await Meeting.findByIdAndUpdate(meetingId, {
        $pull: { participants: userId }
      });

      
      // 5) Clean up auxiliary maps
      userSocketMap.get(meetingId)?.delete(userId);
      if (userSocketMap.get(meetingId)?.size === 0) userSocketMap.delete(meetingId);

      userNameMap.get(meetingId)?.delete(userId);
      if (userNameMap.get(meetingId)?.size === 0) userNameMap.delete(meetingId);

      room?.subscriptionsForClient?.delete(userId);
      if (room?.subscriptionsForClient?.size === 0) {
        room.subscriptionsForClient = new Map(); // optional, or just leave it cleared
      }
    });

    //
    // ─── END MEETING ──────────────────────────────────────────────────────────────
    //
    socket.on('end-meeting', async ({ meetingId }) => {
      const userId = socket.userId;
      const meetingDoc = await Meeting.findById(meetingId).select('hostId');
      if (!meetingDoc) {
        return socket.emit('error', { message: 'Meeting not found' });
      }
      if (String(meetingDoc.hostId) !== String(userId)) {
        return socket.emit('error', { message: 'Not authorized to end meeting' });
      }

      // Notify everyone
      io.to(meetingId).emit('meeting-ended');

      // SFU cleanup
      const room = rooms.get(meetingId);
      if (room) {
        room.peers.forEach((peer, peerUserId) => {
          peer.producers.forEach((p) => p.close());
          peer.consumers.forEach((c) => c.close());
          peer.sendTransport.close();
          if (peer.recvTransport) peer.recvTransport.close();
        });
        room.audioLevelObserver.close();
        room.router.close();
        rooms.delete(meetingId);
      }

      // Optionally mark “ended” in your DB
      await Meeting.findByIdAndUpdate(meetingId, { ended: true });
    });

    //
    // ─── SOCKET DISCONNECT ──────────────────────────────────────────────────────
    //
    socket.on('disconnect', () => {
      const userId = socket.userId;
      console.log('Client disconnected:', socket.id, 'userId=', userId);

      // Clean up from every meeting they might have been in
      for (const [meetingId, room] of rooms.entries()) {
        if (room.peers.has(userId)) {
          socket.leave(meetingId);
           const name = userNameMap.get(meetingId)?.get(userId) || 'Unknown';
          io.to(meetingId).emit('user-left-meeting', {
            userId,
            username: name,
            timestamp: Date.now()
          });

          const peer = room.peers.get(userId);
          if (peer.producers.has('audio')) {
            room.audioLevelObserver.removeProducerById(peer.producers.get('audio').id);
            room.producerToUser.delete(peer.producers.get('audio').id);
          }
          peer.producers.forEach((p) => p.close());
          peer.consumers.forEach((c) => c.close());
          peer.sendTransport.close();
          if (peer.recvTransport) peer.recvTransport.close();
          room.peers.delete(userId);

          if (room.peers.size === 0) {
            room.audioLevelObserver.close();
            room.router.close();
            rooms.delete(meetingId);
          }
            // Clean up auxiliary maps for this meeting
            userSocketMap.get(meetingId)?.delete(userId);
            if (userSocketMap.get(meetingId)?.size === 0) userSocketMap.delete(meetingId);

            userNameMap.get(meetingId)?.delete(userId);
            if (userNameMap.get(meetingId)?.size === 0) userNameMap.delete(meetingId);

            room.subscriptionsForClient?.delete(userId);
            if (room.subscriptionsForClient?.size === 0) {
              room.subscriptionsForClient = new Map(); // or skip if you're not reusing it
            }
        }
      }
    });

    //
    // ─── CHAT MESSAGE HANDLERS (UNCHANGED) ─────────────────────────────────────
    //
    socket.on('send-message', async ({ meetingId, text, tempId }) => {
      try {
        const userId = socket.userId;
        const username = socket.username;
        const msg = await ChatMessage.create({ meetingId, user: userId, text, username });
        await msg.populate('user', 'username image');
        const out = { ...msg.toObject(), tempId };
        io.to(meetingId).emit('receive-message', out);
      } catch (err) {
        console.error('❌ [socket.js] Error in send-message:', err);
        socket.emit('error-sending-message', { message: 'Failed to send message' });
      }
    });

    socket.on('react-to-meeting', async ({ meetingId, emoji }) => {
      try {
        const userId = socket.userId;
        const result = await Meeting.findByIdAndUpdate(
          meetingId,
          { $push: { reactions: { user: userId, emoji } } },
          { new: true }
        );
        io.to(meetingId).emit('meeting-reaction', { userId, emoji, timestamp: Date.now() });
      } catch (err) {
        console.error('❌ [socket.js] Error in react-to-meeting:', err);
        socket.emit('error-meeting-reaction', { message: 'Failed to react' });
      }
    });

    socket.on('react-to-message', async ({ messageId, emoji }) => {
      try {
        const userId = socket.userId;
        const msg = await ChatMessage.findByIdAndUpdate(
          messageId,
          [
            {
              $set: {
                reactions: {
                  $concatArrays: [
                    { $filter: { input: '$reactions', cond: { $ne: ['$$this.user', userId] } } },
                    [{ user: userId, emoji }]
                  ]
                }
              }
            }
          ],
          { new: true }
        )
          .populate('reactions.user', 'username image')
          .populate('user', 'username image');

        if (!msg) return;
        io.to(msg.meetingId.toString()).emit('message-reaction', msg);
      } catch (err) {
        console.error('❌ [socket.js] Error in react-to-message:', err);
        socket.emit('error-message-reaction', { message: 'Failed to react to message' });
      }
    });
  });
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initializeSocket, getIO };