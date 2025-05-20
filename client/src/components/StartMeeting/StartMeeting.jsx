import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import socket from '../../utils/socket/socket';
import { useStartMeetingMutation } from '../../redux/meetingApi/meetingApi';
import Spinner from '../Spinner/Spinner';
import { toast } from 'react-toastify'

const StartMeeting = () => {
  const [id,   setId]   = useState('');
  const [link, setLink] = useState('');
  const navigate         = useNavigate();
  const darkMode         = useSelector(s => s.theme.darkMode);

  const [startMeeting, { isLoading }] = useStartMeetingMutation();

  useEffect(() => {
    socket.connect();
    return () => { socket.disconnect(); };
  }, []);

  const handleStart = async () => {
    try {
      const { meetingId, hostId, link, title } = await startMeeting({
        // optional overrides:
        title: 'Instant Meeting',
        description: ''
      }).unwrap();

      localStorage.setItem('hostId', hostId);
      setId(meetingId);
      setLink(link);

      socket.emit('meeting-started', {
        meetingId, hostId, link,
        message: `Meeting "${title}" has started!`
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to start meeting');
    }
  };

  return (
    <div className={`max-w-md mx-auto p-6 mt-10 rounded-lg shadow
      ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      {!link ? (
        <button
          onClick={handleStart}
          disabled={isLoading}
          className="w-full bg-[#00013d] text-white py-3 rounded hover:hover:bg-[#03055B] disabled:opacity-50"
        >
          {isLoading ? <Spinner /> : 'Start Meeting Now'}
        </button>
      ) : (
        <div className="space-y-4">
          <p className="font-semibold">Your meeting link:</p>
          <input
            readOnly value={link}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            onFocus={e => e.target.select()}
          />
          <div className="flex gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast.success('Copied');
              }}
              className="flex-1 bg-green-700 text-white py-2 rounded hover:bg-green-900"
            >
              Copy Link
            </button>
            <button
              onClick={() => navigate(`/room/${id}`)}
              className="flex-1 bg-[#00013d] text-white py-2 rounded hover:bg-[#03055B]"
            >
              Go to Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartMeeting;
