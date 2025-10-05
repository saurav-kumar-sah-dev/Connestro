// routes/posts.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const {
  createPost,
  getPosts,
  likePost,
  commentOnPost,
  deletePost,
  reactToComment,
  getPostById,
  saveAsDraft,
  editPost,
  updatePost,
  getDrafts,
  publishDraft,
  replyToComment,
  reactToReply,
  canUsersView, // NEW
} = require("../controllers/postController");
const auth = require("../middleware/auth");

// Multer setup for file uploads
const { makeUploader } = require("../lib/uploads");
// Allow images + videos + documents for posts
const upload = makeUploader({ subdir: "posts", allow: "posts", fileSizeMB: 50 });

// Create + list
router.post("/", auth, upload.array("media", 5), createPost);
router.get("/", auth, getPosts);
router.get("/drafts", auth, getDrafts); // before /:id

// Likes + comments
router.put("/like/:id", auth, likePost);
router.post("/comment/:id", auth, commentOnPost);
router.put("/:postId/comment/:commentId/react", auth, reactToComment);

// Replies
router.post("/:postId/comment/:commentId/reply", auth, replyToComment);
router.put("/:postId/comment/:commentId/reply/:replyId/react", auth, reactToReply);

// Access check (ADD THIS BEFORE "/:id")
router.get("/:id/can-view", auth, canUsersView);

// Single post + edit/update/draft/publish
router.get("/:id", auth, getPostById);
router.put("/:id/draft", auth, saveAsDraft);
router.put("/:id/publish", auth, publishDraft);
router.put("/:id/edit", auth, editPost);
router.put("/:id", auth, upload.array("media", 5), updatePost);
router.delete("/:id", auth, deletePost);

module.exports = router;