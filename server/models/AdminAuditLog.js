// models/AdminAuditLog.js
const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true }, 
    targetType: { type: String, enum: ["user", "post", "report", "reel"], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);