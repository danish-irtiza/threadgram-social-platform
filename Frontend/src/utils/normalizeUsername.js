export function normalizeUsername(raw) {
  if (!raw || typeof raw !== "string") return ""
  return raw
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "")
}

export const USERNAME_REGEX = /^[a-z0-9_\-]+$/

export const USERNAME_RULES = "Letters, numbers, underscores, and hyphens only."
