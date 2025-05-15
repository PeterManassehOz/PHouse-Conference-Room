import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({ 
  baseUrl: 'http://localhost:5000/users',
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});



export const profileAuthApi = createApi({
    reducerPath: 'profileAuthApi',
    baseQuery,
    tagTypes: ['Profile'], // Add this line
    endpoints: (builder) => ({
        updateProfile: builder.mutation({
            query: (formData) => ({
              url: '/profile',
              method: 'PUT',
              body: formData,
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`, 
              },
            }),
            invalidatesTags: ['Profile'], // This ensures the query is refetched after mutation
          }),
  
    getUserProfile: builder.query({
      query: () => ({
        url: '/profile',
        method: 'GET',
      }),
      providesTags: ['Profile'],
      transformResponse: (response) => {
      let image = response?.image || null; // Default to null if image is not present

        if (image) {
          const timestamp = new Date().getTime();
          image = `http://localhost:5000/uploads/${response.image.split("/").pop()}?t=${timestamp}`;
        }

        // ✅ Return transformed response with image URL directly included
        return {
          ...response,
          image,
        };
      },
    }),
    }),
  });
  
  
  export const { useUpdateProfileMutation, useGetUserProfileQuery } = profileAuthApi;
  export default profileAuthApi;