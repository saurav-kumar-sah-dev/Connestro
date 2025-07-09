const express = require("express");
const router = express.Router();
const { followUser, unfollowUser, getUserProfile } = require("../controllers/userController");
const auth = require("../middleware/auth");

router.post("/follow/:id", auth, followUser);
router.post("/unfollow/:id", auth, unfollowUser);
router.get("/:id", auth, getUserProfile);

module.exports = router;
