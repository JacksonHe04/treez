import { configureStore } from '@reduxjs/toolkit';
import albumReducer from './slices/albumSlice';

export const store = configureStore({
  reducer: {
    album: albumReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
