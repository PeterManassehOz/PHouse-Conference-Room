import io from 'socket.io-client';

const socket = io('http://localhost:5000');

// after you fetch upcoming meetings, join each room:
export function joinMyMeetingRooms(meetings) {
  meetings.forEach(m => {
    socket.emit('join-meeting-room', { meetingId: m._id });
  });
}

export default socket;
