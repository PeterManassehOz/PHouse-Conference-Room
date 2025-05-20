import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({ 
  baseUrl: 'http://localhost:5000/notifications',
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});


export const notificationApi = createApi({
    reducerPath: 'notificationApi',
    baseQuery,
    endpoints: (builder) => ({
        
    getNotifications: builder.query({
      query: () => '/?unread=true',
      providesTags: ['Notification'],
    }),
    // 2) mark one notification read
    markNotificationRead: builder.mutation({
      query: (id) => ({
        url: `/${id}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const { useGetNotificationsQuery, useMarkNotificationReadMutation } = notificationApi;