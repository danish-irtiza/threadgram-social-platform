const mongoose = require("mongoose")
const User = require("../models/user.model")
const Follow = require("../models/follow.model")

/**
 * POST /api/follow/:targetUserId/follow
 * Send a follow request (or directly follow if public account).
 */
const sendFollowRequest = async (req, res) => {
  try {
    const viewerId = req.user && req.user.sub
    const { targetUserId } = req.params

    if (!viewerId) {
      return res.status(401).json({ status: "fail", message: "Authentication required" })
    }

    if (viewerId.toString() === targetUserId.toString()) {
      return res.status(400).json({ status: "fail", message: "You cannot follow yourself" })
    }

    const targetUser = await User.findById(targetUserId).select("isPrivate")
    if (!targetUser) {
      return res.status(404).json({ status: "fail", message: "User not found" })
    }

    // Check if a relationship already exists
    const existing = await Follow.findOne({
      follower: viewerId,
      following: targetUserId,
    })

    if (existing) {
      const label = existing.status === "pending" ? "Follow request already sent" : "Already following"
      return res.status(409).json({ status: "fail", message: label })
    }

    const status = targetUser.isPrivate ? "pending" : "accepted"

    const follow = await Follow.create({
      follower: viewerId,
      following: targetUserId,
      status,
    })

    return res.status(201).json({
      status: "success",
      message: status === "pending" ? "Follow request sent" : "Now following",
      data: { followStatus: follow.status },
    })
  } catch (error) {
    console.error("sendFollowRequest error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

/**
 * POST /api/follow/:requesterId/accept
 * Accept a pending follow request (called by the account owner).
 */
const acceptFollowRequest = async (req, res) => {
  try {
    const ownerId = req.user && req.user.sub
    const { requesterId } = req.params

    if (!ownerId) {
      return res.status(401).json({ status: "fail", message: "Authentication required" })
    }

    const follow = await Follow.findOne({
      follower: requesterId,
      following: ownerId,
      status: "pending",
    })

    if (!follow) {
      return res.status(404).json({ status: "fail", message: "No pending request found" })
    }

    follow.status = "accepted"
    await follow.save()

    return res.status(200).json({
      status: "success",
      message: "Follow request accepted",
      data: { followStatus: "accepted" },
    })
  } catch (error) {
    console.error("acceptFollowRequest error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

/**
 * DELETE /api/follow/:requesterId/reject
 * Reject / decline a pending follow request (called by the account owner).
 */
const rejectFollowRequest = async (req, res) => {
  try {
    const ownerId = req.user && req.user.sub
    const { requesterId } = req.params

    if (!ownerId) {
      return res.status(401).json({ status: "fail", message: "Authentication required" })
    }

    const deleted = await Follow.findOneAndDelete({
      follower: requesterId,
      following: ownerId,
      status: "pending",
    })

    if (!deleted) {
      return res.status(404).json({ status: "fail", message: "No pending request found" })
    }

    return res.status(200).json({ status: "success", message: "Follow request rejected" })
  } catch (error) {
    console.error("rejectFollowRequest error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

/**
 * DELETE /api/follow/:targetUserId/unfollow
 * Unfollow a user (removes accepted relationship, called by the follower).
 */
const unfollow = async (req, res) => {
  try {
    const viewerId = req.user && req.user.sub
    const { targetUserId } = req.params

    if (!viewerId) {
      return res.status(401).json({ status: "fail", message: "Authentication required" })
    }

    const deleted = await Follow.findOneAndDelete({
      follower: viewerId,
      following: targetUserId,
      status: "accepted",
    })

    if (!deleted) {
      return res.status(404).json({ status: "fail", message: "You are not following this user" })
    }

    return res.status(200).json({ status: "success", message: "Unfollowed successfully" })
  } catch (error) {
    console.error("unfollow error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

/**
 * DELETE /api/follow/:targetUserId/cancel
 * Cancel a pending follow request (called by the requester before acceptance).
 */
const cancelFollowRequest = async (req, res) => {
  try {
    const viewerId = req.user && req.user.sub
    const { targetUserId } = req.params

    if (!viewerId) {
      return res.status(401).json({ status: "fail", message: "Authentication required" })
    }

    const deleted = await Follow.findOneAndDelete({
      follower: viewerId,
      following: targetUserId,
      status: "pending",
    })

    if (!deleted) {
      return res.status(404).json({ status: "fail", message: "No pending request to cancel" })
    }

    return res.status(200).json({ status: "success", message: "Follow request cancelled" })
  } catch (error) {
    console.error("cancelFollowRequest error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

/**
 * GET /api/follow/:userId/followers
 * List all accepted followers of a user.
 */
const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 20
    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
      Follow.find({ following: userId, status: "accepted" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("follower", "_id name username avatar bio isPrivate"),
      Follow.countDocuments({ following: userId, status: "accepted" }),
    ])

    return res.status(200).json({
      status: "success",
      data: {
        followers: docs.map((d) => d.follower),
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("getFollowers error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

/**
 * GET /api/follow/:userId/following
 * List all users that a user is following (accepted).
 */
const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 20
    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
      Follow.find({ follower: userId, status: "accepted" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("following", "_id name username avatar bio isPrivate"),
      Follow.countDocuments({ follower: userId, status: "accepted" }),
    ])

    return res.status(200).json({
      status: "success",
      data: {
        following: docs.map((d) => d.following),
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("getFollowing error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

/**
 * GET /api/follow/requests
 * List all pending follow requests received by the logged-in user.
 */
const getPendingRequests = async (req, res) => {
  try {
    const ownerId = req.user && req.user.sub
    if (!ownerId) {
      return res.status(401).json({ status: "fail", message: "Authentication required" })
    }

    const docs = await Follow.find({ following: ownerId, status: "pending" })
      .sort({ createdAt: -1 })
      .populate("follower", "_id name username avatar bio isPrivate")

    return res.status(200).json({
      status: "success",
      data: { requests: docs.map((d) => d.follower), total: docs.length },
    })
  } catch (error) {
    console.error("getPendingRequests error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

module.exports = {
  sendFollowRequest,
  acceptFollowRequest,
  rejectFollowRequest,
  unfollow,
  cancelFollowRequest,
  getFollowers,
  getFollowing,
  getPendingRequests,
}
