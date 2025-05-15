import React from 'react';
import { useGetRecordedVideosQuery } from '../../redux/videosUploadApi/videoUploadApi';
import Spinner from '../Spinner/Spinner';

const RecordedMeetings = () => {
  const {
    data: videos = [],
    isLoading,
    isError,
    error,
  } = useGetRecordedVideosQuery();

  

  if (isLoading) return <Spinner />;
  if (isError)   return <p>Error: {error?.data?.error || error.message}</p>;

  return (
    <div className="space-x-8 p-4 flex flex-row flex-wrap ">
      {videos.length === 0 && <p>No recordings found.</p>}
      {videos.map((v) => (
        <div
          key={v._id}
          className="rounded p-4 shadow-md"
        >
          <h2 className="text-xl font-semibold">
            Room ID: {v.roomId}
          </h2>
          <p>Size: {(v.size / 1024).toFixed(1)} KB</p>
          <p>
            Created:{' '}
            {new Date(v.createdAt).toLocaleString()}
          </p>
          <video
            className="mt-2 w-full max-w-lg"
            controls
            src={`http://localhost:5000/recordings/videos/${v._id}/stream`}
          />
        </div>
      ))}
    </div>
  );
};

export default RecordedMeetings;
