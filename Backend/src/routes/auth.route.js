const express = require("express")
const router = express.Router()
const {
    registerController,
    loginController,
    logoutController,
    refreshTokenHandler,
    verifyEmail,
    resendVerificationEmail,
    forgetPasswordHandler,
    forgetPasswordResetHandler,
    oAuthGoogleHandler,
    oAuthCallbackHandler,
} = require("../controllers/auth.controller")
const { isAuth } = require("../middlewares/isAuth")

router.post("/register", registerController)
router.post("/login", loginController)
router.post("/logout", isAuth, logoutController)
router.post("/refreshToken", refreshTokenHandler)
router.post("/verifyEmail", verifyEmail)
router.post("/resendVerification", resendVerificationEmail)
router.post("/forgotPassword", forgetPasswordHandler)
router.post("/resetPassword", forgetPasswordResetHandler)
router.get("/google", oAuthGoogleHandler)
router.get("/google/callback", oAuthCallbackHandler)

module.exports = router
