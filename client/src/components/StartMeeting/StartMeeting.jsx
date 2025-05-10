// src/components/StartMeeting/StartMeeting.jsx
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';

const StartMeeting = () => {
  const [meetingId, setMeetingId]       = useState('');
  const [meetingLink, setMeetingLink]   = useState('');
  const navigate = useNavigate();

  const handleStart = () => {
    // 1. Generate a unique ID
    const id   = uuidv4();
    const link = `${window.location.origin}/room/${id}`;

    // 2. Set both in state (so the UI appears)
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
    <div style={{ maxWidth: 400, margin: '2rem auto', textAlign: 'center' }}>
      {/* Step 1: Generate */}
      {!meetingLink && (
        <button
          onClick={handleStart}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Start New Meeting
        </button>
      )}

      {/* Step 2: Show link, copy & join */}
      {meetingLink && (
        <div style={{ marginTop: '1.5rem', wordBreak: 'break-all' }}>
          <p><strong>Your meeting link:</strong></p>
          <input
            type="text"
            readOnly
            value={meetingLink}
            style={{ width: '100%', padding: '0.5rem' }}
            onFocus={e => e.target.select()}
          />
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              onClick={handleCopy}
              style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Copy Link
            </button>
            <button
              onClick={handleJoin}
              style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
            >
              Start Meeting
            </button>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Share this link with anyone you want to invite.
          </p>
        </div>
      )}
    </div>
  );
};

export default StartMeeting;
