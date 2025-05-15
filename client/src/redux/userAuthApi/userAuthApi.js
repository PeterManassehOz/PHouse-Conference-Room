import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({ 
  baseUrl: 'http://localhost:5000/auth',
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});


export const userAuthApi = createApi({
    reducerPath: 'userAuthApi',
    baseQuery,
    endpoints: (builder) => ({

      registerUser: builder.mutation({
        query: (userData) => ({
          url: '/signup',
          method: 'POST',
          body: userData,
        }),
      }),

      loginUser: builder.mutation({
        query: (userData) => ({
          url: '/login',
          method: 'POST',
          body: userData,
        }),
      }),

       resetUserPassword: builder.mutation({
            query: (userData) => ({
            url: '/reset-password',
            method: 'POST',
            body: userData,
            }),
       }),

        forgotPassword: builder.mutation({
            query: (userData) => ({
            url: '/forgot-password',
            method: 'POST',
            body: userData,
            }),
        }),

        resetPasswordWithToken: builder.mutation({
            query: ({ token, ...userData }) => ({
            url: `/reset-password/${token}`, // Insert token into URL
            method: 'POST',
            body: userData,
            }),
        }),


    verifyEmailOtp: builder.mutation({
      query: (otpData) => ({
        url: '/verify-email-otp',
        method: 'POST',
        body: otpData,
      }),
    }),


            
    resendEmailOtp: builder.mutation({
      query: (userData) => ({
        url: '/resend-email-otp',
        method: 'POST',
        body: userData,
      }),
    }),

    }),
});

export const { useRegisterUserMutation, useLoginUserMutation, useResetUserPasswordMutation, useForgotPasswordMutation, useResetPasswordWithTokenMutation, useResendEmailOtpMutation, useVerifyEmailOtpMutation,} = userAuthApi;
export default userAuthApi;