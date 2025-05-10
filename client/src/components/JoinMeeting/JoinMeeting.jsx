// src/components/JoinMeeting/JoinMeeting.jsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';

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
    <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-center mb-6">Join a Meeting</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Paste meeting link or ID"
            {...register('meetingInput')}
            className={`
              w-full
              p-3
              border
              ${errors.meetingInput ? 'border-red-500' : 'border-gray-300'}
              rounded-md
              focus:outline-none
              focus:ring-2 focus:ring-offset-2 focus:ring-blue-200
            `}
          />
          {errors.meetingInput && (
            <p className="text-red-500 text-sm mt-1">
              {errors.meetingInput.message}
            </p>
          )}
        </div>

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
