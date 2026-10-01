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
      console.log(
        `[sendFollowRequest] CONFLICT viewer=${viewerId} → target=${targetUserId}` +
        ` existingStatus=${existing.status}`
      )
      return res.status(409).json({ status: "fail", message: label })
    }

    const status = targetUser.isPrivate ? "pending" : "accepted"

    const follow = await Follow.create({
      follower: viewerId,
      following: targetUserId,
      status,
    })

    // Compute updated counts from Follow collection (source of truth)
    const [viewerFollowingCount, targetFollowerCount] = await Promise.all([
      Follow.countDocuments({ follower: viewerId, status: "accepted" }),
      Follow.countDocuments({ following: targetUserId, status: "accepted" }),
    ])

    console.log(
      `[sendFollowRequest] CREATED follower=${viewerId} → following=${targetUserId}` +
      ` targetIsPrivate=${targetUser.isPrivate} status=${follow.status}` +
      ` viewerFollowingCount=${viewerFollowingCount} targetFollowerCount=${targetFollowerCount}`
    )

    return res.status(201).json({
      status: "success",
      message: status === "pending" ? "Follow request sent" : "Now following",
      data: {
        followStatus: follow.status,
        viewerFollowingCount,
        targetFollowerCount,
      },
    })
  } catch (error) {
    console.error("[sendFollowRequest] error:", error)
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
      console.log(
        `[acceptFollowRequest] NOT_FOUND requester=${requesterId} → owner=${ownerId}`
      )
      return res.status(404).json({ status: "fail", message: "No pending request found" })
    }

    follow.status = "accepted"
    await follow.save()

    // Counts: requester gains 1 following; owner gains 1 follower
    const [requesterFollowingCount, ownerFollowerCount] = await Promise.all([
      Follow.countDocuments({ follower: requesterId, status: "accepted" }),
      Follow.countDocuments({ following: ownerId, status: "accepted" }),
    ])

    console.log(
      `[acceptFollowRequest] ACCEPTED requester=${requesterId} → owner=${ownerId}` +
      ` requesterFollowingCount=${requesterFollowingCount} ownerFollowerCount=${ownerFollowerCount}`
    )

    return res.status(200).json({
      status: "success",
      message: "Follow request accepted",
      data: {
        followStatus: "accepted",
        requesterFollowingCount,
        ownerFollowerCount,
      },
    })
  } catch (error) {
    console.error("[acceptFollowRequest] error:", error)
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
      console.log(
        `[rejectFollowRequest] NOT_FOUND requester=${requesterId} → owner=${ownerId}`
      )
      return res.status(404).json({ status: "fail", message: "No pending request found" })
    }

    console.log(
      `[rejectFollowRequest] REJECTED requester=${requesterId} → owner=${ownerId}`
    )

    return res.status(200).json({ status: "success", message: "Follow request rejected" })
  } catch (error) {
    console.error("[rejectFollowRequest] error:", error)
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
      console.log(
        `[unfollow] NOT_FOUND viewer=${viewerId} → target=${targetUserId}`
      )
      return res.status(404).json({ status: "fail", message: "You are not following this user" })
    }

    const [viewerFollowingCount, targetFollowerCount] = await Promise.all([
      Follow.countDocuments({ follower: viewerId, status: "accepted" }),
      Follow.countDocuments({ following: targetUserId, status: "accepted" }),
    ])

    console.log(
      `[unfollow] REMOVED follower=${viewerId} → following=${targetUserId}` +
      ` viewerFollowingCount=${viewerFollowingCount} targetFollowerCount=${targetFollowerCount}`
    )

    return res.status(200).json({
      status: "success",
      message: "Unfollowed successfully",
      data: { viewerFollowingCount, targetFollowerCount },
    })
  } catch (error) {
    console.error("[unfollow] error:", error)
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
      console.log(
        `[cancelFollowRequest] NOT_FOUND viewer=${viewerId} → target=${targetUserId}`
      )
      return res.status(404).json({ status: "fail", message: "No pending request to cancel" })
    }

    console.log(
      `[cancelFollowRequest] CANCELLED follower=${viewerId} → following=${targetUserId}`
    )

    return res.status(200).json({ status: "success", message: "Follow request cancelled" })
  } catch (error) {
    console.error("[cancelFollowRequest] error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

/**
 * GET /api/follow/:userId/followers
 * List all accepted followers of a user.
 */
const getFollowers = async (req, res) => {
  try {
    const viewerId = req.user && req.user.sub
    const { userId } = req.params
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 20
    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
      Follow.find({ following: userId, status: "accepted" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("follower", "_id name username avatar bio isPrivate")
        .lean(),
      Follow.countDocuments({ following: userId, status: "accepted" }),
    ])

    let followers = docs.map((d) => d.follower).filter(Boolean)

    // Inject relationship flags between viewer and each follower
    if (viewerId && followers.length > 0) {
      const followerIds = followers
        .map((u) => u && u._id)
        .filter(Boolean)
        .map((id) => new mongoose.Types.ObjectId(id))

      if (followerIds.length > 0) {
        const [viewerToUsers, usersToViewer] = await Promise.all([
          Follow.find({
            follower: new mongoose.Types.ObjectId(viewerId),
            following: { $in: followerIds },
          })
            .select("following status")
            .lean(),
          Follow.find({
            follower: { $in: followerIds },
            following: new mongoose.Types.ObjectId(viewerId),
          })
            .select("follower status")
            .lean(),
        ])

        const viewerToMap = {}
        viewerToUsers.forEach((r) => {
          viewerToMap[String(r.following)] = r.status
        })
        const userToViewerMap = {}
        usersToViewer.forEach((r) => {
          userToViewerMap[String(r.follower)] = r.status
        })

        followers = followers.map((u) => {
          if (!u || !u._id) return u
          const uidStr = String(u._id)
          const viewerTo = viewerToMap[uidStr] // viewer → user (follower)
          const userTo = userToViewerMap[uidStr] // user (follower) → viewer
          return {
            ...u,
            isFollowing: viewerTo === "accepted",
            isRequested: viewerTo === "pending",
            isFollower: userTo === "accepted",
            isReceivedPendingRequest: userTo === "pending",
          }
        })
      }
    } else if (!viewerId) {
      followers = followers.map((u) => ({
        ...u,
        isFollowing: false,
        isRequested: false,
        isFollower: false,
        isReceivedPendingRequest: false,
      }))
    }

    console.log(
      `[getFollowers] userId=${userId} viewer=${viewerId || 'guest'}` +
      ` total=${total} page=${page} returned=${followers.length}`
    )

    return res.status(200).json({
      status: "success",
      data: {
        followers,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[getFollowers] error:", error)
    res.status(500).json({ status: "error", message: "Something went wrong" })
  }
}

/**
 * GET /api/follow/:userId/following
 * List all users that a user is following (accepted).
 */
const getFollowing = async (req, res) => {
  try {
    const viewerId = req.user && req.user.sub
    const { userId } = req.params
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 20
    const skip = (page - 1) * limit

    const [docs, total] = await Promise.all([
      Follow.find({ follower: userId, status: "accepted" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("following", "_id name username avatar bio isPrivate")
        .lean(),
      Follow.countDocuments({ follower: userId, status: "accepted" }),
    ])

    let following = docs.map((d) => d.following).filter(Boolean)

    // Inject relationship flags between viewer and each followed user
    if (viewerId && following.length > 0) {
      const followingIds = following
        .map((u) => u && u._id)
        .filter(Boolean)
        .map((id) => new mongoose.Types.ObjectId(id))

      if (followingIds.length > 0) {
        const [viewerToUsers, usersToViewer] = await Promise.all([
          Follow.find({
            follower: new mongoose.Types.ObjectId(viewerId),
            following: { $in: followingIds },
          })
            .select("following status")
            .lean(),
          Follow.find({
            follower: { $in: followingIds },
            following: new mongoose.Types.ObjectId(viewerId),
          })
            .select("follower status")
            .lean(),
        ])

        const viewerToMap = {}
        viewerToUsers.forEach((r) => {
          viewerToMap[String(r.following)] = r.status
        })
        const userToViewerMap = {}
        usersToViewer.forEach((r) => {
          userToViewerMap[String(r.follower)] = r.status
        })

        following = following.map((u) => {
          if (!u || !u._id) return u
          const uidStr = String(u._id)
          const viewerTo = viewerToMap[uidStr]
          const userTo = userToViewerMap[uidStr]
          return {
            ...u,
            isFollowing: viewerTo === "accepted",
            isRequested: viewerTo === "pending",
            isFollower: userTo === "accepted",
            isReceivedPendingRequest: userTo === "pending",
          }
        })
      }
    } else if (!viewerId) {
      following = following.map((u) => ({
        ...u,
        isFollowing: false,
        isRequested: false,
        isFollower: false,
        isReceivedPendingRequest: false,
      }))
    }

    console.log(
      `[getFollowing] userId=${userId} viewer=${viewerId || 'guest'}` +
      ` total=${total} page=${page} returned=${following.length}`
    )

    return res.status(200).json({
      status: "success",
      data: {
        following,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[getFollowing] error:", error)
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
      .lean()

    let requesters = docs.map((d) => d.follower).filter(Boolean)

    // Inject viewer (owner) relationship flags per requester
    if (requesters.length > 0) {
      const requesterIds = requesters
        .map((u) => u && u._id)
        .filter(Boolean)
        .map((id) => new mongoose.Types.ObjectId(id))

      if (requesterIds.length > 0) {
        const viewerToUsers = await Follow.find({
          follower: new mongoose.Types.ObjectId(ownerId),
          following: { $in: requesterIds },
        })
          .select("following status")
          .lean()

        const viewerToMap = {}
        viewerToUsers.forEach((r) => {
          viewerToMap[String(r.following)] = r.status
        })

        requesters = requesters.map((u) => {
          if (!u || !u._id) return u
          const uidStr = String(u._id)
          const viewerTo = viewerToMap[uidStr] // owner → requester
          return {
            ...u,
            isFollowing: viewerTo === "accepted",
            isRequested: viewerTo === "pending",
            isFollower: true, // they have a pending follow to us; use true only when accepted?
            // The UI state 'accept' will be derived from the request being pending TO viewer
            isReceivedPendingRequest: true,
          }
        })
      }
    }

    console.log(
      `[getPendingRequests] owner=${ownerId} pendingRequestCount=${requesters.length}`
    )

    return res.status(200).json({
      status: "success",
      data: { requests: requesters, total: requesters.length },
    })
  } catch (error) {
    console.error("[getPendingRequests] error:", error)
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
