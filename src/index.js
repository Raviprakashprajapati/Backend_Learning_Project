// require("dotenv").config()
import { app } from "./app.js";
import connectDB from "./db/db.js";
import dotenv from "dotenv"

dotenv.config({
    path:"./env"
})


connectDB()
.then((value)=>{

    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is listening on ${process.env.PORT}`)
    })

}).catch((err)=>{
    console.log("ERROR IN DB ", err)
})









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