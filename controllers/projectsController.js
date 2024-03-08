const mongoose = require("mongoose");
const { format } = require("date-fns");

const Project = require("../models/Project");
const ProjectMember = require("../models/ProjectMember");
const Task = require("../models/Task");
const User = require("../models/User");

const getProjectsForUser = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.user)) {
    return res.status(400).json({
      clientMsg: "No information about the projects",
      error:
        "No userid in the request body when trying to get projects for user.",
    });
  }

  try {
    const ownedProjects = await Project.find({ owner: req.user }).exec();
    let projectsWhereMember = await ProjectMember.find(
      { user: req.user },
      { project: 1, _id: 0 }
    )
      .populate("project")
      .exec();

    //format object
    projectsWhereMember = projectsWhereMember.map((project) => {
      return { ...project.project._doc };
    });

    const projects = [...ownedProjects, ...projectsWhereMember];

    const result = [];

    // Iterate over each project and fetch memberCount and taskCount
    for (const project of projects) {
      // Count the number of other users in the project
      const memberCount = await ProjectMember.countDocuments({
        project: project._id,
      }).exec();

      // Count the number of tasks assigned to the user in the project
      const taskCount = await Task.countDocuments({
        project: project._id,
        assignedTo: req.user,
      }).exec();

      // Add the project details along with member and task counts to the result
      result.push({
        _id: project._id,
        name: project.name,
        isOwner: project.owner.toString() === req.user,
        shortDescription: project.shortDescription,
        isActive: project.isActive,
        finished: format(new Date(project.finished), "yyyy-MM-dd"),
        memberCount: memberCount + 1, //+1 for the owner
        taskCount: taskCount,
        recentlyViewed: project.recentlyViewed,
      });
    }

    return res.status(200).json({ projects: result, clientMsg: "", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const createProject = async (req, res) => {
  const { name, shortDescription, description, finished } = req.body;

  if (
    !mongoose.Types.ObjectId.isValid(req.user) ||
    typeof name === "undefined" ||
    typeof shortDescription === "undefined" ||
    typeof description === "undefined"
  ) {
    return res.status(400).json({
      clientMsg: "Not enough information provided.",
      error:
        "Not enough credentials in the request body when creating project.",
    });
  }

  try {
    //check for duplicate name in the database
    const foundDuplicate = await Project.findOne({
      name: name.replace(/\s+/g, "-"),
    }).exec();

    //if duplicate
    if (foundDuplicate)
      return res.status(409).json({
        clientMsg: "This project name is already in use.",
        error: "There was a duplicate for name when creating a project.",
      }); // Conflict

    const userProject = {
      owner: req.user,
      name: name.replace(/\s+/g, "-"),
      shortDescription,
      description,
      finished,
    };

    //remove finished if it is not given by the user
    if (typeof userProject[finished] === "undefined") {
      delete userProject[finished];
    }

    await Project.create(userProject);

    return res
      .status(201)
      .json({ clientMsg: "Successfully created project!", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const getRecentProjectName = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.user)) {
    return res.status(400).json({
      clientMsg: "No information about the projects",
      error:
        "No userid in the request body when trying to get projects for user.",
    });
  }

  try {
    //get owner projects
    const ownedProjects = await Project.find({ owner: req.user }).exec();
    //get project where member
    let projectsWhereMember = await ProjectMember.find(
      { user: req.user },
      { project: 1, _id: 0 }
    )
      .populate("project")
      .exec();

    //format object
    projectsWhereMember = projectsWhereMember.map((project) => {
      return { ...project.project._doc };
    });

    const projects = [...ownedProjects, ...projectsWhereMember];

    //get the most recent project
    const project = projects.sort(
      (a, b) => b.recentlyViewed - a.recentlyViewed
    )[0];

    /*const project = await Project.findOne({}, { _id: -1, name: 1 })
      .sort({ recentlyViewed: -1 })
      .limit(1)
      .lean()
      .exec();*/

    if (!project) {
      return res.status(404).json({
        clientMsg: "You don't have a recently viewed project!",
        error: "User doesn't have a recently viewed project.",
      });
    }

    return res
      .status(200)
      .json({ projectName: project.name, clientMsg: "", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const getProjectDataByName = async (req, res) => {
  const { projectname } = req.params;
  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user)
  ) {
    return res.status(400).json({
      clientMsg: "No information about the project",
      error:
        "No projectname/userid in the request body when trying to get project by name.",
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

    //if user is not an admin check if he is the owner or a member
    if (!isAdmin) {
      const isProjectMember = await ProjectMember.findOne({
        user: req.user,
        project: projectId,
      }).exec();

      if (!isProjectMember) {
        //if not member check if owner
        const isOwner = await Project.findOne({
          owner: req.user,
          _id: projectId,
        }).exec();
        if (!isOwner) {
          return res.status(401).json({
            clientMsg: "You don't have access to this project.",
            error: "User is not the owner of the project.",
          });
        }
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

      //check if project is inactive
      if (!isActive) {
        return res.status(401).json({
          clientMsg: "This project is inactive.",
          error: "The project the user is trying to get is inactive.",
        });
      }
    }

    //find and update recenltyViewed field
    const projectData = await Project.findOneAndUpdate(
      {
        _id: projectId,
      },
      {
        recentlyViewed: Date.now(),
      }
    ).exec();

    const result = {
      _id: projectData._id,
      name: projectData.name,
      isOwner: projectData.owner.toString() === req.user,
      shortDescription: projectData.shortDescription,
      description: projectData.description,
      finished: format(new Date(projectData.finished), "yyyy-MM-dd"),
    };

    return res.status(200).json({ project: result, clientMsg: "", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const getProjectDetailedDataByName = async (req, res) => {
  const { projectname } = req.params;
  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user)
  ) {
    return res.status(400).json({
      clientMsg: "No information about the project",
      error:
        "No projectname/userid in the request body when trying to get detailed project data by name.",
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

    //if user is not an admin check if he is the owner or a member
    if (!isAdmin) {
      const isOwner = await Project.findOne({
        owner: req.user,
        _id: projectId,
      }).exec();
      if (!isOwner) {
        const isProjectMember = await ProjectMember.findOne({
          user: req.user,
          project: projectId,
        }).exec();
        if (!isProjectMember) {
          return res.status(401).json({
            clientMsg: "You don't have access to this project.",
            error: "User is not a member of the project.",
          });
        }
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

      //!check if project is inactive
      if (!isActive) {
        return res.status(401).json({
          clientMsg: "This project is inactive.",
          error: "The project the user is trying to get is inactive.",
        });
      }
    }

    //find and update recenltyViewed field
    const projectData = await Project.findOne({
      _id: projectId,
    })
      .populate("owner", "_id username email")
      .lean()
      .exec();

    const result = {
      _id: projectData._id,
      name: projectData.name,
      owner: projectData.owner,
      shortDescription: projectData.shortDescription,
      description: projectData.description,
      isActive: projectData.isActive,
      finished: format(new Date(projectData.finished), "yyyy-MM-dd"),
      createdAt: format(new Date(projectData.createdAt), "yyyy-MM-dd"),
    };

    return res.status(200).json({ project: result, clientMsg: "", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const updateProject = async (req, res) => {
  const { projectname } = req.params;
  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user)
  ) {
    return res.status(400).json({
      clientMsg: "No information about the project",
      error:
        "No projectname/userid in the request body when trying to update project.",
    });
  }

  const { name, shortDescription, description, finished } = req.body;

  if (
    typeof name === "undefined" ||
    typeof shortDescription === "undefined" ||
    typeof description === "undefined"
  ) {
    return res.status(400).json({
      clientMsg: "Not enough information provided.",
      error:
        "Not enough credentials in the request body when updating project.",
    });
  }

  try {
    //check for duplicate name in the database
    const foundDuplicate = await Project.find({ name: name }).exec();

    //if duplicate
    if (foundDuplicate?.length > 1)
      return res.status(409).json({
        clientMsg: "This project name is already in use by another project.",
        error: "There was a duplicate for name when updating a project.",
      }); // Conflict

    const userProject = {
      name,
      shortDescription,
      description,
      finished,
    };

    //remove finished if it is not given by the user
    if (typeof userProject[finished] === "undefined") {
      delete userProject[finished];
    }

    await Project.updateOne({ name: projectname }, userProject);

    return res
      .status(201)
      .json({ clientMsg: "Successfully updated project!", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const searchInProjects = async (req, res) => {
  const { search, onlyName } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(req.user) ||
    typeof search === "undefined" ||
    typeof onlyName === "undefined"
  ) {
    return res.status(400).json({
      clientMsg: "No information about the project.",
      error:
        "No userid/search/onlyName in the request body when trying to search for project.",
    });
  }

  try {
    const { isAdmin } = await User.findOne(
      { _id: req.user },
      { isAdmin: 1, _id: 0 }
    ).exec();

    //if user is not an admin
    if (!isAdmin) {
      return res.status(401).json({
        clientMsg: "You don't have access to this function.",
        error: "User is not an admin.",
      });
    }

    let projects;
    if (onlyName) {
      projects = await Project.find({ name: { $regex: search, $options: "i" } })
        .sort({ name: 1 })
        .limit(10);
    } else {
      projects = await Project.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { shortDescription: { $regex: search, $options: "i" } },
        ],
      })
        .sort({ name: 1 })
        .limit(10);
    }

    const result = [];

    // Iterate over each project and fetch memberCount and taskCount
    for (const project of projects) {
      // Count the number of other users in the project
      const memberCount = await ProjectMember.countDocuments({
        project: project._id,
      }).exec();

      // Count the number of tasks assigned to the user in the project
      const taskCount = await Task.countDocuments({
        project: project._id,
        assignedTo: req.user,
      }).exec();

      // Add the project details along with member and task counts to the result
      result.push({
        _id: project._id,
        name: project.name,
        isOwner: project.owner.toString() === req.user,
        shortDescription: project.shortDescription,
        isActive: project.isActive,
        finished: format(new Date(project.finished), "yyyy-MM-dd"),
        memberCount: memberCount + 1, //+1 for the owner
        taskCount: taskCount,
        recentlyViewed: project.recentlyViewed,
      });
    }

    return res.status(200).json({ projects: result, clientMsg: "", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const getProjectOwner = async (req, res) => {
  const { projectname } = req.params;
  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user)
  ) {
    return res.status(400).json({
      clientMsg: "No information about the project",
      error:
        "No projectname/userid in the request body when trying to get detailed project data by name.",
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

    //if user is not an admin check if he is the owner or a member
    if (!isAdmin) {
      const isOwner = await Project.findOne({
        owner: req.user,
        _id: projectId,
      }).exec();

      if (!isOwner) {
        //if not an owner check if member
        const isProjectMember = await ProjectMember.findOne({
          user: req.user,
          project: projectId,
        }).exec();

        if (!isProjectMember) {
          return res.status(401).json({
            clientMsg: "You don't have access to this project.",
            error: "User is not a member of the project.",
          });
        }
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

      //!check if project is inactive
      if (!isActive) {
        return res.status(401).json({
          clientMsg: "This project is inactive.",
          error: "The project the user is trying to get is inactive.",
        });
      }
    }

    const projectData = await Project.findOne({
      _id: projectId,
    })
      .populate("owner", "_id username email")
      .lean()
      .exec();

    return res
      .status(200)
      .json({ owner: projectData.owner, clientMsg: "", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const updateOwner = async (req, res) => {
  const { projectname } = req.params;
  const { newOwner } = req.body;
  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user) ||
    !mongoose.Types.ObjectId.isValid(newOwner)
  ) {
    return res.status(400).json({
      clientMsg: "No information about the project",
      error:
        "No projectname/userid/newOwner in the request body when trying to update projects owner.",
    });
  }

  try {
    const { isAdmin } = await User.findOne(
      { _id: req.user },
      { isAdmin: 1, _id: 0 }
    ).exec();

    if (!isAdmin) {
      return res.status(401).json({
        clientMsg: "You don't have access to update the projects owner.",
        error: "User is not an admin.",
      });
    }

    //get the project id for easier searches
    const projectData = await Project.findOne({
      name: projectname,
    }).exec();

    //check if owner trying to update to himself
    if (projectData.owner.toString() === newOwner.toString()) {
      return res.status(401).json({
        clientMsg: "This user is already the project owner.",
        error: "Owner trying to add himself as an owner.",
      });
    }

    //ADD the old owner as a member
    await ProjectMember.create({
      project: projectData._id,
      user: projectData.owner,
    });

    //check if new owner is a member, if so remove him from the members
    const member = await ProjectMember.findOne({
      project: projectData._id,
      user: newOwner,
    });

    if (member) {
      await ProjectMember.deleteOne({
        project: projectData._id,
        user: newOwner,
      });
    }

    //update owner
    await Project.updateOne({ _id: projectData._id }, { owner: newOwner });

    return res
      .status(201)
      .json({ clientMsg: "Successfully updated projects owner!", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const getProjectIsActive = async (req, res) => {
  const { projectname } = req.params;
  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user)
  ) {
    return res.status(400).json({
      clientMsg: "No information about the project",
      error:
        "No projectname/userid in the request body when trying to get isActive state of the project.",
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

    //if user is not an admin check if he is the owner or a member
    if (!isAdmin) {
      const isOwner = await Project.findOne({
        owner: req.user,
        _id: projectId,
      }).exec();

      if (!isOwner) {
        //if not an owner check if member
        const isProjectMember = await ProjectMember.findOne({
          user: req.user,
          project: projectId,
        }).exec();

        if (!isProjectMember) {
          return res.status(401).json({
            clientMsg: "You don't have access to this project.",
            error: "User is not a member of the project.",
          });
        }
      }
    }

    const { isActive } = await Project.findOne(
      {
        _id: projectId,
      },
      {
        isActive: 1,
        _id: 0,
      }
    ).exec();

    return res
      .status(200)
      .json({ isActive: isActive, clientMsg: "", error: "" });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const updateIsActive = async (req, res) => {
  const { projectname } = req.params;
  const { newStatus } = req.body;

  if (
    typeof projectname === "undefined" ||
    !mongoose.Types.ObjectId.isValid(req.user) ||
    typeof newStatus === "undefined"
  ) {
    return res.status(400).json({
      clientMsg: "No information about the project",
      error:
        "No projectname/userid/newStatus in the request body when trying to update projects isActive status.",
    });
  }

  try {
    const { isAdmin } = await User.findOne(
      { _id: req.user },
      { isAdmin: 1, _id: 0 }
    ).exec();

    if (!isAdmin) {
      return res.status(401).json({
        clientMsg:
          "You don't have access to update the projects isActive status.",
        error: "User is not an admin.",
      });
    }

    //update owner
    await Project.updateOne({ name: projectname }, { isActive: newStatus });

    return res.status(201).json({
      clientMsg: "Successfully updated projects isActive status!",
      error: "",
    });
  } catch (error) {
    return res.status(500).json({
      clientMsg: "Something went wrong. Try again later!",
      error: error.message,
    });
  }
};

const isProjectOwner = async (req, res) => {
  const { projectid } = req.params;
  if (
    !mongoose.Types.ObjectId.isValid(projectid) ||
    !mongoose.Types.ObjectId.isValid(req.user)
  ) {
    return res.status(400).json({
      clientMsg: "No information about the project",
      error:
        "No projectid/userid in the request body when trying to check if user is the owner.",
    });
  }

  try {
    const project = await Project.findOne({
      _id: projectid,
    }).exec();

    return res.status(200).json({
      isOwner: project.owner.toString() === req.user.toString(),
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

module.exports = {
  getProjectsForUser,
  createProject,
  getRecentProjectName,
  getProjectDataByName,
  getProjectDetailedDataByName,
  updateProject,
  searchInProjects,
  getProjectOwner,
  updateOwner,
  getProjectIsActive,
  updateIsActive,
  isProjectOwner,
};
