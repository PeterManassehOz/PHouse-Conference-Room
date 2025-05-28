import React, { useRef, useEffect, useState,  useCallback, useMemo } from 'react';
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


  const peerConnections = useRef({}); // userId -> RTCPeerConnection
  const [peers, setPeers] = useState([]); // [{ userId, stream }]
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  console.log('Selected Microphone:', selectedMicrophone);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const localStreamRef = useRef(null);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [isMuted, setIsMuted]                 = useState(false);
  const [isVideoOff, setIsVideoOff]           = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

 //meeting reactions
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
  });
  
  return () => { 
    socket.off('meeting-reaction'); 
    socket.off('user-joined-meeting');
    socket.off('user-left-meeting');
  };
  }, []);


   // apply defaults once settings arrive
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
     // 1) Remove from socket room
     doLeave();

    // 2) Remove from the DB participants array
      try {
      await leaveMeetingApi(roomId).unwrap();
    } catch (err) {
      console.error('Failed to leave meeting:', err);
    }

    // 3) Clean up WebRTC and navigate away
    Object.values(peerConnections.current).forEach(pc => pc.close());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
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
  if (!stream) return;
  stream.getVideoTracks().forEach(track => {
    track.enabled = !isVideoOff;
  });
  }, [isVideoOff]);


  const startScreenShare = async () => {
  try {
    if (isScreenSharing) {
      // Stop share → revert to camera
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track.kind === 'video');
        if (sender) sender.replaceTrack(camTrack);
      });

      setIsScreenSharing(false);
      toast.info('Stopped screen share');
      return;
    }

    // Start screen capture
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = screenStream.getVideoTracks()[0];

    // Broadcast screen track to all peers
    Object.values(peerConnections.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track.kind === 'video');
      if (sender) sender.replaceTrack(screenTrack);
    });

    // Locally preview the screen
    setIsScreenSharing(true);
    toast.success('Screen sharing started');

    // When user manually stops share, revert automatically
    screenTrack.onended = () => {
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track.kind === 'video');
        if (sender) sender.replaceTrack(camTrack);
      });

      setIsScreenSharing(false);
      toast.info('Screen share ended');
    };
  } catch (err) {
    console.error('Screen share failed', err);
    toast.error('Screen share failed');
  }
  };



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


  // Using useMemo to ensure iceServers is stable
  const iceServers = useMemo(() => ({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302", // Google's public STUN server
      },
    ],
  }), []);



  const addPeer = useCallback((userId, stream, username) => {
    setPeers(prev => {
      // if we already have this id, update its stream
      if (prev.some(p => p.userId === userId)) {
        return prev.map(p =>
          p.userId === userId
            ? { ...p, stream, username: username ?? p.username }
            : p
        );
      }
      // otherwise append a new entry
      return [ ...prev, { userId, stream, username } ];
    });

    // (speech-detection stays the same)
    detectSpeech(stream, isSpeaking => {
      if (isSpeaking) setActiveSpeakerId(userId);
    });
  }, []);


  const removePeer = useCallback((userId) => {
    setPeers(prev => prev.filter(p => p.userId !== userId));
    peerConnections.current[userId]?.close();
    delete peerConnections.current[userId];
  }, []);

  const waitingPeers = useRef([]);  // will hold [{ otherId, initiator }]

  // Updated setupConnection:
  const setupConnection = useCallback((otherId, initiator) => {
  const localStream = localStreamRef.current;
  if (!localStream) {
    // we don't have media yet → queue it
    waitingPeers.current.push({ otherId, initiator });
    return;
  }

    // ← if we’ve already built a PC for this user, do nothing
  if (peerConnections.current[otherId]) {
    console.log(`skipping duplicate setup for ${otherId}`);
    return;
  }

  console.log(`setupConnection(${otherId}, initiator=${initiator})`);
  // 1) create RTCPeerConnection and store it
  const pc = new RTCPeerConnection(iceServers);
  peerConnections.current[otherId] = pc;

  // 2) add your local tracks to the connection
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  // 3) when remote tracks arrive, add to peers
  pc.ontrack = ({ streams: [stream] }) => addPeer(otherId, stream);

  // 4) ICE candidates → signal via socket
  pc.onicecandidate = e => {
    if (e.candidate) {
      console.log('→ ice-candidate', { to: otherId, from: meId });
      socket.emit('ice-candidate', {
        roomId,
        to: otherId,
        from: meId,
        candidate: e.candidate
      });
    }
  };

  // 5) if this client is the initiator, make & send an offer
  if (initiator) {
    pc.createOffer()
      .then(async (offer) => {
        await pc.setLocalDescription(offer).then(() => offer);
      })
      .then(offer => {
        console.log('→ offer', { to: otherId, from: meId });
        socket.emit('offer', {
          roomId,
          to: otherId,
          from: meId,
          sdp: offer
        });
      })
      .catch(console.error);
  }
 }, [iceServers, roomId, addPeer, meId]);


  const detectSpeech = (stream, onSpeaking) => {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  const data = new Uint8Array(analyser.frequencyBinCount);

  source.connect(analyser);

  const detect = () => {
    analyser.getByteFrequencyData(data);
    const volume = data.reduce((a, b) => a + b) / data.length;
    onSpeaking(volume > 10); // You may need to fine-tune the threshold
    requestAnimationFrame(detect);
  };

  detect();
  };

  
    // Log peers whenever it changes
    useEffect(() => {
      console.log('Peers:', peers);
    }, [peers]);

   
  const hasInitRef = useRef(false);

  // at the top of Room.jsx, above your media/socket effect:
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

 
   // Main effect to handle socket connections, media setup, etc.
    useEffect(() => {
      // 0️⃣ Don’t run until your profile & ID are loaded
      if (userProfileLoading || !userProfile || !meId) return;

      // 1️⃣ Local refs & buffers
      const pcs               = peerConnections.current;
      const pendingCandidates = {};
      const waitList          = waitingPeers.current;

      // 2️⃣ Tear down any old socket handlers
      socket.off('existing-peers');
      socket.off('user-joined-meeting');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-left-meeting');
      socket.off('meeting-ended');

      // 3️⃣ Register socket handlers

      // • Existing peers → seed & answer
      socket.on('existing-peers', peersList => {
        console.log('Existing peers:', peersList);
        peersList.forEach(({ userId, username }) => {
          if (userId === meId) return;
          addPeer(userId, null, username);
           // 🆕 If local stream isn't ready yet, queue this peer
            if (!localStreamRef.current) {
              waitingPeers.current.push({ otherId: userId, initiator: false });
            } else {
              setupConnection(userId, false);
            }
        });
      });

      // • New peer joined → seed & offer
      socket.on('user-joined-meeting', ({ userId, username }) => {
        console.log('User joined:', userId, username);
        if (userId === meId) return;
        toast.info(`${username} joined`);
        addPeer(userId, null, username);
        if (!localStreamRef.current) {
            waitingPeers.current.push({ otherId: userId, initiator: true });
          } else {
            setupConnection(userId, true);
          }
      });

      // • Offer → answer + replay early ICEs
      socket.on('offer', async ({ from, sdp }) => {
        console.log('Received offer from', from);
        /*const pc = pcs[from];
        if (!pc) return;*/
        
        let pc = pcs[from];
        if (!pc) {
          setupConnection(from, false); // false = not initiator
          pc = pcs[from]; // retrieve it after creating
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, to: from, from: meId, sdp: answer });

        if (pendingCandidates[from]) {
          for (const c of pendingCandidates[from]) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidates[from] = [];
        }
      });

      // • Answer → finish handshake + replay ICEs
      socket.on('answer', async ({ from, sdp }) => {
        console.log('Received answer from', from);
        const pc = pcs[from];
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (pendingCandidates[from]) {
          for (const c of pendingCandidates[from]) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidates[from] = [];
        }
      });

      // • ICE candidate → add or queue
      socket.on('ice-candidate', ({ from, candidate }) => {
        console.log('Got ICE candidate from', from);
        const pc = pcs[from];
        if (pc) {
          pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          pendingCandidates[from] = pendingCandidates[from] || [];
          pendingCandidates[from].push(candidate);
        }
      });

      // • Peer leaves or host ends meeting
      socket.on('user-left-meeting', ({ userId }) => removePeer(userId));
      socket.on('meeting-ended', () => {
        toast.info('Meeting ended');
        leaveMeeting();
      });

      // 4️⃣ One-time media acquisition + socket join
      if (!hasInitRef.current) {
        hasInitRef.current = true;

        (async () => {
          // a) get camera & mic
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: selectedCamera
              ? { deviceId: { exact: selectedCamera } }
              : true,
            audio: selectedMicrophone
              ? { deviceId: { exact: selectedMicrophone } }
              : true,
          });

          // b) save & preview local
          localStreamRef.current = camStream;
          setHasLocalStream(true);
          addPeer(meId, camStream, userProfile.username);

          // c) connect to any peers queued before local stream
          waitList.forEach(({ otherId, initiator }) =>
            setupConnection(otherId, initiator)
          );
          waitingPeers.current = [];

          // d) now notify the server-side socket logic
          socket.emit('join-meeting-room', {
            meetingId: roomId,
            userId:    meId,
            username:  userProfile.username
          });
        })();
      }

      // 5️⃣ Cleanup on unmount
      return () => {
        doLeave(); // emit leave-meeting-room

        // stop local tracks
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;

        // close all peer connections
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};

        // remove socket listeners
        socket.off('existing-peers');
        socket.off('user-joined-meeting');
        socket.off('offer');
        socket.off('answer');
        socket.off('ice-candidate');
        socket.off('user-left-meeting');
        socket.off('meeting-ended');
      };
    }, [
      roomId,
      meId,
      userProfile,
      userProfileLoading,
      selectedCamera,
      selectedMicrophone,
      addPeer,
      setupConnection,
      removePeer,
      leaveMeeting,
      doLeave
    ]);



  const activeSpeaker = peers.find(p => p.userId === activeSpeakerId);
  console.log('Active Speaker:', activeSpeaker);

  if (isLoading) {
    return <Spinner />;
  }
  if (isError) {
    return <p className="text-red-500 text-center">Error loading room.</p>;
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

        
      {/*Video Grid and Reactions*/}
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
