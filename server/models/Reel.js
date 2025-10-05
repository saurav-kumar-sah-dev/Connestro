// models/Reel.js
const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: String,
  },
  { _id: false }
);

const replySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    emoji: { type: String, default: "" }, 
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],    
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
    reactions: [reactionSchema],                                        
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    emoji: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],    
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], 
    replies: [replySchema],                                             
  },
  { _id: true }
);

const reelSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    url: { type: String, required: true },
    caption: { type: String, default: "" },
    durationSec: { type: Number, default: 0 },

    visibility: { type: String, enum: ["public", "followers"], default: "public", index: true },
    draft: { type: Boolean, default: false, index: true },

    // NEW: moderation
    isHidden: { type: Boolean, default: false, index: true },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [commentSchema],

    viewsCount: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Unique view per user per reel
const reelViewSchema = new mongoose.Schema(
  {
    reel: { type: mongoose.Schema.Types.ObjectId, ref: "Reel", required: true, index: true },
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);
reelViewSchema.index({ reel: 1, viewer: 1 }, { unique: true });

const Reel = mongoose.model("Reel", reelSchema);
const ReelView = mongoose.model("ReelView", reelViewSchema);

module.exports = { Reel, ReelView };