const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProjectMemberSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
    user: { type: Schema.Types.ObjectId, ref: "User"},
  },
  { timestamps: true } //createdAt, updateAt fields
);

module.exports = mongoose.model("ProjectMember", ProjectMemberSchema);
