const express = require("express");
const router = express.Router();
const { isAuth } = require("../middlewares/isAuth");
const upload = require("../middlewares/multer");
const {
  createStory,
  getFeedStories,
  getUserStories,
  getStoryById,
  markStoryAsViewed,
  toggleLikeStory,
  deleteStory,
  getStoryViewers,
} = require("../controllers/story.controller");

// ─── Feed & User Stories ───────────────────────────────────────────────────────
// Get aggregated 24h stories feed (self + followed users)
router.get("/feed", isAuth, getFeedStories);

// Get active stories for a specific user
router.get("/user/:userId", isAuth, getUserStories);

// Get single story by ID
router.get("/:storyId", isAuth, getStoryById);

// Get story viewers (author only)
router.get("/:storyId/viewers", isAuth, getStoryViewers);

// ─── Story CRUD & Interactions ────────────────────────────────────────────────
// Create story (image or video upload)
router.post("/", isAuth, upload.single("media"), createStory);

// Mark story as viewed
router.post("/:storyId/view", isAuth, markStoryAsViewed);

// Toggle like story
router.post("/:storyId/like", isAuth, toggleLikeStory);

// Delete story (author only)
router.delete("/:storyId", isAuth, deleteStory);

module.exports = router;

