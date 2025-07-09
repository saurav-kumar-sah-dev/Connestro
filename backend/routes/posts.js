const express = require("express");
const router = express.Router();
const {
  createPost,
  getPosts,
  likePost,
  commentOnPost
} = require("../controllers/postController");
const auth = require("../middleware/auth");

router.post("/", auth, createPost);
router.get("/", auth, getPosts);
router.post("/like/:id", auth, likePost);
router.post("/comment/:id", auth, commentOnPost);

module.exports = router;
