require("dotenv").config()
const server = require("./src/app")
const dbConnect = require("./src/config/db")
const port = process.env.PORT || 8000

const startServer = async () => {
    try{
        await dbConnect()
        console.log("Database connected")
        server.listen(port, () => {
            console.log(`Server is running on port ${port}`)
            console.log(`Environment: ${process.env.ENVIRONMENT} || development`)
        })
    }catch(err){
        console.log(err)
        process.exit(1)
    }
}
startServer()
