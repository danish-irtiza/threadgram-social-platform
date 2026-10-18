const mongoose = require("mongoose")
const User = require("../models/user.model")
const Follow = require("../models/follow.model")
const Post = require("../models/post.model")
const Vibe = require("../models/vibe.model")
const { editProfileSchema } = require("../validators/auth.validators")
const uploadOnCloudinary = require("../config/cloudinary.js")
const { deleteTempFile } = require("../config/cloudinary.js")

const extractValidationErrors = (error) => {
  const errors = {}
  error.issues.forEach((issue) => {
    const path = issue.path.join(".")
    errors[path] = issue.message
  })
  return errors
}

const SENSITIVE_USER_FIELDS = [
  "password",
  "tokenVersion",
  "resetPasswordToken",
  "resetPasswordTokenExpire",
  "emailVerificationToken",
  "emailVerificationExpireAt",
  "__v",
]

const postPopulateFields =
  "_id author mediaType media caption like comment likesCount commentsCount createdAt"

const toObjectId = (id) => {
  if (!id) return null
  try {
    return new mongoose.Types.ObjectId(id)
  } catch {
    return null
  }
}

const normalizeId = (v) => {
  if (!v) return null
  if (typeof v === "string") return v
  if (v._id) return v._id.toString()
  if (v.toString) return v.toString()
  return String(v)
}

const buildPostsStats = (posts = []) => {
  const list = Array.isArray(posts) ? posts : []
  let photos = 0
  let videos = 0
  list.forEach((p) => {
    const t = p && p.mediaType
    if (t === "image" || (p && p.media && !t)) photos++
    else if (t === "video") videos++
  })
  return { photos, videos }
}

/**
 * sanitizeProfileResponse
 * -----------------------
 * Async – queries the Follow collection (indexed) instead of scanning
 * followers/following arrays stored on the User document.
 *
 * Relationship flags returned to the client:
 *   isOwner                   – viewer is the profile owner
 *   isFollowing               – viewer has an *accepted* follow to this profile
 *   isFollower                – this profile has an *accepted* follow to the viewer
 *   isRequested               – viewer sent a *pending* follow request (private account)
 *   isReceivedPendingRequest  – this profile (owner) sent the VIEWER a *pending* follow request
 *
 * Frontend button logic (for viewer):
 *   isOwner                          → Edit Profile
 *   isReceivedPendingRequest         → Accept (or Reject) – viewer must approve
 *   isFollowing                      → Following  (click to unfollow)
 *   isRequested                      → Requested  (click to cancel)
 *   isFollower                       → Follow Back (click → follow the owner back)
 *   else                             → Follow
 *
 * Priority for the above matters:
 *   Accept > Following > Requested > Follow Back > Follow
 */
const sanitizeProfileResponse = async (profileUserDoc, viewer) => {
  const viewerId = viewer && viewer.sub ? toObjectId(viewer.sub) : null
  const ownerId = profileUserDoc._id

  const isOwner =
    !!viewerId && !!ownerId && viewerId.toString() === ownerId.toString()

  // ── Relationship queries (O(1) indexed lookups) ──────────────────────────
  let isFollowing = false
  let isFollower = false
  let isRequested = false
  let isReceivedPendingRequest = false

  if (viewerId && !isOwner) {
    const [viewerToOwner, ownerToViewerAny] = await Promise.all([
      // viewer→owner: any status (accepted OR pending)
      Follow.findOne({ follower: viewerId, following: ownerId }).select("status").lean(),
      // owner→viewer: ANY status — need both accepted (for isFollower / follow-back) AND pending (for Accept button)
      Follow.findOne({ follower: ownerId, following: viewerId })
        .select("status")
        .lean(),
    ])

    if (viewerToOwner) {
      if (viewerToOwner.status === "accepted") {
        isFollowing = true
        isRequested = false
      } else if (viewerToOwner.status === "pending") {
        isFollowing = false
        isRequested = true
      }
    }
    if (ownerToViewerAny) {
      if (ownerToViewerAny.status === "accepted") {
        isFollower = true
        isReceivedPendingRequest = false
      } else if (ownerToViewerAny.status === "pending") {
        isFollower = false
        isReceivedPendingRequest = true
      }
    }

    // Compute final UI button state
    let uiState = "follow"
    if (isReceivedPendingRequest) uiState = "accept"
    else if (isFollowing && isFollower) uiState = "message"
    else if (isFollowing) uiState = "following"
    else if (isRequested) uiState = "requested"
    else if (isFollower) uiState = "followback"

    console.log(
      `[sanitizeProfileResponse] viewer=${viewerId} → owner=${ownerId}` +
      ` | viewer→owner=${viewerToOwner ? viewerToOwner.status : 'none'}` +
      ` | owner→viewer=${ownerToViewerAny ? ownerToViewerAny.status : 'none'}` +
      ` | isFollowing=${isFollowing} isRequested=${isRequested}` +
      ` isFollower=${isFollower} isReceivedPendingRequest=${isReceivedPendingRequest}` +
      ` | uiState=${uiState}`
    )
  }

  // ── Counts (aggregation instead of pulling full arrays) ──────────────────
  const [followerCount, followingCount, vibeCount] = await Promise.all([
    Follow.countDocuments({ following: ownerId, status: "accepted" }),
    Follow.countDocuments({ follower: ownerId, status: "accepted" }),
    Vibe.countDocuments({ author: ownerId }),
  ])

  const isPrivate = profileUserDoc.isPrivate === true
  const isAuthenticated = !!viewerId

  // Authenticated viewer can see posts if: they own the profile, the profile is public, or they are an accepted follower
  const canSeePosts = isAuthenticated && (isOwner || !isPrivate || isFollowing)

  console.log(
    `[sanitizeProfileResponse] canSeePosts=${canSeePosts}` +
    ` isAuthenticated=${isAuthenticated} isOwner=${isOwner}` +
    ` isPrivate=${isPrivate} isFollowing=${isFollowing} isRequested=${isRequested}` +
    ` followerCount=${followerCount} followingCount=${followingCount}`
  )

  let allAuthorPosts = []
  if (canSeePosts) {
    allAuthorPosts = await Post.find({ author: ownerId })
      .sort({ createdAt: -1 })
      .populate("author", "_id name username avatar")
      .populate("comment.user", "_id name username avatar")
      .populate("comment.replies.user", "_id name username avatar")
      .lean()
  }

  const stats = buildPostsStats(allAuthorPosts)
  const postsRestricted = isPrivate && !canSeePosts

  // Guests receive empty posts array [] so no post media is exposed over the network
  const postsForViewer = isAuthenticated && canSeePosts ? allAuthorPosts : []

  const publicBase = {
    _id: profileUserDoc._id,
    name: profileUserDoc.name,
    username: profileUserDoc.username,
    avatar: profileUserDoc.avatar || "",
    bio: profileUserDoc.bio || "",
    isPrivate,
    followerCount,
    followingCount,
    postCount: allAuthorPosts.length,
    photosCount: stats.photos,
    videosCount: vibeCount,
    vibeCount,
    isGuest: !isAuthenticated,
    // Relationship flags
    isOwner,
    isFollowing,
    isFollower,
    isRequested,
    isReceivedPendingRequest,
    posts: postsForViewer,
    postsRestricted,
    createdAt: profileUserDoc.createdAt,
    updatedAt: profileUserDoc.updatedAt,
  }

  if (isOwner) {
    publicBase.email = profileUserDoc.email
    publicBase.gender = profileUserDoc.gender || null
  } else {
    const canSeeGender = !isPrivate || isFollowing
    if (canSeeGender) publicBase.gender = profileUserDoc.gender || null
  }

  SENSITIVE_USER_FIELDS.forEach((f) => {
    delete publicBase[f]
  })

  return publicBase
}

const buildProfileResponse = async (profileUserDoc, viewer) => {
  if (!profileUserDoc.populated || !profileUserDoc.populated("posts")) {
    try {
      await profileUserDoc.populate({
        path: "posts",
        options: { sort: { createdAt: -1 } },
        populate: [
          { path: "author", select: "_id name username avatar" },
          { path: "comment.user", select: "_id name username avatar" },
          { path: "comment.replies.user", select: "_id name username avatar" },
        ],
      })
    } catch (err) {
      console.error("Profile posts populate error:", err)
    }
  }
  // sanitizeProfileResponse is now async (Follow collection queries)
  const sanitized = await sanitizeProfileResponse(profileUserDoc, viewer)
  return sanitized
}

const suggestUsers = async (req, res) => {
  try {
    const currentUserId = req.user && req.user.sub
    const limit = parseInt(req.query.limit, 10) || 5

    // Build the excluded set using the Follow collection (source of truth)
    // Exclude self + anyone the viewer already follows (accepted) or has requested (pending)
    let excludedIds = []
    if (currentUserId) {
      excludedIds.push(new mongoose.Types.ObjectId(currentUserId))

      const existingRelationships = await Follow.find({
        follower: currentUserId,
      }).select("following").lean()

      existingRelationships.forEach((doc) => {
        excludedIds.push(new mongoose.Types.ObjectId(doc.following))
      })
    }

    const pipeline = []
    if (excludedIds.length > 0) {
      pipeline.push({ $match: { _id: { $nin: excludedIds } } })
    }
    pipeline.push(
      { $sample: { size: limit } },
      {
        $project: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          bio: 1,
          isPrivate: 1,
        },
      }
    )

    const suggested = await User.aggregate(pipeline)

    // For each suggestion user, determine if the SUGGESTION already follows the VIEWER
    // (needed for Follow Back button on suggestions)
    const users = (() => {
      if (!currentUserId || suggested.length === 0) {
        return suggested.map((u) => ({
          ...u,
          isFollowing: false,
          isRequested: false,
          isFollower: false,
          isReceivedPendingRequest: false,
        }))
      }

      const suggestionIds = suggested
        .map((u) => new mongoose.Types.ObjectId(u._id))

      // ownerToViewer: suggestion follows viewer (any status)
      const ownerToViewerRows = Follow.find({
        follower: { $in: suggestionIds },
        following: new mongoose.Types.ObjectId(currentUserId),
      })
        .select("follower status")
        .lean()

      return Promise.resolve(ownerToViewerRows).then((rows) => {
        const ownerToViewerMap = {}
        rows.forEach((r) => {
          ownerToViewerMap[String(r.follower)] = r.status
        })

        return suggested.map((u) => {
          const uidStr = String(u._id)
          const ownerTo = ownerToViewerMap[uidStr]
          // Viewer relationship: isFollowing/isRequested are always false here
          // because we filtered those out above. But expose for consistency.
          return {
            ...u,
            isFollowing: false,
            isRequested: false,
            isFollower: ownerTo === "accepted",
            isReceivedPendingRequest: ownerTo === "pending",
          }
        })
      })
    })()

    const finalUsers = Promise.resolve(users)

    return finalUsers.then((resolvedUsers) => {
      console.log(
        `[suggestUsers] viewer=${currentUserId || 'guest'}` +
        ` excluded=${excludedIds.length} returned=${resolvedUsers.length}`
      )

      return res.status(200).json({
        status: "success",
        data: { users: resolvedUsers },
      })
    })
  } catch (error) {
    console.error("Suggested users error:", error)
    res.status(error.statusCode || 500).json({
      status: "error",
      message:
        error && error.message
          ? error.message
          : "Something went wrong while fetching suggested users.",
    })
  }
}

const getUser = async (req, res) => {
  try {
    const { username } = req.params
    if (!username) {
      return res.status(400).json({
        status: "fail",
        message: "Username is required",
      })
    }

    let user = null

    if (mongoose.Types.ObjectId.isValid(username)) {
      user = await User.findById(username)
    }

    if (!user) {
      // Strip leading @ (social-style URLs) and decode URI-encoded characters
      let cleaned = String(username).trim()
      try { cleaned = decodeURIComponent(cleaned) } catch { /* already decoded */ }
      cleaned = cleaned.replace(/^@+/, '')
      // Case-insensitive lookup: some legacy users bypassed the lowercase transform
      user = await User.findOne({
        username: { $regex: new RegExp(`^${cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      })
    }

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      })
    }

    const viewer = req.user || null
    const payload = await buildProfileResponse(user, viewer)

    return res.status(200).json({
      status: "success",
      data: { user: payload },
    })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(error.statusCode || 500).json({
      status: "error",
      message:
        error && error.message
          ? error.message
          : "Something went wrong while fetching user.",
    })
  }
}

const getCurrentUser = async (req, res) => {
  try {
    const ownerId = req.user && req.user.sub
    if (!ownerId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      })
    }
    const user = await User.findById(ownerId)
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      })
    }
    const payload = await buildProfileResponse(user, req.user)
    return res.status(200).json({
      status: "success",
      data: { user: payload },
    })
  } catch (error) {
    console.error("Get me error:", error)
    res.status(error.statusCode || 500).json({
      status: "error",
      message:
        error && error.message
          ? error.message
          : "Something went wrong while loading your profile.",
    })
  }
}

const editProfile = async (req, res) => {
  try {
    const currentUserId = req.user && req.user.sub
    if (!currentUserId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required",
      })
    }

    // If only a file was uploaded with no text fields, body may be empty — skip body validation
    const hasBodyFields = Object.keys(req.body).some(
      (k) => ["name", "username", "bio", "gender", "isPrivate", "removeAvatar"].includes(k)
    )

    let validatedData = {}
    if (hasBodyFields) {
      const validated = editProfileSchema.safeParse(req.body)
      if (!validated.success) {
        const errors = extractValidationErrors(validated.error)
        const firstKey = Object.keys(errors)[0]
        const firstMsg = firstKey ? errors[firstKey] : "Validation failed"
        return res.status(400).json({
          status: "fail",
          message: firstMsg,
          errors,
        })
      }
      validatedData = validated.data
    } else if (!req.file) {
      return res.status(400).json({
        status: "fail",
        message: "At least one field or a file is required to update the profile",
      })
    }

    const { name, username, bio, gender, isPrivate, removeAvatar } = validatedData

    const user = await User.findById(currentUserId)
    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      })
    }

    const isOwner = user._id.toString() === currentUserId.toString()
    if (!isOwner) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to edit this profile",
      })
    }

    if (name !== undefined) {
      user.name = name
    }

    if (username !== undefined && username !== user.username) {
      const usernameExists = await User.findOne({
        username,
        _id: { $ne: currentUserId },
      })
      if (usernameExists) {
        return res.status(409).json({
          status: "fail",
          message: "Username is already taken",
        })
      }
      user.username = username
    }

    if (bio !== undefined) {
      user.bio = bio
    }
    if (gender !== undefined) {
      user.gender = gender
    }
    if (isPrivate !== undefined) {
      user.isPrivate = isPrivate
    }

    if (removeAvatar) {
      user.avatar = ""
    } else if (req.file) {
      const avatarUrl = await uploadOnCloudinary(req.file.path)
      if (avatarUrl) {
        user.avatar = avatarUrl
      } else {
        return res.status(400).json({
          status: "fail",
          message: "Failed to upload avatar image. Please check image format and try again.",
        })
      }
    }

    await user.save()
    const payload = await buildProfileResponse(user, req.user)

    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: { user: payload },
    })
  } catch (error) {
    console.error("Edit profile error:", error)
    res.status(error.statusCode || 500).json({
      status: "error",
      message:
        error && error.message
          ? error.message
          : "Something went wrong while updating profile.",
    })
  } finally {
    if (req.file) {
      await deleteTempFile(req.file.path)
    }
  }
}

module.exports = {
  suggestUsers,
  getUser,
  getCurrentUser,
  editProfile,
  sanitizeProfileResponse,
}
