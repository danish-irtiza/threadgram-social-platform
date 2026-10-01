const mongoose = require("mongoose");
const Story = require("../models/stories.model");
const User = require("../models/user.model");
const Follow = require("../models/follow.model");
const uploadOnCloudinary = require("../config/cloudinary");
const { createStorySchema } = require("../validators/story.validators");

const extractValidationErrors = (error) => {
  const errors = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  });
  return errors;
};

/**
 * Helper to verify story access rules based on user privacy settings and follow status.
 *
 * Rules:
 * 1. If author account is public (`isPrivate === false`), anyone can view active stories.
 * 2. If author account is private (`isPrivate === true`):
 *    - The author themselves can always view their own stories.
 *    - Other users can ONLY view stories if they are an ACCEPTED follower of the author (`follower: viewerId, following: authorId, status: "accepted"`).
 *    - Following someone does NOT automatically grant them permission to see your stories unless they are an accepted follower of your account.
 *    - Pending, rejected, and non-following users CANNOT view stories from private accounts.
 */
const canUserAccessAuthorStories = async (viewerId, authorId) => {
  if (!authorId) return false;

  const targetAuthorId = authorId._id ? authorId._id.toString() : authorId.toString();

  // Author can always access their own stories
  if (viewerId && viewerId.toString() === targetAuthorId) {
    return true;
  }

  // Fetch author privacy setting
  const author = await User.findById(targetAuthorId).select("isPrivate");
  if (!author) {
    return false;
  }

  // Public accounts allow anyone to view active stories
  if (!author.isPrivate) {
    return true;
  }

  // Private accounts require viewer to be logged in and an accepted follower
  if (!viewerId) {
    return false;
  }

  const followRecord = await Follow.findOne({
    follower: viewerId,
    following: targetAuthorId,
    status: "accepted",
  });

  return !!followRecord;
};

/**
 * POST /api/stories
 * Create a new 24-hour story with image or video media upload.
 */
const createStory = async (req, res) => {
  try {
    const authorId = req.user && req.user.sub;
    if (!authorId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({
        status: "fail",
        message: "Media file (image or video) is required for a story",
      });
    }

    // Determine mediaType automatically from MIME type unless explicitly valid in body
    const mime = file.mimetype || "";
    let mediaType = "image";
    if (mime.startsWith("video/")) {
      mediaType = "video";
    } else if (!mime.startsWith("image/")) {
      return res.status(400).json({
        status: "fail",
        message: "Only image and video files are supported for stories",
      });
    }

    // Optional schema validation
    const validated = createStorySchema.safeParse(req.body);
    if (!validated.success) {
      const errors = extractValidationErrors(validated.error);
      const firstKey = Object.keys(errors)[0];
      return res.status(400).json({
        status: "fail",
        message: firstKey ? errors[firstKey] : "Validation failed",
        errors,
      });
    }

    // Upload to Cloudinary
    const mediaUrl = await uploadOnCloudinary(file.path);
    if (!mediaUrl) {
      return res.status(500).json({
        status: "error",
        message: "Failed to upload story media to Cloudinary",
      });
    }

    // Create Story in DB
    const story = await Story.create({
      author: authorId,
      mediaType,
      media: mediaUrl,
      viewers: [],
      like: [],
    });

    // Push story ID into User's stories array
    await User.findByIdAndUpdate(authorId, {
      $push: { stories: story._id },
    });

    // Populate author details for client response
    await story.populate("author", "_id name username avatar isPrivate");

    return res.status(201).json({
      status: "success",
      message: "Story created successfully",
      data: { story },
    });
  } catch (error) {
    console.error("Create story error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while creating story.",
    });
  }
};

/**
 * GET /api/stories/feed
 * Get grouped stories of logged-in user and followed accounts (created within last 24 hours).
 */
const getFeedStories = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    // 1. Get list of user IDs that the logged-in user is following (accepted status)
    const followingDocs = await Follow.find({
      follower: userId,
      status: "accepted",
    }).select("following");

    const followingUserIds = followingDocs.map((doc) => doc.following);

    // Include the user's own stories as well
    const allowedAuthorIds = [userId, ...followingUserIds];

    // 2. Fetch all active stories (created within last 24h) for these authors
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      author: { $in: allowedAuthorIds },
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ createdAt: 1 })
      .populate("author", "_id name username avatar isPrivate")
      .lean();

    // 3. Group stories by author
    const storiesByAuthorMap = new Map();

    stories.forEach((story) => {
      const authorIdStr = story.author._id.toString();

      if (!storiesByAuthorMap.has(authorIdStr)) {
        storiesByAuthorMap.set(authorIdStr, {
          user: story.author,
          stories: [],
          hasUnseen: false,
        });
      }

      const group = storiesByAuthorMap.get(authorIdStr);

      const isViewedByCurrentUser = Array.isArray(story.viewers) && story.viewers.some(
        (vId) => vId.toString() === userId.toString()
      );

      const isLikedByCurrentUser = Array.isArray(story.like) && story.like.some(
        (lId) => lId.toString() === userId.toString()
      );

      const formattedStory = {
        ...story,
        isViewed: isViewedByCurrentUser,
        isLiked: isLikedByCurrentUser,
        viewsCount: Array.isArray(story.viewers) ? story.viewers.length : 0,
        likesCount: Array.isArray(story.like) ? story.like.length : 0,
      };

      if (!isViewedByCurrentUser && authorIdStr !== userId.toString()) {
        group.hasUnseen = true;
      }

      group.stories.push(formattedStory);
    });

    // Convert map to array
    const groupedStories = Array.from(storiesByAuthorMap.values());

    // Sort grouped stories:
    // 1. Logged-in user's stories first
    // 2. Groups with unseen stories second
    // 3. Groups where all stories are seen third
    groupedStories.sort((a, b) => {
      const aIsSelf = a.user._id.toString() === userId.toString();
      const bIsSelf = b.user._id.toString() === userId.toString();

      if (aIsSelf) return -1;
      if (bIsSelf) return 1;

      if (a.hasUnseen && !b.hasUnseen) return -1;
      if (!a.hasUnseen && b.hasUnseen) return 1;

      return 0;
    });

    return res.status(200).json({
      status: "success",
      data: {
        storyGroups: groupedStories,
      },
    });
  } catch (error) {
    console.error("Get feed stories error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching story feed.",
    });
  }
};

/**
 * GET /api/stories/user/:userId
 * Get active stories of a specific user.
 */
const getUserStories = async (req, res) => {
  try {
    const currentUserId = req.user && req.user.sub;
    if (!currentUserId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(userId).select("_id name username avatar isPrivate");
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    const isAllowed = await canUserAccessAuthorStories(currentUserId, userId);
    if (!isAllowed) {
      return res.status(403).json({
        status: "fail",
        message: "This account is private. Follow this account to see their stories.",
      });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      author: userId,
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ createdAt: 1 })
      .populate("author", "_id name username avatar isPrivate")
      .lean();

    const formattedStories = stories.map((story) => {
      const isViewed = currentUserId && Array.isArray(story.viewers) && story.viewers.some(
        (vId) => vId.toString() === currentUserId.toString()
      );
      const isLiked = currentUserId && Array.isArray(story.like) && story.like.some(
        (lId) => lId.toString() === currentUserId.toString()
      );

      return {
        ...story,
        isViewed: !!isViewed,
        isLiked: !!isLiked,
        viewsCount: Array.isArray(story.viewers) ? story.viewers.length : 0,
        likesCount: Array.isArray(story.like) ? story.like.length : 0,
      };
    });

    return res.status(200).json({
      status: "success",
      data: {
        user,
        stories: formattedStories,
      },
    });
  } catch (error) {
    console.error("Get user stories error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching user stories.",
    });
  }
};

/**
 * GET /api/stories/:storyId
 * Get a single story by ID.
 */
const getStoryById = async (req, res) => {
  try {
    const currentUserId = req.user && req.user.sub;
    if (!currentUserId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { storyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid story ID",
      });
    }

    const story = await Story.findById(storyId)
      .populate("author", "_id name username avatar isPrivate")
      .lean();

    if (!story) {
      return res.status(404).json({
        status: "fail",
        message: "Story not found or expired",
      });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (new Date(story.createdAt) < twentyFourHoursAgo) {
      return res.status(404).json({
        status: "fail",
        message: "Story not found or expired",
      });
    }

    const isAllowed = await canUserAccessAuthorStories(currentUserId, story.author._id);
    if (!isAllowed) {
      return res.status(403).json({
        status: "fail",
        message: "This account is private. Follow this account to see their stories.",
      });
    }

    const isViewed = currentUserId && Array.isArray(story.viewers) && story.viewers.some(
      (vId) => vId.toString() === currentUserId.toString()
    );
    const isLiked = currentUserId && Array.isArray(story.like) && story.like.some(
      (lId) => lId.toString() === currentUserId.toString()
    );

    const formattedStory = {
      ...story,
      isViewed: !!isViewed,
      isLiked: !!isLiked,
      viewsCount: Array.isArray(story.viewers) ? story.viewers.length : 0,
      likesCount: Array.isArray(story.like) ? story.like.length : 0,
    };

    return res.status(200).json({
      status: "success",
      data: { story: formattedStory },
    });
  } catch (error) {
    console.error("Get story by id error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching story.",
    });
  }
};

/**
 * POST /api/stories/:storyId/view
 * Mark a story as viewed by the authenticated user.
 */
const markStoryAsViewed = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid story ID",
      });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        status: "fail",
        message: "Story not found or expired",
      });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (new Date(story.createdAt) < twentyFourHoursAgo) {
      return res.status(404).json({
        status: "fail",
        message: "Story not found or expired",
      });
    }

    const isAllowed = await canUserAccessAuthorStories(userId, story.author);
    if (!isAllowed) {
      return res.status(403).json({
        status: "fail",
        message: "This account is private. Follow this account to see their stories.",
      });
    }

    // Do not record author as a viewer of their own story
    if (story.author.toString() !== userId.toString()) {
      await Story.findByIdAndUpdate(storyId, {
        $addToSet: { viewers: userId },
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Story marked as viewed",
    });
  } catch (error) {
    console.error("Mark story as viewed error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while marking story as viewed.",
    });
  }
};

/**
 * POST /api/stories/:storyId/like
 * Toggle like/unlike on a story.
 */
const toggleLikeStory = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid story ID",
      });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        status: "fail",
        message: "Story not found or expired",
      });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (new Date(story.createdAt) < twentyFourHoursAgo) {
      return res.status(404).json({
        status: "fail",
        message: "Story not found or expired",
      });
    }

    const isAllowed = await canUserAccessAuthorStories(userId, story.author);
    if (!isAllowed) {
      return res.status(403).json({
        status: "fail",
        message: "This account is private. Follow this account to see their stories.",
      });
    }

    const isLiked = Array.isArray(story.like) && story.like.some(
      (id) => id.toString() === userId.toString()
    );

    if (isLiked) {
      await Story.findByIdAndUpdate(storyId, {
        $pull: { like: userId },
      });

      return res.status(200).json({
        status: "success",
        message: "Story unliked",
        isLiked: false,
        likesCount: story.like.length - 1,
      });
    } else {
      await Story.findByIdAndUpdate(storyId, {
        $addToSet: { like: userId },
      });

      return res.status(200).json({
        status: "success",
        message: "Story liked",
        isLiked: true,
        likesCount: story.like.length + 1,
      });
    }
  } catch (error) {
    console.error("Toggle like story error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while liking story.",
    });
  }
};

/**
 * DELETE /api/stories/:storyId
 * Delete a story — author only.
 */
const deleteStory = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid story ID",
      });
    }

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({
        status: "fail",
        message: "Story not found or expired",
      });
    }

    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to delete this story",
      });
    }

    await Story.findByIdAndDelete(storyId);

    // Remove story from User's stories array
    await User.findByIdAndUpdate(userId, {
      $pull: { stories: storyId },
    });

    return res.status(200).json({
      status: "success",
      message: "Story deleted successfully",
    });
  } catch (error) {
    console.error("Delete story error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while deleting story.",
    });
  }
};

/**
 * GET /api/stories/:storyId/viewers
 * Get list of viewers who watched a story — author only.
 */
const getStoryViewers = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { storyId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(storyId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid story ID",
      });
    }

    const story = await Story.findById(storyId).populate(
      "viewers",
      "_id name username avatar"
    );

    if (!story) {
      return res.status(404).json({
        status: "fail",
        message: "Story not found or expired",
      });
    }

    // Only the story author can see the detailed viewer list
    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to see story viewers",
      });
    }

    const likesSet = new Set((story.like || []).map((id) => id.toString()));

    const viewersWithLikeStatus = (story.viewers || []).map((viewer) => ({
      ...viewer.toObject(),
      hasLiked: likesSet.has(viewer._id.toString()),
    }));

    return res.status(200).json({
      status: "success",
      data: {
        viewers: viewersWithLikeStatus,
        totalViewers: viewersWithLikeStatus.length,
        totalLikes: likesSet.size,
      },
    });
  } catch (error) {
    console.error("Get story viewers error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching story viewers.",
    });
  }
};

module.exports = {
  createStory,
  getFeedStories,
  getUserStories,
  getStoryById,
  markStoryAsViewed,
  toggleLikeStory,
  deleteStory,
  getStoryViewers,
};

