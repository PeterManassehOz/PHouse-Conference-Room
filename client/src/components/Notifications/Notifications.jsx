import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../utils/socket/socket';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation
} from '../../redux/notificationApi/notificationApi';
import Spinner from '../Spinner/Spinner';

const Notifications = () => {
  const navigate = useNavigate();
  const darkMode = useSelector(s => s.theme.darkMode);

  // 1) RTK Query: load unread notifications
  const {
    data: initialNotes = [],
    isLoading,
    isError,
  } = useGetNotificationsQuery(undefined, {
  refetchOnMountOrArgChange: false
});

  // 2) local state to prepend real-time updates
  const [notes, setNotes] = useState([]);

  // 3) mutation to mark read
  const [markRead] = useMarkNotificationReadMutation();

  // when initial data arrives, seed our local list
  useEffect(() => {
    if (initialNotes.length) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  // 4) socket subscription
  useEffect(() => {
    socket.connect();

    socket.on('meeting-notification', data => {
      console.log('Incoming notification:', data);
      setNotes(prev => {
          // filter out any duplicates by _id
          if (prev.find(n => n._id === data._id)) return prev;
          return [data, ...prev];
        });
      toast.info(data.message, { position: 'top-right', autoClose: 5000 });
    });

    return () => {
      socket.off('meeting-notification');
      socket.disconnect();
    };
  }, []);

  // 5) navigate internally to /room/:id
  // inside Notifications.jsx

const handleJoin = async (note) => {
  // 1) Extract meetingId & hostId exactly once
  let meetingId = note.meetingId;
  let hostId    = null;

  if (note.link) {
    try {
      const url      = new URL(note.link);
      const parts    = url.pathname.split('/');
      meetingId      = meetingId || parts[parts.length - 1];
      hostId         = url.searchParams.get('hostId');    // <-- new param
    } catch {
      // fallback if URL constructor fails
      const parts = note.link.split('/');
      meetingId    = meetingId || parts[parts.length - 1];
    }
  }

  // if we still don’t have an ID, give up
  if (!meetingId) return;

  // 2) Store hostId (if present)
  if (hostId) {
    localStorage.setItem('hostId', hostId);
  }

  // 3) Mark read + update UI + navigate
  try {
    await markRead(note._id).unwrap();
    setNotes(prev => prev.filter(n => n._id !== note._id));
  } catch (err) {
    console.error('mark-read failed', err);
  }

  navigate(`/room/${meetingId}`);
};



  if (isLoading) {
    return <Spinner />;
  }
  if (isError) {
    return <p className="text-red-500 text-center mt-10">Failed to load notifications.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 mt-10">
      <h2 className="text-2xl font-bold mb-4 text-center">Notifications</h2>

      {notes.length > 0 ? (
        <ul className="space-y-2">
          {notes.map(n => (
            <li
              key={n._id}
              className={`p-3 rounded-md shadow-md flex justify-between items-center ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
              }`}
            >
              <div>
                {n.meetingId && (
                  <p className="text-sm italic text-gray-500">
                    Meeting ID: {n.meetingId}
                  </p>
                )}
                <p className="mt-1">{n.message}</p>
              </div>
              {(n.meetingId || n.link) && (
                <button
                  onClick={() => handleJoin(n)}
                  className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Join now
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">No notifications.</p>
      )}
    </div>
  );
};

export default Notifications;
