const mongoose = require("mongoose");
const Post = require("../models/post.model");
const User = require("../models/user.model");
const uploadOnCloudinary = require("../config/cloudinary");
const { uploadVideoOnCloudinary } = require("../config/cloudinary");
const {
  createPostSchema,
  commentPostSchema,
} = require("../validators/post.validators");

const extractValidationErrors = (error) => {
  const errors = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  });
  return errors;
};

/**
 * POST /api/posts
 * Create a new post with image/video media upload and caption.
 */
const createPost = async (req, res) => {
  try {
    const authorId = req.user && req.user.sub;
    if (!authorId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    // Validate request file (single or array)
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({
        status: "fail",
        message: "Media file (image or video) is required",
      });
    }

    // Validate caption
    const validated = createPostSchema.safeParse(req.body || {});
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

    // Detect mediaType (image or video)
    const mime = file.mimetype || "";
    let mediaType = "image";
    if (mime.startsWith("video/")) {
      mediaType = "video";
    } else if (!mime.startsWith("image/")) {
      return res.status(400).json({
        status: "fail",
        message: "Only image and video files are supported",
      });
    }

    // Upload to Cloudinary
    let mediaUrl = null;
    if (mediaType === "video") {
      const videoResult = await uploadVideoOnCloudinary(file.path);
      mediaUrl = videoResult ? (videoResult.url || videoResult.secure_url) : null;
    } else {
      mediaUrl = await uploadOnCloudinary(file.path);
    }

    if (!mediaUrl) {
      return res.status(500).json({
        status: "error",
        message: "Failed to upload media to Cloudinary",
      });
    }

    // Create post in DB
    const post = await Post.create({
      author: authorId,
      mediaType,
      media: mediaUrl,
      caption,
    });

    // Push post ID to author's user document
    await User.findByIdAndUpdate(authorId, {
      $push: { posts: post._id },
    });

    // Populate author details for response
    await post.populate("author", "_id name username avatar");

    return res.status(201).json({
      status: "success",
      message: "Post created successfully",
      data: { post },
    });
  } catch (error) {
    console.error("Create post error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while creating post.",
    });
  }
};

/**
 * POST /api/posts/:postId/like
 * Toggle like/unlike on a post for the logged-in user.
 */
const toggleLikePost = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "Post not found",
      });
    }

    const isLiked = Array.isArray(post.like) && post.like.some(
      (id) => id.toString() === userId.toString()
    );

    if (isLiked) {
      await Post.findByIdAndUpdate(postId, {
        $pull: { like: userId },
      });

      return res.status(200).json({
        status: "success",
        message: "Post unliked",
        isLiked: false,
        likesCount: post.like.length - 1,
      });
    } else {
      await Post.findByIdAndUpdate(postId, {
        $addToSet: { like: userId },
      });

      return res.status(200).json({
        status: "success",
        message: "Post liked",
        isLiked: true,
        likesCount: post.like.length + 1,
      });
    }
  } catch (error) {
    console.error("Toggle like post error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while liking post.",
    });
  }
};

/**
 * POST /api/posts/:postId/comment
 * Add a comment to a post.
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

    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid post ID",
      });
    }

    // Validate comment text
    const validated = commentPostSchema.safeParse(req.body);
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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "Post not found",
      });
    }

    const newComment = {
      user: userId,
      text: comment,
      createdAt: new Date(),
    };

    post.comment.push(newComment);
    await post.save();

    // The pushed subdoc gets an _id from Mongoose
    const savedComment = post.comment[post.comment.length - 1];

    // Populate the commenter's info for the response
    await post.populate("comment.user", "_id name username avatar");
    const populatedComment = post.comment.id(savedComment._id);

    return res.status(201).json({
      status: "success",
      message: "Comment added",
      data: {
        comment: populatedComment,
        commentsCount: post.comment.length,
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
 * PUT /api/posts/:postId/comment/:commentId
 * Edit an existing comment — only the comment author can edit.
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

    const { postId, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid post or comment ID",
      });
    }

    // Validate updated text
    const validated = commentPostSchema.safeParse(req.body);
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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "Post not found",
      });
    }

    const existingComment = post.comment.id(commentId);
    if (!existingComment) {
      return res.status(404).json({
        status: "fail",
        message: "Comment not found",
      });
    }

    // Only the comment author can edit
    if (existingComment.user.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to edit this comment",
      });
    }

    // One-time edit restriction: once edited, a comment cannot be edited again
    if (existingComment.isEdited) {
      return res.status(400).json({
        status: "fail",
        message: "This comment has already been edited and cannot be edited again.",
      });
    }

    existingComment.text = comment;
    existingComment.isEdited = true;
    existingComment.editedAt = new Date();
    await post.save();

    await post.populate([
      { path: "comment.user", select: "_id name username avatar" },
      { path: "comment.replies.user", select: "_id name username avatar" },
    ]);
    const updatedComment = post.comment.id(commentId);

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
 * DELETE /api/posts/:postId/comment/:commentId
 * Delete a comment. Allowed for the comment author OR the post owner.
 */
const deleteComment = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Authentication required" });
    }

    const { postId, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ status: "fail", message: "Invalid ID(s)" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ status: "fail", message: "Post not found" });
    }

    const comment = post.comment.id(commentId);
    if (!comment) {
      return res.status(404).json({ status: "fail", message: "Comment not found" });
    }

    const isCommentAuthor = String(comment.user) === String(userId);
    const isPostOwner = String(post.author) === String(userId);

    if (!isCommentAuthor && !isPostOwner) {
      return res.status(403).json({ status: "fail", message: "You are not authorized to delete this comment" });
    }

    post.comment.pull({ _id: commentId });
    await post.save();

    return res.status(200).json({
      status: "success",
      message: "Comment deleted",
      data: { commentsCount: post.comment.length },
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
 * POST /api/posts/:postId/comment/:commentId/reply
 * Add a reply to a comment. Any authorized user can reply.
 */
const addReply = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { postId, commentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid post or comment ID",
      });
    }

    const validated = commentPostSchema.safeParse(req.body);
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

    const { comment: replyText } = validated.data;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "Post not found",
      });
    }

    const parentComment = post.comment.id(commentId);
    if (!parentComment) {
      return res.status(404).json({
        status: "fail",
        message: "Parent comment not found",
      });
    }

    parentComment.replies.push({
      user: userId,
      text: replyText,
    });

    await post.save();

    await post.populate([
      { path: "comment.user", select: "_id name username avatar" },
      { path: "comment.replies.user", select: "_id name username avatar" },
    ]);

    const updatedComment = post.comment.id(commentId);

    return res.status(201).json({
      status: "success",
      message: "Reply added",
      data: { comment: updatedComment },
    });
  } catch (error) {
    console.error("Add reply error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while adding reply.",
    });
  }
};

/**
 * PUT /api/posts/:postId/comment/:commentId/reply/:replyId
 * Edit a reply — only the reply author can edit, and only ONCE.
 */
const editReply = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { postId, commentId, replyId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(postId) ||
      !mongoose.Types.ObjectId.isValid(commentId) ||
      !mongoose.Types.ObjectId.isValid(replyId)
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid parameters",
      });
    }

    const validated = commentPostSchema.safeParse(req.body);
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

    const { comment: replyText } = validated.data;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "Post not found",
      });
    }

    const parentComment = post.comment.id(commentId);
    if (!parentComment) {
      return res.status(404).json({
        status: "fail",
        message: "Parent comment not found",
      });
    }

    const reply = parentComment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({
        status: "fail",
        message: "Reply not found",
      });
    }

    if (reply.user.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to edit this reply",
      });
    }

    if (reply.isEdited) {
      return res.status(400).json({
        status: "fail",
        message: "This reply has already been edited and cannot be edited again.",
      });
    }

    reply.text = replyText;
    reply.isEdited = true;
    reply.editedAt = new Date();

    await post.save();

    await post.populate([
      { path: "comment.user", select: "_id name username avatar" },
      { path: "comment.replies.user", select: "_id name username avatar" },
    ]);

    const updatedComment = post.comment.id(commentId);

    return res.status(200).json({
      status: "success",
      message: "Reply updated",
      data: { comment: updatedComment },
    });
  } catch (error) {
    console.error("Edit reply error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while editing reply.",
    });
  }
};

/**
 * DELETE /api/posts/:postId/comment/:commentId/reply/:replyId
 * Delete a reply — reply author, parent comment author, OR post owner can delete.
 */
const deleteReply = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { postId, commentId, replyId } = req.params;
    if (
      !mongoose.Types.ObjectId.isValid(postId) ||
      !mongoose.Types.ObjectId.isValid(commentId) ||
      !mongoose.Types.ObjectId.isValid(replyId)
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid parameters",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "Post not found",
      });
    }

    const parentComment = post.comment.id(commentId);
    if (!parentComment) {
      return res.status(404).json({
        status: "fail",
        message: "Parent comment not found",
      });
    }

    const reply = parentComment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({
        status: "fail",
        message: "Reply not found",
      });
    }

    const isReplyAuthor = reply.user.toString() === userId.toString();
    const isCommentAuthor = parentComment.user.toString() === userId.toString();
    const isPostOwner = post.author.toString() === userId.toString();

    if (!isReplyAuthor && !isCommentAuthor && !isPostOwner) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to delete this reply",
      });
    }

    parentComment.replies.pull(replyId);
    await post.save();

    await post.populate([
      { path: "comment.user", select: "_id name username avatar" },
      { path: "comment.replies.user", select: "_id name username avatar" },
    ]);

    const updatedComment = post.comment.id(commentId);

    return res.status(200).json({
      status: "success",
      message: "Reply deleted",
      data: { comment: updatedComment },
    });
  } catch (error) {
    console.error("Delete reply error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while deleting reply.",
    });
  }
};

/**
 * DELETE /api/posts/:postId
 * Delete a post — only the post owner can delete.
 */
const deletePost = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "Post not found",
      });
    }

    // Only the post owner can delete
    if (post.author.toString() !== userId.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to delete this post",
      });
    }

    await Post.findByIdAndDelete(postId);

    // Remove from author's posts array
    await User.findByIdAndUpdate(userId, {
      $pull: { posts: postId },
    });

    // Remove from all users' savedPosts arrays
    await User.updateMany(
      { savedPosts: postId },
      { $pull: { savedPosts: postId } }
    );

    return res.status(200).json({
      status: "success",
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while deleting post.",
    });
  }
};

/**
 * POST /api/posts/:postId/save
 * Toggle saving/bookmarking a post for the logged-in user.
 */
const toggleSavePost = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid post ID",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        status: "fail",
        message: "Post not found",
      });
    }

    const isSaved = Array.isArray(post.savedPost) && post.savedPost.some(
      (id) => id.toString() === userId.toString()
    );

    if (isSaved) {
      // Remove user from post.savedPost array and post from user.savedPosts array
      await Post.findByIdAndUpdate(postId, {
        $pull: { savedPost: userId },
      });
      await User.findByIdAndUpdate(userId, {
        $pull: { savedPosts: postId },
      });

      return res.status(200).json({
        status: "success",
        message: "Post removed from saved",
        isSaved: false,
      });
    } else {
      // Add user to post.savedPost array and post to user.savedPosts array
      await Post.findByIdAndUpdate(postId, {
        $addToSet: { savedPost: userId },
      });
      await User.findByIdAndUpdate(userId, {
        $addToSet: { savedPosts: postId },
      });

      return res.status(200).json({
        status: "success",
        message: "Post saved successfully",
        isSaved: true,
      });
    }
  } catch (error) {
    console.error("Toggle save post error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while saving post.",
    });
  }
};

/**
 * GET /api/posts/saved
 * Get all posts saved by the authenticated user.
 */
const getSavedPosts = async (req, res) => {
  try {
    const userId = req.user && req.user.sub;
    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      });
    }

    const user = await User.findById(userId).populate({
      path: "savedPosts",
      populate: [
        { path: "author", select: "_id name username avatar" },
        { path: "comment.user", select: "_id name username avatar" },
        { path: "comment.replies.user", select: "_id name username avatar" },
      ],
    });

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: {
        savedPosts: user.savedPosts || [],
      },
    });
  } catch (error) {
    console.error("Get saved posts error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching saved posts.",
    });
  }
};

/**
 * GET /api/posts/feed
 * Get paginated feed posts (all public posts, newest first).
 */
const getFeedPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "_id name username avatar")
      .populate("comment.user", "_id name username avatar")
      .populate("comment.replies.user", "_id name username avatar")
      .lean();

    // Attach computed counts for each post
    const postsWithCounts = posts.map((p) => ({
      ...p,
      likesCount: Array.isArray(p.like) ? p.like.length : 0,
      commentsCount: Array.isArray(p.comment) ? p.comment.length : 0,
    }));

    return res.status(200).json({
      status: "success",
      data: {
        posts: postsWithCounts,
        pagination: {
          page,
          limit,
          totalPosts,
          totalPages: Math.ceil(totalPosts / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get feed posts error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching feed.",
    });
  }
};

/**
 * GET /api/posts/user/:userId
 * Get all posts by a specific user (newest first).
 */
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(userId).select("_id name username avatar");
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    const posts = await Post.find({ author: userId })
      .sort({ createdAt: -1 })
      .populate("author", "_id name username avatar")
      .populate("comment.user", "_id name username avatar")
      .populate("comment.replies.user", "_id name username avatar")
      .lean();

    const postsWithCounts = posts.map((p) => ({
      ...p,
      likesCount: Array.isArray(p.like) ? p.like.length : 0,
      commentsCount: Array.isArray(p.comment) ? p.comment.length : 0,
    }));

    return res.status(200).json({
      status: "success",
      data: {
        user,
        posts: postsWithCounts,
      },
    });
  } catch (error) {
    console.error("Get user posts error:", error);
    return res.status(500).json({
      status: "error",
      message: error && error.message ? error.message : "Something went wrong while fetching user posts.",
    });
  }
};

/**
 * GET /api/posts/:postId/comments?page=1&limit=20
 * Paginated retrieval of comments for a post (sorted newest first).
 */
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ status: "fail", message: "Invalid post ID" });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const post = await Post.findById(postId).select("comment author").lean();
    if (!post) {
      return res.status(404).json({ status: "fail", message: "Post not found" });
    }

    const allComments = Array.isArray(post.comment) ? post.comment : [];
    const totalComments = allComments.length;

    // Sort comments newest first
    const sortedComments = [...allComments].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    const pageSlice = sortedComments.slice(skip, skip + limit);

    // Populate user details for the requested comments slice
    const populatedDoc = await Post.populate(
      { comment: pageSlice },
      [
        { path: "comment.user", select: "_id name username avatar" },
        { path: "comment.replies.user", select: "_id name username avatar" },
      ]
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
    console.error("Get post comments error:", error);
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch comments",
    });
  }
};

module.exports = {
  createPost,
  toggleLikePost,
  addComment,
  editComment,
  deleteComment,
  addReply,
  editReply,
  deleteReply,
  deletePost,
  toggleSavePost,
  getSavedPosts,
  getFeedPosts,
  getUserPosts,
  getPostComments,
};

