const jwt = require("jsonwebtoken")
const User = require("../models/user.model")
const { registerSchema, loginSchema } = require("../validators/auth.validators")
const { createAccessToken, createRefreshToken, verifyRefreshToken, verifyAccessToken, dbTokenVersion, compareTokenVersion } = require("../utils/token.js")
const { hashPassword, comparePassword } = require("../utils/bycrypt/bycrypt.js")
const crypto = require("crypto")
const sendEmail = require("../config/send-mail.js")
const oauth2 = require("../config/google.js")
const baseUrl = () => process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 8000}`

const createVerificationEmail = async (user) => {
  const emailToken = crypto.randomBytes(32).toString("hex")
  user.emailVerificationToken = emailToken
  user.emailVerificationExpireAt = new Date(Date.now() + 15 * 60 * 1000)
  await user.save()

  const emailVerifySecret = crypto.createHash("sha256").update(emailToken).digest("hex")

  const token = jwt.sign(
    { sub: user._id.toString(), emailToken: emailToken },
    emailVerifySecret,
    { expiresIn: "15m" }
  )
  const verifyEmailUrl = `${baseUrl()}/verify-email?token=${token}`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 22px; font-weight: 700;">Verify your email address</h2>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        Thanks for signing up for <strong>${process.env.CLIENT_NAME || "Social Media App"}</strong>! Please click the button below to verify your email and activate your account.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${verifyEmailUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
          Verify Email
        </a>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin-bottom: 20px;">
        Button not working? Copy and paste this link into your browser:<br/>
        <a href="${verifyEmailUrl}" style="color: #4f46e5; word-break: break-all;">${verifyEmailUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
        This verification link will expire in 15 minutes. If you did not create an account, you can safely disregard this message.
      </p>
    </div>
  `

  const emailResult = await sendEmail(
    user.email,
    "Verify your email address",
    html,
    { previewUrl: verifyEmailUrl }
  )

  return { emailResult, verifyEmailUrl }
}
// const sendResponse = (res, statusCode, status, user, message) => {
//   const token = signToken(user._id)

//   res.status(statusCode).json({
//     status,
//     message,
//     token,
//     data: {
//       user,
//     },
//   })
// }

const extractValidationErrors = (error) => {
  const errors = {}
  error.issues.forEach((issue) => {
    const path = issue.path.join(".")
    errors[path] = issue.message
  })
  return errors
}

const registerController = async (req, res) => {
  try {
    const validated = registerSchema.safeParse(req.body)
    if (!validated.success) {
      const errors = extractValidationErrors(validated.error)
      const firstKey = Object.keys(errors)[0]
      const firstMsg = firstKey ? errors[firstKey] : "Validation failed"
      return res.status(400).json({
        status: "fail",
        message: firstMsg,
        errors,
      })
    }

    const { name, username, email, password } = validated.data
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        status: "fail",
        message: "All fields are required",
      })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const usernameExists = await User.findOne({ username })
    if (usernameExists) {
      return res.status(409).json({
        status: "fail",
        message: "Username is already taken",
      })
    }
    const emailExists = await User.findOne({ email: normalizedEmail })
    if (emailExists) {
      if (emailExists.isEmailVerified) {
        return res.status(409).json({
          status: "fail",
          message: "Email is already registered and verified. Please log in.",
        })
      }

      // If registered but not verified yet, resend verification email for convenience
      try {
        await createVerificationEmail(emailExists)
      } catch (e) {
        console.error("Error resending verification on duplicate registration:", e.message)
      }

      return res.status(409).json({
        status: "fail",
        message: "Email is already registered but not verified. We have resent a verification link to your inbox.",
      })
    }



    const hashedPassword = await hashPassword(password)

    const user = await User.create({
      name,
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      isEmailVerified: false,
      emailVerificationToken: "",
    })

    let verificationInfo = null
    try {
      verificationInfo = await createVerificationEmail(user)
    } catch (err) {
      console.error("Error sending verification email on register:", err.message)
    }

    return res.status(201).json({
      status: "success",
      message: "Account created successfully. Please check your email to verify your account.",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          isEmailVerified: user.isEmailVerified,
        },
      },
      ...(process.env.NODE_ENV !== "production" && verificationInfo?.verifyEmailUrl && {
        devVerificationUrl: verificationInfo.verifyEmailUrl,
      }),
    })
  } catch (error) {
    console.error("Register error:", error)
    res.status(error.statusCode || 500).json({
      status: "error",
      message:
        error && error.message
          ? error.message
          : "Something went wrong during registration. Please try again.",
    })
  }
}

const verifyEmail = async (req, res) => {
  try {
    const token = req.query.token || req.body.token

    if (!token) {
      return res.status(400).json({ message: "Verification token is required" })
    }

    let decoded = jwt.decode(token)
    if (!decoded || !decoded.emailToken) {
      return res.status(400).json({ message: "Invalid verification token format" })
    }
    const secret = crypto.createHash("sha256").update(decoded.emailToken).digest("hex")

    let verifiedToken
    try {
      verifiedToken = jwt.verify(token, secret)
    } catch (jwtErr) {
      return res.status(400).json({ message: "Invalid or expired verification token" })
    }

    if (!verifiedToken || !verifiedToken.sub) {
      return res.status(400).json({ message: "Invalid verification token format" })
    }

    const user = await User.findById(verifiedToken.sub)
    if (!user) {
      return res.status(400).json({ message: "Invalid verification request" })
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        status: "success",
        message: "Email is already verified",
        alreadyVerified: true,
        email: user.email,
      })
    }

    if (
      !user.emailVerificationToken ||
      user.emailVerificationToken !== verifiedToken.emailToken
    ) {
      return res.status(400).json({ message: "This verification link has expired or has been replaced. Please request a new one." })
    }

    user.isEmailVerified = true
    user.emailVerificationToken = ""
    user.emailVerificationExpireAt = null
    await user.save()

    return res.status(200).json({
      status: "success",
      message: "Email verified successfully",
      email: user.email,
    })
  } catch (err) {
    console.error("Email verification error:", err)
    return res.status(400).json({ message: "Invalid or expired verification token" })
  }
}

const resendVerificationEmail = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase()
    if (!email) {
      return res.status(400).json({ message: "Email is required" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" })
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" })
    }

    const { emailResult, verifyEmailUrl } = await createVerificationEmail(user)

    let message = "Verification email sent successfully. Please check your inbox."
    if (emailResult && !emailResult.delivered) {
      if (emailResult.sandboxBlocked) {
        message = "Resend Sandbox notice: Test emails can only be sent to owner (danirt085@gmail.com). A verification link was printed in your server console."
      } else {
        message = "Verification link generated. Check your server console in development mode."
      }
    }

    return res.status(200).json({
      status: "success",
      message,
      delivered: emailResult?.delivered ?? true,
      ...(process.env.NODE_ENV !== "production" && { devVerificationUrl: verifyEmailUrl }),
    })
  } catch (err) {
    console.error("Resend verification email error:", err)
    return res.status(500).json({ message: "Could not send verification email. Please check server logs." })
  }
}
const loginController = async (req, res) => {
  try {
    const validated = loginSchema.safeParse(req.body)
    if (!validated.success) {
      return res.status(400).json({
        status: "fail",
        message: "Validation failed",
        errors: extractValidationErrors(validated.error),
      })
    }

    const { identifier, password } = validated.data

    const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(identifier)

    let findQuery
    if (isEmail) {
      findQuery = { email: identifier.toLowerCase() }
    } else {
      findQuery = { username: identifier.toLowerCase() }
    }

    const user = await User.findOne(findQuery).select("+password")

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: isEmail
          ? "No account found with this email. Please check or sign up."
          : "No account found with this username. Please check or sign up.",
      })
    }

    const isPasswordCorrect = await user.comparePassword(password)
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "fail",
        message: "Incorrect password. Please try again or use 'Forgot Password'.",
      })
    }
    if (!user.isEmailVerified) {
      return res.status(401).json({
        status: "fail",
        message: "Email is not verified. Please verify your email first.",
      })
    }

    const accessToken = createAccessToken(user._id, user.tokenVersion)


    const refreshToken = createRefreshToken(user._id, user.tokenVersion)

    const isProd = process.env.NODE_ENV === "production"
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "Lax",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return res.status(200).json({
      status: "success",
      data: {
        accessToken,
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          avatar: user.avatar || "",
          bio: user.bio || "",
          gender: user.gender || "prefer_not_to_say",
          isPrivate: user.isPrivate || false,
          isEmailVerified: user.isEmailVerified,
        }
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      status: "error",
      message: "Something went wrong during login. Please try again.",
    })
  }
}



const logoutController = (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === "production"
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: "Lax",
    })
    res.status(200).json({
      status: "success",
      message: "Logout successful",
    })
  } catch (err) {
    console.error("Logout error:", err)
    res.status(500).json({
      status: "error",
      message: "Something went wrong during logout. Please try again.",
    })
  }
}

const refreshTokenHandler = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken
    if (!refreshToken) {
      return res.status(401).json({
        status: "fail",
        message: "Refresh token is required",
      })
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    if (!decoded) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid refresh token",
      })
    }
    const user = await User.findById(decoded.sub)

    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "User not found",
      })
    }
    if (!compareTokenVersion(user.tokenVersion, decoded.tokenVersion)) {
      return res.status(401).json({
        status: "fail",
        message: "Refresh token version is not valid",
      })
    }

    const tokenVersion = await dbTokenVersion(user._id)

    const NewaccessToken = createAccessToken(user._id, tokenVersion)
    const newRefreshToken = createRefreshToken(user._id, tokenVersion)

    const isProd = process.env.NODE_ENV === "production"
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "Lax",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    return res.status(200).json({
      status: "success",
      accessToken: NewaccessToken,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      }
    })
  } catch (err) {
    console.error("Refresh token error:", err)
    res.status(500).json({
      status: "error",
      message: "Something went wrong during refresh token. Please try again.",
    })
  }
}

const forgetPasswordHandler = async (req, res) => {
  try {
    const { email } = req.body
    if (!email || !email.trim()) {
      return res.status(400).json({
        status: "fail",
        message: "Email is required",
      })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalizedEmail })

    const genericMessage = "If an account with that email exists, a password reset link has been sent to your inbox."

    if (!user) {
      return res.status(200).json({
        status: "success",
        message: genericMessage,
      })
    }
    const resetPasswordToken = crypto.randomBytes(32).toString("hex")
    user.resetPasswordToken = resetPasswordToken
    user.resetPasswordTokenExpire = new Date(Date.now() + 15 * 60 * 1000)
    await user.save()

    const resetPasswordUrl = `${process.env.CLIENT_URL}/reset-password/${resetPasswordToken}`

    await sendEmail(
      user.email,
      "Reset Password",
      `<h1>Reset Password URL: ${resetPasswordUrl}</h1>
            <p>Please click the link above to reset your password.</p>
            <p>Reset password link expires in 15 minutes.</p>
         
            <p>${process.env.CLIENT_NAME || "Social Media App"}</p>`,
      { previewUrl: resetPasswordUrl }
    )
    return res.status(200).json({
      status: "success",
      message: genericMessage,
      ...(process.env.NODE_ENV !== "production" && { resetPasswordUrl }),
    })
  } catch (err) {
    console.error("Forget password error:", err)
    res.status(500).json({
      status: "error",
      message: "Something went wrong during forget password. Please try again.",
    })
  }
}

const forgetPasswordResetHandler = async (req, res) => {
  try {
    const { resetPasswordToken, newPassword } = req.body
    if (!resetPasswordToken || typeof resetPasswordToken !== "string" || !newPassword) {
      return res.status(400).json({
        status: "fail",
        message: "Reset password token and new password are required.",
      })
    }
    const cleanToken = resetPasswordToken.trim()
    const user = await User.findOne({ resetPasswordToken: cleanToken })
    if (!user) {
      return res.status(401).json({
        status: "fail",
        message: "Invalid or expired reset password link.",
      })
    }
    if (!user.resetPasswordTokenExpire || Date.now() > new Date(user.resetPasswordTokenExpire).getTime()) {
      return res.status(401).json({
        status: "fail",
        message: "This reset password link has expired. Please request a new one.",
      })
    }

    user.password = await hashPassword(newPassword)
    user.resetPasswordToken = ""
    user.resetPasswordTokenExpire = null
    await user.save()
    return res.status(200).json({
      status: "success",
      message: "Password reset successfully",
    })
  } catch (err) {
    console.error("Forget password reset error:", err)
    res.status(500).json({
      status: "error",
      message: "Something went wrong during password reset. Please try again.",
    })
  }
}

const oAuthGoogleHandler = (req, res) => {
  try {
    const googleClient = oauth2()
    const state = crypto.randomBytes(32).toString("hex")
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:8000/api/auth/google/callback"
    console.log("==========================================")
    console.log("[Google OAuth] Initiating Sign-In")
    console.log("[Google OAuth] Client ID:", process.env.GOOGLE_CLIENT_ID)
    console.log("[Google OAuth] Exact Redirect URI sent to Google:", redirectUri)
    console.log("==========================================")

    const url = googleClient.generateAuthUrl({
      access_type: "offline",
      scope: [
        "openid",
        "email",
        "profile",
      ],
      prompt: "select_account",
      state,
    })
    const isProd = process.env.NODE_ENV === "production"
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: isProd,
      sameSite: "Lax",
      maxAge: 10 * 60 * 1000,
    })
    return res.redirect(url)
  } catch (authError) {
    console.error("OAuth error:", authError)
    res.status(500).json({
      status: "error",
      message: "Something went wrong during Google sign in. Please try again.",
    })
  }
}

const oAuthCallbackHandler = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173"
  try {
    const { code, state } = req.query
    const savedState = req.cookies?.oauth_state

    if (!code || !state || state !== savedState) {
      console.error("OAuth state mismatch or code missing")
      return res.redirect(`${clientUrl}/login?error=invalid_state`)
    }

    const googleClient = oauth2()
    const { tokens } = await googleClient.getToken(code)

    if (!tokens || !tokens.id_token) {
      throw new Error("Google OAuth2 ID token missing")
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    const { email, email_verified, name, picture } = payload

    if (!email) {
      throw new Error("Email not provided by Google account")
    }

    const normalizedEmail = email.trim().toLowerCase()
    let user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex")
      const password = await hashPassword(randomPassword)

      const displayName = name || normalizedEmail.split("@")[0]
      let baseHandle = (normalizedEmail.split("@")[0] || displayName)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 24) || "user"
      if (baseHandle.length < 3) baseHandle = baseHandle.padEnd(3, "_")

      let finalUsername = baseHandle
      let suffix = 1
      while (await User.findOne({ username: finalUsername })) {
        const suffixStr = String(suffix)
        const maxBase = 30 - (1 + suffixStr.length)
        finalUsername = `${baseHandle.slice(0, Math.max(0, maxBase))}_${suffixStr}`
        suffix++
      }

      user = await User.create({
        name: displayName,
        username: finalUsername,
        email: normalizedEmail,
        password,
        isEmailVerified: email_verified ?? true,
        avatar: picture || "",
      })
    } else if (!user.isEmailVerified) {
      user.isEmailVerified = true
      await user.save()
    }

    const accessToken = createAccessToken(user._id, user.tokenVersion)
    const refreshToken = createRefreshToken(user._id, user.tokenVersion)

    const isProd = process.env.NODE_ENV === "production"

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "Lax",
      maxAge: 77 * 24 * 60 * 60 * 1000,
    })

    res.clearCookie("oauth_state")

    return res.redirect(`${clientUrl}/login?token=${accessToken}&googleSuccess=true`)
  } catch (err) {
    console.error("OAuth callback error:", err)
    return res.redirect(`${clientUrl}/login?error=oauth_failed`)
  }
}



module.exports = {
  registerController,
  verifyEmail,
  resendVerificationEmail,
  loginController,
  logoutController,
  refreshTokenHandler,
  forgetPasswordHandler,
  forgetPasswordResetHandler,
  oAuthGoogleHandler,
  oAuthCallbackHandler,
}
