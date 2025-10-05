// routes/notifications.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/notificationController");

router.get("/", auth, ctrl.list);
router.patch("/:id/read", auth, ctrl.markOneRead);
router.patch("/read-all", auth, ctrl.markAllRead);

// NEW
router.delete("/:id", auth, ctrl.deleteOne); // delete single notification
router.delete("/", auth, ctrl.clearAll);     // clear all notifications

module.exports = router;