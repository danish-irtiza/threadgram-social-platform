const express = require("express");
const router = express.Router();
const { isAuth, optionalAuth } = require("../middlewares/isAuth");
const upload = require("../middlewares/multer");
const {
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
} = require("../controllers/post.controller");

// ─── Feed & listing (authenticated only) ──────────────────────────────────────
// Feed (all posts, paginated)
router.get("/feed", isAuth, getFeedPosts);

// Posts by a specific user
router.get("/user/:userId", isAuth, getUserPosts);

// Saved posts of logged-in user
router.get("/saved", isAuth, getSavedPosts);

// ─── Post CRUD ─────────────────────────────────────────────────────────────────
// Create post
router.post("/", isAuth, upload.array("media", 10), createPost);

// Delete post (owner only)
router.delete("/:postId", isAuth, deletePost);

// ─── Like ──────────────────────────────────────────────────────────────────────
router.post("/:postId/like", isAuth, toggleLikePost);

// ─── Save / Bookmark ───────────────────────────────────────────────────────────
router.post("/:postId/save", isAuth, toggleSavePost);

// ─── Comments & Replies ────────────────────────────────────────────────────────
// Paginated comments for a post
router.get("/:postId/comments", isAuth, getPostComments);

// Add comment
router.post("/:postId/comment", isAuth, addComment);

// Edit comment (comment author only)
router.put("/:postId/comment/:commentId", isAuth, editComment);

// Delete comment (comment author OR post owner)
router.delete("/:postId/comment/:commentId", isAuth, deleteComment);

// Add reply to comment
router.post("/:postId/comment/:commentId/reply", isAuth, addReply);

// Edit reply (reply author only)
router.put("/:postId/comment/:commentId/reply/:replyId", isAuth, editReply);

// Delete reply (reply author, comment author, OR post owner)
router.delete("/:postId/comment/:commentId/reply/:replyId", isAuth, deleteReply);

module.exports = router;


