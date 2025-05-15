// src/components/VideoPlayer/VideoPlayer.jsx
import React, { useRef, useEffect } from 'react';

const VideoPlayer = ({ stream, muted = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // only set srcObject if it's not already our stream
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className="w-full h-full object-contain rounded-lg"
    />
  );
};

export default React.memo(VideoPlayer);
