const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: String,
  emoji: String,
  createdAt: { type: Date, default: Date.now },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: String,
    },
  ],
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: String,
  emoji: String,
  createdAt: { type: Date, default: Date.now },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: String,
    },
  ],
  replies: [replySchema], 
});

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: { type: String },
  media: [
    {
      url: String, // file or external URL
      type: { type: String, enum: ["image", "video", "document", "link"] },
      name: { type: String, default: "" }, // original filename
      sizeBytes: { type: Number, default: 0 }, // file size
      mime: { type: String, default: "" }, // mimetype
    },
  ],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isHidden: { type: Boolean, default: false, index: true },
  draft: { type: Boolean, default: false },
  visibility: {
    type: String,
    enum: ["public", "followers", "private"],
    default: "public",
    index: true,
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Post", postSchema);