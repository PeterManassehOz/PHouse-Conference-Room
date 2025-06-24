// VideoPlayer.jsx
import React, { useRef, useEffect } from 'react';

const VideoPlayer = ({ stream, isLocal, label, isSpeaking }) => {
  const videoRef = useRef(null);

  // whenever `stream` changes, just re-bind it
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (stream) {
      v.srcObject = stream;
        // 👉 Kick off playback
      v.play().catch(() => {
        /* ignore autoplay failures */
      });
    } else {
      v.removeAttribute('srcObject');
    }
  }, [stream]);

  // if no video tracks yet, show “warming up”
  if (!stream || stream.getVideoTracks().length === 0) {
    return (
      <div className="relative flex items-center justify-center rounded-lg bg-gray-800 text-gray-200 w-full" style={{ paddingTop: '56.25%' }}>
        <span className="absolute text-sm">
          {isLocal ? 'Your video is off' : `${label} is warming up…`}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border-2 transition-all duration-300 ${isSpeaking ? 'border-green-500 shadow-md' : 'border-transparent'} w-full`} style={{ paddingTop: '56.25%' }}>
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-cover"
        autoPlay
        muted={isLocal}
        playsInline
      />
      <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-50 px-2 py-1 rounded text-xs">
        {isLocal ? 'You' : label}
      </div>
    </div>
  );
};

export default React.memo(VideoPlayer);
