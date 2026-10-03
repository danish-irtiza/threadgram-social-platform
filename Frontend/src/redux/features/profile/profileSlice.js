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

/**
 * Accept an incoming pending follow request (viewer received it from the profile owner).
 * Route: POST /api/follow/:requesterId/accept — viewer is the owner being followed.
 */
export const acceptFollowRequest = createAsyncThunk(
  'profile/acceptFollowRequest',
  async ({ requesterId }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/follow/${requesterId}/accept`)
      return { requesterId, data: response.data }
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to accept follow request.'
      return rejectWithValue(message)
    }
  }
)

/**
 * Reject / decline an incoming pending follow request.
 * Route: DELETE /api/follow/:requesterId/reject — viewer is the owner being followed.
 */
export const rejectFollowRequest = createAsyncThunk(
  'profile/rejectFollowRequest',
  async ({ requesterId }, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/follow/${requesterId}/reject`)
      return { requesterId, data: response.data }
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to reject follow request.'
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
        const { userId, isFollowing, isRequested } = action.meta.arg
        const responseData = action.payload?.data?.data || {}
        const newStatus = responseData.followStatus

        // Counts from backend (source of truth):
        // - viewerFollowingCount: viewer (authed user) new following count after action
        // - targetFollowerCount: the profile owner's new follower count after action
        const viewerFollowingCount = responseData.viewerFollowingCount
        const targetFollowerCount = responseData.targetFollowerCount

        // ── Compute next relationship flags ──────────────────────────────────
        let nextIsFollowing = false
        let nextIsRequested = false

        if (isFollowing) {
          // Unfollow: accepted → idle
          nextIsFollowing = false
          nextIsRequested = false
        } else if (isRequested) {
          // Cancel: pending → idle
          nextIsFollowing = false
          nextIsRequested = false
        } else if (newStatus === 'accepted') {
          // Follow accepted (public account or follow-back on public)
          nextIsFollowing = true
          nextIsRequested = false
        } else if (newStatus === 'pending') {
          // Follow request sent (private account)
          nextIsFollowing = false
          nextIsRequested = true
        }

        // ── Patch state.profile if it is the target ──────────────────────────
        if (state.profile && String(state.profile._id) === String(userId)) {
          if (isFollowing) {
            // Was following (accepted) → now unfollowing
            console.log(
              '[profileSlice] toggleFollowUser: UNFOLLOW accepted → idle' +
              ` targetFollowerCount=${targetFollowerCount}`
            )
            state.profile.isFollowing = false
            state.profile.isRequested = false
            state.profile.followerCount =
              typeof targetFollowerCount === 'number'
                ? targetFollowerCount
                : Math.max(0, (state.profile.followerCount || 1) - 1)
            // Re-lock content if profile is private
            if (state.profile.isPrivate) {
              state.profile.postsRestricted = true
              state.profile.posts = []
            }
          } else if (isRequested) {
            // Was pending → now cancelling request
            console.log('[profileSlice] toggleFollowUser: CANCEL pending → idle')
            state.profile.isRequested = false
            state.profile.isFollowing = false
            // pending never counted so followerCount stays
            if (state.profile.isPrivate) {
              state.profile.postsRestricted = true
              state.profile.posts = []
            }
          } else {
            // Was idle → now following or requesting
            if (newStatus === 'accepted') {
              console.log(
                '[profileSlice] toggleFollowUser: FOLLOW → accepted (public/followback public)' +
                ` targetFollowerCount=${targetFollowerCount}`
              )
              state.profile.isFollowing = true
              state.profile.isRequested = false
              state.profile.followerCount =
                typeof targetFollowerCount === 'number'
                  ? targetFollowerCount
                  : (state.profile.followerCount || 0) + 1
              // Accepted follow: content is now accessible
              state.profile.postsRestricted = false
            } else if (newStatus === 'pending') {
              console.log('[profileSlice] toggleFollowUser: FOLLOW → pending (private/followback private)')
              state.profile.isRequested = true
              state.profile.isFollowing = false
              // pending request: content stays locked
              state.profile.postsRestricted = !!state.profile.isPrivate
            }
          }
          // Stash counts for auth.user update via component dispatch
          state._viewerFollowingCount = viewerFollowingCount
        }

        // ── Patch matching entries in followersList / followingList ───────────
        const patchListUser = (u) => {
          if (!u || String(u._id) !== String(userId)) return u
          return {
            ...u,
            isFollowing: nextIsFollowing,
            isRequested: nextIsRequested,
            // isFollower stays as-is (their follow direction to viewer hasn't changed)
          }
        }
        state.followersList = (state.followersList || []).map(patchListUser)
        state.followingList = (state.followingList || []).map(patchListUser)
      })
      .addCase(acceptFollowRequest.fulfilled, (state, action) => {
        const requesterId = action.meta.arg.requesterId
        const responseData = action.payload?.data?.data || {}
        const requesterFollowingCount = responseData.requesterFollowingCount
        const ownerFollowerCount = responseData.ownerFollowerCount

        console.log(
          `[profileSlice] acceptFollowRequest: ACCEPTED requester=${requesterId}` +
          ` ownerFollowerCount=${ownerFollowerCount} requesterFollowingCount=${requesterFollowingCount}`
        )

        if (state.profile && String(state.profile._id) === String(requesterId)) {
          // Profile = the requester (the person whose request we just accepted)
          // Now the requester follows viewer (accepted):
          //   - profile.isFollower = true (profile owner is an accepted follower of viewer)
          //   - profile.isReceivedPendingRequest = false
          //   - profile.followingCount = requesterFollowingCount (requester's following gained 1)
          //   - Viewer's followerCount (me) gained 1 → will patch via component dispatch
          state.profile.isFollower = true
          state.profile.isReceivedPendingRequest = false
          if (typeof requesterFollowingCount === 'number') {
            state.profile.followingCount = requesterFollowingCount
          }
        }
        // Stash viewer's own followerCount so component can patch auth.user
        state._viewerFollowerCount = ownerFollowerCount

        // Patch list entries: the requester now has accepted follow to viewer
        const patchAccepted = (u) => {
          if (!u || String(u._id) !== String(requesterId)) return u
          return { ...u, isFollower: true, isReceivedPendingRequest: false }
        }
        state.followersList = (state.followersList || []).map(patchAccepted)
        state.followingList = (state.followingList || []).map(patchAccepted)
      })
      .addCase(rejectFollowRequest.fulfilled, (state, action) => {
        const requesterId = action.meta.arg.requesterId
        console.log(`[profileSlice] rejectFollowRequest: REJECTED requester=${requesterId}`)

        if (state.profile && String(state.profile._id) === String(requesterId)) {
          state.profile.isReceivedPendingRequest = false
          state.profile.isFollower = false
        }

        // Remove the requester from followersList (request rejected → no longer a follower)
        state.followersList = (state.followersList || []).filter(
          (u) => !u || String(u._id) !== String(requesterId)
        )
        // Patch followingList too in case they appear there
        const patchRejected = (u) => {
          if (!u || String(u._id) !== String(requesterId)) return u
          return { ...u, isFollower: false, isReceivedPendingRequest: false }
        }
        state.followingList = (state.followingList || []).map(patchRejected)
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

