const bcryptjs = require("bcryptjs")
const saltRounds = 12

const hashPassword = async (password) => {
    try {
        return await bcryptjs.hash(password, saltRounds)
    } catch (err) {
        console.log(err.message)
        throw err
    }
}

const comparePassword = async (password, hashedPassword) => {
    try {
        return await bcryptjs.compare(password, hashedPassword)
    } catch (err) {
        console.log(err.message)
        throw err
    }
}

module.exports = {
    hashPassword,
    comparePassword,
}
