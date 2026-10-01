const { z } = require("zod");

const createPostSchema = z.object({
  caption: z
    .string()
    .max(2200, "Caption cannot exceed 2200 characters")
    .trim()
    .optional()
    .default(""),
});

const editPostSchema = z.object({
  caption: z
    .string({ required_error: "Caption is required" })
    .min(1, "Caption cannot be empty")
    .max(2200, "Caption cannot exceed 2200 characters")
    .trim(),
});

const commentPostSchema = z.object({
  comment: z
    .string({ required_error: "Comment is required" })
    .min(1, "Comment cannot be empty")
    .max(500, "Comment cannot exceed 500 characters")
    .trim(),
});

module.exports = {
  createPostSchema,
  editPostSchema,
  commentPostSchema,
};
