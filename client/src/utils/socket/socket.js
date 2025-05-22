import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  transports: ['websocket']
});


socket.on('connect', () => console.log('✅ [socket.js] connected, id=', socket.id));
socket.on('disconnect', () => console.log('❌ [socket.js] disconnected'));



export default socket;


// after you fetch upcoming meetings, join each room:
export function joinMyMeetingRooms(meetings) {
  meetings.forEach(m => {
    socket.emit('join-meeting-room', { meetingId: m._id });
  });
}
