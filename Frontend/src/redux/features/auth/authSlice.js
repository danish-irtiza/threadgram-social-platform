import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'axios'

const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000'
const baseApi = axios.create({
  baseURL: `${serverUrl}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

const getAccessToken = () => localStorage.getItem('accessToken')

const setAccessToken = (token) => {
  if (token) {
    localStorage.setItem('accessToken', token)
  } else {
    localStorage.removeItem('accessToken')
  }
}

const initialState = {
  user: null,
  accessToken: getAccessToken() || null,
  isAuthenticated: Boolean(getAccessToken()),
  isLoading: false,
  isError: false,
  isSuccess: false,
  error: null,
  message: null,
}

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await baseApi.post('/auth/register', userData)
      return response.data
    } catch (error) {
      const err = error?.response?.data
      return rejectWithValue({
        message: err?.message || 'Registration failed. Please try again.',
        errors: err?.errors || null,
        status: error?.response?.status || 500,
      })
    }
  }
)

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await baseApi.post('/auth/login', credentials)
      const { accessToken, user } = response.data.data
      setAccessToken(accessToken)
      return { accessToken, user }
    } catch (error) {
      const err = error?.response?.data
      return rejectWithValue({
        message: err?.message || 'Login failed. Please check your credentials.',
        status: error?.response?.status || 500,
      })
    }
  }
)

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async ({ token, user }, { rejectWithValue }) => {
    try {
      setAccessToken(token)
      return { accessToken: token, user }
    } catch (error) {
      return rejectWithValue({
        message: 'Google login failed.',
        status: 500,
      })
    }
  }
)

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = getState().auth.accessToken
      await baseApi.post(
        '/auth/logout',
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )
      setAccessToken(null)
      return true
    } catch (error) {
      setAccessToken(null)
      return rejectWithValue({
        message: 'Logout failed.',
        status: error?.response?.status || 500,
      })
    }
  }
)

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue, getState }) => {
    try {
      const response = await baseApi.post('/auth/refreshToken')
      const { accessToken, user } = response.data
      setAccessToken(accessToken)
      return { accessToken, user }
    } catch (error) {
      setAccessToken(null)
      return rejectWithValue({
        message: 'Session expired. Please login again.',
        status: error?.response?.status || 401,
      })
    }
  }
)

export const getCurrentUser = createAsyncThunk(
  'auth/refreshAuthSession',
  async (_, { rejectWithValue, getState }) => {
    try {
      const token = getState().auth.accessToken || getAccessToken()
      if (token) {
        try {
          const getCurrentUserResponse = await baseApi.get('/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const user = getCurrentUserResponse.data?.data?.user
          if (user) {
            setAccessToken(token)
            return { accessToken: token, user }
          }
        } catch (meErr) {
          // Token may be expired, attempt refreshToken endpoint next
        }
      }

      const response = await baseApi.post('/auth/refreshToken')
      const { accessToken, user } = response.data
      setAccessToken(accessToken)
      return { accessToken, user }
    } catch (error) {
      setAccessToken(null)
      return rejectWithValue({
        message: 'Failed to refresh auth session.',
        status: error?.response?.status || 401,
      })
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetAuthState: (state) => {
      state.isLoading = false
      state.isError = false
      state.isSuccess = false
      state.error = null
      state.message = null
    },
    clearAuth: (state) => {
      state.user = null
      state.accessToken = null
      state.isAuthenticated = false
      state.isLoading = false
      state.isError = false
      state.isSuccess = false
      state.error = null
      state.message = null
      localStorage.removeItem('accessToken')
    },
    setUser: (state, action) => {
      state.user = action.payload
      state.isAuthenticated = !!action.payload
    },
    setAccessTokenLocal: (state, action) => {
      state.accessToken = action.payload
      if (action.payload) {
        localStorage.setItem('accessToken', action.payload)
      } else {
        localStorage.removeItem('accessToken')
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.isError = false
        state.isSuccess = false
        state.error = null
        state.message = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.message = action.payload?.message || 'Registration successful!'
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.error = action.payload || { message: 'Registration failed' }
        state.message = action.payload?.message || 'Registration failed'
      })

      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.isError = false
        state.isSuccess = false
        state.error = null
        state.message = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.isAuthenticated = true
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.message = 'Login successful!'
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.isAuthenticated = false
        state.user = null
        state.accessToken = null
        state.error = action.payload || { message: 'Login failed' }
        state.message = action.payload?.message || 'Login failed'
      })

      .addCase(googleLogin.pending, (state) => {
        state.isLoading = true
        state.isError = false
        state.isSuccess = false
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.isAuthenticated = true
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.message = 'Google login successful!'
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.error = action.payload
      })

      .addCase(logout.pending, (state) => {
        state.isLoading = true
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false
        state.isSuccess = true
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
        state.message = 'Logged out successfully.'
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
        state.error = action.payload
      })

      .addCase(refreshToken.pending, (state) => {
        state.isLoading = true
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
        state.error = action.payload
      })

      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
      })
  },
})

export const { resetAuthState, clearAuth, setUser, setAccessTokenLocal } =
  authSlice.actions

export default authSlice.reducer
