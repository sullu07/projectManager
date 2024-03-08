const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const User = require("../models/User");

const registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  if (
    typeof username === "undefined" ||
    typeof email === "undefined" ||
    typeof password === "undefined"
  ) {
    return res.status(400).json({
      clientMsg: "Please fill out every field.",
      error: "Not enough credentials in the request body at registration.",
    });
  }

  try {
    //check for duplicate username in the database
    const foundDuplicateUsername = await User.findOne({
      username: username,
    }).exec();

    //if duplicate
    if (foundDuplicateUsername)
      return res.status(409).json({
        clientMsg: "This username is already in use.",
        error: "There was a duplicate for username at registration.",
      }); // Conflict

    //check for duplicate email in the database
    const foundDuplicateEmail = await User.findOne({ email: email }).exec();

    //if duplicate
    if (foundDuplicateEmail)
      return res.status(409).json({
        clientMsg: "This email is already in use.",
        error: "There was a duplicate for email at registration.",
      }); // Conflict

    //encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    //create and store new user
    await User.create({
      username,
      email,
      password: hashedPassword,
    });

    //return
    return res
      .status(201)
      .json({ clientMsg: "Successful registration!", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;
  if (typeof username === "undefined" || typeof password === "undefined") {
    return res.status(400).json({
      clientMsg: "Please fill out all fields.",
      error: "Not enough credentials in the request body at login.",
    });
  }

  try {
    //check user in the database
    const dbUser = await User.findOne({ username: username }).exec();

    if (!dbUser) {
      return res.status(401).json({
        clientMsg: "There is no user with the given username.",
        error: "No user was found with the given username at login.",
      });
    }

    const match = await bcrypt.compare(password, dbUser.password);
    if (!match) {
      return res.status(401).json({
        clientMsg: "Password does not match.",
        error: "Users password didn't match at login.",
      }); //unauthorized - wrong password
    }

    //check if profile is inactive
    if (dbUser.isActive === false) {
      return res.status(401).json({
        clientMsg: "This profile is inactive.",
        error: "Users profile is inactive at login.",
      }); //unauthorized - inactive
    }

    //create accessToken, refreshToken
    const accessToken = jwt.sign(
      {
        userid: dbUser._id,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "10m",
      }
    );
    const refreshToken = jwt.sign(
      {
        userid: dbUser._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "5d",
      }
    );

    //set refresh token in httponly cookie
    //maxAge: 5 day
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "None",
      secure: true,
      maxAge: 5 * 24 * 60 * 60 * 1000,
    });

    //send back data and access token
    return res.status(200).json({
      //userid only for dev
      userid: dbUser._id,
      accessToken: accessToken,
      clientMsg: "Successfully logged in!",
      error: "",
    });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const handleRefreshToken = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.refreshToken) {
    return res.status(401).json({
      clientMsg: "Unauthorized.",
      error: "There was no refresh token presented in the cookies.",
    });
  }

  //clear old refreshtoken
  const refreshToken = cookies.refreshToken;
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });

  //verify refreshToken
  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    (error, decodedData) => {
      if (error) {
        return res.status(403).json({
          clientMsg: "Forbidden.",
          error: "Invalid refresh token.",
        });
      }

      //create new accessToken
      const accessToken = jwt.sign(
        {
          userid: decodedData.userid,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "10m",
        }
      );

      //create new refreshToken
      const newRefreshToken = jwt.sign(
        {
          userid: decodedData.userid,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: "5d",
        }
      );

      //set refresh token in httponly cookie
      //maxAge: 5 day
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        sameSite: "None",
        secure: true,
        maxAge: 5 * 24 * 60 * 60 * 1000,
      });

      //send back access token
      return res.status(200).json({
        //userid only for development
        userid: decodedData.userid,
        accessToken: accessToken,
      });
    }
  );
};

const logoutUser = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.refreshToken) {
    return res.status(200).json({
      clientMsg: "Logged out!",
      error: "",
    });
  }

  //delete refreshToken
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });

  return res.status(200).json({
    clientMsg: "Logged out!",
    error: "",
  });
};

module.exports = { registerUser, loginUser, handleRefreshToken, logoutUser };
