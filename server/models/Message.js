// models/Message.js
const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["image", "video", "file"], required: true },
    url: { type: String, required: true },
    mime: String,
    size: Number,
    name: String,
    width: Number,
    height: Number,
    duration: Number,
  },
  { _id: false }
);

const callInfoSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["audio", "video"], required: true },
    status: { type: String, enum: ["missed", "declined", "ended"], required: true },
    initiator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    startedAt: { type: Date },
    endedAt: { type: Date },
    durationSec: { type: Number, default: 0 },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Content
    text: { type: String, default: "" },
    attachments: [attachmentSchema],

    // Kind: text or call log
    kind: { type: String, enum: ["text", "call"], default: "text", index: true },
    callInfo: callInfoSchema, // present when kind === 'call'

    // receipts
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // edit/delete
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    isDeleted: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);