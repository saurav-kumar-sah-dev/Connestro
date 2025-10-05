// models/Conversation.js
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    // legacy field kept for your DB (unique index exists)
    participantHash: { type: String, unique: true, index: true },
    // deterministic ID string for participants
    key: { type: String, unique: true, sparse: true, index: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    unreadCounts: { type: Map, of: Number, default: {} }, // userId => count
    clearedAt: { type: Map, of: Date, default: {} }, // userId => Date (clear boundary)
  },
  { timestamps: true }
);

conversationSchema.pre("validate", function (next) {
  if (this.participants && this.participants.length > 0) {
    try {
      const ids = this.participants.map((id) => String(id)).sort();
      const k = ids.join("|");
      this.key = k;
      this.participantHash = k; // keep legacy unique index satisfied
    } catch (_) {}
  }
  next();
});

module.exports = mongoose.model("Conversation", conversationSchema);