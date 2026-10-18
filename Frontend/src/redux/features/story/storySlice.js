import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "@/api/axios";

// Fetch feed stories (logged in user + accepted following)
export const fetchFeedStories = createAsyncThunk(
  "story/fetchFeedStories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/stories/feed");
      return response.data?.data?.storyGroups || [];
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed to load feed stories");
    }
  }
);

// Fetch active stories for a specific user
export const fetchUserStories = createAsyncThunk(
  "story/fetchUserStories",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/stories/user/${userId}`);
      return {
        userId,
        user: response.data?.data?.user,
        stories: response.data?.data?.stories || [],
      };
    } catch (err) {
      return rejectWithValue({
        userId,
        error: err?.response?.data?.message || "Failed to load user stories",
      });
    }
  }
);

// Mark story as viewed
export const markStoryViewed = createAsyncThunk(
  "story/markStoryViewed",
  async (storyId, { rejectWithValue }) => {
    try {
      await api.post(`/stories/${storyId}/view`);
      return storyId;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed to mark story as viewed");
    }
  }
);

// Toggle like story
export const toggleLikeStory = createAsyncThunk(
  "story/toggleLikeStory",
  async (storyId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/stories/${storyId}/like`);
      return {
        storyId,
        isLiked: response.data?.isLiked,
        likesCount: response.data?.likesCount,
      };
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed to like story");
    }
  }
);

// Delete story (author only)
export const deleteStory = createAsyncThunk(
  "story/deleteStory",
  async (storyId, { rejectWithValue }) => {
    try {
      await api.delete(`/stories/${storyId}`);
      return storyId;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed to delete story");
    }
  }
);

// Fetch story viewers (author only)
export const fetchStoryViewers = createAsyncThunk(
  "story/fetchStoryViewers",
  async (storyId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/stories/${storyId}/viewers`);
      return {
        storyId,
        viewers: response.data?.data?.viewers || [],
        totalViewers: response.data?.data?.totalViewers || 0,
        totalLikes: response.data?.data?.totalLikes || 0,
      };
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed to fetch story viewers");
    }
  }
);

const storySlice = createSlice({
  name: "story",
  initialState: {
    feedStoryGroups: [],
    userStories: {}, // { [userId]: { user, stories: [] } }
    loading: false,
    error: null,
    activeViewer: {
      isOpen: false,
      groupIndex: 0,
      storyIndex: 0,
      groups: [], // [{ user, stories: [] }]
    },
    storyViewersData: {}, // { [storyId]: { viewers: [], totalViewers: 0, totalLikes: 0 } }
  },
  reducers: {
    openStoryViewer: (state, action) => {
      const { groups, groupIndex = 0, storyIndex = 0 } = action.payload;
      state.activeViewer = {
        isOpen: true,
        groupIndex,
        storyIndex,
        groups: groups || state.feedStoryGroups,
      };
    },
    closeStoryViewer: (state) => {
      state.activeViewer.isOpen = false;
    },
    setActiveViewerIndexes: (state, action) => {
      const { groupIndex, storyIndex } = action.payload;
      if (groupIndex !== undefined) state.activeViewer.groupIndex = groupIndex;
      if (storyIndex !== undefined) state.activeViewer.storyIndex = storyIndex;
    },
    addCreatedStoryToFeed: (state, action) => {
      const story = action.payload;
      if (!story || !story.author) return;
      const authorId = String(story.author._id || story.author);
      
      const existingGroupIndex = state.feedStoryGroups.findIndex(
        (g) => String(g.user._id) === authorId
      );

      const formattedStory = {
        ...story,
        isViewed: false,
        isLiked: false,
        viewsCount: 0,
        likesCount: 0,
      };

      if (existingGroupIndex >= 0) {
        state.feedStoryGroups[existingGroupIndex].stories.push(formattedStory);
        // Recompute hasUnseen — true if ANY story in the group is unviewed
        state.feedStoryGroups[existingGroupIndex].hasUnseen =
          state.feedStoryGroups[existingGroupIndex].stories.some((s) => !s.isViewed);
      } else {
        state.feedStoryGroups.unshift({
          user: story.author,
          stories: [formattedStory],
          hasUnseen: true,
        });
      }

      if (state.userStories[authorId]) {
        state.userStories[authorId].stories.push(formattedStory);
      }
    },
    // Mark a story as viewed locally (for owner viewing their own story)
    markStoryViewedLocally: (state, action) => {
      const storyId = String(action.payload);

      // Update feedStoryGroups
      state.feedStoryGroups.forEach((group) => {
        group.stories.forEach((story) => {
          if (String(story._id) === storyId) {
            story.isViewed = true;
          }
        });
        // Recompute hasUnseen for this group
        group.hasUnseen = group.stories.some((s) => !s.isViewed);
      });

      // Update userStories
      Object.values(state.userStories).forEach((userGroup) => {
        userGroup.stories.forEach((story) => {
          if (String(story._id) === storyId) {
            story.isViewed = true;
          }
        });
      });

      // Update activeViewer groups
      if (state.activeViewer.groups) {
        state.activeViewer.groups.forEach((group) => {
          group.stories.forEach((story) => {
            if (String(story._id) === storyId) {
              story.isViewed = true;
            }
          });
        });
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchFeedStories
      .addCase(fetchFeedStories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeedStories.fulfilled, (state, action) => {
        state.loading = false;
        state.feedStoryGroups = action.payload;
      })
      .addCase(fetchFeedStories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchUserStories
      .addCase(fetchUserStories.fulfilled, (state, action) => {
        const { userId, user, stories } = action.payload;
        state.userStories[userId] = { user, stories };
      })

      // markStoryViewed
      .addCase(markStoryViewed.fulfilled, (state, action) => {
        const storyId = action.payload;
        state.feedStoryGroups.forEach((group) => {
          group.stories.forEach((story) => {
            if (String(story._id) === String(storyId)) {
              story.isViewed = true;
            }
          });
          group.hasUnseen = group.stories.some((s) => !s.isViewed);
        });

        Object.values(state.userStories).forEach((userGroup) => {
          userGroup.stories.forEach((story) => {
            if (String(story._id) === String(storyId)) {
              story.isViewed = true;
            }
          });
        });
      })

      // toggleLikeStory
      .addCase(toggleLikeStory.fulfilled, (state, action) => {
        const { storyId, isLiked, likesCount } = action.payload;
        state.feedStoryGroups.forEach((group) => {
          group.stories.forEach((story) => {
            if (String(story._id) === String(storyId)) {
              story.isLiked = isLiked;
              story.likesCount = likesCount;
            }
          });
        });

        Object.values(state.userStories).forEach((userGroup) => {
          userGroup.stories.forEach((story) => {
            if (String(story._id) === String(storyId)) {
              story.isLiked = isLiked;
              story.likesCount = likesCount;
            }
          });
        });

        if (state.activeViewer.groups) {
          state.activeViewer.groups.forEach((group) => {
            group.stories.forEach((story) => {
              if (String(story._id) === String(storyId)) {
                story.isLiked = isLiked;
                story.likesCount = likesCount;
              }
            });
          });
        }
      })

      // deleteStory
      .addCase(deleteStory.fulfilled, (state, action) => {
        const storyId = action.payload;
        
        state.feedStoryGroups = state.feedStoryGroups
          .map((group) => ({
            ...group,
            stories: group.stories.filter((s) => String(s._id) !== String(storyId)),
          }))
          .filter((group) => group.stories.length > 0);

        Object.keys(state.userStories).forEach((userId) => {
          state.userStories[userId].stories = state.userStories[userId].stories.filter(
            (s) => String(s._id) !== String(storyId)
          );
        });

        if (state.activeViewer.groups) {
          state.activeViewer.groups = state.activeViewer.groups
            .map((group) => ({
              ...group,
              stories: group.stories.filter((s) => String(s._id) !== String(storyId)),
            }))
            .filter((group) => group.stories.length > 0);
          
          if (state.activeViewer.groups.length === 0) {
            state.activeViewer.isOpen = false;
          }
        }
      })

      // fetchStoryViewers
      .addCase(fetchStoryViewers.fulfilled, (state, action) => {
        const { storyId, viewers, totalViewers, totalLikes } = action.payload;
        state.storyViewersData[storyId] = { viewers, totalViewers, totalLikes };
      });
  },
});

export const {
  openStoryViewer,
  closeStoryViewer,
  setActiveViewerIndexes,
  addCreatedStoryToFeed,
  markStoryViewedLocally,
} = storySlice.actions;

export default storySlice.reducer;
