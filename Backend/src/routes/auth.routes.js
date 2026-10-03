const { Router } = require('express')
const authController = require("../controllers/auth.controllers")
const authMiddlewares=require("../middlewares/auth.middleware")
const authRouter = Router()

/** 
 * @route  POST  api/auth/regester
 * @discription regester a new user
 * @access  Public
 */

authRouter.post("/register", authController.registerUserController)


/**
 * @route POST /api/auth/login
 * @description login user with email and password
 * @access Public
 */
authRouter.post("/login", authController.loginUserController)

/**
 * @route GET /api/auth/logout
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
authRouter.get("/logout", authController.logoutUserController)

/**
 * @route GET /api/auth/get-me
 * @description get the current user login ditels
 * @access private
 */
authRouter.get("/get-me",authMiddlewares.authUser,authController.getMeController)

module.exports = authRouter; 