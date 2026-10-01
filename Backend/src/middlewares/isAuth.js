const jwt = require("jsonwebtoken")

const isAuth = async (req,res,next) => {
    const token = req.headers.authorization?.split(" ")[1]
    if(!token) return res.status(401).json({message:"Token is required"})
    try{
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        req.user = decoded
        next()
    }catch(err){
        return res.status(401).json({message:"Invalid token"})
    }
}

const optionalAuth = async (req, res, next) => {
    const rawHeader = req.headers.authorization
    const token = rawHeader && rawHeader.startsWith("Bearer ")
        ? rawHeader.slice(7)
        : rawHeader || null
    if (!token) return next()
    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        req.user = decoded
    } catch (err) {
    }
    next()
}

module.exports = {
    isAuth,
    optionalAuth,
}
