const jwt = require("jsonwebtoken")
const userModel = require("../models/user.model")

const createAccessToken = (userId,tokenVersion) => {
    return jwt.sign(
        {sub: userId,tokenVersion},
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN}
    )
}

const createRefreshToken = (userId,tokenVersion) => {
    return jwt.sign(
        {sub: userId,tokenVersion},
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN}
    )
}


const verifyRefreshToken = (refreshToken) => {
    return jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
}

const verifyAccessToken = (accessToken) => {
    return jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
}

const dbTokenVersion = async (id) => {
const user  = await userModel.findById(id)
    
if(!user) throw new Error("User not found")
    user.tokenVersion++
    await user.save()
    return user.tokenVersion
}
const compareTokenVersion = (tokenVersion,dbTokenVersion) => {
    return tokenVersion === dbTokenVersion
}


module.exports = {
    createAccessToken,
    createRefreshToken,
    verifyRefreshToken,
    verifyAccessToken,
    dbTokenVersion,
    compareTokenVersion,
}