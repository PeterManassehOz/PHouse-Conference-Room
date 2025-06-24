import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// read the env var
const API_BASE = import.meta.env.VITE_API_BASE;

// log it so you know what the running code is actually using
console.log('🛰️ API_BASE is:', API_BASE);

const baseQuery = fetchBaseQuery({ 
  baseUrl: `${API_BASE}/meetings`,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});


export const meetingApi = createApi({
    reducerPath: 'meetingApi',
    baseQuery,
    endpoints: (builder) => ({
    getInvites: builder.query({
      query: () => '/invites',
      providesTags: ['Meeting'],
    }),
    respondInvite: builder.mutation({
      query: ({ meetingId, status }) => ({
        url: '/respond',
        method: 'PUT',
        body: { meetingId, status },
      }),
      invalidatesTags: ['Meeting'],
    }),
    getUpcoming: builder.query({
      query: () => '/upcoming',
      providesTags: ['Meeting'],
    }),
    getMyMeetings: builder.query({
      query: () => '/my-meetings',
    }),
    scheduleMeeting: builder.mutation({
      query: newM => ({
        url: '/schedule',
        method: 'POST',
        body: newM,
      }),
      invalidatesTags: ['Meeting'],
    }),
    deleteMeeting: builder.mutation({
      query: (meetingId) => ({
        url: `/${meetingId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Meeting']
    }),
    startMeeting: builder.mutation({
      query: (payload) => ({
        url:    '/start',
        method: 'POST',
        body:   payload,    // e.g. { title, description }
      }),
      invalidatesTags: ['Meeting'],
    }),
    joinMeeting: builder.mutation({
      query: (meetingId) => ({
        url:    `/${meetingId}/join`,
        method: 'POST'
      }),
      invalidatesTags: ['Meeting']
    }),
    getChat: builder.query({
      // GET /meetings/:id/chat
      query: meetingId => `/${meetingId}/chat`,
      providesTags: ['Chat'],
      transformResponse: (msgs) => {
        return msgs.map(m => {
          if (m.user.image) {
            m.user.image = `${API_BASE}/uploads/${m.user.image.split("/").pop()}`
          }
          return m;
        });
      },
    }),
    editChat: builder.mutation({
    query: ({ messageId, text }) => ({
      url: `/chat/${messageId}`,
      method: 'PUT',
          body: { text }
        }),
        invalidatesTags: ['Chat'],
    }),
    deleteChat: builder.mutation({
        query: (messageId) => ({
          url: `/chat/${messageId}`,
          method: 'DELETE'
      }),
      invalidatesTags: ['Chat'],
    }),
    postChatFile: builder.mutation({
      // POST /:id/chat/file
      query: ({ meetingId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/${meetingId}/chat/file`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Chat'],
    }),
    getMeetingById: builder.query({
    query: (id) => `/${id}`,
    transformResponse: (response) => {
    const timestamp = Date.now();

    // rewrite top‐level meeting.image if you need it
    const image = response.image
      ? `${API_BASE}/uploads/${response.image.split('/').pop()}?t=${timestamp}`
      : null;

    // 🔄 rewrite every participant.user.image
    const participants = response.participants.map(p => {
      const img = p.user.image
        ? `${API_BASE}/uploads/${p.user.image.split('/').pop()}?t=${timestamp}`
        : null;
      return {
        ...p,
        user: {
          ...p.user,
          image: img
        }
      };
    });

    return {
      ...response,
      image,
      participants
    };
  },
  providesTags: ['Meeting'],
    }),
    leaveMeeting: builder.mutation({
      query: (meetingId) => ({
        url:    `/${meetingId}/leave`,
        method: 'POST'
      }),
      invalidatesTags: ['Meeting']
    }),  
  }),
});

export const { useGetInvitesQuery, useRespondInviteMutation, useGetUpcomingQuery, useGetMyMeetingsQuery, useScheduleMeetingMutation, useDeleteMeetingMutation, useStartMeetingMutation, useJoinMeetingMutation, useGetChatQuery, useEditChatMutation, useDeleteChatMutation,   usePostChatFileMutation, useGetMeetingByIdQuery, useLeaveMeetingMutation} = meetingApi;
