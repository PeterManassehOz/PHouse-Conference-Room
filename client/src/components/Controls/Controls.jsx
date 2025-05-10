import React from 'react';
import {MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdScreenShare, MdStopScreenShare } from 'react-icons/md';

const Controls = ({
  isMuted,
  isVideoOff,
  isScreenSharing,
  setIsMuted,
  setIsVideoOff,
  startScreenShare,
}) => (
  <div className="flex justify-center md:justify-end items-center space-x-4">
    {/* Mute / Unmute */}
    <button
      onClick={() => setIsMuted(!isMuted)}
      className="p-3 md:p-4 rounded-full bg-[#00013d] hover:bg-[#03055B] text-white transition focus:outline-none cursor-pointer"
    >
      {isMuted ? <MdMicOff size={24} /> : <MdMic size={24} />}
    </button>

    {/* Video On / Off */}
    <button
      onClick={() => setIsVideoOff(!isVideoOff)}
      className="p-3 md:p-4 rounded-full bg-[#00013d] hover:bg-[#03055B] text-white transition focus:outline-none cursor-pointer"
    >
      {isVideoOff ? <MdVideocamOff size={24} /> : <MdVideocam size={24} />}
    </button>

    {/* Screen Share */}
    <button
      onClick={startScreenShare}
      className="p-3 md:p-4 rounded-full bg-[#00013d] hover:bg-[#03055B] text-white transition focus:outline-none cursor-pointer"
    >
      {isScreenSharing ? (
        <MdStopScreenShare size={24} />
      ) : (
        <MdScreenShare size={24} />
      )}
    </button>
  </div>
);

export default Controls;
