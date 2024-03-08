const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ErrorSchema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: "User" },
    subject: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: true } //createdAt, updateAt fields
);

module.exports = mongoose.model("Error", ErrorSchema);
