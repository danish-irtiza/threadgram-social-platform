const express = require("express")
const router = express.Router()
const { isAuth, optionalAuth } = require("../middlewares/isAuth")
const {
  sendFollowRequest,
  acceptFollowRequest,
  rejectFollowRequest,
  unfollow,
  cancelFollowRequest,
  getFollowers,
  getFollowing,
  getPendingRequests,
} = require("../controllers/follow.controller")

// ─── Follow actions ────────────────────────────────────────────────────────────
// Follow or send request
router.post("/:targetUserId/follow", isAuth, sendFollowRequest)

// Accept a pending request (owner accepts)
router.post("/:requesterId/accept", isAuth, acceptFollowRequest)

// Reject / decline a pending request (owner rejects)
router.delete("/:requesterId/reject", isAuth, rejectFollowRequest)

// Unfollow (remove accepted relationship)
router.delete("/:targetUserId/unfollow", isAuth, unfollow)

// Cancel your own pending request
router.delete("/:targetUserId/cancel", isAuth, cancelFollowRequest)

// ─── List endpoints ────────────────────────────────────────────────────────────
// All pending requests for the logged-in user
router.get("/requests", isAuth, getPendingRequests)

// Followers / following lists for any user
router.get("/:userId/followers", optionalAuth, getFollowers)
router.get("/:userId/following", optionalAuth, getFollowing)

module.exports = router
