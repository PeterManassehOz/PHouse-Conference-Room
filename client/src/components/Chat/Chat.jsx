import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import socket from '../../utils/socket/socket';
import { useGetChatQuery, usePostChatMutation } from '../../redux/meetingApi/meetingApi';
import { useGetUserProfileQuery } from '../../redux/profileAuthApi/profileAuthApi';
import Spinner from '../Spinner/Spinner';
import { IoIosSend } from 'react-icons/io';
import { useEditChatMutation, useDeleteChatMutation } from '../../redux/meetingApi/meetingApi';


// Helper to resolve avatar URLs
const resolveImage = (imgPath) => {
  if (!imgPath) return '/profileIconBrown.jpeg';
  if (imgPath.startsWith('http')) return imgPath;
  const filename = imgPath.split('/').pop();
  return `http://localhost:5000/uploads/${filename}`;
};

// Format timestamp for display
const formatTimestamp = (date) => {
  const today = new Date();
  const msgDate = new Date(date);
  const isToday = msgDate.toDateString() === today.toDateString();
  return isToday
    ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : msgDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Chat = ({ meetingId }) => {
  const { data: history = [], isLoading } = useGetChatQuery(meetingId);
  const [postChat] = usePostChatMutation();
  const { data: userProfile, isLoading: isProfileLoading } = useGetUserProfileQuery();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const darkMode = useSelector((state) => state.theme.darkMode);
  const bottomRef = useRef(null);

  
  const [editChat] = useEditChatMutation();
  const [deleteChat] = useDeleteChatMutation();


  
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [actionVisibleFor, setActionVisibleFor] = useState(null);
  const holdTimers = useRef({});


  const me = userProfile || {
  _id: localStorage.getItem('userId'),
  username: 'Me',
  image: null,
  };


  // Load REST history
  useEffect(() => {
    if (!isLoading) {
      setMessages(history);
    }
  }, [history, isLoading]);

  // Socket: join room & listen for incoming messages
  useEffect(() => {
    socket.emit('join-meeting-room', { meetingId });
    socket.on('receive-message', (msg) => {
      console.log('Received:', msg);
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) {
          return prev;
        }
        if (msg.tempId && msg.user._id === me._id) {
          return prev.map((m) =>
            m.tempId === msg.tempId ? { ...msg, tempId: undefined } : m
          );
        }
        return [...prev, msg];
      });
    });
    return () => socket.off('receive-message');
  }, [meetingId, me._id]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    
    const tempId = uuidv4();
    const optimisticMessage = {
      _id: tempId,
      tempId,
      meetingId,
      text: newMessage,
      user: { _id: me._id, username: me.username || 'Me', image: me.image },
      createdAt: new Date().toISOString(),
    };

    console.log('Sending optimistic message:', optimisticMessage); 

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');

    socket.emit('send-message', {
      meetingId,
      text: newMessage,
      userId: me._id,
      username: me.username || 'Me',
      image: me.image,
      tempId,
    });

    try {
      const saved = await postChat({ meetingId, text: newMessage }).unwrap();
      console.log('Server saved message:', saved);
      setMessages((prev) => {
        if (prev.some((m) => m._id === saved._id)) {
          return prev;
        }
        return prev.map((m) =>
          m.tempId === tempId ? { ...saved, tempId: undefined } : m
        );
      });
    } catch (err) {
      console.error('Failed to send:', err);
      setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
    }
  };

  
  const handleLongPressStart = (id) => {
    holdTimers.current[id] = setTimeout(() => {
      setActionVisibleFor(id);
    }, 1000); // 1 sec hold
  };

  const handleLongPressEnd = (id) => {
    clearTimeout(holdTimers.current[id]);
  };

  const handleDelete = async (id) => {
    try {
      await deleteChat(id).unwrap();
      setMessages((prev) => prev.filter((m) => m._id !== id));
      setActionVisibleFor(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditClick = (id, currentText) => {
    setEditingMessageId(id);
    setEditText(currentText);
    setActionVisibleFor(null);
  };

  const handleEditSubmit = async () => {
    try {
      const updated = await editChat({ messageId: editingMessageId, text: editText }).unwrap();
      setMessages((prev) =>
        prev.map((m) => (m._id === editingMessageId ? updated : m))
      );
      setEditingMessageId(null);
      setEditText('');
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) return <Spinner />;
  if (isProfileLoading) return <Spinner />;

  return (
    <div
      className={`flex flex-col h-[400px] md:h-[500px] lg:h-[600px] xl:h-[700px] rounded-lg shadow-lg p-4 overflow-hidden transition-colors ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}
    >
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.user?._id === me._id;
          const justify = isMe ? 'justify-end' : 'justify-start';
          const rowDir = isMe ? 'flex-row-reverse' : 'flex-row';
          const bubbleColor = isMe
            ? darkMode
              ? 'bg-blue-600 text-white'
              : 'bg-blue-500 text-white'
            : darkMode
            ? 'bg-gray-700 text-white'
            : 'bg-gray-200 text-gray-900';
          const bubbleShape = isMe
            ? 'rounded-l-lg rounded-tr-lg'
            : 'rounded-r-lg rounded-tl-lg';

          const name = msg.user?.username || msg.username || 'Unknown';
          const avatarUrl = resolveImage(msg.user?.image || msg.image);

          return (
           <div
            key={msg._id || msg.tempId}
            className={`flex ${justify}`}
            onMouseDown={() => handleLongPressStart(msg._id)}
            onMouseUp={() => handleLongPressEnd(msg._id)}
            onTouchStart={() => handleLongPressStart(msg._id)}
            onTouchEnd={() => handleLongPressEnd(msg._id)}
          >
          <div className={`flex ${rowDir} items-start gap-3 max-w-[70%]`}>
            <img
              src={avatarUrl}
              alt={name}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="flex flex-col">
              {/* Header: never stretch */}
              <div className={`flex items-center gap-2 flex-none ${ isMe ? 'self-end' : 'self-start' }`}>
                {!isMe && <span className="font-semibold text-sm">{name}</span>}
                <span className="text-xs text-gray-500">
                  {formatTimestamp(msg.createdAt)}
                </span>
                {isMe && <span className="font-semibold text-sm">{name}</span>}
              </div>

              {/* Bubble */}
              <div
                className={`mt-1 px-4 py-2 ${bubbleColor} ${bubbleShape} text-sm break-words relative`}
              >
                {editingMessageId === msg._id ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full bg-transparent outline-none h-40 resize-none"
                  />
                ) : (
                  msg.text
                )}

                {/* Edit/Delete buttons */}
                {isMe &&
                  actionVisibleFor === msg._id &&
                  editingMessageId !== msg._id && (
                    <div className="absolute -bottom-10 right-0 flex gap-2 p-1 bg-white rounded">
                      <button
                        onClick={() => handleEditClick(msg._id, msg.text)}
                        className="text-xs font-medium bg-yellow-700 text-white px-3 py-1 rounded hover:bg-yellow-600 transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(msg._id)}
                        className="text-xs font-medium bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500 transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  )}
              </div>

              {/* Save button below */}
              {editingMessageId === msg._id && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleEditSubmit}
                    className="text-sm font-semibold bg-green-700 text-white px-5 py-2 rounded-lg shadow hover:bg-green-600 transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className={`flex-1 p-3 rounded-lg focus:outline-none transition-colors ${
            darkMode
              ? 'bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500'
              : 'bg-gray-100 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300'
          }`}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button
          onClick={handleSendMessage}
          className={`p-3 rounded-full transition cursor-pointer ${
            darkMode
              ? 'bg-[#00013d] hover:bg-[#03055B]'
              : 'bg-[#00013d] hover:bg-[#03055B]'
          } text-white`}
          title="Send message"
        >
          <IoIosSend size={20} />
        </button>
      </div>
    </div>
  );
};

export default Chat;