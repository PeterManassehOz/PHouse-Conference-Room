import React from 'react';
import { useSelector } from 'react-redux';
import { useGetMyMeetingsQuery } from '../../redux/meetingApi/meetingApi';
import Spinner from '../Spinner/Spinner';




const PreviousMeetings = () => {
  const darkMode = useSelector(s => s.theme.darkMode);
  const { data: meetings = [], isLoading, isError } = useGetMyMeetingsQuery();
  if (isLoading) return <Spinner />;
  if (isError)   return <p className="text-red-500 text-center">Error loading meetings.</p>;

  const now = new Date();
  const previous = meetings.filter(m => new Date(m.date) < now);

  return (
    <div className={`max-w-3xl mx-auto p-4 rounded-lg shadow mt-10
      ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
      <h2 className="text-2xl font-semibold mb-4">Previous Meetings</h2>
      {previous.length === 0
        ? <p>No past meetings.</p>
        : [...previous].reverse().map(m => (
            <div key={m._id} className={`p-4 mb-3 rounded ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <div className="flex justify-between">
                <h3 className="font-medium">{m.title}</h3>
                <time className="text-sm text-gray-500">
                  {new Date(m.date).toLocaleString()}
                </time>
              </div>
              {m.description && <p className="mt-1 text-sm">{m.description}</p>}
            </div>
          ))
      }
    </div>
  );
}

export default PreviousMeetings;