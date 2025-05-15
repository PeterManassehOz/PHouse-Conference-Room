import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import themeReducer from '../themeSlice/themeSlice';
import { videoUploadApi } from '../videosUploadApi/videoUploadApi';
import userAuthApi from '../userAuthApi/userAuthApi';
import profileAuthApi from '../profileAuthApi/profileAuthApi';




export const store = configureStore({
    reducer: {
        theme: themeReducer,
        [videoUploadApi.reducerPath]: videoUploadApi.reducer,    
        [userAuthApi.reducerPath]: userAuthApi.reducer,
        [profileAuthApi.reducerPath]: profileAuthApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(
            videoUploadApi.middleware,
            userAuthApi.middleware, profileAuthApi.middleware,
        ),
});

setupListeners(store.dispatch);