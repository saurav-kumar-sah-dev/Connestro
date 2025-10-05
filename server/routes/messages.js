// routes/messages.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
  getConversations,
  getOrCreateConversationWithUser,
  getMessages,
  sendMessage,
  markRead,
  editMessage,
  deleteForMe,
  deleteForEveryone,
  clearConversationForMe
} = require("../controllers/messageController");

const { makeUploader } = require("../lib/uploads");
const upload = makeUploader({ subdir: 'chat', allow: 'images+videos', fileSizeMB: 25 });

// Conversations
router.get("/conversations", auth, getConversations);
router.post("/conversations/with/:userId", auth, getOrCreateConversationWithUser);
router.post("/conversations", auth, getOrCreateConversationWithUser); // accepts { userId }

// Messages
router.get("/conversations/:id/messages", auth, getMessages);
router.post("/conversations/:id/messages", auth, upload.array("attachments", 6), sendMessage);
router.patch("/conversations/:id/read", auth, markRead);

// Message edit/delete
router.patch("/message/:messageId", auth, editMessage);
router.delete("/message/:messageId", auth, deleteForMe);
router.delete("/message/:messageId/everyone", auth, deleteForEveryone);
router.post("/:id/clear", auth, clearConversationForMe);

module.exports = router;