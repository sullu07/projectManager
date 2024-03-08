const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProjectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, unique: true, required: true },
    shortDescription: { type: String, required: true },
    description: { type: String, default: "" },
    finished: {
      type: Date,
      //current date + 3 year
      default: () => Date.now() + 3 * 365 * 24 * 60 * 60000,
    },
    recentlyViewed: {
      type: Date,
      default: () => Date.now(),
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true } //createdAt, updateAt fields
);

module.exports = mongoose.model("Project", ProjectSchema);
