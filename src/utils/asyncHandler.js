const asyncHandler = (reqhandler)=>{
    (req,res,next)=>{
        Promise.resolve(reqhandler(req,res,next)).catch((err)=>next(err))
    }
}






export {asyncHandler}


// const asyncHandler=()=>{}
// const asyncHandler=(fn)=>()=>{}
// const asyncHandler=(fn)=>async()=>{}

// const asyncHandler=(fn)=>async(req,res,next)=>{

//     try {

//         await fn(req,res,next)
        
//     } catch (error) {
//         res.status().json({
//             success:false,
//             message:error.message
//         })
//     }

// }