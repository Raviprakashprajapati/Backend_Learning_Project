import mongoose, { Schema } from "mongoose";

const subcriptionSchema = new mongoose.Schema(
    {
        //subscribers id
        channel:{ //subcribe channel id
            type:Schema.Types.ObjectId,
            ref:"User"
        },

        //current USER subscribed other channels
        subcriber:{ //who is subcribing
            type:Schema.Types.ObjectId,
            ref:"User"
        }
      

    }
    ,{timestamps:true})

export const Subcription = mongoose.model("Subcription",subcriptionSchema)