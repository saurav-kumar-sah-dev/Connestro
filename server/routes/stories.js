const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/storyController");

const { makeUploader } = require("../lib/uploads");
const upload = makeUploader({ subdir: "stories", allow: "images+videos", fileSizeMB: 30 });

// Create story (single media)
router.post("/", auth, upload.single("media"), ctrl.create);

// Feed: my + following active stories
router.get("/", auth, ctrl.listFeed);

// User stories
router.get("/user/:userId", auth, ctrl.listForUser);

// Active counts for users (for rings)
router.get("/active", auth, ctrl.activeForUsers);

// NEW: unseen counts for users (for seen/unseen rings)
router.get("/unseen", auth, ctrl.unseenForUsers);

// NEW: views
router.post("/:id/view", auth, ctrl.markView);
router.get("/:id/views", auth, ctrl.listViews);

// NEW: reactions
router.post("/:id/react", auth, ctrl.react);
router.get("/:id/reactions", auth, ctrl.listReactions);

// Delete own story
router.delete("/:id", auth, ctrl.remove);

module.exports = router;