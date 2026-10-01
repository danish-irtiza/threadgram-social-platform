import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice.js'
import profileReducer from '../features/profile/profileSlice.js'
import reelsReducer from '../features/reels/reelsSlice.js'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    reels: reelsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [],
        ignoredPaths: [],
      },
    }),
  devTools: import.meta.env.MODE !== 'production',
})

export default store

