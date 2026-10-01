const mongoose = require("mongoose")

/**
 * Follow Collection
 * ------------------
 * Stores every follow relationship (both accepted and pending) as its own
 * document.  This avoids loading the entire followers/following array from the
 * User document just to check whether a viewer follows someone.
 *
 * Status values:
 *   "accepted" – regular follow (public account) or accepted friend request
 *   "pending"  – follow request sent to a private account, awaiting approval
 */
const followSchema = new mongoose.Schema(
  {
    /** The user who initiated the follow / sent the request */
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** The user being followed / whose approval is awaited */
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    /** Relationship state */
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "accepted",
    },
  },
  { timestamps: true }
)

// Enforce uniqueness: one follow doc per (follower, following) pair
followSchema.index({ follower: 1, following: 1 }, { unique: true })

// Efficient lookup of all followers of a user
followSchema.index({ following: 1, status: 1 })

// Efficient lookup of all users a person follows
followSchema.index({ follower: 1, status: 1 })

const Follow = mongoose.model("Follow", followSchema)

module.exports = Follow
