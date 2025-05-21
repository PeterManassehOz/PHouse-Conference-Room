import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({ 
  baseUrl: 'http://localhost:5000/meetings',
  credentials: 'include',
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
      query: () => '/meetings',
    }),
    scheduleMeeting: builder.mutation({
      query: newM => ({
        url: '/meetings',
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
            m.user.image = `http://localhost:5000/uploads/${m.user.image.split("/").pop()}`
          }
          return m;
        });
      },
    }),
    postChat: builder.mutation({
      query: ({ meetingId, text }) => ({
        url: `/${meetingId}/chat`,
        method: 'POST',
        body: { text }
      }),
      invalidatesTags: (res, err, { meetingId }) => [
        { type: 'Chat', id: meetingId }
      ]
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
  }),
});

export const { useGetInvitesQuery, useRespondInviteMutation, useGetUpcomingQuery, useGetMyMeetingsQuery, useScheduleMeetingMutation, useDeleteMeetingMutation, useStartMeetingMutation, useJoinMeetingMutation, useGetChatQuery, usePostChatMutation, useEditChatMutation, useDeleteChatMutation} = meetingApi;
