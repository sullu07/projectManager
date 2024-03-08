const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TaskSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project" },
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    description: { type: String, default: "" },
    deadline: {
      type: Date, //current date + 14days
      default: () => Date.now() + 14 * 24 * 60 * 60000,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    status: { type: String, default: "todo" },
    priority: { type: String, default: "low" },
  },
  { timestamps: true } //createdAt, updateAt fields
);

module.exports = mongoose.model("Task", TaskSchema);
