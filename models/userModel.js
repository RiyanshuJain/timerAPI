const mongoose = require("mongoose");

const userModel = mongoose.Schema({
  address: {
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
