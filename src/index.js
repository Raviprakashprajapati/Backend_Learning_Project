// require("dotenv").config()
import connectDB from "./db/db.js";
import dotenv from "dotenv"

dotenv.config({
    path:"./env"
})


connectDB()










// import  express  from "express";
// const app = express(); 

// ;(async()=>{

//     try {
//         await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERROR IN DATABASE : "+error)
//             throw error
//         })

        

//     } catch (error) {
//         console.log("ERROR IN DATABASE : " + error)
//         throw error
//     }


// })()