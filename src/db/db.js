import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB=async()=>{

    try {

       const connection =  await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)

       console.log(`DB Connected!`)
    //    console.log(connection)
        
    } catch (error) {
        console.log("ERROR IN DATABASE  :"+error)
        process.exit(1)

    }

}

export default connectDB