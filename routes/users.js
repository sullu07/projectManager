const express = require("express");
const router = express.Router();

const controller = require("../controllers/usersController");

router.put("/",controller.addUser);
router.get("/",controller.getAllUsers);
router.delete("/",controller.deleteUser);
router.delete("/",controller.updateUser);
router.get("/search/:search/:onlyUsername", controller.searchInUsers);

module.exports = router;
