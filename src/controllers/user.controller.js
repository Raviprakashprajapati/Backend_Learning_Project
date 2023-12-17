import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResonse.js";
import jwt from "jsonwebtoken"

const generatedAccessAndRefreshTokens = async(userId)=>
{
    //access can be give to user but refreshtoken save in database to not compare password every time
    try {
         const user =  await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken =  user.generateRefreshToken()  
        
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        
        return {accessToken,refreshToken}
        
        
        
        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating tokens")
    }
    
}


const registerUser = asyncHandler( async(req,res)=>{

    //get user details from fronted
    //validation - empty
    //check if user already exists : username,email
    //check for images, check for avatar
    //upload them in cloudinary, avatar
    //create user object - create entry in db
    //remove password and referesh token fields from response
    //check for user creation
    //return response

    const {fullName,username,email,password} = req.body

    if(
        [fullName,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All fields must be required")
    }

    console.log(" req.files =  ",req.files , "end")
    
    const existedUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or usename already exists")
    }



    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath =  req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
    {
        coverImageLocalPath = req.files.coverImage[0].path;
    }



    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar =  await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user =  await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createUser){
        throw new  ApiError(500,"Something went wrong while registering")
    }

    return res.status(201).json(
        new ApiResponse(200,createUser, "User Registered Successfully")
    )

    



   


} )

const loginUser = asyncHandler(async(req,res)=>{
    //username or email and password from fronted
    //check validation
    //check database for username or email
    //compare password
    //access and refresh token
    //send to cookies
    
    const {username,email,password} = req.body

    if(!(username || email)) throw new ApiError(400,"username or email is required")

    const user =  await User.findOne({
        $or:[{username},{email}]
    })

    if(!user) throw new ApiError(404,"User is not exist")

    //user has a method of bcrypt and jwt not for User
    const isPasswordValid =  await user.isPasswordCorrect(password)

    if(!isPasswordValid) throw new ApiError(404,"Password is not correct")

    const {accessToken,refreshToken} =  await generatedAccessAndRefreshTokens(user._id)

     const loggedInUser=  await User.findById(user._id).select("-password -refreshToken")

     //now cookies can only edit by server
     const options = {
        httpOnly:true,
        secure:true
     }

     return res.status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",refreshToken,options)
     .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User loggedIn successfully"
        )
     )



})


const logoutUser = asyncHandler(async(req,res)=>{

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out"))
    
})


const refreshAccessToken = asyncHandler(async(req,res)=>{


    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken= jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)
    if(!user){
        throw new ApiError(401,"Invalid refresh token")
    }
    
    if(incomingRefreshToken!== user?.refreshToken){
        throw new ApiError(401,"Refresh Token is expired or used")
    }

    const options={
        httpOnly: true,
        secure:true
    }

    const {accessToken,newRefreshToken} = await generatedAccessAndRefreshTokens(user._id)

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",newRefreshToken,options)
    .json(
        new ApiResponse(
            200,
            {accessToken,refreshToken:newRefreshToken},
            "Access token Refreshed"
        )
    )
        
    } catch (error) {
        throw new ApiError(401,error?.message)
        
    }






})




export {registerUser,loginUser,logoutUser,refreshAccessToken}