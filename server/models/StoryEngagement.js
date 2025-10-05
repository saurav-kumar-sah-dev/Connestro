// models/StoryEngagement.js
const mongoose = require("mongoose");

// Unique view per user per story, TTL at story.expiresAt
const storyViewSchema = new mongoose.Schema(
  {
    story: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true, index: true },
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true }, // same as story.expiresAt
  },
  { timestamps: false }
);
storyViewSchema.index({ story: 1, viewer: 1 }, { unique: true });
storyViewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Reactions: like toggle (unique), emoji/text (multiple), TTL at story.expiresAt
const storyReactionSchema = new mongoose.Schema(
  {
    story: { type: mongoose.Schema.Types.ObjectId, ref: "Story", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["like", "emoji", "text"], required: true, index: true },
    emoji: { type: String, default: "" }, // for type=emoji
    text: { type: String, default: "" },  // for type=text (short)
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: false }
);
// Only one like per user/story
storyReactionSchema.index(
  { story: 1, user: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "like" } }
);
storyReactionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const StoryView = mongoose.model("StoryView", storyViewSchema);
const StoryReaction = mongoose.model("StoryReaction", storyReactionSchema);

module.exports = { StoryView, StoryReaction };