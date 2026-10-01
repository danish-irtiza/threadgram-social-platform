const { z } = require("zod")

const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot be more than 50 characters")
    .trim(),

  username: z
    .string({ required_error: "Username is required" })
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot be more than 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    )
    .trim()
    .toLowerCase(),

  email: z
    .string({ required_error: "Email is required" })
    .email("Please enter a valid email")
    .trim()
    .toLowerCase(),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password cannot be more than 128 characters"),
})

const loginSchema = z.object({
  identifier: z
    .string({ required_error: "Username or email is required" })
    .min(3, "Please enter at least 3 characters")
    .trim()
  ,
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long")

})

const editProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name cannot be more than 50 characters")
      .trim()
      .optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username cannot be more than 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores"
      )
      .trim()
      .toLowerCase()
      .optional(),
    bio: z
      .string()
      .max(150, "Bio cannot be more than 150 characters")
      .trim()
      .optional()
      .nullable()
      .transform((v) => (v === null ? "" : v)),
    gender: z.enum(["male", "female", "prefer_not_to_say"], {
      errorMap: () => ({ message: "Gender must be either 'male', 'female', or 'prefer_not_to_say'" }),
    }).optional(),
    isPrivate: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((v) => {
        if (typeof v === "boolean") return v
        if (v === "true") return true
        if (v === "false") return false
        return v
      })
      .refine((v) => typeof v === "undefined" || typeof v === "boolean", {
        message: "isPrivate must be a boolean",
      }),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update the profile",
  })

module.exports = {
  registerSchema,
  loginSchema,
  editProfileSchema,
}
