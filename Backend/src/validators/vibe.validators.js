const { z } = require("zod");

const createVibeSchema = z.object({
  caption: z
    .string()
    .max(2200, "Caption cannot exceed 2200 characters")
    .trim()
    .optional()
    .default(""),
});

const editVibeSchema = z.object({
  caption: z
    .string()
    .min(1, "Caption cannot be empty")
    .max(2200, "Caption cannot exceed 2200 characters")
    .trim(),
});

const commentVibeSchema = z.object({
  comment: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(500, "Comment cannot exceed 500 characters")
    .trim(),
});

module.exports = {
  createVibeSchema,
  editVibeSchema,
  commentVibeSchema,
};
