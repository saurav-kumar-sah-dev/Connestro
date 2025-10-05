// routes/users.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  followUser,
  unfollowUser,
  getUserProfile,
  updateProfileImage,
  updateProfile,
  updateEnhancedProfile,
  deleteUser,
  searchUsers,
  getFollowers,
  getFollowing,
  setPassword,
  checkUsername,
  // Notification settings
  getNotificationSettings,
  updateNotificationSettings,
} = require("../controllers/userController");

// Status controller
const { setStatus, clearStatus } = require("../controllers/statusController");

// Centralized uploader
const { makeUploader } = require("../lib/uploads");

// Images only, 5 MB max, saved under UPLOADS_DIR/profileImages
const uploadProfileImage = makeUploader({
  subdir: "profileImages",
  allow: "images",
  fileSizeMB: 5,
});


router.get("/search", auth, searchUsers);


router.get("/username-available", checkUsername);


router.patch("/me/password", auth, setPassword);


router.put("/me/status", auth, setStatus);   
router.delete("/me/status", auth, clearStatus);


router.get("/me/notification-settings", auth, getNotificationSettings);
router.patch("/me/notification-settings", auth, updateNotificationSettings);


router.put("/update", auth, updateProfile);
router.put("/enhanced/update", auth, updateEnhancedProfile);


router.put(
  "/:id/profile-image",
  auth,
  uploadProfileImage.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  updateProfileImage
);


router.put("/:id/follow", auth, followUser);
router.put("/:id/unfollow", auth, unfollowUser);

router.get("/:id/followers", auth, getFollowers);
router.get("/:id/following", auth, getFollowing);


router.get("/:id", auth, getUserProfile);


router.delete("/delete", auth, deleteUser);

module.exports = router;