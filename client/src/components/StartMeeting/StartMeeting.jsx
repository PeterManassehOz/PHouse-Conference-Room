import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const StartMeeting = () => {
  const [meetingId, setMeetingId] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const navigate = useNavigate();
  const darkMode = useSelector((state) => state.theme.darkMode);

  const handleStart = () => {
    const id = uuidv4();
    const hostId = uuidv4();


    
    // 2) Persist the hostId in localStorage so this browser “remembers” it
    localStorage.setItem('hostId', hostId);

    // 3) Append hostId as a query param on the URL
    const link = `${window.location.origin}/room/${id}?`;
    setMeetingId(id);
    setMeetingLink(link);
  };

  const handleJoin = () => {
    navigate(`/room/${meetingId}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(meetingLink);
    alert('Meeting link copied to clipboard!');
  };

  return (
    <div className={`w-full max-w-md mx-auto p-6 mt-10 rounded-lg shadow-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}>
      {/* Step 1: Generate */}
      {!meetingLink ? (
        <button
          onClick={handleStart}
          className="w-full bg-[#00013d] text-white py-3 rounded-md hover:bg-[#03055B] transition duration-200 cursor-pointer"
        >
          Start New Meeting
        </button>
      ) : (
        <div className="space-y-4">
          {/* Meeting Link Display */}
          <div>
            <p className="font-semibold text-lg">Your meeting link:</p>
            <input
              type="text"
              readOnly
              value={meetingLink}
              className="w-full mt-2 p-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              onFocus={(e) => e.target.select()}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row items-center gap-4 mt-4">
            <button
              onClick={handleCopy}
              className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-500 transition duration-200 cursor-pointer"
            >
              Copy Link
            </button>
            <button
              onClick={handleJoin}
              className="flex-1 bg-[#00013d] text-white py-2 px-4 rounded-md hover:bg-[#03055B] transition duration-200 cursor-pointer"
            >
              Start Meeting
            </button>
          </div>

          {/* Instructions */}
          <p className="text-sm text-gray-500 mt-3">
            Share this link with anyone you want to invite.
          </p>
        </div>
      )}
    </div>
  );
};

export default StartMeeting;
