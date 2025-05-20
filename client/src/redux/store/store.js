import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import themeReducer from '../themeSlice/themeSlice';
import { videoUploadApi } from '../videosUploadApi/videoUploadApi';
import userAuthApi from '../userAuthApi/userAuthApi';
import profileAuthApi from '../profileAuthApi/profileAuthApi';
import { meetingApi } from '../meetingApi/meetingApi';
import { notificationApi } from '../notificationApi/notificationApi';




export const store = configureStore({
    reducer: {
        theme: themeReducer,
        [videoUploadApi.reducerPath]: videoUploadApi.reducer,    
        [userAuthApi.reducerPath]: userAuthApi.reducer,
        [profileAuthApi.reducerPath]: profileAuthApi.reducer,
        [meetingApi.reducerPath]: meetingApi.reducer,
        [notificationApi.reducerPath]: notificationApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            videoUploadApi.middleware,
            userAuthApi.middleware, profileAuthApi.middleware, meetingApi.middleware, notificationApi.middleware
        ),
});

setupListeners(store.dispatch);