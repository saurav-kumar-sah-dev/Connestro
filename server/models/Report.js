// models/Report.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: String,
    mime: String,
    size: Number,
    name: String,
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // ADD "reel" here
    targetType: { type: String, enum: ["post", "user", "reel"], required: true, index: true },

    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // NEW: reel reference
    reel: { type: mongoose.Schema.Types.ObjectId, ref: "Reel" },

    reason: {
      type: String,
      enum: ["spam", "abuse", "nudity", "violence", "harassment", "hate", "misinformation", "other"],
      default: "other",
      index: true,
    },
    details: { type: String, default: "" },

    attachments: [attachmentSchema],

    status: { type: String, enum: ["open", "reviewing", "resolved", "rejected"], default: "open", index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolution: { type: String, default: "" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// existing indexes...
reportSchema.index(
  { reporter: 1, post: 1 },
  { unique: true, partialFilterExpression: { targetType: "post", post: { $type: "objectId" } } }
);

// NEW: uniqueness per reporter+reel
reportSchema.index(
  { reporter: 1, reel: 1 },
  { unique: true, partialFilterExpression: { targetType: "reel", reel: { $type: "objectId" } } }
);

reportSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);