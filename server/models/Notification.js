// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, // recipient
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },            // who did the action

    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "reply",
        "follow",
        "message",
        "call",
        "comment_reaction",
        "reply_reaction",
        "reel_publish",
        "report_update",
        "moderation",
        "comment_like",
        "comment_dislike",
        "reply_like",
        "reply_dislike",
        "story_like",
        "story_reaction",
        "story_reply",
        "story_publish",
      ],
      required: true,
      index: true,
    },

    // Optional targets
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    message: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    comment: { type: mongoose.Schema.Types.ObjectId },

    text: { type: String, default: "" },
    link: { type: String, default: "" },

    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);