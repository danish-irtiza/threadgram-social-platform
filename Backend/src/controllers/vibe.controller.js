const mongoose = require("mongoose");
const Vibe = require("../models/vibe.model");
const User = require("../models/user.model");
const Follow = require("../models/follow.model");
const uploadOnCloudinary = require("../config/cloudinary");
const { uploadVideoOnCloudinary, deleteFromCloudinary } = require("../config/cloudinary");
const {
  createVibeSchema,
  editVibeSchema,
  commentVibeSchema,
} = require("../validators/vibe.validators");

const extractValidationErrors = (error) => {
  const errors = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  });
  return errors;
};

/**
 * Format vibe object with interaction flags and counts for viewer.
 */
const formatVibe = (vibe, currentUserId) => {
  const cUserIdStr = currentUserId ? currentUserId.toString() : null;

  const isLiked = !!(
    cUserIdStr &&
    Array.isArray(vibe.like) &&
    vibe.like.some((id) => id.toString() === cUserIdStr)
  );

  const isSaved = !!(
    cUserIdStr &&
    Array.isArray(vibe.savedVibe) &&
    vibe.savedVibe.some((id) => id.toString() === cUserIdStr)
  );

  const isViewed = !!(
    cUserIdStr &&
    Array.isArray(vibe.views) &&
    vibe.views.some((id) => id.toString() === cUserIdStr)
  );

  return {
    ...vibe,
    isLiked,
    isSaved,
    isViewed,
    likesCount: Array.isArray(vibe.like) ? vibe.like.length : 0,
    commentsCount: Array.isArray(vibe.comment) ? vibe.comment.length : 0,
    viewsCount: Array.isArray(vibe.views) ? vibe.views.length : 0,
    savesCount: Array.isArray(vibe.savedVibe) ? vibe.savedVibe.length : 0,
  };
};

/**
 * POST /api/vibes
 * Create a new vibe (short video only, max 60s) with video media upload and caption.
 */
const createVibe = async (req, res) => {
  try {
    const authorId = req.user && req.user.sub;
    if (!authorId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    // Pre-check client reported video duration if provided in body
    if (req.body.duration && parseFloat(req.body.duration) > 60) {
      return res.status(400).json({
        status: "fail",
        message: "Vibe video duration cannot exceed 60 seconds",
      });
    }

    // Validate request file
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({
        status: "fail",
        message: "Video file is required for a vibe",
      });
    }

    // Validate video MIME type (video only)
    const mime = file.mimetype || "";
    if (!mime.startsWith("video/")) {
      return res.status(400).json({
        status: "fail",
        message: "Only short video files (max 60 seconds) are allowed for Vibes",
      });
    }

    // Validate caption schema
    const validated = createVibeSchema.safeParse(req.body || {});
    if (!validated.success) {
      const errors = extractValidationErrors(validated.error);
      const firstKey = Object.keys(errors)[0];
      const firstMsg = firstKey ? errors[firstKey] : "Validation failed";
      return res.status(400).json({
        status: "fail",
        message: firstMsg,
        errors,
      });
    }

    const caption = validated.data.caption || "";

    // Upload video to Cloudinary and fetch duration metadata
    const uploadResult = await uploadVideoOnCloudinary(file.path);
    if (!uploadResult || !uploadResult.url) {
      return res.status(500).json({
        status: "error",
        message: "Failed to upload video media to Cloudinary",
      });
    }

    // Enforce 60-second max video duration limit from Cloudinary metadata (allowing float margin for container metadata)
    if (uploadResult.duration && uploadResult.duration > 60.99) {
      if (uploadResult.public_id) {
        await deleteFromCloudinary(uploadResult.public_id, "video");
      }
      return res.status(400).json({
        status: "fail",
        message: "Vibe video duration cannot exceed 60 seconds",
      });
    }

    const mediaUrl = uploadResult.url;

    // Create vibe in DB
    const vibe = await Vibe.create({
      author: authorId,
      media: mediaUrl,
      caption,
      like: [],
      comment: [],
      savedVibe: [],
      views: [],
    });

    // Push vibe ID to author's user document
    await User.findByIdAndUpdate(authorId, {
      $push: { vibes: vibe._id },
    });

    // Populate author details for response
    await vibe.populate("author", "_id name username avatar");

    const formatted = formatVibe(vibe.toObject(), authorId);

    return res.status(201).json({
      status: "success",
      message: "Vibe created successfully",
      data: { vibe: formatted },
    });
  } catch (error) {
    console.error("Create vibe error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while creating vibe.",
    });
  }
};

/**
 * PUT /api/vibes/:vibeId
 * Edit caption of a vibe — author only.
 */
const editVibe = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { vibeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vibeId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid vibe ID",
      });
    }

    const validated = editVibeSchema.safeParse(req.body);
    if (!validated.success) {
      const errors = extractValidationErrors(validated.error);
      const firstKey = Object.keys(errors)[0];
      const firstMsg = firstKey ? errors[firstKey] : "Validation failed";
      return res.status(400).json({
        status: "fail",
        message: firstMsg,
        errors,
      });
    }

    const vibe = await Vibe.findById(vibeId);
    if (!vibe) {
      return res.status(404).json({
        status: "fail",
        message: "Vibe not found",
      });
    }

    if (vibe.author.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to edit this vibe",
      });
    }

    vibe.caption = validated.data.caption;
    await vibe.save();
    await vibe.populate("author", "_id name username avatar");

    const formatted = formatVibe(vibe.toObject(), userId);

    return res.status(200).json({
      status: "success",
      message: "Vibe updated successfully",
      data: { vibe: formatted },
    });
  } catch (error) {
    console.error("Edit vibe error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while editing vibe.",
    });
  }
};

/**
 * DELETE /api/vibes/:vibeId
 * Delete a vibe — only the vibe owner can delete.
 */
const deleteVibe = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { vibeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vibeId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid vibe ID",
      });
    }

    const vibe = await Vibe.findById(vibeId);
    if (!vibe) {
      return res.status(404).json({
        status: "fail",
        message: "Vibe not found",
      });
    }

    if (vibe.author.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to delete this vibe",
      });
    }

    // Delete stored video file from Cloudinary if media URL exists
    if (vibe.media) {
      const parts = vibe.media.split("/");
      const filename = parts[parts.length - 1];
      const publicId = filename ? filename.split(".")[0] : null;
      if (publicId) {
        await deleteFromCloudinary(publicId, "video");
      }
    }

    await Vibe.findByIdAndDelete(vibeId);

    // Remove from author's vibes array
    await User.findByIdAndUpdate(userId, {
      $pull: { vibes: vibeId },
    });

    // Remove from all users' savedVibes arrays
    await User.updateMany(
      { savedVibes: vibeId },
      { $pull: { savedVibes: vibeId } }
    );

    return res.status(200).json({
      status: "success",
      message: "Vibe deleted successfully",
    });
  } catch (error) {
    console.error("Delete vibe error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while deleting vibe.",
    });
  }
};

/**
 * POST /api/vibes/:vibeId/like
 * Toggle like/unlike on a vibe for the logged-in user.
 */
const toggleLikeVibe = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { vibeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vibeId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid vibe ID",
      });
    }

    const vibe = await Vibe.findById(vibeId);
    if (!vibe) {
      return res.status(404).json({
        status: "fail",
        message: "Vibe not found",
      });
    }

    const isLiked = Array.isArray(vibe.like) && vibe.like.some(
      (id) => id.toString() === userId.toString()
    );

    if (isLiked) {
      await Vibe.findByIdAndUpdate(vibeId, {
        $pull: { like: userId },
      });

      return res.status(200).json({
        status: "success",
        message: "Vibe unliked",
        isLiked: false,
        likesCount: vibe.like.length - 1,
      });
    } else {
      await Vibe.findByIdAndUpdate(vibeId, {
        $addToSet: { like: userId },
      });

      return res.status(200).json({
        status: "success",
        message: "Vibe liked",
        isLiked: true,
        likesCount: vibe.like.length + 1,
      });
    }
  } catch (error) {
    console.error("Toggle like vibe error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while liking vibe.",
    });
  }
};

/**
 * POST /api/vibes/:vibeId/comment
 * Add a comment to a vibe.
 */
const addComment = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { vibeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vibeId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid vibe ID",
      });
    }

    const validated = commentVibeSchema.safeParse(req.body);
    if (!validated.success) {
      const errors = extractValidationErrors(validated.error);
      const firstKey = Object.keys(errors)[0];
      const firstMsg = firstKey ? errors[firstKey] : "Validation failed";
      return res.status(400).json({
        status: "fail",
        message: firstMsg,
        errors,
      });
    }

    const { comment } = validated.data;

    const vibe = await Vibe.findById(vibeId);
    if (!vibe) {
      return res.status(404).json({
        status: "fail",
        message: "Vibe not found",
      });
    }

    const newComment = {
      user: userId,
      text: comment,
      createdAt: new Date(),
    };

    vibe.comment.push(newComment);
    await vibe.save();

    const savedComment = vibe.comment[vibe.comment.length - 1];

    await vibe.populate("comment.user", "_id name username avatar");
    const populatedComment = vibe.comment.id(savedComment._id);

    return res.status(201).json({
      status: "success",
      message: "Comment added",
      data: {
        comment: populatedComment,
        commentsCount: vibe.comment.length,
      },
    });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while adding comment.",
    });
  }
};

/**
 * PUT /api/vibes/:vibeId/comment/:commentId
 * Edit an existing comment — only comment author can edit.
 */
const editComment = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { vibeId, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vibeId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid vibe or comment ID",
      });
    }

    const validated = commentVibeSchema.safeParse(req.body);
    if (!validated.success) {
      const errors = extractValidationErrors(validated.error);
      const firstKey = Object.keys(errors)[0];
      const firstMsg = firstKey ? errors[firstKey] : "Validation failed";
      return res.status(400).json({
        status: "fail",
        message: firstMsg,
        errors,
      });
    }

    const { comment } = validated.data;

    const vibe = await Vibe.findById(vibeId);
    if (!vibe) {
      return res.status(404).json({
        status: "fail",
        message: "Vibe not found",
      });
    }

    const existingComment = vibe.comment.id(commentId);
    if (!existingComment) {
      return res.status(404).json({
        status: "fail",
        message: "Comment not found",
      });
    }

    if (existingComment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to edit this comment",
      });
    }

    existingComment.text = comment;
    await vibe.save();

    await vibe.populate("comment.user", "_id name username avatar");
    const updatedComment = vibe.comment.id(commentId);

    return res.status(200).json({
      status: "success",
      message: "Comment updated",
      data: { comment: updatedComment },
    });
  } catch (error) {
    console.error("Edit comment error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while editing comment.",
    });
  }
};

/**
 * DELETE /api/vibes/:vibeId/comment/:commentId
 * Delete a comment — comment author OR vibe owner can delete.
 */
const deleteComment = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { vibeId, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vibeId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid vibe or comment ID",
      });
    }

    const vibe = await Vibe.findById(vibeId);
    if (!vibe) {
      return res.status(404).json({
        status: "fail",
        message: "Vibe not found",
      });
    }

    const existingComment = vibe.comment.id(commentId);
    if (!existingComment) {
      return res.status(404).json({
        status: "fail",
        message: "Comment not found",
      });
    }

    const isCommentAuthor = existingComment.user.toString() === userId.toString();
    const isVibeOwner = vibe.author.toString() === userId.toString();

    if (!isCommentAuthor && !isVibeOwner) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to delete this comment",
      });
    }

    vibe.comment.pull(commentId);
    await vibe.save();

    return res.status(200).json({
      status: "success",
      message: "Comment deleted",
      data: { commentsCount: vibe.comment.length },
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while deleting comment.",
    });
  }
};

/**
 * POST /api/vibes/:vibeId/save
 * Toggle saving/bookmarking a vibe for the logged-in user.
 */
const toggleSaveVibe = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { vibeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vibeId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid vibe ID",
      });
    }

    const vibe = await Vibe.findById(vibeId);
    if (!vibe) {
      return res.status(404).json({
        status: "fail",
        message: "Vibe not found",
      });
    }

    const isSaved = Array.isArray(vibe.savedVibe) && vibe.savedVibe.some(
      (id) => id.toString() === userId.toString()
    );

    if (isSaved) {
      await Vibe.findByIdAndUpdate(vibeId, {
        $pull: { savedVibe: userId },
      });
      await User.findByIdAndUpdate(userId, {
        $pull: { savedVibes: vibeId },
      });

      return res.status(200).json({
        status: "success",
        message: "Vibe removed from saved",
        isSaved: false,
        savesCount: Math.max(0, (Array.isArray(vibe.savedVibe) ? vibe.savedVibe.length : 1) - 1),
      });
    } else {
      await Vibe.findByIdAndUpdate(vibeId, {
        $addToSet: { savedVibe: userId },
      });
      await User.findByIdAndUpdate(userId, {
        $addToSet: { savedVibes: vibeId },
      });

      return res.status(200).json({
        status: "success",
        message: "Vibe saved successfully",
        isSaved: true,
        savesCount: (Array.isArray(vibe.savedVibe) ? vibe.savedVibe.length : 0) + 1,
      });
    }
  } catch (error) {
    console.error("Toggle save vibe error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while saving vibe.",
    });
  }
};

/**
 * GET /api/vibes/saved
 * Get all vibes saved by the authenticated user.
 */
const getSavedVibes = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const user = await User.findById(userId).populate({
      path: "savedVibes",
      populate: {
        path: "author",
        select: "_id name username avatar",
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    const formattedVibes = (user.savedVibes || []).map((vibe) =>
      formatVibe(vibe.toObject ? vibe.toObject() : vibe, userId)
    );

    return res.status(200).json({
      status: "success",
      data: {
        savedVibes: formattedVibes,
      },
    });
  } catch (error) {
    console.error("Get saved vibes error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching saved vibes.",
    });
  }
};

/**
 * POST /api/vibes/:vibeId/view
 * Record a view on a vibe.
 */
const recordVibeView = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    const { vibeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(vibeId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid vibe ID",
      });
    }

    const vibe = await Vibe.findById(vibeId);
    if (!vibe) {
      return res.status(404).json({
        status: "fail",
        message: "Vibe not found",
      });
    }

    if (userId) {
      await Vibe.findByIdAndUpdate(vibeId, {
        $addToSet: { views: userId },
      });
    }

    const updatedVibe = await Vibe.findById(vibeId).select("views");
    const viewsCount = Array.isArray(updatedVibe.views) ? updatedVibe.views.length : 0;

    return res.status(200).json({
      status: "success",
      message: "Vibe view recorded",
      data: { viewsCount },
    });
  } catch (error) {
    console.error("Record vibe view error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while recording vibe view.",
    });
  }
};

/**
 * GET /api/vibes/feed
 * Global algorithmic Vibe feed.
 * Ranks vibes using engagement metrics (likes, comments, views) & recency.
 */
const getFeedVibes = async (req, res) => {
  try {
    const currentUserId = req.user && req.user.sub;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const totalVibes = await Vibe.countDocuments();

    const rawVibes = await Vibe.find()
      .populate("author", "_id name username avatar")
      .populate("comment.user", "_id name username avatar")
      .lean();

    const now = Date.now();
    const scoredVibes = rawVibes.map((vibe) => {
      const likesCount = Array.isArray(vibe.like) ? vibe.like.length : 0;
      const commentsCount = Array.isArray(vibe.comment) ? vibe.comment.length : 0;
      const viewsCount = Array.isArray(vibe.views) ? vibe.views.length : 0;

      const hoursAge = Math.max(0.1, (now - new Date(vibe.createdAt).getTime()) / (1000 * 3600));

      // Algorithmic ranking score: engagement divided by time decay factor
      const engagementScore = (likesCount * 3 + commentsCount * 5 + viewsCount * 1 + 1) / Math.pow(hoursAge + 2, 1.5);

      return {
        vibe,
        score: engagementScore,
      };
    });

    // Sort by score descending
    scoredVibes.sort((a, b) => b.score - a.score);

    // Paginate
    const paginatedScoredVibes = scoredVibes.slice(skip, skip + limit);

    const formattedVibes = paginatedScoredVibes.map((item) =>
      formatVibe(item.vibe, currentUserId)
    );

    return res.status(200).json({
      status: "success",
      data: {
        vibes: formattedVibes,
        pagination: {
          page,
          limit,
          totalVibes,
          totalPages: Math.ceil(totalVibes / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get feed vibes error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching feed vibes.",
    });
  }
};

/**
 * GET /api/vibes/user/:userId
 * Get all vibes by a specific user (newest first).
 */
const getUserVibes = async (req, res) => {
  try {
    const currentUserId = req.user && req.user.sub;
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

    // ── Privacy enforcement (BUG 3 fix) ─────────────────────────────────────
    const isOwner = currentUserId && currentUserId.toString() === userId.toString();
    let canView = !user.isPrivate || isOwner;

    if (!canView && currentUserId) {
      // Check if viewer is an accepted follower
      const followRecord = await Follow.findOne({
        follower: currentUserId,
        following: userId,
        status: "accepted",
      }).select("_id").lean();
      canView = !!followRecord;
    }

    console.log(
      `[getUserVibes] viewer=${currentUserId} profileOwner=${userId}` +
      ` isPrivate=${user.isPrivate} canView=${canView}`
    );

    if (!canView) {
      // Return empty vibes array — do NOT expose private content
      return res.status(200).json({
        status: "success",
        data: {
          user: { _id: user._id, name: user.name, username: user.username, avatar: user.avatar },
          vibes: [],
          restricted: true,
        },
      });
    }

    const vibes = await Vibe.find({ author: userId })
      .sort({ createdAt: -1 })
      .populate("author", "_id name username avatar")
      .populate("comment.user", "_id name username avatar")
      .lean();

    const formattedVibes = vibes.map((v) => formatVibe(v, currentUserId));

    return res.status(200).json({
      status: "success",
      data: {
        user,
        vibes: formattedVibes,
      },
    });
  } catch (error) {
    console.error("Get user vibes error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching user vibes.",
    });
  }
};

/**
 * GET /api/vibes/:vibeId/comments
 * Paginated comments for a vibe (newest first).
 */
const getVibeComments = async (req, res) => {
  try {
    const { vibeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vibeId)) {
      return res.status(400).json({ status: "fail", message: "Invalid vibe ID" });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const vibe = await Vibe.findById(vibeId).select("comment author").lean();
    if (!vibe) {
      return res.status(404).json({ status: "fail", message: "Vibe not found" });
    }

    const allComments = Array.isArray(vibe.comment) ? vibe.comment : [];
    const totalComments = allComments.length;

    const sortedComments = [...allComments].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    const pageSlice = sortedComments.slice(skip, skip + limit);

    const populatedDoc = await Vibe.populate(
      { comment: pageSlice },
      [{ path: "comment.user", select: "_id name username avatar" }]
    );

    const comments = populatedDoc.comment || [];
    const hasMore = skip + limit < totalComments;

    return res.status(200).json({
      status: "success",
      data: {
        comments,
        totalComments,
        page,
        limit,
        hasMore,
      },
    });
  } catch (error) {
    console.error("Get vibe comments error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch comments",
    });
  }
};

/**
 * GET /api/vibes/:vibeId
 * Get a single vibe by ID.
 */
const getVibeById = async (req, res) => {
  try {
    const currentUserId = req.user && req.user.sub;
    const { vibeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(vibeId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid vibe ID",
      });
    }

    const vibe = await Vibe.findById(vibeId)
      .populate("author", "_id name username avatar")
      .populate("comment.user", "_id name username avatar")
      .lean();

    if (!vibe) {
      return res.status(404).json({
        status: "fail",
        message: "Vibe not found",
      });
    }

    const formattedVibe = formatVibe(vibe, currentUserId);

    return res.status(200).json({
      status: "success",
      data: { vibe: formattedVibe },
    });
  } catch (error) {
    console.error("Get vibe by id error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching vibe.",
    });
  }
};

/**
 * GET /api/vibes/reels
 * Public-facing Reels feed:
 *   - Only vibes from PUBLIC accounts (author.isPrivate === false)
 *   - Never include the currently logged-in user's own vibes
 *   - All vibes are video (schema enforced)
 *   - Reuses the same engagement+recency scoring as getFeedVibes
 *   - Paginated (page/limit).
 */
const getReelsFeed = async (req, res) => {
  try {
    const currentUserId = req.user && req.user.sub;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 8));
    const skip = (page - 1) * limit;

    // 1. Fetch ALL vibes with their populated author (so we can read author.isPrivate)
    const rawVibes = await Vibe.find()
      .populate("author", "_id name username avatar isPrivate")
      .populate("comment.user", "_id name username avatar")
      .lean();

    // 2. Fetch followed authors for current viewer if logged in
    const cUserIdStr = currentUserId ? String(currentUserId) : null;
    let followedAuthorSet = new Set();
    if (currentUserId) {
      const acceptedFollows = await Follow.find({
        follower: new mongoose.Types.ObjectId(currentUserId),
        status: "accepted",
      })
        .select("following")
        .lean();
      acceptedFollows.forEach((f) => followedAuthorSet.add(String(f.following)));
    }

    // 3. Filter: include own vibes, public account vibes, or vibes from followed private accounts
    const filteredRaw = rawVibes.filter((v) => {
      if (!v || !v.author) return false;
      const authorIdStr = String(v.author._id || v.author);
      const isOwner = !!(cUserIdStr && authorIdStr === cUserIdStr);
      const isPublic = !v.author.isPrivate;
      const isFollowing = followedAuthorSet.has(authorIdStr);

      return isOwner || isPublic || isFollowing;
    });

    const now = Date.now();
    const scoredReels = filteredRaw.map((vibe) => {
      const likesCount = Array.isArray(vibe.like) ? vibe.like.length : 0;
      const commentsCount = Array.isArray(vibe.comment) ? vibe.comment.length : 0;
      const viewsCount = Array.isArray(vibe.views) ? vibe.views.length : 0;
      const hoursAge = Math.max(0.1, (now - new Date(vibe.createdAt).getTime()) / (1000 * 3600));
      // Algorithmic ranking score (same formula as getFeedVibes — reuse existing scoring)
      const engagementScore =
        (likesCount * 3 + commentsCount * 5 + viewsCount * 1 + 1) /
        Math.pow(hoursAge + 2, 1.5);
      return { vibe, score: engagementScore };
    });

    scoredReels.sort((a, b) => b.score - a.score);

    const totalFiltered = scoredReels.length;
    const paginatedScored = scoredReels.slice(skip, skip + limit);

    const formattedReels = paginatedScored.map((item) =>
      formatVibe(item.vibe, currentUserId)
    );

    // Also fetch current user's follow status per author in one pass
    let viewerToAuthorMap = {};
    let authorToViewerMap = {};
    if (currentUserId) {
      const authorIds = [
        ...new Set(
          formattedReels
            .map((r) => r?.author?._id)
            .filter((id) => !!id && String(id) !== cUserIdStr)
            .map((id) => new mongoose.Types.ObjectId(id)),
        ),
      ];
      if (authorIds.length) {
        const [viewerRows, authorRows] = await Promise.all([
          Follow.find({
            follower: new mongoose.Types.ObjectId(currentUserId),
            following: { $in: authorIds },
          })
            .select("following status")
            .lean(),
          Follow.find({
            follower: { $in: authorIds },
            following: new mongoose.Types.ObjectId(currentUserId),
          })
            .select("follower status")
            .lean(),
        ]);
        viewerRows.forEach((r) => {
          viewerToAuthorMap[String(r.following)] = r.status;
        });
        authorRows.forEach((r) => {
          authorToViewerMap[String(r.follower)] = r.status;
        });
      }
    }

    const reels = formattedReels.map((r) => {
      const authorIdStr = String(r?.author?._id);
      const viewerTo = viewerToAuthorMap[authorIdStr];
      const authorTo = authorToViewerMap[authorIdStr];
      return {
        ...r,
        author: {
          ...(r.author || {}),
          isFollowing: viewerTo === "accepted",
          isFollowRequested: viewerTo === "pending",
          isFollower: authorTo === "accepted",
          isReceivedPendingRequest: authorTo === "pending",
        },
      };
    });

    return res.status(200).json({
      status: "success",
      data: {
        reels,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages: Math.ceil(totalFiltered / limit),
          hasMore: skip + limit < totalFiltered,
        },
      },
    });
  } catch (error) {
    console.error("getReelsFeed error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching reels feed.",
    });
  }
};

module.exports = {
  createVibe,
  editVibe,
  deleteVibe,
  toggleLikeVibe,
  addComment,
  editComment,
  deleteComment,
  toggleSaveVibe,
  getSavedVibes,
  recordVibeView,
  getFeedVibes,
  getUserVibes,
  getVibeById,
  getVibeComments,
  getReelsFeed,
};

