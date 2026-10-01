const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mediaType: {
      type: String,
      required: true,
      enum: ["image", "video"],
    },
    media: {
      type: String,
      required: true,
    },
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    like: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400, // Automatically delete stories after 24 hours (86400 seconds)
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of active user stories
storySchema.index({ author: 1, createdAt: -1 });

const StoryModel = mongoose.model("Story", storySchema);

module.exports = StoryModel;