// routes/reels.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/reelController");
const { makeUploader } = require("../lib/uploads");

// Videos only, 100MB max
const upload = makeUploader({ subdir: "reels", allow: "images+videos", fileSizeMB: 100 });

// Create reel (video) — accepts body.draft
router.post("/", auth, upload.single("video"), ctrl.create);

// Feed: my + following reels (published only)
router.get("/", auth, ctrl.listFeed);

// User reels (owner sees drafts, others don't)
router.get("/user/:userId", auth, ctrl.listForUser);

// Drafts (owner only)
router.get("/drafts", auth, ctrl.listDrafts);

// Publish draft (owner only)
router.put("/:id/publish", auth, ctrl.publish);

// Like toggle
router.post("/:id/like", auth, ctrl.like);

// Comment
router.post("/:id/comment", auth, ctrl.comment);

// NEW: comment vote (like/dislike)
router.post("/:id/comment/:commentId/vote", auth, ctrl.voteComment);

// NEW: reply to comment
router.post("/:id/comment/:commentId/reply", auth, ctrl.replyToComment);

// NEW: reply vote (like/dislike)
router.post("/:id/comment/:commentId/reply/:replyId/vote", auth, ctrl.voteReply);

// NEW: react to reply (emoji toggle per user+emoji)
router.put("/:id/comment/:commentId/reply/:replyId/react", auth, ctrl.reactToReply);

// Unique view
router.post("/:id/view", auth, ctrl.view);

router.get("/:id", auth, ctrl.getById); // NEW

// Delete
router.delete("/:id", auth, ctrl.remove);

// Lists for clickable users
router.get("/:id/likes", auth, ctrl.listLikes);
router.get("/:id/comments", auth, ctrl.listComments);
router.get("/:id/views", auth, ctrl.listViews);

router.get("/:id/can-view", auth, ctrl.canUsersView);

module.exports = router;