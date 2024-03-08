const express = require("express");
const router = express.Router();

const adminController = require("../controllers/adminController");

router.get("/check", adminController.isAdmin);

module.exports = router;
