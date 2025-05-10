import React, { forwardRef } from 'react';

const VideoPlayer = forwardRef((_, ref) => (
  <video ref={ref} autoPlay playsInline className="video" />
));

export default VideoPlayer;
