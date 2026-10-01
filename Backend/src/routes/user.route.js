const express = require("express");
const router = express.Router();
const { editProfile, getUser, getCurrentUser, suggestUsers } = require("../controllers/user.controller");
const { upload } = require("../middlewares/multer");
const { isAuth, optionalAuth } = require("../middlewares/isAuth");

router.get("/suggest", isAuth, suggestUsers);

router.get("/me", isAuth, getCurrentUser);

router.get("/:username", optionalAuth, getUser);

router.post("/edit-profile", isAuth, upload.single("avatar"), editProfile);

module.exports = router;
