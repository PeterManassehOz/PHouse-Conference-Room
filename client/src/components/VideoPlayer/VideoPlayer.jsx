import React, { useRef, useEffect } from 'react';

const VideoPlayer = ({ stream, isLocal, label, isSpeaking }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative rounded-lg overflow-hidden border-2 transition-all duration-300 ${
    isSpeaking ? 'border-green-500 shadow-md' : 'border-transparent'
    } aspect-16-9`}>
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
        {isLocal ? 'You' : label}
      </div>
    </div>
  );
};


export default React.memo(VideoPlayer);