// src/pages/Room/Room.jsx
import React, { useRef, useEffect, useState,  useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import VideoPlayer from '../../components/VideoPlayer/VideoPlayer';
import Chat from '../../components/Chat/Chat';
import Controls from '../../components/Controls/Controls';
import socket from '../../utils/socket/socket';
import { toast } from "react-toastify";
import { FaPersonWalkingDashedLineArrowRight } from "react-icons/fa6";
import { SlCallEnd } from "react-icons/sl";
import { FaCopy } from "react-icons/fa";
import { useUploadVideoMutation } from '../../redux/videosUploadApi/videoUploadApi';





const Room = () => {
  const [uploadVideo] = useUploadVideoMutation();
  const darkMode       = useSelector(s => s.theme.darkMode);
  const { id: roomId } = useParams();
  const navigate       = useNavigate();
  const roomLink       = `${window.location.origin}/room/${roomId}`;
  const linkInputRef = useRef(null);

  
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
  const [displayStream, setDisplayStream] = useState(null);
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
  const hostId = localStorage.getItem('hostId');
  const isHost = Boolean(hostId);

  const leaveMeeting = useCallback(() => {
    socket.emit('leave-room', roomId);
    Object.values(peerConnections.current).forEach(pc => pc.close());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    navigate('/');
  }, [roomId, navigate]);

  const endMeeting = () => {
    socket.emit('end-meeting', roomId);
    leaveMeeting();
  };

  // Initialize Local Stream without affecting the main stream
  useEffect(() => {
  socket.emit('join-room', roomId);

  socket.on('meeting-ended', () => {
    toast.info('Host has ended the meeting.');
    leaveMeeting();
  });

  return () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    socket.off('meeting-ended');
    socket.disconnect();
  };
  }, [roomId, leaveMeeting]);


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

      setDisplayStream(localStreamRef.current);
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
    setDisplayStream(screenStream);
    setIsScreenSharing(true);
    toast.success('Screen sharing started');

    // When user manually stops share, revert automatically
    screenTrack.onended = () => {
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      Object.values(peerConnections.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track.kind === 'video');
        if (sender) sender.replaceTrack(camTrack);
      });

      setDisplayStream(localStreamRef.current);
      setIsScreenSharing(false);
      toast.info('Screen share ended');
    };
  } catch (err) {
    console.error('Screen share failed', err);
    toast.error('Screen share failed');
  }
  };



  // Start Recording (Separate Stream)
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
    recorderRef.current = recorder;
    chunksRef.current = [];

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
        // Stop the recording stream
        stream.getTracks().forEach(t => t.stop());
      }
    };

    recorder.start();
    setIsRecording(true);
  };

  // Stop Recording
  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  // Using useMemo to ensure iceServers is stable
  const iceServers = useMemo(() => ({
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302", // Google's public STUN server
      },
    ],
  }), []);



  // Helpers to manage peers
  const addPeer = useCallback((userId, stream) => {
      setPeers(prev => {
        if (prev.some(p => p.userId === userId)) return prev;
        return [...prev, { userId, stream }];
      });
    }, []);

  const removePeer = useCallback((userId) => {
    setPeers(prev => prev.filter(p => p.userId !== userId));
    peerConnections.current[userId]?.close();
    delete peerConnections.current[userId];
  }, []);

  const setupConnection = useCallback((otherId, initiator) => {
    const pc = new RTCPeerConnection(iceServers);
    peerConnections.current[otherId] = pc;

    // Add local tracks
    localStreamRef.current.getTracks().forEach(track =>
      pc.addTrack(track, localStreamRef.current)
    );

    // When we get remote tracks, add to peers
    pc.ontrack = ({ streams: [stream] }) => addPeer(otherId, stream);

    // ICE candidates
    pc.onicecandidate = e => {
      if (e.candidate) {
        socket.emit('ice-candidate', { roomId, to: otherId, candidate: e.candidate });
      }
    };

    // If we're the initiator (host), create and send an offer
    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit('offer', { roomId, to: otherId, sdp: offer });
      });
    }
  }, [iceServers, roomId, addPeer]);

  // Join, WebRTC + socket handlers
  useEffect(() => {
    // 1. Join room and get local media
    navigator.mediaDevices.getUserMedia({
    video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
    audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true
  })  .then(camStream => {
    // save the raw camera stream
    localStreamRef.current = camStream;

    // this is what VideoPlayer will render
    setDisplayStream(camStream);

    // flip your “got it” flag so the grid shows up
    setHasLocalStream(true);

    // now that we have media, join the room on the server
    socket.emit('join-room', roomId);
  })
 .catch(err => {
      console.error('Failed to access camera/mic', err);
      toast.error('Failed to access camera/mic');
    });

   // 2. New user joined
  socket.on('user-joined', userId => {
    setupConnection(userId, isHost);
  });

  // 3. Received offer
  socket.on('offer', async ({ from, sdp }) => {
    setupConnection(from, false);
    const pc = peerConnections.current[from];
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { roomId, to: from, sdp: answer });
  });

  // 4. Received answer
  socket.on('answer', async ({ from, sdp }) => {
    const pc = peerConnections.current[from];
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  });

  // 5. Received ICE candidates
  socket.on('ice-candidate', ({ from, candidate }) => {
    peerConnections.current[from]?.addIceCandidate(new RTCIceCandidate(candidate));
  });

  // 6. User left
  socket.on('user-left', removePeer);

  // 7. Meeting ended
  socket.on('meeting-ended', () => {
    toast.info('Meeting ended');
    socket.disconnect();
    leaveMeeting();
  });

  const pcs = peerConnections.current;

   return () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    Object.values(pcs).forEach(pc => pc.close());
    socket.disconnect();
  };
  }, [
    roomId,
    selectedCamera,
    selectedMicrophone,
    isHost,
    iceServers,
    leaveMeeting,
    setupConnection,
    removePeer,
  ]);





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

      {/* Controls */}
      <div
        className={`
          p-4 flex flex-wrap justify-center gap-3 shadow
          ${darkMode ? 'bg-gray-800' : 'bg-white'}
        `}
      >
        <FaPersonWalkingDashedLineArrowRight 
          onClick={leaveMeeting}
          size={45}
          className="cursor-pointer text-white bg-[#00013d] hover:bg-[#03055B] p-3 rounded-full transition" 
          title="Leave Meeting" 
        />

        {isHost && (
          <SlCallEnd 
            onClick={endMeeting}
            size={45}
            className="cursor-pointer text-white bg-red-600 hover:bg-red-700 p-3 rounded-full transition" 
            title="End Meeting" 
          />
        )}
      </div>

      {/* Video Grid */}
      <div   className={`
            flex-1 p-4 grid gap-4
            ${peers.length > 0
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'}
            ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}
          `}>
          {/* Local (always present) */}
           {hasLocalStream && <VideoPlayer key="local" stream={isScreenSharing ? displayStream : localStreamRef.current} muted/>}

           {/* Peers (only if joined) */}
            {peers.map(p => (
              <VideoPlayer key={p.userId} stream={p.stream} />
            ))}

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
              />
            </div>

            {/* Chat fills most of the width on large screens */}
            <div className="width-full">
              <Chat socket={socket} />
            </div>

           
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
