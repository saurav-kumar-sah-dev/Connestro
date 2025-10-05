// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");

const {
  getAllUsers,
  deleteUserByAdmin,
  getAllPosts,
  deletePostByAdmin,
  suspendUser,
  unsuspendUser,
  hidePost,
  unhidePost,
  getAllMetrics,
} = require("../controllers/adminController");

const {
  listReports,
  getReport,
  updateReport,
  exportReports,
} = require("../controllers/adminReportController");

const {
  listAudit,
  exportAudit,
} = require("../controllers/adminAuditController");

const { 
  getAllReels, deleteReelByAdmin, hideReel, unhideReel,
} = require("../controllers/adminReelController"); // NEW controller


router.get("/metrics", auth, admin, getAllMetrics);


router.get("/users", auth, admin, getAllUsers);
router.delete("/users/:id", auth, admin, deleteUserByAdmin);

// Hardened: disable role updates
router.put("/users/:id/role", auth, admin, (req, res) =>
  res.status(403).json({ success: false, code: "ROLE_CHANGE_DISABLED", msg: "Role change is disabled" })
);

router.put("/users/:id/suspend", auth, admin, suspendUser);
router.put("/users/:id/unsuspend", auth, admin, unsuspendUser);


router.get("/posts", auth, admin, getAllPosts);
router.delete("/posts/:id", auth, admin, deletePostByAdmin);
router.put("/posts/:id/hide", auth, admin, hidePost);
router.put("/posts/:id/unhide", auth, admin, unhidePost);

router.get("/reports", auth, admin, listReports);
router.get("/reports/export", auth, admin, exportReports);
router.get("/reports/:id", auth, admin, getReport);
router.put("/reports/:id", auth, admin, updateReport);


router.get("/audit", auth, admin, listAudit);
router.get("/audit/export", auth, admin, exportAudit);


router.get("/reels", auth, admin, getAllReels);
router.delete("/reels/:id", auth, admin, deleteReelByAdmin);
router.put("/reels/:id/hide", auth, admin, hideReel);
router.put("/reels/:id/unhide", auth, admin, unhideReel);

module.exports = router;