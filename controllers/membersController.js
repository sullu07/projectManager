const mongoose = require("mongoose");

const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const User = require("../models/User");

const getMembersInProject = async (req, res) => {
  const { projectname } = req.params;

  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user)
  ) {
    return res.status(400).json({
      clientMsg: "No information about the members.",
      error:
        "No projectname/userid in the request body when trying to get all members in a project.",
    });
  }

  try {
    const { isAdmin } = await User.findOne(
      { _id: req.user },
      { isAdmin: 1, _id: 0 }
    ).exec();

    //get the project id for easier searches
    const { _id: projectId } = await Project.findOne({
      name: projectname,
    }).exec();

    if (!isAdmin) {
      //check if owner if not an admin
      const isOwner = await Project.findOne({
        owner: req.user,
        _id: projectId,
      }).exec();

      if (!isOwner) {
        return res.status(401).json({
          clientMsg: "You can't get the members of this project.",
          error: "User is not the owner of the project.",
        });
      }

      //check if project is inactive
      const { isActive } = await Project.findOne(
        {
          _id: projectId,
        },
        {
          isActive: 1,
          _id: 0,
        }
      ).exec();
      if (!isActive) {
        return res.status(401).json({
          clientMsg: "This project is inactive.",
          error: "The project is inactive, the user can't get the members.",
        });
      }
    }

    let result = await ProjectMember.find(
      { project: projectId },
      { user: 1, _id: 0 }
    )
      .populate("user", "_id username")
      .lean()
      .exec();

    const users = result.map((obj) => {
      return {
        ...obj.user,
      };
    });

    const { owner } = await Project.findOne(
      { owner: req.user },
      { _id: 0, owner: 1 }
    )
      .populate("owner", "_id username")
      .lean()
      .exec();

    owner.isOwner = true;

    users.push(owner);

    return res.status(200).json({
      users,
      clientMsg: "",
      error: "",
    });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const addMember = async (req, res) => {
  const { projectname } = req.params;
  const { memberid } = req.body;

  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user) ||
    !mongoose.Types.ObjectId.isValid(memberid)
  ) {
    return res.status(400).json({
      clientMsg: "Not enough information.",
      error:
        "No projectid/userid/memberid in the request body when trying to add member to project.",
    });
  }

  try {
    const { isAdmin } = await User.findOne(
      { _id: req.user },
      { isAdmin: 1, _id: 0 }
    ).exec();

    //get the project id for easier searches
    const { _id: projectId } = await Project.findOne({
      name: projectname,
    }).exec();

    //get neccesary information
    const { owner: curOwner, isActive } = await Project.findOne(
      { _id: projectId },
      { owner: 1, isActive: 1, _id: 0 }
    ).exec();

    if (!isAdmin) {
      //check if owner if not an admin
      if (req.user.toString() !== curOwner.toString()) {
        return res.status(401).json({
          clientMsg: "You don't have authority to add member to this project.",
          error: "User is not the owner of the project.",
        });
      }

      //check if owner trying to add himself
      if (memberid.toString() === curOwner.toString()) {
        return res.status(401).json({
          clientMsg: "You can't add yourself as a member to this project.",
          error: "User is the owner of the project.(can't be a member)",
        });
      }

      //check if project is inactive
      if (!isActive) {
        return res.status(401).json({
          clientMsg: "This project is inactive.",
          error: "The project the user is trying to add member to is inactive.",
        });
      }
    }

    //check if admin is trying to add himself
    if (req.user.toString() === memberid.toString()) {
      return res.status(401).json({
        clientMsg: "You can't add yourself to this project.",
        error: "User is an admin, can't be a member.",
      });
    }

    //check if user is already a member
    const member = await ProjectMember.findOne({
      project: projectId,
      user: memberid,
    });

    if (member) {
      return res.status(401).json({
        clientMsg: "This user is already a member of this project.",
        error: "The user getting added is already a member of this project.",
      });
    }

    await ProjectMember.create({
      project: projectId,
      user: memberid,
    });

    return res.status(200).json({
      clientMsg: "Successfully added member to project!",
      error: "",
    });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const removeMember = async (req, res) => {
  const { projectname, memberid } = req.params;

  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user) ||
    !mongoose.Types.ObjectId.isValid(memberid)
  ) {
    return res.status(400).json({
      clientMsg: "Not enough information.",
      error:
        "No projectid/memberud in the request body when trying to remove member from project.",
    });
  }

  try {
    const { isAdmin } = await User.findOne(
      { _id: req.user },
      { isAdmin: 1, _id: 0 }
    ).exec();

    //get the project id for easier searches
    const { _id: projectId } = await Project.findOne({
      name: projectname,
    }).exec();

    if (!isAdmin) {
      //check if owner if not an admin
      const { owner: curOwner, isActive } = await Project.findOne(
        { _id: projectId },
        { owner: 1, isActive: 1, _id: 0 }
      ).exec();

      if (req.user.toString() !== curOwner.toString()) {
        return res.status(401).json({
          clientMsg:
            "You don't have authority to remove a member from this project.",
          error: "User is not the owner of the project.",
        });
      }

      //check if project is inactive
      if (!isActive) {
        return res.status(401).json({
          clientMsg: "This project is inactive.",
          error:
            "The project the user is trying to remove member from is inactive.",
        });
      }
    }

    //check if member is the owner
    const { owner: curOwner } = await Project.findOne(
      { _id: projectId },
      { owner: 1, _id: 0 }
    ).exec();

    if (memberid.toString() === curOwner.toString()) {
      return res.status(401).json({
        clientMsg: "You can't remove the project owner.",
        error: "Member is the owner of the project.",
      });
    }

    //check if member is truly a member
    const member = await ProjectMember.findOne({
      project: projectId,
      user: memberid,
    });

    if (!member) {
      return res.status(401).json({
        clientMsg: "This user is not a member of this project.",
        error: "The user getting removed is not member of this project.",
      });
    }

    await ProjectMember.deleteOne({
      project: projectId,
      user: memberid,
    });

    return res.status(200).json({
      clientMsg: "Successfully removed member from project!",
      error: "",
    });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

module.exports = {
  getMembersInProject,
  addMember,
  removeMember,
};
