const express = require("express");
const router = express.Router();
const { isAuth, optionalAuth } = require("../middlewares/isAuth");
const { upload, handleMulterError } = require("../middlewares/multer");
const {
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
} = require("../controllers/vibe.controller");

// ─── Feed & listing (authenticated only) ───────────────────────
// Public Reels feed (authenticated only, public accounts only, excludes current user's own vibes, scored)
router.get("/reels", isAuth, getReelsFeed);

// Feed (all vibes, paginated)
router.get("/feed", isAuth, getFeedVibes);

// Vibes by a specific user
router.get("/user/:userId", isAuth, getUserVibes);

// Saved vibes of logged-in user
router.get("/saved", isAuth, getSavedVibes);

// Get single vibe by ID
router.get("/:vibeId", isAuth, getVibeById);

// ─── Vibe CRUD ─────────────────────────────────────────────────────────────────
// Create vibe (video upload)
router.post("/", isAuth, upload.single("media"), handleMulterError, createVibe);

// Edit vibe caption
router.put("/:vibeId", isAuth, editVibe);

// Delete vibe (owner only)
router.delete("/:vibeId", isAuth, deleteVibe);

// ─── Views ─────────────────────────────────────────────────────────────────────
router.post("/:vibeId/view", isAuth, recordVibeView);

// ─── Like ──────────────────────────────────────────────────────────────────────
router.post("/:vibeId/like", isAuth, toggleLikeVibe);

// ─── Save / Bookmark ───────────────────────────────────────────────────────────
router.post("/:vibeId/save", isAuth, toggleSaveVibe);

// ─── Comments ──────────────────────────────────────────────────────────────────
// Paginated comments for a vibe
router.get("/:vibeId/comments", isAuth, getVibeComments);

// Add comment
router.post("/:vibeId/comment", isAuth, addComment);

// Edit comment (comment author only)
router.put("/:vibeId/comment/:commentId", isAuth, editComment);

// Delete comment (comment author OR vibe owner)
router.delete("/:vibeId/comment/:commentId", isAuth, deleteComment);

module.exports = router;

