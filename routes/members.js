const express = require("express");
const router = express.Router();

const membersController = require("../controllers/membersController");

router.get("/:projectname", membersController.getMembersInProject);
router.post("/add/:projectname", membersController.addMember);
router.delete("/remove/:projectname/:memberid", membersController.removeMember);

module.exports = router;
