function normalizeUsername(raw) {
  if (!raw || typeof raw !== "string") return ""
  return raw
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "")
}

module.exports = normalizeUsername
