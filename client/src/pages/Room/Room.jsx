import React, { useRef, useEffect, useState,  useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import VideoPlayer from '../../components/VideoPlayer/VideoPlayer';
import Chat from '../../components/Chat/Chat';
import Controls from '../../components/Controls/Controls';
import socket from '../../utils/socket/socket';
import { toast } from "react-toastify";
import { FaCopy } from "react-icons/fa";
import { useUploadVideoMutation } from '../../redux/videosUploadApi/videoUploadApi';
import { useJoinMeetingMutation, useGetMeetingByIdQuery, useLeaveMeetingMutation } from '../../redux/meetingApi/meetingApi';
import { useGetUserProfileQuery, useGetUserSettingsQuery,  } from '../../redux/profileAuthApi/profileAuthApi';
import Spinner from '../../components/Spinner/Spinner';
import { Device } from 'mediasoup-client';







const Room = () => {

  const { id: roomId } = useParams();
  const { data: settings = {}, isLoading: settingsLoading } = useGetUserSettingsQuery();
  const [uploadVideo] = useUploadVideoMutation();
  const [joinMeeting] = useJoinMeetingMutation();
  const [leaveMeetingApi] = useLeaveMeetingMutation();
  const { data: meeting, isLoading, isError } = useGetMeetingByIdQuery(roomId);
  const { data: userProfile, isLoading: userProfileLoading } = useGetUserProfileQuery();
  console.log(userProfile);


  const meId   = localStorage.getItem('userId');
  const isHost = meeting?.hostId === meId;
  console.log('Host ID:', meeting?.hostId, 'My ID:', meId);
  console.log('Is Host:', isHost);




  const darkMode       = useSelector(s => s.theme.darkMode);
  const navigate       = useNavigate();
  const roomLink       = `${window.location.origin}/room/${roomId}`;
  const linkInputRef = useRef(null);
  const [meetingReactions, setMeetingReactions] = useState([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const [subscriptions, setSubscriptions] = useState(new Set([meId]));
  const [peers, setPeers] = useState([]); // [{ userId, stream }]
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  console.log('Selected Microphone:', selectedMicrophone);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [isMuted, setIsMuted]                 = useState(false);
  const [isVideoOff, setIsVideoOff]           = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producersRef     = useRef({}); // kind → producer
  const consumersRef     = useRef({}); // producerId → consumer streams
  const subscriptionsRef = useRef(subscriptions);
  const producerUserToProducerIds = useRef(new Map());
  const MAX_ACTIVE = 6; // Max active speakers allowed
  const usernamesRef = useRef(new Map());
  const peerStreamsRef = useRef(new Map());

  

  console.log('Meeting:', meeting);


  
  const copyLinkToClipboard = () => {
    const text = roomLink;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success('Link copied to clipboard!'))
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    // create a temporary textarea to select & copy
    const ta = document.createElement('textarea');
    ta.value = text;
    // avoid scrolling to bottom
    ta.style.position = 'fixed';
    ta.style.top = 0;
    ta.style.left = 0;
    ta.style.width = '2em';
    ta.style.height = '2em';
    ta.style.padding = 0;
    ta.style.border = 'none';
    ta.style.outline = 'none';
    ta.style.boxShadow = 'none';
    ta.style.background = 'transparent';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast.success('Link copied!');
    } catch {
      toast.error('Failed to copy link');
    }
    document.body.removeChild(ta);
  };


   // ------------ Utility: addPeer / removePeer ------------
    const addPeer = useCallback((userId, stream, username) => {
      console.log('🔄 addPeer called with', { userId, stream, username });
      setPeers(prev => {
      console.log('[Room.jsx] ⏳ Before adding peer:', prev);
      let next;
      if (prev.some(p => p.userId === userId)) {
        next = prev.map(p =>
          p.userId === userId
            ? { ...p, stream, username: username ?? p.username }
            : p
        );
      } else {
        next = [...prev, { userId, stream, username }];
      }
      console.log('[Room.jsx] ✅ After adding peer :', next);
      return next;
    });

    // Speech detection (unchanged)
    if (stream && stream.getAudioTracks().length > 0) {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      const data = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);

      const detect = () => {
        analyser.getByteFrequencyData(data);
        const volume = data.reduce((a, b) => a + b) / data.length;
        if (volume > 10) {
          setActiveSpeakerId(userId);
        }
        requestAnimationFrame(detect);
      };
      detect();
    }
  }, []);

  const removePeer = useCallback((userId) => {
  // 1) Remove this user’s tile from the UI
  setPeers(prev => prev.filter(p => p.userId !== userId));

  // 2) Close every consumer that belongs to userId (via our Map)
  const setOfProducerIds = producerUserToProducerIds.current.get(userId);
  if (setOfProducerIds) {
    for (const pid of setOfProducerIds) {
      const consumer = consumersRef.current[pid];
      if (consumer) {
        consumer.close();
        delete consumersRef.current[pid];
      }
    }
    producerUserToProducerIds.current.delete(userId);
  }

  // 3) Also remove from subscriptions if present
  setSubscriptions(prev => {
    const next = new Set(prev);
    next.delete(userId);
    return next;
  });
  }, []);


  

  // ------------ Meeting / Reactive Handlers ------------
  useEffect(() => {
  socket.on('meeting-reaction', reaction => {
    // add to local list (so you can animate/display)
    setMeetingReactions(r => [...r, reaction]);
    // optionally clear it after X seconds
    setTimeout(() => {
      setMeetingReactions(r => r.filter((_,i) => i !== 0));
    }, 60000);
  });

  socket.on('user-left-meeting', ({ username }) => {
    toast.info(`${username} has left the meeting`);
    removePeer(username);
  });
  
  return () => { 
    socket.off('meeting-reaction'); 
    socket.off('user-joined-meeting');
    socket.off('user-left-meeting');
  };
  }, [removePeer]);


  // ------------ Apply default settings (mute/video-off) ------------
  useEffect(() => {
    if (!settingsLoading) {
      setIsMuted(settings.autoMute);
      setIsVideoOff(settings.autoVideoOff);
      // do NOT start recording until after local media is ready:
    }
  }, [settings, settingsLoading]);

  const hasLeftRef = useRef(false); 
  const doLeave = useCallback(() => {
    if (hasLeftRef.current || !socket.connected) return;
    if (!userProfile) return; 
    hasLeftRef.current = true;

    socket.emit('leave-meeting-room', {
      meetingId: roomId,
      userId: meId,
      username: userProfile.username
    });
  }, [roomId, meId, userProfile]);

  const leaveMeeting = useCallback(async () => {
    doLeave();
    try {
      await leaveMeetingApi(roomId).unwrap();
    } catch (err) {
      console.error('Failed to leave meeting:', err);
    }
    // Clean up local
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    setHasLocalStream(false);

    // Close all producers & consumers
    Object.values(producersRef.current).forEach(p => p.close());
    Object.values(consumersRef.current).forEach(c => c.close());
    producersRef.current = {};
    consumersRef.current = {};

    // Close transports
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();

    socket.disconnect();
    localStorage.removeItem('hostId');
    navigate('/');
  }, [roomId, leaveMeetingApi, navigate, doLeave]);

  const endMeeting = () => {
    socket.emit('end-meeting', roomId);
    leaveMeeting();
    localStorage.removeItem('hostId');
  };

  // mute/unmute
  useEffect(() => {
  const stream = localStreamRef.current;
  if (!stream) return;
  stream.getAudioTracks().forEach(track => {
    track.enabled = !isMuted;
  });
  }, [isMuted]);


  // video on/off
  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;                // <-- guard
    const tracks = stream.getVideoTracks();
    if (!tracks.length) return;         // <-- guard
    tracks.forEach(track => {
      track.enabled = !isVideoOff;
    });
  }, [isVideoOff]);
  
  useEffect(() => {
  console.log('isVideoOff:', isVideoOff);
  }, [isVideoOff]);

  // Start Recording (Separate Stream)
  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
    recorderRef.current = recorder;
    chunksRef.current   = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      setIsUploading(true);
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const form = new FormData();
      form.append('recording', blob, `meeting-${roomId}-${Date.now()}.webm`);
      form.append('roomId', roomId);

      try {
        await uploadVideo(form).unwrap();
        toast.success('Recording saved!');
      } catch (err) {
        console.error(err);
        toast.error('Upload failed');
      } finally {
        setIsUploading(false);
        stream.getTracks().forEach(t => t.stop());
      }
    };

    recorder.start();
    setIsRecording(true);
  }, [roomId, uploadVideo]);

  // likewise wrap stopRecording
  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setIsRecording(false);
  }, []);

   // then, once we have our localStream, if autoRecord is true, kick off recording:
  useEffect(() => {
    if (hasLocalStream && settings.autoRecord && !isRecording) {
      startRecording();   // your existing function
    }
  }, [hasLocalStream, settings.autoRecord, isRecording, startRecording]);

  // ---------- Screen Sharing: startScreenShare / stopScreenShare  ----------
   // ------------ Screen Sharing with Mediasoup ------------
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    // Re‐produce camera track on sendTransport
    const camStream = localStreamRef.current;
    if (!camStream) return;
    const camTrack = camStream.getVideoTracks()[0];
    if (camTrack && producersRef.current.video) {
      producersRef.current.video.replaceTrack({ track: camTrack });
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      if (producersRef.current.video) {
        await producersRef.current.video.replaceTrack({ track: screenTrack });
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          stopScreenShare();
        };
        screenStream.oninactive = () => {
          stopScreenShare();
        };
      }
    } catch (err) {
      console.error('Screen share failed', err);
      toast.error('Screen share failed');
    }
  }, [stopScreenShare]);
 

  
    // Log peers whenever it changes
    useEffect(() => {
      console.log('Peers:', peers);
    }, [peers]);

    

   
    //const hasInitRef = useRef(false);
    const hasJoinedDB = useRef(false);

    useEffect(() => {
      if (
        hasJoinedDB.current ||
        userProfileLoading ||
        !userProfile ||
        !meId
      ) return;

      hasJoinedDB.current = true;

      joinMeeting(roomId)
        .unwrap()
        .catch(err => {
          console.error('joinMeeting API failed:', err);
        });
    }, [
      roomId,
      userProfileLoading,
      userProfile,
      meId,
      joinMeeting
    ]);

    // Whenever `subscriptions` changes, let the server know:
    useEffect(() => {
      if (!meId) return;
        const debounce = setTimeout(() => {
        console.log('[Room.jsx] 📡 Emitting update‑subscriptions →', Array.from(subscriptions));
        socket.emit('update-subscriptions', {
          meetingId: roomId,
          newSubscriptions: Array.from(subscriptions)
        });
      }, 1000); // throttle every 1s

      return () => clearTimeout(debounce);
    }, [roomId, meId, subscriptions]);


    useEffect(() => {
    subscriptionsRef.current = subscriptions;
    }, [subscriptions]);
 
     // ------------ MEDIASOUP CONNECTION EFFECT ------------
    
    useEffect(() => {
    if (userProfileLoading || !userProfile || !meId) return;
    let mounted = true;

    // keep track of which producer belongs to which user
    const producerIdToUserRef = new Map();

    socket.emit('join-meeting-room', { meetingId: roomId, userId: meId, username: userProfile.username });

    socket.on('existing-peers', peers => {
      peers.forEach(p => usernamesRef.current.set(p.userId, p.username));
      const allIds = peers.map(p => p.userId).concat(meId);
      const next = new Set(allIds);
      subscriptionsRef.current = next;
      setSubscriptions(next);
      socket.emit('update-subscriptions', { meetingId: roomId, newSubscriptions: Array.from(next) });
      socket.emit('get-existing-producers', { meetingId: roomId });
    });

    socket.on('user-joined-meeting', ({ userId: newUserId, username }) => {
      usernamesRef.current.set(newUserId, username);
      setSubscriptions(prev => {
        const next = new Set(prev).add(newUserId);
        subscriptionsRef.current = next;
        socket.emit('update-subscriptions', { meetingId: roomId, newSubscriptions: Array.from(next) });
        socket.emit('get-existing-producers', { meetingId: roomId });
        return next;
      });
    });

    socket.on('router-rtp-capabilities', async ({ rtpCapabilities }) => {
      if (!mounted) return;
      deviceRef.current = new Device();
      await deviceRef.current.load({ routerRtpCapabilities: rtpCapabilities });

      socket.on('mediasoup-send-transport', async params => {
        if (!mounted) return;
        sendTransportRef.current = deviceRef.current.createSendTransport(params);
        sendTransportRef.current.on('connect', ({ dtlsParameters }, cb) => {
          socket.emit('mediasoup-connect-transport', { meetingId: roomId, userId: meId, transportId: sendTransportRef.current.id, dtlsParameters });
          socket.once('transport-connected', cb);
        });
        sendTransportRef.current.on('produce', async ({ kind, rtpParameters }, cb) => {
          socket.emit('mediasoup-produce', { meetingId: roomId, userId: meId, kind, rtpParameters });
          socket.once('produced', ({ producerId }) => cb({ id: producerId }));
        });

        // local media
        let camStream;
        try {
          camStream = await navigator.mediaDevices.getUserMedia({
            video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
            audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true
          });
          console.log('Local video track enabled:', camStream.getVideoTracks()[0].enabled);
        } catch (err) {
          console.error('getUserMedia failed:', err);
          toast.error('Unable to access camera/microphone');
          return;
        }

        localStreamRef.current = camStream;
        setHasLocalStream(true);
        addPeer(meId, camStream, userProfile.username);

        for (const track of camStream.getTracks()) {
          console.log(`[Produce] Sending track:`, track.kind, track.enabled, track.muted);
          const producer = await sendTransportRef.current.produce({ track });
          producersRef.current[track.kind] = producer;
        }
      });
    });

    socket.on('mediasoup-recv-transport', params => {
      if (!mounted || recvTransportRef.current) return;
      recvTransportRef.current = deviceRef.current.createRecvTransport(params);
      recvTransportRef.current.on('connect', ({ dtlsParameters }, cb) => {
        console.log('[recvTransport] Connecting with DTLS');
        socket.emit('mediasoup-connect-transport', { meetingId: roomId, userId: meId, transportId: recvTransportRef.current.id, dtlsParameters });
        socket.once('transport-connected', () => {
        console.log('[recvTransport] Connected');
          cb();
        });
      });
    });

    // once a new producer is announced, record which user it belongs to,
    // then request to consume it
    socket.on('new-producer', ({ producerId, producerUserId }) => {
      if (!mounted || consumersRef.current[producerId]) return;
      if (!subscriptionsRef.current.has(producerUserId)) return;

      // record mapping
      producerIdToUserRef.set(producerId, producerUserId);

      socket.emit('mediasoup-consume', {
        meetingId: roomId,
        userId: meId,
        producerId,
        rtpCapabilities: deviceRef.current.rtpCapabilities
      });
    });

    // handle the server's consumed event and attach the track to the right peer
    const onConsumed = async ({ producerId: pid, id, kind, rtpParameters }) => {
    if (!mounted || consumersRef.current[pid]) return;

    const consumer = await recvTransportRef.current.consume({
      id,
      producerId: pid,
      kind,
      rtpParameters,
      paused: false
    });

    consumer.pause();
    await consumer.resume();
    console.log(`[consume] Received track for ${kind}`, {
    enabled: consumer.track.enabled,
    muted: consumer.track.muted,
    readyState: consumer.track.readyState,
    });

    consumersRef.current[pid] = consumer;

    const userId = producerIdToUserRef.get(pid);
    if (!userId) return;

    let oldStream = peerStreamsRef.current.get(userId);

    if (!oldStream) {
      oldStream = new MediaStream([consumer.track]);
    } else {
      const existingTracks = oldStream.getTracks();

      // ✅ Filter out old tracks of the same kind
      const filteredTracks = existingTracks.filter(t => t.kind !== consumer.track.kind);

      // ✅ Create new stream with fresh track + remaining non-conflicting ones
      oldStream = new MediaStream([...filteredTracks, consumer.track]);
    }

    peerStreamsRef.current.set(userId, oldStream);
    addPeer(userId, oldStream, usernamesRef.current.get(userId));
    
    console.log('[onConsumed] Final Stream Tracks:', oldStream.getTracks());
  
    console.log('STREAM CHECK', userId, oldStream.getVideoTracks());
    };

    socket.on('consumed', onConsumed);
    

    socket.on('user-left-meeting', ({ userId: leftId, username }) => {
      removePeer(leftId);
      toast.info(`${username} has left the meeting`);
    });

    return () => {
      mounted = false;
      doLeave();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      setHasLocalStream(false);
      Object.values(producersRef.current).forEach(p => p.close());
      Object.values(consumersRef.current).forEach(c => c.close());
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();

      socket.off('existing-peers');
      socket.off('user-joined-meeting');
      socket.off('router-rtp-capabilities');
      socket.off('mediasoup-send-transport');
      socket.off('mediasoup-recv-transport');
      socket.off('new-producer');
      socket.off('consumed', onConsumed);
      socket.off('user-left-meeting');
    };
  }, [
    roomId,
    meId,
    userProfile,
    userProfileLoading,
    selectedCamera,
    selectedMicrophone,
    addPeer,
    removePeer,
    doLeave
    ]);






  // ─── Whenever activeSpeakerId changes, add them to subscriptions ──────────
  // 1) Listen for server’s speaker event → setActiveSpeakerId
  useEffect(() => {
    const onServerSpeaker = ({ userId: newSpeakerId }) => {
      if (newSpeakerId !== meId) {
        setActiveSpeakerId(newSpeakerId);
      }
    };
    socket.on('speaker-changed', onServerSpeaker);
    return () => {
      socket.off('speaker-changed', onServerSpeaker);
    };
  }, [meId]);

  // 2) Eviction logic whenever activeSpeakerId changes
  useEffect(() => {
  if (!activeSpeakerId || activeSpeakerId === meId) return;

  setSubscriptions(prev => {
    if (prev.has(activeSpeakerId)) return prev;

    const next = new Set(prev);
    next.add(activeSpeakerId);

    if (next.size > MAX_ACTIVE + 1) {
      for (let u of next) {
        if (u !== meId && u !== activeSpeakerId) {
          next.delete(u);
          // ─── Replace prefix‐based loop with Map‐based cleanup ───
          const setOfProducerIds = producerUserToProducerIds.current.get(u);
          if (setOfProducerIds) {
            for (const pid of setOfProducerIds) {
              const consumer = consumersRef.current[pid];
              if (consumer) {
                consumer.close();
                delete consumersRef.current[pid];
              }
            }
            producerUserToProducerIds.current.delete(u);
          }
          removePeer(u);
          break;
        }
      }
    }

      return next;
    });
  }, [activeSpeakerId, meId, removePeer]);


  if (isLoading || userProfileLoading || settingsLoading) {
    return <Spinner />;
  }
  
  if (!meeting || isError) {
  return <div className="text-center text-red-500 mt-10">Meeting not found or failed to load.</div>;
  }



const videos = peers.map(p => ({
  userId:   p.userId,
  stream:   p.stream,
  isLocal:  p.userId === meId,
  isSpeaking: p.userId === activeSpeakerId,
  label:    p.userId === meId ? 'You' : p.username
}));


  console.log('Videos:', videos);
  console.log("Rendering videos:", videos.map(v => ({ userId: v.userId, hasStream: !!v.stream })));

  return (
    <div
      className={`
        min-h-screen flex flex-col
        ${darkMode ? 'bg-gray-900 text-white' : 'bg-blue-100 text-black'}
      `}
    >
      {/* Link + ID Bar */}
      <div
        className={`
          p-4 flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 md:space-x-4 shadow
          ${darkMode ? 'bg-gray-800' : 'bg-white'}
        `}
      >
        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
          Meeting ID: <span className="font-medium">{roomId}</span>
        </span>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <input
            ref={linkInputRef}
            className={`w-full p-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${
              darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"
            }`} 
            readOnly
            value={roomLink}
            onFocus={(e) => e.target.select()}
          />

          <FaCopy
            onClick={copyLinkToClipboard}
            className={`text-5xl  p-2 rounded cursor-pointer transition"
            title="Copy Link ${ darkMode ? 'text-white hover:text-gray-100' : 'text-[#00013d] hover:text-[#03055B]'}`}
          />
        </div>

      </div>




  
      {/*Video Grid and Reactions
      <div className="flex flex-col items-center w-full h-full p-4 bg-gray-100 dark:bg-gray-900 overflow-y-auto">
        <div 
          className="grid gap-4 w-full"
          style={{ gridTemplateColumns: `repeat(${videos.length}, minmax(0, 1fr))` }}
        >
            {videos.map(({ userId, stream, isLocal, label, isSpeaking }) => (
            <VideoPlayer
              key={userId}
              stream={stream ?? null}
              isLocal={isLocal}
              userId={userId}
              label={label ?? 'Unknown'}
              isSpeaking={isSpeaking}
              onPin={() => {
                setSubscriptions(prev => {
                  const next = new Set(prev);
                  next.add(userId);
                  return next;
                });
              }}
              onUnpin={() => {
                setSubscriptions(prev => {
                  const next = new Set(prev);
                  next.delete(userId);
                  return next;
                });
                // Also close their consumer and removePeer(userId)
              }}
            />
          ))}
        </div>

        {hasLocalStream && (
          <audio
            ref={el => {
              if (el) el.srcObject = localStreamRef.current;
            }}
            autoPlay
            className="hidden"
            controls
          />
        )}

        
        {meetingReactions.map((r, i) => (
                <span
                  key={i}
                  className="absolute animate-float text-3xl"
                  style={{
                    top: `${20 + i*10}%`,
                    left: `${50 + (i%2 ? -10 : 10)}%`
                  }}
                >
                  {r.emoji}
                </span>
        ))}
      </div>*/}

      <div className="flex flex-col items-center w-full h-full p-4 bg-gray-100 dark:bg-gray-900 overflow-y-auto">
        <div
          className="grid gap-4 w-full"
          style={{ gridTemplateColumns: `repeat(${videos.length}, minmax(0, 1fr))` }}
        >
          {videos.map(({ userId, stream, isLocal, label, isSpeaking }) => (
            <div key={userId} className="relative">
              <VideoPlayer
                key={userId}
                stream={stream ?? null}
                isLocal={isLocal}
                userId={userId}
                label={label ?? 'Unknown'}
                isSpeaking={isSpeaking}
                onPin={() => {
                  setSubscriptions(prev => {
                    const next = new Set(prev);
                    next.add(userId);
                    return next;
                  });
                }}
                onUnpin={() => {
                  setSubscriptions(prev => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                  });
                  // Also close their consumer and removePeer(userId)
                }}
              />
              {/* Hidden audio for remote so their sound plays */}
              {!isLocal && stream && (
                <audio
                  ref={el => {
                    if (el) el.srcObject = stream;
                  }}
                  autoPlay
                  className="hidden"
                />
              )}
            </div>
          ))}
        </div>

        {hasLocalStream && (
          <audio
            ref={el => {
              if (el) el.srcObject = localStreamRef.current;
            }}
            autoPlay
            className="hidden"
            controls
          />
        )}

        {meetingReactions.map((r, i) => (
          <span
            key={i}
            className="absolute animate-float text-3xl"
            style={{
              top: `${20 + i * 10}%`,
              left: `${50 + (i % 2 ? -10 : 10)}%`
            }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

        

      {/* Chat & Controls */}
      <div
        className={`
          p-4 shadow
          ${darkMode ? 'bg-gray-800' : 'bg-white'}
        `}
      >
        
        <div
          className={`
            p-4 shadow
            ${darkMode ? 'bg-gray-900' : 'bg-white'}
          `}
        >
          <div className="flex flex-col space-y-4 w-full">

             {/* Controls sit on the top on md+ */}
             <div className="w-full items-center justify-center flex">
              <Controls
                isMuted={isMuted}
                isVideoOff={isVideoOff}
                isScreenSharing={isScreenSharing}
                setIsMuted={setIsMuted}
                setIsVideoOff={setIsVideoOff}
                startScreenShare={startScreenShare}
                stopScreenShare={stopScreenShare}
                isRecording={isRecording}
                startRecording={startRecording}
                stopRecording={stopRecording}
                isUploading={isUploading}
                setSelectedCamera={setSelectedCamera}
                setSelectedMicrophone={setSelectedMicrophone}
                roomId={roomId}
                meId={meId}
                participants={meeting.participants}
                leaveMeeting={leaveMeeting}
                endMeeting={endMeeting}
                isHost={isHost}
              />
            </div>

            {/* Chat fills most of the width on large screens */}
            <div className="width-full">
              <Chat meetingId={roomId} />
            </div>

           
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
