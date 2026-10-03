const mongoose = require("mongoose")
const bcryptjs = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: [true, "Name is required"],
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
    username: {
      type: String,
      trim: true,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      match: [
        /^[a-z0-9_\-]+$/,
        "Username can only contain lowercase letters, numbers, underscores, and hyphens",
      ],
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot be more than 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      maxlength: [100, "Password cannot be more than 100 characters"],
      select: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: "",
    },
    emailVerificationExpireAt: {
      type: Date,
      default: null,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    resetPasswordToken: {
      type: String,
      default: "",
    },
    resetPasswordTokenExpire: {
      type: Date,
      default: null,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [150, "Bio cannot be more than 150 characters"],
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    // followers: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "User",
    //   },
    // ],
    // following: [
    //   {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "User",
    //   },
    // ],
    gender: {
      type: String,
      enum: ["male", "female", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    vibes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vibe",
      },
    ],
    savedVibes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vibe",
      },
    ],
    stories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
  },
  { timestamps: true }
)

const normalizeUsername = require("../utils/normalizeUsername")

// Auto-normalize username before every save (catches legacy & edge-case data)
userSchema.pre("save", function (next) {
  if (this.isModified("username") || this.isNew) {
    this.username = normalizeUsername(this.username)
  }
  if (typeof next === "function") next()
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcryptjs.compare(candidatePassword, this.password)
  } catch (err) {
    throw err
  }
}

const User = mongoose.model("User", userSchema)

module.exports = User
