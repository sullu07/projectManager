const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    username: { type: String, unique: true, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    favoriteProjects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
  },
  { timestamps: true } //createdAt, updateAt fields
);

module.exports = mongoose.model("User", UserSchema);
