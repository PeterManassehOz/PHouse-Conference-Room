import React, { useEffect, useState, useRef } from 'react';
import {
  MdMic,
  MdMicOff,
  MdVideocam,
  MdVideocamOff,
  MdScreenShare,
  MdStopScreenShare,
  MdArrowDropDown 
} from 'react-icons/md';
import { PiRecordFill, PiStopFill } from 'react-icons/pi';
import Spinner from '../Spinner/Spinner';

const Controls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  setIsMuted,
  setIsVideoOff,
  startScreenShare,
  isRecording,
  startRecording,
  stopRecording,
  isUploading,
  setSelectedCamera,
  setSelectedMicrophone,
}) => {
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCamera, setLocalSelectedCamera] = useState('');
  const [selectedMicrophone, setLocalSelectedMicrophone] = useState('');

  const [showCamMenu, setShowCamMenu] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);

  const camMenuRef = useRef();
  const micMenuRef = useRef();

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
          className="p-2 rounded-full text-white transition focus:outline-none"
        >
          {isMuted ? <MdMicOff size={24} /> : <MdMic size={24} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setShowMicMenu(v => !v); }}
          className="rounded-full text-white focus:outline-none"
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
          className="p-2 rounded-full text-white transition focus:outline-none"
        >
          {isVideoOff ? <MdVideocamOff size={24} /> : <MdVideocam size={24} />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setShowCamMenu(v => !v); }}
          className="rounded-full text-white focus:outline-none"
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

      {/* Screen Share */}
      <button
        onClick={startScreenShare}
        className="p-3 rounded-full bg-[#00013d] hover:bg-[#03055B] text-white transition focus:outline-none"
      >
        {isScreenSharing ? <MdStopScreenShare size={24} /> : <MdScreenShare size={24} />}
      </button>

      {/* Recording Control */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`p-3 rounded-full ${isRecording ? 'bg-red-600' : 'bg-green-600'} hover:bg-opacity-80 text-white transition focus:outline-none`}
      >
        {isUploading ? <Spinner /> : isRecording ? <PiStopFill size={24} /> : <PiRecordFill size={24} />}
      </button>
    </div>
  );
};

export default Controls;
