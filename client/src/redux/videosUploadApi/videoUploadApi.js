import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:5000/recordings',
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const videoUploadApi = createApi({
  reducerPath: 'videoUploadApi',
  baseQuery,
 endpoints: build => ({
    uploadVideo: build.mutation({
      query: (formData) => ({
        url: '/videos',
        method: 'POST',
        body: formData,
      }),
    }),
     getRecordedVideos: build.query({
      query: () => '/videos',
    }),
  }),
});

export const { useUploadVideoMutation, useGetRecordedVideosQuery } = videoUploadApi;