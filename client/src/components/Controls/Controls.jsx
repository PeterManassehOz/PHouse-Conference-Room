import React, { useEffect, useState, useRef } from 'react';
import {
  MdMic,
  MdMicOff,
  MdVideocam,
  MdVideocamOff,
  MdScreenShare,
  MdStopScreenShare,
  MdArrowDropDown, 
  MdAddReaction
} from 'react-icons/md';
import { PiRecordFill, PiStopFill } from 'react-icons/pi';
import { FaUserFriends } from 'react-icons/fa';
import Spinner from '../Spinner/Spinner';
import Picker from 'emoji-picker-react';
import socket from '../../utils/socket/socket';
import { FaPersonWalkingDashedLineArrowRight } from "react-icons/fa6";
import { SlCallEnd } from "react-icons/sl";






const Controls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  setIsMuted,
  setIsVideoOff,
  startScreenShare,
  stopScreenShare,
  isRecording,
  startRecording,
  stopRecording,
  isUploading,
  setSelectedCamera,
  setSelectedMicrophone,
  roomId,
  meId,
  participants = [],
  leaveMeeting,
  endMeeting,
  isHost
}) => {
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCamera, setLocalSelectedCamera] = useState('');
  const [selectedMicrophone, setLocalSelectedMicrophone] = useState('');

  const [showCamMenu, setShowCamMenu] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showMeetingPicker, setShowMeetingPicker] = useState(false);
  const [showList, setShowList] = useState(false);


  const camMenuRef = useRef();
  const micMenuRef = useRef();
  const pickerRef = useRef();
  const listRef = useRef();

  // Fetch devices
  useEffect(() => {
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const audioDevices = devices.filter(d => d.kind === 'audioinput');
        setCameras(videoDevices);
        setMicrophones(audioDevices);
        if (videoDevices[0]) {
          setLocalSelectedCamera(videoDevices[0].deviceId);
          setSelectedCamera(videoDevices[0].deviceId);
        }
        if (audioDevices[0]) {
          setLocalSelectedMicrophone(audioDevices[0].deviceId);
          setSelectedMicrophone(audioDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error fetching devices:', err);
      }
    })();
  }, [setSelectedCamera, setSelectedMicrophone]);

  // Close menus on outside click
  useEffect(() => {
    const handler = e => {
      if (camMenuRef.current && !camMenuRef.current.contains(e.target)) {
        setShowCamMenu(false);
      }
      if (micMenuRef.current && !micMenuRef.current.contains(e.target)) {
        setShowMicMenu(false);
      }
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
      setShowMeetingPicker(false);
      }
      if (listRef.current && !listRef.current.contains(e.target)) {
        setShowList(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCameraChange = e => {
    setLocalSelectedCamera(e.target.value);
    setSelectedCamera(e.target.value);
  };

  const handleMicrophoneChange = e => {
    setLocalSelectedMicrophone(e.target.value);
    setSelectedMicrophone(e.target.value);
  };

  return (
    <div className="flex flex-row gap-5 md:flex-row items-center justify-center md:justify-end space-y-2 md:space-y-0 md:space-x-4">
      {/* Microphone Control */}
      <div className="relative flex items-center bg-[#00013d] hover:bg-[#03055B] rounded-full" ref={micMenuRef}>
        <button
          onClick={() => setIsMuted(prev => !prev)}
          className="p-2 rounded-full text-white transition focus:outline-none cursor-pointer"
        >
          {isMuted ? <MdMicOff size={24} /> : <MdMic size={24} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setShowMicMenu(v => !v); }}
          className="rounded-full text-white focus:outline-none cursor-pointer"
        >
          <MdArrowDropDown size={20} />
        </button>
        {showMicMenu && (
          <div className="absolute bottom-full mb-2 w-40 bg-gray-100 hover:bg-gray-400 text-white rounded-md shadow-lg z-10">
            <select
              value={selectedMicrophone}
              onChange={handleMicrophoneChange}
              className="w-full p-2 bg-black hover:bg-gray-900 text-white rounded-md"
            >
              {microphones.map(mic => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || 'Unnamed Microphone'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Camera Control */}
      <div className="relative flex items-center bg-[#00013d] hover:bg-[#03055B] rounded-full" ref={camMenuRef}>
        <button
          onClick={() => setIsVideoOff(prev => !prev)}
          className="p-2 rounded-full text-white transition focus:outline-none cursor-pointer"
        >
          {isVideoOff ? <MdVideocamOff size={24} /> : <MdVideocam size={24} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setShowCamMenu(v => !v); }}
          className="rounded-full text-white focus:outline-none cursor-pointer"
        >
          <MdArrowDropDown size={20} />
        </button>
        {showCamMenu && (
          <div className="absolute bottom-full mb-2 w-40 bg-gray-100 hover:bg-gray-400 text-white rounded-md shadow-lg z-10">
            <select
              value={selectedCamera}
              onChange={handleCameraChange}
              className="w-full p-2 bg-black hover:bg-gray-900 text-white rounded-md"
            >
              {cameras.map(cam => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || 'Unnamed Camera'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Participants Control */}
       <div className="relative" ref={listRef}>
        <button
          onClick={() => setShowList(v => !v)}
          className="relative p-3 rounded-full bg-[#00013d] hover:bg-[#03055B] text-white focus:outline-none cursor-pointer"
        >
          <FaUserFriends size={24} />
          {participants.length > 0 && (
            <span
              className="
                absolute -top-1 -right-1 inline-flex
                items-center justify-center
                w-5 h-5 text-xs font-bold
                text-white bg-red-600 rounded-full
              "
            >
              {participants.length}
            </span>
          )}
        </button>

        {showList && (
          <div
            className="
              absolute -right-25 mt-2 w-60 max-h-64
              overflow-y-auto bg-white text-black
              shadow-lg rounded-lg z-50
            "
          >
            <ul>
             {participants.map(({ user }) => (
                <li
                  key={user._id}
                  className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100"
                >
                  {user.image
                    ? <img
                        src={user.image}
                        className="w-6 h-6 rounded-full"
                        alt={user.email}
                      />
                    : <div className="w-6 h-6 bg-gray-300 rounded-full" />
                  }
                  <div className="flex flex-col">
                    <span className="text-sm">{user.username}</span>
                    <span className="text-xs text-gray-500 italic">{user.email}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>


      {/* Leave Meeting Button */}
      <div className="p-3 rounded-full bg-[#00013d] hover:bg-[#03055B] text-white transition focus:outline-none cursor-pointer">
        <FaPersonWalkingDashedLineArrowRight 
          onClick={leaveMeeting}
          size={24} 
          title="Leave Meeting" 
        />
      </div>

      {/* End Meeting Button */}
      {isHost && (
        <div className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition focus:outline-none cursor-pointer">
          <SlCallEnd 
            onClick={endMeeting}
            size={24}
            className="text-white"
            title="End Meeting" 
          />
        </div>
      )}

      

      {/* Screen Share */}
      <button
        onClick={isScreenSharing ? stopScreenShare : startScreenShare}
        className="p-3 rounded-full bg-[#00013d] hover:bg-[#03055B] text-white transition focus:outline-none cursor-pointer"
      >
        {isScreenSharing ? <MdStopScreenShare size={24} /> : <MdScreenShare size={24} />}
      </button>


       
       {/* Meeting Reaction Button */}
      <div className="relative">
        <button
          onClick={() => setShowMeetingPicker(v => !v)}
          className="p-3 rounded-full bg-[#00013d] hover:bg-[#03055B] text-white  cursor-pointer"
        >
          <MdAddReaction size={24}/>
        </button>
        {showMeetingPicker && (
          <div 
            ref={pickerRef} 
            className="absolute -left-56 -top-70 bottom-full mb-2 z-20">
            <Picker
              onEmojiClick={({ emoji }) => {
                console.log('🏷️ picked emoji:', emoji);
                socket.emit('react-to-meeting', {
                  meetingId: roomId,
                  userId: meId,
                  emoji: emoji
                });
                setShowMeetingPicker(false);
              }}
            />
          </div>
        )}
      </div>


      {/* Recording Control */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`p-3 rounded-full cursor-pointer ${isRecording ? 'bg-red-600' : 'bg-green-600'} hover:bg-opacity-80 text-white transition focus:outline-none`}
      >
        {isUploading ? <Spinner /> : isRecording ? <PiStopFill size={24} /> : <PiRecordFill size={24} />}
      </button>
    </div>
  );
};

export default Controls;
