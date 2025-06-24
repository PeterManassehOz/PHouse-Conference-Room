import io from 'socket.io-client';


// Grab the same token you put in localStorage for RTK Query:
const token = localStorage.getItem('token');
console.log('✅ [socket.js] connecting with token:', token);

const socket = io('https://192.168.121.113:5000', {
  transports: ['websocket'],
  auth: {token}
});

socket.on('connect', () =>
  console.log('✅ [socket.js] connected, id=', socket.id)
);
socket.on('disconnect', () =>
  console.log('❌ [socket.js] disconnected')
);

export default socket;


export function joinMyMeetingRooms() {
  //no-op
}


/*// This function is not used in the current codebase, but it can be used to join all meeting rooms
export function joinMyMeetingRooms(meetings) {     
  meetings.forEach(m => {
    socket.emit('join-meeting-room', { meetingId: m._id });
  });
}
*/