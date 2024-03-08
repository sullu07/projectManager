const mongoose = require("mongoose");
const User = require("../models/User");


// Create a new user
exports.addUser = async (req, res) => {
  const { username, email } = req.body;
  
  try {
    const newUser = new User({ username, email });
    await newUser.save();
    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Failed to create user", error: error.message });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ users: users, message: "Users found successfully", error: null });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve users", error: error.message });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  const userId = req.params.id;
  const { username, email } = req.body;

  try {
    const user = await User.findByIdAndUpdate(userId, { username, email }, { new: true });
    res.status(200).json({ message: "User updated successfully", user: user });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user", error: error.message });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: "User deleted successfully", user: null });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
};


exports.searchInUsers = async (req, res) => {
  const { search, onlyUsername } = req.params;

  // Check if search and onlyUsername are provided
  if (!search || typeof onlyUsername === "undefined") {
    return res.status(400).json({
      message: "Invalid request parameters",
      error: "Missing search query or search type"
    });
  }

  try {
    let query = {};

    // Adjust query based on search type
    if (onlyUsername) {
      query.username = search;
    } else {
      query.username = search;
      query.email = search;
    }

    // Find users
    const users = await User.find(query);

    // Send response
    res.status(200).json({ users: users, message: "Users found successfully", error: null });
  } catch (error) {
    // Handle errors
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
