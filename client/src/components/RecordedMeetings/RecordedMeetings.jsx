// src/components/RecordedMeetings.jsx
import React from 'react';
import {
  useGetRecordedVideosQuery,
  useStreamVideoQuery
} from '../../redux/videosUploadApi/videoUploadApi';
import Spinner from '../Spinner/Spinner';
import { useSelector } from 'react-redux';

const RecordedMeetings = () => {
  const { data: videos = [], isLoading, isError } = useGetRecordedVideosQuery();
  const darkMode = useSelector((s) => s.theme.darkMode);

  if (isLoading) {
    return (
      <div className="flex justify-center mt-10">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center mt-10">
        <p className="text-red-500">Error loading recordings.</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex justify-center mt-10">
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          No recordings found.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-wrap gap-5">
      {videos.map((v) => (
        <RecordingCard key={v._id} video={v} darkMode={darkMode} />
      ))}
    </div>
  );
};

function RecordingCard({ video, darkMode }) {
  // fetch the blob URL for this recording
  const { data: src, isLoading } = useStreamVideoQuery(video._id);

  return (
    <div
      className={`flex-shrink-0 w-full sm:w-[48%] lg:w-[31%] rounded p-4 shadow-md
        ${darkMode ? 'text-white bg-gray-800' : 'text-black bg-white'}
      `}
    >
      <h2 className="text-xl font-semibold">Room ID: {video.roomId}</h2>
      <p className="mt-1">Size: {(video.size / 1024).toFixed(1)} KB</p>
      <p className="mt-1">Created: {new Date(video.createdAt).toLocaleString()}</p>

      <div className="mt-3">
        {isLoading ? (
          <Spinner />
        ) : src ? (
          <video className="w-full max-w-lg" controls src={src} />
        ) : (
          <p>Unable to load video.</p>
        )}
      </div>
    </div>
  );
}

export default RecordedMeetings;
