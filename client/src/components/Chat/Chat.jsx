import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import socket from '../../utils/socket/socket';
import { useGetChatQuery, useEditChatMutation, useDeleteChatMutation, usePostChatFileMutation } from '../../redux/meetingApi/meetingApi';
import { useGetUserProfileQuery } from '../../redux/profileAuthApi/profileAuthApi';
import Spinner from '../Spinner/Spinner';
import { IoIosSend } from 'react-icons/io';
import { MdAddReaction } from 'react-icons/md';
import { ImAttachment } from 'react-icons/im';
import EmojiPickerPortal from '../EmojiPickerPortal/EmojiPickerPortal';
import { FaRegFilePdf } from "react-icons/fa6";
import { BsFiletypeDocx } from "react-icons/bs";
import { FaFilePowerpoint } from "react-icons/fa";



// Helper to resolve avatar URLs
const resolveImage = (imgPath) => {
  if (!imgPath) return '/profileIconBrown.jpeg';
  if (imgPath.startsWith('http')) return imgPath;
  const filename = imgPath.split('/').pop();
  return `https://192.168.208.113:5000/uploads/${filename}`;
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
  const { data: userProfile, isLoading: isProfileLoading } = useGetUserProfileQuery();
  const [editChat] = useEditChatMutation();
  const [deleteChat] = useDeleteChatMutation();
  const [postChatFile] = usePostChatFileMutation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const darkMode = useSelector((state) => state.theme.darkMode);
  const bottomRef = useRef(null);
  const fileInputRef = useRef();
  const menuRef = useRef(null);

  
  
  
  
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [actionVisibleFor, setActionVisibleFor] = useState(null);
  const holdTimers = useRef({});

  
  const [showPickerFor, setShowPickerFor] = useState(null);

  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const handleShowPicker = (e, msgId, isMe) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const isMobile = windowWidth < 500;
    const pickerWidth = isMobile ? windowWidth * 0.9 : 320;
    const padding = 8;
    const mobileOffset = isMobile && isMe ? 30 : 0; 

    let left = rect.left + window.scrollX;

    if (isMe) {
      left = rect.right + window.scrollX - pickerWidth + 5;

      if (left + pickerWidth > windowWidth - padding) {
        left = windowWidth - pickerWidth - padding;
      }
      if (left < padding + mobileOffset) {
        left = padding + mobileOffset;
      }
    } else {
      if (left + pickerWidth > windowWidth - padding) {
        left = windowWidth - pickerWidth - padding;
      }
      if (left < padding) {
        left = padding;
      }
    }

    let top = rect.top + window.scrollY + 30; // tighter to bubble

    if (windowHeight - rect.bottom < 350) {
      // not enough space below, try above
      top = rect.top + window.scrollY - 350;
      if (top < 0) top = padding;
    }

    setPickerPosition({ top, left });
    setShowPickerFor(msgId);
  };


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


  useEffect(() => {

  // Handle new messages
  const handleReceiveMessage = (msg) => {
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
  };

  socket.on('receive-message', handleReceiveMessage);

  // Handle message reactions
  const handleMessageReaction = (updatedMsg) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg._id === updatedMsg._id
          ? {
              ...msg,
              reactions: updatedMsg.reactions.map((r) => ({
                ...r,
                user: {
                  ...r.user,
                  image: r.user.image
                    ? `https://192.168.208.113:5000/uploads/${r.user.image.split('/').pop()}`
                    : null,
                },
              })),
            }
          : msg
      )
    );
  };

  socket.on('message-reaction', handleMessageReaction);

  return () => {
    socket.off('receive-message', handleReceiveMessage);
    socket.off('message-reaction', handleMessageReaction);
  };
  }, [meetingId, me._id, setMessages, me.username]);


  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  useEffect(() => {
  if (!actionVisibleFor) return;

  const hideTimer = setTimeout(() => setActionVisibleFor(null), 10000);

  const handleDocPointer = (e) => {
    if (menuRef.current?.contains(e.target)) return;
    setActionVisibleFor(null);
  };

  // add right away—no need for a delay
  document.addEventListener('pointerdown', handleDocPointer);

  return () => {
    clearTimeout(hideTimer);
    document.removeEventListener('pointerdown', handleDocPointer);
  };
}, [actionVisibleFor]);



  const onEmojiClick = (msgId, emoji) => {
  setMessages(prev =>
    prev.map(m => {
      if (m._id !== msgId) return m;

      // Check if this user already reacted
      const existing = m.reactions.find(r => r.user._id === me._id);

      let newReactions;
      if (existing) {
        // Replace the old reaction
        newReactions = m.reactions.map(r =>
          r.user._id === me._id ? { ...r, emoji } : r
        );
      } else {
        // Add new reaction
        newReactions = [
          ...m.reactions,
          { user: { _id: me._id, username: me.username }, emoji }
        ];
      }

      return { ...m, reactions: newReactions };
    })
  );

  socket.emit('react-to-message', {
    messageId: msgId,
    userId: me._id,
    emoji,
  });
}; 


  const handleRemoveReaction = (msgId) => {
  // 1) Update local UI state
  setMessages(prev =>
    prev.map(m =>
      m._id !== msgId
        ? m
        : {
            ...m,
            reactions: m.reactions.filter(r => r.user._id !== me._id)
          }
    )
  );

  // 2) Tell server to remove
  socket.emit('remove-reaction', {
    messageId: msgId,
    userId: me._id
  });
  };



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

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // optimistic UI
    const tempId = uuidv4();
    const blobUrl = URL.createObjectURL(file);

    setMessages(prev => [
    ...prev,
    {
      _id:     tempId,
      tempId,
      fileName: file.name,
      fileUrl:  blobUrl,
      fileType: file.type,       // ← add this
      user:      me,
      createdAt: new Date().toISOString(),
    }
  ]);

    try {
      const saved = await postChatFile({ meetingId, file }).unwrap();

      // emit via socket (so server will broadcast the real message)
      socket.emit('send-file', {
        meetingId,
        tempId,
        filename: saved.fileUrl.split('/').pop()
      });
    } catch (err) {
      console.error('Upload failed', err);
      // you might want to roll back optimistic UI here
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
          const sentAt = new Date(msg.createdAt).getTime();
          const now    = Date.now();
          // allow edits only within 20 minutes (20 * 60 * 1000 ms)
          const editable = isMe && (now - sentAt) < 20 * 60 * 1000;
           const isImage =
            msg.fileType?.startsWith('image/') ||
            msg.fileUrl?.match(/\.(jpe?g|png|gif)$/i);

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
            ? 'rounded-b-lg rounded-tl-lg'
            : 'rounded-tr-lg rounded-b-lg';

          const name = msg.user?.username || msg.username || 'Unknown';
          const avatarUrl = resolveImage(msg.user?.image || msg.image);

          return (
          <div
            key={msg._id || msg.tempId}
            className={`flex ${justify} mb-4`}
            onMouseDown={() => handleLongPressStart(msg._id)}
            onMouseUp={() => handleLongPressEnd(msg._id)}
            onTouchStart={() => handleLongPressStart(msg._id)}
            onTouchEnd={() => handleLongPressEnd(msg._id)}
          >
            <div className={`relative flex ${rowDir} items-start gap-3 max-w-[70%]`}>
              <img
                src={avatarUrl}
                alt={name}
                className="h-10 w-10 rounded-full object-cover"
              />

              <div className="flex flex-col">
                <div
                  className={`flex items-center gap-2 flex-none ${
                    isMe ? 'self-end' : 'self-start'
                  }`}
                >
                  {!isMe && <span className="font-semibold text-sm">{name}</span>}
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(msg.createdAt)}
                  </span>
                  {isMe && <span className="font-semibold text-sm">{name}</span>}
                </div>

                <div
                  className={`mt-1 px-4 py-2 ${bubbleColor} ${bubbleShape} text-sm break-words relative`}
                >
                 {msg.fileUrl ? (
                    isImage ? (
                      // IMAGE
                      // 1) figure out a proper URL, whether blob or server file
                      (() => {
                        const displayUrl = msg.fileUrl.startsWith('blob:')
                          ? msg.fileUrl                               // blob URL
                          : `https://192.168.208.113:5000${msg.fileUrl}`;    // server URL

                        return (
                          <a
                            href={displayUrl}
                            download={msg.fileName}
                            className="block max-h-60 overflow-hidden rounded"
                            title="Click to download"
                          >
                            <img
                              src={displayUrl}
                              alt={msg.fileName}
                              className="max-h-60 w-auto"
                            />
                          </a>
                        );
                      })()
                    ) : (
                      // GENERIC FILE
                    <a
                      href={`https://192.168.208.113:5000${msg.fileUrl}`}
                      download={msg.fileName}
                      className="
                        flex items-center space-x-3
                        bg-gray-100 dark:bg-gray-700
                        px-4 py-2 rounded-lg
                        hover:bg-gray-200 dark:hover:bg-gray-600
                        transition
                        max-w-xs
                      "
                    >
                      {/* choose icon by extension */}
                      {msg.fileName.endsWith('.pdf') ? (
                        <FaRegFilePdf size={24} className="text-red-600 dark:text-red-400" />
                      ) : msg.fileName.match(/\.(docx?|rtf)$/i) ? (
                        <BsFiletypeDocx size={24} className="text-blue-600 dark:text-blue-400" />
                      ) : msg.fileName.endsWith('.epub') ? (
                        <FaFilePowerpoint size={24} className="text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <FaFilePowerpoint size={24} className="text-gray-600 dark:text-gray-400" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p
                          className="
                            text-sm font-medium
                            truncate
                            text-gray-900 dark:text-gray-100
                          "
                          title={msg.fileName}
                        >
                          {msg.fileName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round((msg.fileSize || 0) / 1024)} KB
                        </p>
                      </div>
                    </a>
                      )
                    ) : (
                    // ③ TEXT CASE
                    <>
                      {editingMessageId === msg._id ? (
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-transparent outline-none h-40 resize-none"
                        />
                      ) : (
                        msg.text
                      )}
                    </>
                  )}
            
                <button
                  className={`absolute ${
                    isMe ? 'left-0' : 'right-0'
                  } -bottom-4 text-lg cursor-pointer ${
                    darkMode ? 'text-white' : 'text-black'
                  }`}
                  onClick={(e) => handleShowPicker(e, msg._id, isMe)}
                >
                  <MdAddReaction size={15} />
                </button>

                {showPickerFor === msg._id && (
                  <div
                    className={`absolute ${
                      isMe ? 'left-0' : 'right-0'
                    } bottom-8 z-50`}
                  >
                    <EmojiPickerPortal
                      onEmojiClick={({ emoji }) => {
                        onEmojiClick(msg._id, emoji);
                        setShowPickerFor(null);
                        socket.emit('react-to-message', {
                          messageId: msg._id,
                          userId: me._id,
                          emoji,
                        });
                      }}
                      onClose={() => setShowPickerFor(null)}
                      position={pickerPosition}
                    />
                  </div>
                )}

                {isMe &&
                  actionVisibleFor === msg._id &&
                  editingMessageId !== msg._id && (
                    <div 
                      ref={menuRef}
                      className="absolute -bottom-10 right-0 flex gap-2 p-1 rounded z-30"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      {editable && (
                        <button
                          onClick={() => handleEditClick(msg._id, msg.text)}
                          className="text-xs font-medium bg-yellow-700 text-white px-3 py-1 rounded hover:bg-yellow-600 transition cursor-pointer"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(msg._id)}
                        className="text-xs font-medium bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500 transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  )}
              </div>

                {/*{msg.reactions?.length > 0 && (() => {
                  const reactions = msg.reactions;
                  const lastTwo = reactions.slice(-2);
                  const count = reactions.length;

                  return (
                    <div
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-sm ${
                        isMe ? 'self-end justify-end' : 'self-start'
                      }`}
                    >
                      {lastTwo.map((reaction, index) => (
                        <span key={index}>{reaction.emoji}</span>
                      ))}
                      <span className="text-xs text-blue-600 font-semibold">
                        {count}
                      </span>
                    </div>
                  );
                })()}*/}

                {msg.reactions?.length > 0 && (() => {
                  // Map to store the latest reaction per user
                  const latestReactionsByUser = new Map();

                  // Iterate in reverse to keep the last reaction per user
                  for (let i = msg.reactions.length - 1; i >= 0; i--) {
                    const reaction = msg.reactions[i];
                    const userId = reaction.user._id;
                    if (!latestReactionsByUser.has(userId)) {
                      latestReactionsByUser.set(userId, reaction);
                    }
                  }

                  // Convert the map values to an array (latest unique reactions)
                  const uniqueReactions = Array.from(latestReactionsByUser.values());

                  const count = uniqueReactions.length;

                  return (
                    <div
                      onClick={() => handleRemoveReaction(msg._id)}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-sm cursor-pointer ${
                        isMe ? 'self-end justify-end' : 'self-start'
                      }`}
                    >
                      {uniqueReactions.map((reaction, index) => (
                        <span key={index}>{reaction.emoji}</span>
                      ))}
                      <span className="text-xs text-blue-600 font-semibold">
                        {count}
                      </span>
                    </div>
                  );
                })()}


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

      
      <div className="relative flex items-center gap-2 w-full">
        <div className="relative flex-1 max-w-[100%]">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className={`w-full pr-10 p-2 rounded-lg text-sm focus:outline-none transition-colors ${
              darkMode
                ? 'bg-gray-700 text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500'
                : 'bg-gray-100 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-300'
            }`}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          />

          {/* Attachment icon */}
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-[#03055B] hover:text-white rounded-full transition"
            title="Attach file"
          >
            <ImAttachment size={18} className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        <input
          type="file"
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          className={`p-2 rounded-full transition cursor-pointer ${
            darkMode
              ? 'bg-[#00013d] hover:bg-[#03055B]'
              : 'bg-[#00013d] hover:bg-[#03055B]'
          } text-white`}
          title="Send message"
        >
          <IoIosSend size={16} />
        </button>
      </div>
    </div>
  );
};
export default Chat;