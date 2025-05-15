// src/components/JoinMeeting/JoinMeeting.jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// 1) Yup schema
const schema = yup
  .object({
    meetingInput: yup.string().required('Meeting link or ID is required').test(
        'is-valid', 'Must be a valid URL (/room/ID) or a room ID', value => {
          if (!value) return false;
          try {
            const url = new URL(value);
            return (
              url.pathname.startsWith('/room/') &&
              Boolean(url.pathname.split('/').pop())
            );
          } catch {
            return /^[\w-]+$/.test(value.trim());
          }
        }
      )
  }).required();

const JoinMeeting = () => {
  const navigate = useNavigate();
   const darkMode       = useSelector(s => s.theme.darkMode);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(schema)
  });

  // 2) On valid submit, extract roomId & navigate
  const onSubmit = ({ meetingInput }) => {
    let roomId = meetingInput.trim();
    try {
      const url = new URL(meetingInput);
      roomId = url.pathname.split('/').pop();
    } catch {
      // use the raw ID
    }
    navigate(`/room/${roomId}`);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? "bg-gray-900 text-white" : "bg-blue-100 text-black"}`}>
      <form onSubmit={handleSubmit(onSubmit)}  className={`w-full max-w-md p-8 shadow-md rounded-lg ${darkMode ? "bg-gray-800 text-white" : "bg-white text-black"}`}>
         <h2 className={`text-2xl font-semibold text-center mb-6 ${darkMode ? "text-white" : "text-black" }`}>Join a Meeting</h2>
          <input
            type="text"
            placeholder="Paste meeting link or ID"
            {...register('meetingInput')}
            className={`w-full p-3 mb-3 rounded-md border-none focus:ring-2 focus:ring-blue-200 focus:outline-none ${darkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-600"}`}
          />
          {errors.meetingInput && (
            <p className="text-red-500 text-sm mt-1">
              {errors.meetingInput.message}
            </p>
          )}
        

        <button
          type="submit"
          disabled={isSubmitting}
          className={`
            w-full
            py-3
            rounded-md
            text-white
            bg-[#00013d]
            hover:bg-[#03055B]
            transition-colors
            ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isSubmitting ? 'Joining...' : 'Join Meeting'}
        </button>
      </form>
    </div>
  );
};

export default JoinMeeting;
