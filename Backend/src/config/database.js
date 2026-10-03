const mongoose =require("mongoose");

async function  connectDB() {
   try{ await mongoose.connect(process.env.MONGO_URT);
    console.log("  Database is connected");
   }
   catch(error){
    console.log(error);
   }
}

module.exports = connectDB;