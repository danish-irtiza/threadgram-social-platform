import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '@/api/axios.js'

const initialState = {
  reels: [],
  loading: false,
  error: null,
  page: 1,
  limit: 8,
  hasMore: true,
  total: 0,
}

/**
 * Fetch initial reels feed (resets state).
 */
export const fetchReels = createAsyncThunk(
  'reels/fetchReels',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { reels: state } = getState()
      const limit = state?.limit || 8
      const { data } = await api.get('/vibes/reels', { params: { page: 1, limit } })
      return {
        reels: data?.data?.reels || [],
        pagination: data?.data?.pagination || { page: 1, limit, hasMore: false, total: 0 },
      }
    } catch (error) {
      console.error('[fetchReels error]:', error?.response?.data || error?.message || error)
      const rawMessage = error?.response?.data?.message
      if (!rawMessage || /token|jwt|auth|unauthorized/i.test(rawMessage) || error?.response?.status === 401) {
        return rejectWithValue('Unable to load this Reel. Please try again.')
      }
      return rejectWithValue(rawMessage || 'Unable to load this Reel. Please try again.')
    }
  }
)

/**
 * Fetch next page of reels (appends).
 */
export const fetchMoreReels = createAsyncThunk(
  'reels/fetchMoreReels',
  async (_, { rejectWithValue, getState }) => {
    try {
      const { reels: state } = getState()
      if (!state.hasMore) return { reels: [], pagination: { ...state, hasMore: false } }
      const nextPage = (state.page || 0) + 1
      const limit = state.limit || 8
      const { data } = await api.get('/vibes/reels', { params: { page: nextPage, limit } })
      return {
        reels: data?.data?.reels || [],
        pagination: data?.data?.pagination || { page: nextPage, limit, hasMore: false, total: state.total },
      }
    } catch (error) {
      console.error('[fetchMoreReels error]:', error?.response?.data || error?.message || error)
      const rawMessage = error?.response?.data?.message
      if (!rawMessage || /token|jwt|auth|unauthorized/i.test(rawMessage) || error?.response?.status === 401) {
        return rejectWithValue('Unable to load this Reel. Please try again.')
      }
      return rejectWithValue(rawMessage || 'Unable to load this Reel. Please try again.')
    }
  }
)

/**
 * Record a view for a specific reel (one count per user).
 */
export const recordReelView = createAsyncThunk(
  'reels/recordReelView',
  async (reelId, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/vibes/${reelId}/view`)
      return { reelId, viewsCount: data?.data?.viewsCount }
    } catch (error) {
      return rejectWithValue(null)
    }
  }
)

/**
 * Toggle like on a reel.
 */
export const toggleReelLike = createAsyncThunk(
  'reels/toggleReelLike',
  async (reelId, { rejectWithValue, getState, dispatch }) => {
    const { reels: state } = getState()
    const reel = state.reels.find((r) => String(r._id) === String(reelId))
    const prevLiked = !!reel?.isLiked
    const prevCount = reel?.likesCount || 0
    const optimistic = {
      reelId,
      isLiked: !prevLiked,
      likesCount: prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1,
    }
    // Optimistic update — instant UI feedback
    dispatch(updateReel(optimistic))
    try {
      const { data } = await api.post(`/vibes/${reelId}/like`)
      return {
        reelId,
        isLiked: data?.isLiked ?? optimistic.isLiked,
        likesCount: data?.likesCount ?? optimistic.likesCount,
      }
    } catch (error) {
      // Revert on failure
      dispatch(updateReel({ reelId, isLiked: prevLiked, likesCount: prevCount }))
      return rejectWithValue(error?.response?.data?.message || 'Failed to update like.')
    }
  }
)

/**
 * Toggle save/bookmark on a reel.
 */
export const toggleReelSave = createAsyncThunk(
  'reels/toggleReelSave',
  async (reelId, { rejectWithValue, getState, dispatch }) => {
    const { reels: state } = getState()
    const reel = state.reels.find((r) => String(r._id) === String(reelId))
    const prevSaved = !!reel?.isSaved
    const prevSavesCount = reel?.savesCount || 0
    // Optimistic update — instant UI feedback
    dispatch(updateReel({
      reelId,
      isSaved: !prevSaved,
      savesCount: prevSaved ? Math.max(0, prevSavesCount - 1) : prevSavesCount + 1,
    }))
    try {
      const { data } = await api.post(`/vibes/${reelId}/save`)
      return {
        reelId,
        isSaved: data?.isSaved ?? !prevSaved,
        savesCount: data?.savesCount ?? (prevSaved ? Math.max(0, prevSavesCount - 1) : prevSavesCount + 1),
      }
    } catch (error) {
      // Revert on failure
      dispatch(updateReel({ reelId, isSaved: prevSaved, savesCount: prevSavesCount }))
      return rejectWithValue(error?.response?.data?.message || 'Failed to update save.')
    }
  }
)

/**
 * Toggle follow on a reel author.
 */
export const toggleReelFollow = createAsyncThunk(
  'reels/toggleReelFollow',
  async ({ reelId, authorId, isFollowing, isFollowRequested }, { rejectWithValue }) => {
    try {
      let response
      if (isFollowing) {
        response = await api.delete(`/follow/${authorId}/unfollow`)
      } else if (isFollowRequested) {
        response = await api.delete(`/follow/${authorId}/cancel`)
      } else {
        response = await api.post(`/follow/${authorId}/follow`)
      }
      const followStatus = response?.data?.data?.followStatus
      const nextFollowing = followStatus === 'accepted'
      const nextRequested = followStatus === 'pending'
      const viewerFollowingCount = response?.data?.data?.viewerFollowingCount
      return {
        reelId,
        authorId,
        isFollowing: nextFollowing,
        isFollowRequested: nextRequested,
        viewerFollowingCount,
        _raw: response?.data?.data,
      }
    } catch (error) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to update follow status.')
    }
  }
)

const updateOneReel = (state, reelId, patch) => {
  const idx = state.reels.findIndex((r) => String(r._id) === String(reelId))
  if (idx !== -1) {
    state.reels[idx] = { ...state.reels[idx], ...patch }
  }
}

const updateAuthorByReel = (state, reelId, patch) => {
  const idx = state.reels.findIndex((r) => String(r._id) === String(reelId))
  if (idx !== -1) {
    state.reels[idx] = {
      ...state.reels[idx],
      author: { ...(state.reels[idx].author || {}), ...patch },
    }
  }
}

const reelsSlice = createSlice({
  name: 'reels',
  initialState,
  reducers: {
    resetReels: (state) => {
      state.reels = []
      state.loading = false
      state.error = null
      state.page = 1
      state.hasMore = true
      state.total = 0
    },
    updateReel: (state, action) => {
      const { reelId, ...patch } = action.payload || {}
      if (reelId) updateOneReel(state, reelId, patch)
    },
    updateReelAuthor: (state, action) => {
      const { reelId, ...patch } = action.payload || {}
      if (reelId) updateAuthorByReel(state, reelId, patch)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReels.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchReels.fulfilled, (state, action) => {
        state.loading = false
        state.reels = action.payload?.reels || []
        const p = action.payload?.pagination || {}
        state.page = p.page || 1
        state.limit = p.limit || state.limit
        state.hasMore = !!p.hasMore
        state.total = p.total || state.reels.length
      })
      .addCase(fetchReels.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to load reels.'
      })

      .addCase(fetchMoreReels.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchMoreReels.fulfilled, (state, action) => {
        state.loading = false
        const newReels = action.payload?.reels || []
        const existingIds = new Set(state.reels.map((r) => String(r._id)))
        const deduped = newReels.filter((r) => !existingIds.has(String(r._id)))
        state.reels = [...state.reels, ...deduped]
        const p = action.payload?.pagination || {}
        state.page = p.page || state.page
        state.hasMore = !!p.hasMore
        state.total = p.total ?? state.total
      })
      .addCase(fetchMoreReels.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || state.error
      })

      .addCase(recordReelView.fulfilled, (state, action) => {
        const { reelId, viewsCount } = action.payload || {}
        if (reelId) {
          const idx = state.reels.findIndex((r) => String(r._id) === String(reelId))
          if (idx !== -1) {
            state.reels[idx] = {
              ...state.reels[idx],
              isViewed: true,
              viewsCount: viewsCount ?? state.reels[idx].viewsCount,
            }
          }
        }
      })

      .addCase(toggleReelLike.fulfilled, (state, action) => {
        const { reelId, isLiked, likesCount } = action.payload || {}
        updateOneReel(state, reelId, { isLiked, likesCount })
      })
      .addCase(toggleReelLike.rejected, (state, action) => {
        state.error = action.payload || state.error
      })

      .addCase(toggleReelSave.fulfilled, (state, action) => {
        const { reelId, isSaved, savesCount } = action.payload || {}
        updateOneReel(state, reelId, { isSaved, savesCount })
      })
      .addCase(toggleReelSave.rejected, (state, action) => {
        state.error = action.payload || state.error
      })

      .addCase(toggleReelFollow.fulfilled, (state, action) => {
        const { reelId, isFollowing, isFollowRequested } = action.payload || {}
        updateAuthorByReel(state, reelId, { isFollowing, isFollowRequested })
      })
      .addCase(toggleReelFollow.rejected, (state, action) => {
        state.error = action.payload || state.error
      })
  },
})

export const { resetReels, updateReel, updateReelAuthor } = reelsSlice.actions
export default reelsSlice.reducer
