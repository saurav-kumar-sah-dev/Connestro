// models/Story.js
const mongoose = require("mongoose");

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    type: { type: String, enum: ["image", "video"], required: true, index: true },
    url: { type: String, required: true },
    caption: { type: String, default: "" },

    // for videos (client provides this; server may validate via ffprobe if added)
    durationSec: { type: Number, default: 0 },

    // audience
    visibility: { type: String, enum: ["public", "followers"], default: "public", index: true },

    // lifecycle
    createdAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// TTL: deletes story when expiresAt passes
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Story", storySchema);