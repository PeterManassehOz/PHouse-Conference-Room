import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import socket from '../../utils/socket/socket'; // Import the socket instance

const Chat = () => {
  const [messages, setMessages] = useState([ { id: 1, sender: 'John', text: 'Hello, everyone!', time: '10:00 AM' },
    { id: 2, sender: 'You', text: 'Hi, John! How are you?', time: '10:01 AM' },
    { id: 3, sender: 'Jane', text: 'Good morning, all! Ready for the meeting?', time: '10:02 AM' },
    { id: 4, sender: 'Alice', text: 'Morning! I\'m excited for today\'s session.', time: '10:05 AM' },
    { id: 5, sender: 'Bob', text: 'Good to see you all! Is the agenda ready?', time: '10:06 AM' },
    { id: 6, sender: 'Charlie', text: 'Yes, Bob, the agenda is shared in the meeting notes.', time: '10:10 AM' },
    { id: 7, sender: 'You', text: 'Thanks, Charlie! I\'ll check it out.', time: '10:12 AM' },
    { id: 8, sender: 'John', text: 'I\'m ready to get started. Shall we begin?', time: '10:15 AM' },
    { id: 9, sender: 'Jane', text: 'I\'m good to go. Let\'s start!', time: '10:17 AM' },
    { id: 10, sender: 'Alice', text: 'Same here, let\'s dive in.', time: '10:20 AM' },]);
  const [newMessage, setNewMessage] = useState('');
  const darkMode = useSelector((state) => state.theme.darkMode);

  // Listen for incoming messages
  useEffect(() => {
    socket.on('receive-message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    // Cleanup on unmount
    return () => {
      socket.off('receive-message');
    };
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: Date.now(),
        sender: 'You', // This can be dynamically set depending on user
        text: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      // Send the message to the server
      socket.emit('send-message', message);
      setMessages((prevMessages) => [...prevMessages, message]);
      setNewMessage('');
    }
  };

  return (
    <div
      className={`flex flex-col h-[400px] md:h-[500px] lg:h-[600px] xl:h-[700px] rounded-md shadow-lg p-4 overflow-hidden transition-colors ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'
      }`}
    >
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'You' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-sm font-semibold">{msg.sender}</span>
            <div
              className={`px-3 py-2 rounded-lg transition-colors ${
                msg.sender === 'You'
                  ? darkMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : darkMode
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-200 text-black'
              }`}
            >
              {msg.text}
            </div>
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {msg.time}
            </span>
          </div>
        ))}
      </div>

      {/* Message Input Area */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className={`flex-1 p-2 rounded-md focus:outline-none transition-colors ${
            darkMode
              ? 'bg-gray-700 text-white placeholder-gray-400 focus:ring focus:ring-blue-500'
              : 'bg-gray-100 text-black placeholder-gray-500 focus:ring focus:ring-blue-200'
          }`}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button
          onClick={handleSendMessage}
          className={`px-4 py-2 rounded-md transition ${
            darkMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
