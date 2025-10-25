// routes/reports.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const ctrl = require("../controllers/reportController");

const { uploaders } = require("../lib/cloudinary");
const upload = uploaders.reports;

// Create a report (post or user) with optional attachments
router.post("/", auth, upload.array("attachments", 5), ctrl.createReport);

// View my own reports (no privacy risk)
router.get("/mine", auth, ctrl.myReports);

module.exports = router;