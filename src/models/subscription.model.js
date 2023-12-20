import mongoose, { Schema } from "mongoose";

const subcriptionSchema = new mongoose.Schema(
    {
        subcriber:{ //who is subcribing
            type:Schema.Types.ObjectId,
            ref:"User"
        },
        channel:{ //subcribe channel userid
            type:Schema.Types.ObjectId,
            ref:"User"
        }


    }
    ,{timestamps:true})

export const Subcription = mongoose.model("Subcription",subcriptionSchema)