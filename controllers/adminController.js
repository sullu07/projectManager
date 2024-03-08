const mongoose = require("mongoose");
const User = require("../models/User");

const isAdmin = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.user)) {
    return res.status(400).json({
      clientMsg: "No information about the user.",
      error:
        "Not enough credentials in the request body when checking if user is admin.",
    });
  }

  try {
    //check user in the database
    const dbUser = await User.findOne({ _id: req.user }).lean().exec();

    if (!dbUser) {
      return res.status(401).json({
        clientMsg: "There is no user with the given credentials.",
        error:
          "No user was found with the given credentials when checking if user is amdin.",
      });
    }

    //send back data and access token
    return res.status(200).json({
      isAdmin: dbUser.isAdmin,
      clientMsg: "Successfully checked admin rights!",
      error: "",
    });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

module.exports = { isAdmin };
