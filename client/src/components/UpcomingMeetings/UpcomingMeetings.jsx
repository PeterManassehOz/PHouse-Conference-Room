import React, { useEffect, useState } from 'react';
import {
  useGetUpcomingQuery,
  useDeleteMeetingMutation
} from '../../redux/meetingApi/meetingApi';
import { useSelector } from 'react-redux';
import Spinner from '../Spinner/Spinner';
import { MdDelete } from 'react-icons/md';
import { toast } from 'react-toastify';

import socket, { joinMyMeetingRooms } from '../../utils/socket/socket';

const UpcomingMeetings = () => {
  const dark = useSelector(s => s.theme.darkMode);
  const {
    data: meets = [],
    isLoading,
    isError,
    refetch
  } = useGetUpcomingQuery();
  const [deleteMeeting] = useDeleteMeetingMutation();
  const [showDelete, setShowDelete] = useState(null);

  // 1) connect socket & set up notification listener
  useEffect(() => {
    socket.connect();

    socket.on('meeting-notification', data => {
      toast.info(`New Meeting Started: ${data.message}`, {
        position: 'top-right',
        autoClose: 5000
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 2) once meets are loaded, join each meeting-room
  useEffect(() => {
    if (meets.length > 0) {
      joinMyMeetingRooms(meets);
    }
  }, [meets]);

  if (isLoading) return <Spinner />;
  if (isError)
    return (
      <p className="text-red-500 text-center mt-10">
        Error loading meetings.
      </p>
    );
  if (meets.length === 0)
    return (
      <p className="text-gray-500 text-center mt-10">
        No upcoming meetings.
      </p>
    );

  const handleDeleteMeeting = async id => {
    try {
      await deleteMeeting(id).unwrap();
      toast.success('Meeting deleted successfully.');
      refetch();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete the meeting.');
    }
  };

  const confirmDelete = id => {
    setShowDelete(id);
  };

  return (
    <div className="flex flex-wrap gap-5 p-4 mt-10">
      {meets.map(m => {
        const startTs = new Date(m.date).getTime();
        const isLive = Date.now() >= startTs;

        return (
          <div
            key={m._id}
            className={`relative flex-shrink-0 w-full sm:w-[48%] lg:w-[31%] p-4 border rounded-lg shadow ${
              dark
                ? 'bg-gray-800 text-white border-gray-700'
                : 'bg-white text-black border-gray-200'
            }`}
          >
            {/* Delete button */}
            {showDelete === m._id ? (
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => handleDeleteMeeting(m._id)}
                  className="bg-red-600 text-white px-2 py-1 rounded-md"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowDelete(null)}
                  className="bg-gray-400 text-white px-2 py-1 rounded-md"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => confirmDelete(m._id)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                title="Delete"
              >
                <MdDelete size={24} />
              </button>
            )}

            {/* Title & Time */}
            <h3 className="text-lg font-semibold mb-1">{m.title}</h3>
            <time className="block text-sm text-gray-500 mb-2">
              {new Date(m.date).toLocaleString()}
            </time>

            {/* Description */}
            {m.description && (
              <p className="text-sm mb-2">
                <span className="italic text-gray-400">
                  Description:{' '}
                </span>
                {m.description}
              </p>
            )}

            {/* Join link */}
            <a
              href={isLive ? m.link : undefined}
              className={`text-blue-500 ${
                !isLive ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={e => {
                if (!isLive) e.preventDefault();
              }}
            >
              {isLive
                ? 'Join Meeting'
                : `Starts at ${new Date(m.date).toLocaleString()}`}
            </a>

            {/* Inviter */}
            {m.createdBy?.email && (
              <p className="text-sm italic text-gray-400 mt-2">
                Invited by: {m.createdBy.email}
              </p>
            )}

            {/* Participants & statuses */}
            {m.participants?.length > 0 && (
              <ul className="space-y-1 text-sm mt-2">
                {m.participants.map(p => (
                  <li
                    key={p.user._id || p.user}
                    className="flex justify-between"
                  >
                    <span className="italic text-blue-600">
                      {p.user.email}
                    </span>
                    <span
                      className={`font-semibold ${
                        p.status === 'Accepted'
                          ? 'text-green-400'
                          : p.status === 'Declined'
                          ? 'text-red-400'
                          : 'text-gray-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UpcomingMeetings;
