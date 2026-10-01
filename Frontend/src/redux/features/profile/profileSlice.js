import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/api/axios.js'

const initialState = {
  key: null,
  profile: null,
  isLoading: false,
  isError: false,
  isSuccess: false,
  error: null,
  notFound: false,
  followersList: [],
  followingList: [],
  isListLoading: false,
  // Vibes (separate model from posts)
  vibes: [],
  vibesLoading: false,
  vibesError: null,
}

export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async ({ isMe, username }, { rejectWithValue }) => {
    try {
      const url = isMe ? '/users/me' : `/users/${encodeURIComponent(username)}`
      const { data } = await api.get(url)
      return { key: isMe ? 'me' : String(username).toLowerCase(), user: data?.data?.user }
    } catch (error) {
      const errData = error?.response?.data
      const status = error?.response?.status || 500
      const message = errData?.message || 'Failed to load profile.'
      if (status === 404) {
        return rejectWithValue({ message, status, notFound: true })
      }
      return rejectWithValue({ message, status, notFound: false })
    }
  }
)

export const toggleFollowUser = createAsyncThunk(
  'profile/toggleFollowUser',
  async ({ userId, isFollowing, isRequested }, { rejectWithValue }) => {
    try {
      let response
      if (isFollowing) {
        response = await api.delete(`/follow/${userId}/unfollow`)
      } else if (isRequested) {
        response = await api.delete(`/follow/${userId}/cancel`)
      } else {
        response = await api.post(`/follow/${userId}/follow`)
      }
      return { userId, isFollowing, isRequested, data: response.data }
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to update follow status.'
      return rejectWithValue(message)
    }
  }
)

export const fetchFollowers = createAsyncThunk(
  'profile/fetchFollowers',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/follow/${userId}/followers`)
      return data?.data?.followers || []
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch followers.')
    }
  }
)

export const fetchFollowing = createAsyncThunk(
  'profile/fetchFollowing',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/follow/${userId}/following`)
      return data?.data?.following || []
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch following.')
    }
  }
)

/**
 * Fetch vibes for a user's profile (Profile → Vibes tab).
 * GET /api/vibes/user/:userId
 */
export const fetchUserVibes = createAsyncThunk(
  'profile/fetchUserVibes',
  async (userId, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/vibes/user/${userId}`)
      return data?.data?.vibes || []
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to fetch vibes.')
    }
  }
)

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    resetProfile: (state) => {
      state.profile = null
      state.isLoading = false
      state.isError = false
      state.isSuccess = false
      state.error = null
      state.notFound = false
      state.followersList = []
      state.followingList = []
      state.isListLoading = false
      state.vibes = []
      state.vibesLoading = false
      state.vibesError = null
    },
    addPostToProfile: (state, action) => {
      const newPost = action.payload
      if (state.profile && (state.profile.isOwner || state.key === 'me')) {
        const existing = Array.isArray(state.profile.posts) ? state.profile.posts : []
        const exists = existing.some((p) => String(p._id) === String(newPost._id))
        if (!exists) {
          state.profile.posts = [newPost, ...existing]
          state.profile.postCount = (state.profile.postCount || 0) + 1
          if (newPost.mediaType === 'image') {
            state.profile.photosCount = (state.profile.photosCount || 0) + 1
          } else if (newPost.mediaType === 'video') {
            state.profile.videosCount = (state.profile.videosCount || 0) + 1
          }
        }
      }
    },
    removePostFromProfile: (state, action) => {
      const postId = action.payload
      if (state.profile && Array.isArray(state.profile.posts)) {
        const postToRemove = state.profile.posts.find((p) => String(p._id) === String(postId))
        if (postToRemove) {
          state.profile.posts = state.profile.posts.filter((p) => String(p._id) !== String(postId))
          state.profile.postCount = Math.max(0, (state.profile.postCount || 1) - 1)
          if (postToRemove.mediaType === 'image') {
            state.profile.photosCount = Math.max(0, (state.profile.photosCount || 1) - 1)
          } else if (postToRemove.mediaType === 'video') {
            state.profile.videosCount = Math.max(0, (state.profile.videosCount || 1) - 1)
          }
        }
      }
    },
    updatePostInProfile: (state, action) => {
      const updatedPost = action.payload
      if (state.profile && Array.isArray(state.profile.posts)) {
        const index = state.profile.posts.findIndex((p) => String(p._id) === String(updatedPost._id))
        if (index !== -1) {
          state.profile.posts[index] = { ...state.profile.posts[index], ...updatedPost }
        }
      }
    },
    // Optimistically prepend a newly created vibe without refetching
    addVibeToProfile: (state, action) => {
      const newVibe = action.payload
      if (state.profile && (state.profile.isOwner || state.key === 'me')) {
        const existing = Array.isArray(state.vibes) ? state.vibes : []
        const exists = existing.some((v) => String(v._id) === String(newVibe._id))
        if (!exists) {
          state.vibes = [newVibe, ...existing]
          state.profile.vibeCount = (state.profile.vibeCount || 0) + 1
        }
      }
    },
    // Remove a deleted vibe from the profile vibes list
    removeVibeFromProfile: (state, action) => {
      const vibeId = action.payload
      state.vibes = (state.vibes || []).filter((v) => String(v._id) !== String(vibeId))
      if (state.profile) {
        state.profile.vibeCount = Math.max(0, (state.profile.vibeCount || 1) - 1)
      }
    },
    // Update fields of a vibe in the profile vibes list (e.g. comment count, like/save state)
    updateVibeInProfile: (state, action) => {
      const updatedVibe = action.payload
      if (Array.isArray(state.vibes)) {
        const index = state.vibes.findIndex((v) => String(v._id) === String(updatedVibe._id))
        if (index !== -1) {
          state.vibes[index] = { ...state.vibes[index], ...updatedVibe }
        }
      }
    },
  },
  extraReducers: (builder) => {

    builder
      .addCase(fetchProfile.pending, (state, action) => {
        state.isLoading = true
        state.isError = false
        state.isSuccess = false
        state.error = null
        state.notFound = false
        state.key = action.meta.arg?.isMe ? 'me' : String(action.meta.arg?.username || '').toLowerCase()
        // Reset vibes when navigating to a different profile
        state.vibes = []
        state.vibesLoading = false
        state.vibesError = null
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false
        state.isSuccess = true
        state.profile = action.payload?.user || null
        state.key = action.payload?.key || state.key
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false
        state.isError = true
        state.profile = null
        state.error = action.payload || { message: 'Failed to load profile.' }
        state.notFound = !!action.payload?.notFound
      })
      .addCase(toggleFollowUser.fulfilled, (state, action) => {
        const { isFollowing, isRequested } = action.meta.arg
        if (state.profile) {
          if (isFollowing) {
            state.profile.isFollowing = false
            state.profile.isRequested = false
            state.profile.followerCount = Math.max(0, (state.profile.followerCount || 1) - 1)
          } else if (isRequested) {
            state.profile.isRequested = false
            state.profile.isFollowing = false
          } else {
            const newStatus = action.payload?.data?.data?.followStatus
            if (newStatus === 'accepted') {
              state.profile.isFollowing = true
              state.profile.isRequested = false
              state.profile.followerCount = (state.profile.followerCount || 0) + 1
            } else if (newStatus === 'pending') {
              state.profile.isRequested = true
              state.profile.isFollowing = false
            }
          }
        }
      })
      .addCase(fetchFollowers.pending, (state) => {
        state.isListLoading = true
        state.followersList = []
      })
      .addCase(fetchFollowers.fulfilled, (state, action) => {
        state.isListLoading = false
        state.followersList = action.payload
      })
      .addCase(fetchFollowers.rejected, (state) => {
        state.isListLoading = false
      })
      .addCase(fetchFollowing.pending, (state) => {
        state.isListLoading = true
        state.followingList = []
      })
      .addCase(fetchFollowing.fulfilled, (state, action) => {
        state.isListLoading = false
        state.followingList = action.payload
      })
      .addCase(fetchFollowing.rejected, (state) => {
        state.isListLoading = false
      })
      // Vibes for profile tab
      .addCase(fetchUserVibes.pending, (state) => {
        state.vibesLoading = true
        state.vibesError = null
      })
      .addCase(fetchUserVibes.fulfilled, (state, action) => {
        state.vibesLoading = false
        state.vibes = action.payload
      })
      .addCase(fetchUserVibes.rejected, (state, action) => {
        state.vibesLoading = false
        state.vibesError = action.payload || 'Failed to fetch vibes.'
      })
  },
})

export const {
  resetProfile,
  addPostToProfile,
  removePostFromProfile,
  updatePostInProfile,
  addVibeToProfile,
  removeVibeFromProfile,
  updateVibeInProfile,
} = profileSlice.actions
export default profileSlice.reducer

