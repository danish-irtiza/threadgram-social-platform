const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const authRoutes = require("./routes/auth.route")
const userRoutes = require("./routes/user.route")
const followRoutes = require("./routes/follow.route")
const postRoutes = require("./routes/post.route")
const vibeRoutes = require("./routes/vibe.route")
const storyRoutes = require("./routes/story.route")
const { handleMulterError } = require("./middlewares/multer")

const app = express()

const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173"
]

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed"));
        }
    },
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/follow", followRoutes)
app.use("/api/posts", postRoutes)
app.use("/api/vibes", vibeRoutes)
app.use("/api/stories", storyRoutes)

// Global Multer error handler — must be AFTER all routes
app.use(handleMulterError)

module.exports = app
