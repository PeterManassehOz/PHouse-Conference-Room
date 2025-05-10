// src/pages/Room/Room.jsx
import React, { useRef, useEffect, useState,  useCallback } from 'react';
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





const Room = () => {
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

  const localVideoRef   = useRef(null);
  const remoteVideoRef  = useRef(null);
  const localStreamRef  = useRef(null);
  const remoteStreamRef = useRef(null);

  const [isMuted, setIsMuted]                 = useState(false);
  const [isVideoOff, setIsVideoOff]           = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHost, setIsHost]                   = useState(true);
  const [hasRemote, setHasRemote]             = useState(false);

  const leaveMeeting = useCallback(() => {
    socket.emit('leave-room', roomId);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    remoteStreamRef.current?.getTracks().forEach(t => t.stop());
    socket.disconnect();
    navigate('/');
  }, [roomId, navigate]);

  const endMeeting = () => {
    socket.emit('end-meeting', roomId);
    leaveMeeting();
  };

  useEffect(() => {
    socket.emit('join-room', roomId);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        socket.emit('stream-ready', roomId);

        socket.on('user-stream', otherStream => {
          remoteStreamRef.current = otherStream;
          setHasRemote(true);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = otherStream;
          }
        });

        socket.on('room-users', users => {
          if (users.length === 1) setIsHost(true);
        });

        socket.on('meeting-ended', () => {
          toast.info('Host has ended the meeting.');
          leaveMeeting();
        });
      })
      .catch(console.error);

    return () => {
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      socket.off('user-stream');
      socket.off('room-users');
      socket.off('meeting-ended');
      socket.disconnect();
    };
  }, [roomId, leaveMeeting]);

  // mute/unmute
  useEffect(() => {
    const s = localStreamRef.current;
    if (s) s.getAudioTracks()[0].enabled = !isMuted;
  }, [isMuted]);

  // video on/off
  useEffect(() => {
    const s = localStreamRef.current;
    if (s) s.getVideoTracks()[0].enabled = !isVideoOff;
  }, [isVideoOff]);

  const startScreenShare = async () => {
    const s = localStreamRef.current;
    if (!s) return;
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack  = screenStream.getVideoTracks()[0];
        s.getVideoTracks()[0].stop();
        s.removeTrack(s.getVideoTracks()[0]);
        s.addTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);
        toast.success('Screen sharing started');
      } catch (err) {
        toast.error('Screen share failed');
        console.error(err);
      }
    } else {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack     = cameraStream.getVideoTracks()[0];
      s.getVideoTracks()[0].stop();
      s.removeTrack(s.getVideoTracks()[0]);
      s.addTrack(camTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = s;
      setIsScreenSharing(false);
      toast.info('Stopped screen sharing');
    }
  };

  return (
    <div
      className={`
        min-h-screen flex flex-col
        ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-black'}
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
      <div
        className={`
          flex-1 p-4 grid 
          ${hasRemote ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} 
          gap-4 
          ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}
        `}
      >
        {/* Local Video */}
     <div className="relative w-full h-64 md:h-[400px] lg:h-[700px] xl:h-[800px] flex items-center justify-center bg-black rounded overflow-hidden">
        <VideoPlayer ref={localVideoRef} />
      </div>


        {/* Remote Video - Only shows if someone has joined */}
        {hasRemote && (
          <div className="relative w-full h-64 md:h-[400px] lg:h-[700px] xl:h-[800px] flex items-center justify-center bg-black rounded overflow-hidden">
            <VideoPlayer ref={remoteVideoRef} />
          </div>
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
            ${darkMode ? 'bg-gray-800' : 'bg-white'}
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
