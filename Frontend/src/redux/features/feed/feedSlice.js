import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/api/axios";

// Fetch initial feed or refresh (page 1)
export const fetchFeedPosts = createAsyncThunk(
  "feed/fetchFeedPosts",
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const response = await api.get(`/posts/feed?page=${page}&limit=${limit}`);
      return response.data?.data || { posts: [], pagination: {} };
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to load feed posts"
      );
    }
  }
);

// Fetch more posts for pagination (page > 1)
export const fetchMoreFeedPosts = createAsyncThunk(
  "feed/fetchMoreFeedPosts",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { feed } = getState();
      if (!feed.hasMore || feed.loadingMore) {
        return null;
      }
      const nextPage = feed.page + 1;
      const response = await api.get(`/posts/feed?page=${nextPage}&limit=${feed.limit}`);
      return response.data?.data || { posts: [], pagination: {} };
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.message || "Failed to load more posts"
      );
    }
  }
);

const initialState = {
  posts: [],
  page: 1,
  limit: 10,
  totalPosts: 0,
  totalPages: 1,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
  initialLoaded: false,
};

export const feedSlice = createSlice({
  name: "feed",
  initialState,
  reducers: {
    // Optimistically prepend newly created post
    prependFeedPost: (state, action) => {
      const newPost = action.payload;
      if (!newPost || !newPost._id) return;
      const exists = state.posts.some((p) => String(p._id) === String(newPost._id));
      if (!exists) {
        state.posts.unshift(newPost);
        state.totalPosts += 1;
      }
    },
    // Remove a deleted post
    removeFeedPost: (state, action) => {
      const postId = action.payload;
      state.posts = state.posts.filter((p) => String(p._id) !== String(postId));
      state.totalPosts = Math.max(0, state.totalPosts - 1);
    },
    // Update a post (e.g. like, save, comment count changes)
    updateFeedPost: (state, action) => {
      const updated = action.payload;
      if (!updated || !updated._id) return;
      const index = state.posts.findIndex((p) => String(p._id) === String(updated._id));
      if (index !== -1) {
        state.posts[index] = { ...state.posts[index], ...updated };
      }
    },
    resetFeed: () => initialState,
  },
  extraReducers: (builder) => {
    // Initial fetch / refresh
    builder.addCase(fetchFeedPosts.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchFeedPosts.fulfilled, (state, action) => {
      state.loading = false;
      state.initialLoaded = true;
      state.posts = action.payload.posts || [];
      const pagination = action.payload.pagination || {};
      state.page = pagination.page || 1;
      state.limit = pagination.limit || 10;
      state.totalPosts = pagination.totalPosts || 0;
      state.totalPages = pagination.totalPages || 1;
      state.hasMore = Boolean(pagination.hasMore);
    });
    builder.addCase(fetchFeedPosts.rejected, (state, action) => {
      state.loading = false;
      state.initialLoaded = true;
      state.error = action.payload;
    });

    // Pagination fetch
    builder.addCase(fetchMoreFeedPosts.pending, (state) => {
      state.loadingMore = true;
    });
    builder.addCase(fetchMoreFeedPosts.fulfilled, (state, action) => {
      state.loadingMore = false;
      if (!action.payload) return;
      const newPosts = action.payload.posts || [];
      const pagination = action.payload.pagination || {};

      // Deduplicate new posts against existing
      const existingIds = new Set(state.posts.map((p) => String(p._id)));
      const uniqueNewPosts = newPosts.filter((p) => !existingIds.has(String(p._id)));

      state.posts.push(...uniqueNewPosts);
      state.page = pagination.page || state.page + 1;
      state.totalPosts = pagination.totalPosts ?? state.totalPosts;
      state.totalPages = pagination.totalPages ?? state.totalPages;
      state.hasMore = Boolean(pagination.hasMore);
    });
    builder.addCase(fetchMoreFeedPosts.rejected, (state) => {
      state.loadingMore = false;
    });
  },
});

export const { prependFeedPost, removeFeedPost, updateFeedPost, resetFeed } = feedSlice.actions;

export default feedSlice.reducer;
