import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';


// read the env var
const API_BASE = import.meta.env.VITE_API_BASE;

// log it so you know what the running code is actually using
console.log('🛰️ API_BASE is:', API_BASE);

const baseQuery = fetchBaseQuery({ 
  baseUrl: `${API_BASE}/auth`,
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

    forgotPHCode: builder.mutation({
      query: (userData) => ({
        url: '/forgot-phcode',
        method: 'POST',
        body: userData,
      }),
    }),


    }),
});

export const { useRegisterUserMutation, useLoginUserMutation, useResetUserPasswordMutation, useForgotPasswordMutation, useResetPasswordWithTokenMutation, useResendEmailOtpMutation, useVerifyEmailOtpMutation, useForgotPHCodeMutation} = userAuthApi;
export default userAuthApi;