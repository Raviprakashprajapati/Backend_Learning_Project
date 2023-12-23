import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResonse.js";
import jwt from "jsonwebtoken"

const generatedAccessAndRefreshTokens = async (userId) => {
    //access can be give to user but refreshtoken save in database to not compare password every time
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }




    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens")
    }

}


const registerUser = asyncHandler(async (req, res) => {

    //get user details from fronted
    //validation - empty
    //check if user already exists : username,email
    //check for images, check for avatar
    //upload them in cloudinary, avatar
    //create user object - create entry in db
    //remove password and referesh token fields from response
    //check for user creation
    //return response

    const { fullName, username, email, password } = req.body

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields must be required")
    }

    console.log(" req.files =  ", req.files, "end")

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or usename already exists")
    }



    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath =  req.files?.coverImage[0]?.path
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }



    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createUser) {
        throw new ApiError(500, "Something went wrong while registering")
    }

    return res.status(201).json(
        new ApiResponse(200, createUser, "User Registered Successfully")
    )








})

const loginUser = asyncHandler(async (req, res) => {
    //username or email and password from fronted
    //check validation
    //check database for username or email
    //compare password
    //access and refresh token
    //send to cookies

    const { username, email, password } = req.body

    if (!(username || email)) throw new ApiError(400, "username or email is required")

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) throw new ApiError(404, "User is not exist")

    //user has a method of bcrypt and jwt not for User
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) throw new ApiError(404, "Password is not correct")

    const { accessToken, refreshToken } = await generatedAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //now cookies can only edit by server
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User loggedIn successfully"
            )
        )



})


const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))

})


const refreshAccessToken = asyncHandler(async (req, res) => {


    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generatedAccessAndRefreshTokens(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token Refreshed"
                )
            )

    } catch (error) {
        throw new ApiError(401, error?.message)

    }






})


const changeCurrentPassword = asyncHandler(async (req, res) => {

    //get oldpassword and newPassword from fronted
    //get userid from  auth req.user
    //compare oldpassword is equal to database user password
    //Save newpassword to database
    //return  respond

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(404, "Invalid Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(200, {}, "Password updated successfully")
    )

})


const getCurrentUser = asyncHandler(async (req, res) => {

    return res.status(200).json(
        new ApiResponse(200, req.user, "Current User Fetched successfully")
    )

})


const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(404, "All fields are required")
    }

    const user = User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password -refreshToken")

    return res.status(200).json(
        new ApiResponse(200, user, "Fullname and email has been updated successfully")
    )


})


const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.files?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")


    return res.status(200).json(
        new ApiResponse(200, user, "Avatar has been successfully update")
    )

})

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.files?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password -refreshToken")


    return res.status(200).json(
        new ApiResponse(200, user, "coverImage has been successfully update")
    )

})


const getUserChannelProfile = asyncHandler(async (req, res) => {

    //get USERNAME from :PARAMS
    //find username from USER database
    //apply aggregations for CHANNEL-SUBCRIBER-COUNT AND CHANNEL-SUBCRIBED_COUNT
    //return specific fields 


    const { username } = req.params

    if (!username) {
        throw new ApiError(401, "Username is required")
    }

    //it give arrays
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subcriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subcribers"
            }
        },
        {
            $lookup: {
                from: "subcriptions",
                localField: "_id",
                foreignField: "subcriber",
                as: "subcribedTo"

            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subcribers"
                },
                channelSubscribedToCount: {
                    $size: "$subcribedTo"
                },
                isSubcribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subcribers.subcriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1, username: 1, email: 1, subscribersCount: 1, channelSubscribedToCount: 1, isSubcribed: 1, avatar: 1,
                coverImage: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            channel[0],
            "User channel fetched successfully"
        )
    )






})






export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile
}