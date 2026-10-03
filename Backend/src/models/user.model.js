const mongoose = require("mongoose")
const userSchema=new mongoose.Schema({
  username :{
    type: String,
    unique:[true," user already taken"],
    required:true
  },

  email :{
    type: String,
    unique:[true," email already taken with this email"],
    required:true
  },

  password :{
    type: String,
    required:true
  }
})

const userModel=mongoose.model("user",userSchema)
 
module.exports = userModel