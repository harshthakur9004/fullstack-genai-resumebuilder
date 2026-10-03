const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")
const { get } = require("mongoose")

// registeration 
/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */
async function registerUserController(req, res) {

    const { username, email, password } = req.body

    if (!username || !email || !password) {
        return res.status(400).json({
            message: "Please provide username, email and password"
        })
    }

    const isUserAlreadyExists = await userModel.findOne({
        $or: [ { username }, { email } ]
    })

    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "Account already exists with this email address or username"
        })
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await userModel.create({
        username,
        email,
        password: hash
    })

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token)


    res.status(201).json({
        message: "User registered successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}

// loginuser
/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req, res) {

    const { email, password } = req.body

    const user = await userModel.findOne({ email })

    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }

    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token)
    res.status(200).json({
        message: "User loggedIn successfully.",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

// blacklist token 

/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
    const token = req.cookies.token
        console.log("TOKEN FROM COOKIE:", token)

    if (token) {
        await tokenBlacklistModel.create({ token })
    }

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })
}

// middleware 

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */

async function getMeController(req, res) {

    const user = await userModel.findById(req.user.id)



    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })

}
module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController,
    
}

// const userModel = require("../models/user.model")
// const bcrypt = require("bcryptjs")
// const jwt = require("jsonwebtoken")
// const tokenBlacklistModel = require("../models/blacklist.model")

// // In local dev, frontend (localhost:5173) and backend (localhost:3000)
// // are same-site (just different ports) so a plain cookie works fine.
// // In production they're on different domains (e.g. vercel.app and
// // onrender.com), which is genuinely cross-site - that requires
// // SameSite=None + Secure (HTTPS only) or the browser will silently
// // refuse to send the cookie back on API requests.
// const cookieOptions = process.env.NODE_ENV === "production"
//     ? { httpOnly: true, secure: true, sameSite: "none" }
//     : { httpOnly: true }

// // registeration
// /**
//  * @name registerUserController
//  * @description register a new user, expects username, email and password in the request body
//  * @access Public
//  */
// async function registerUserController(req, res) {

//     const { username, email, password } = req.body

//     if (!username || !email || !password) {
//         return res.status(400).json({
//             message: "Please provide username, email and password"
//         })
//     }

//     const isUserAlreadyExists = await userModel.findOne({
//         $or: [ { username }, { email } ]
//     })

//     if (isUserAlreadyExists) {
//         return res.status(400).json({
//             message: "Account already exists with this email address or username"
//         })
//     }

//     const hash = await bcrypt.hash(password, 10)

//     const user = await userModel.create({
//         username,
//         email,
//         password: hash
//     })

//     const token = jwt.sign(
//         { id: user._id, username: user.username },
//         process.env.JWT_SECRET,
//         { expiresIn: "1d" }
//     )

//     res.cookie("token", token, cookieOptions)


//     res.status(201).json({
//         message: "User registered successfully",
//         user: {
//             id: user._id,
//             username: user.username,
//             email: user.email
//         }
//     })

// }

// // loginuser
// /**
//  * @name loginUserController
//  * @description login a user, expects email and password in the request body
//  * @access Public
//  */
// async function loginUserController(req, res) {

//     const { email, password } = req.body

//     const user = await userModel.findOne({ email })

//     if (!user) {
//         return res.status(400).json({
//             message: "Invalid email or password"
//         })
//     }

//     const isPasswordValid = await bcrypt.compare(password, user.password)

//     if (!isPasswordValid) {
//         return res.status(400).json({
//             message: "Invalid email or password"
//         })
//     }

//     const token = jwt.sign(
//         { id: user._id, username: user.username },
//         process.env.JWT_SECRET,
//         { expiresIn: "1d" }
//     )

//     res.cookie("token", token, cookieOptions)
//     res.status(200).json({
//         message: "User loggedIn successfully.",
//         user: {
//             id: user._id,
//             username: user.username,
//             email: user.email
//         }
//     })
// }

// // blacklist token

// /**
//  * @name logoutUserController
//  * @description clear token from user cookie and add the token in blacklist
//  * @access public
//  */
// async function logoutUserController(req, res) {
//     const token = req.cookies.token

//     if (token) {
//         await tokenBlacklistModel.create({ token })
//     }

//     res.clearCookie("token", cookieOptions)

//     res.status(200).json({
//         message: "User logged out successfully"
//     })
// }

// // middleware

// /**
//  * @name getMeController
//  * @description get the current logged in user details.
//  * @access private
//  */

// async function getMeController(req, res) {

//     const user = await userModel.findById(req.user.id)



//     res.status(200).json({
//         message: "User details fetched successfully",
//         user: {
//             id: user._id,
//             username: user.username,
//             email: user.email
//         }
//     })

// }
// module.exports = {
//     registerUserController,
//     loginUserController,
//     logoutUserController,
//     getMeController,

// }