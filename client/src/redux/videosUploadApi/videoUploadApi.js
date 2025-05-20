// src/redux/videosUploadApi/videoUploadApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:5000/recordings',   
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

export const videoUploadApi = createApi({
  reducerPath: 'videoUploadApi',
  baseQuery,
  endpoints: (build) => ({
    uploadVideo: build.mutation({
      query: (formData) => ({
        url: '/videos',
        method: 'POST',
        body: formData,
      }),
    }),
    getRecordedVideos: build.query({
      query: () => '/videos',    // now returns *only* this user’s recordings
    }),
    streamVideo: build.query({
      // we’ll fetch the raw blob here so we can inject the token
      queryFn: async (id, _queryApi, _extraOptions, fetchWithBQ) => {
        const response = await fetchWithBQ({ url: `/videos/${id}/stream`, responseHandler: (res) => res.blob() });
        if (response.error) return { error: response.error };
        const url = URL.createObjectURL(response.data);
        return { data: url };
      }
    }),
  }),
});

export const {
  useUploadVideoMutation,
  useGetRecordedVideosQuery,
  useStreamVideoQuery,
} = videoUploadApi;
