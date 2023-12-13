const mongoose = require("mongoose");

const userModel = mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  pin: {
    type: String,
    required: true,
  },
});

const User = mongoose.model("userModel", userModel);
module.exports = User;
