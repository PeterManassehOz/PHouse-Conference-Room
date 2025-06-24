import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';


// read the env var
const API_BASE = import.meta.env.VITE_API_BASE;

// log it so you know what the running code is actually using
console.log('🛰️ API_BASE is:', API_BASE);


const baseQuery = fetchBaseQuery({ 
  baseUrl: `${API_BASE}/notifications`,
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