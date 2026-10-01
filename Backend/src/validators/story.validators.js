const { z } = require("zod");

const createStorySchema = z.object({
  mediaType: z
    .enum(["image", "video"], {
      errorMap: () => ({ message: "mediaType must be either image or video" }),
    })
    .optional(),
});

module.exports = {
  createStorySchema,
};
