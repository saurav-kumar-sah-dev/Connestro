// controllers/postController.js
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const { unlinkMedia } = require("../lib/uploads");

// Normalize visibility
const normalizeVisibility = (v) =>
  ["public", "followers", "private"].includes(String(v || "").toLowerCase())
    ? String(v).toLowerCase()
    : "public";

// Broadcast only to allowed audience
function emitToAudience(io, onlineUsers, post, eventName) {
  try {
    if (!io || !post) return;

    const ownerId = String(post.user?._id || post.user);
    const vis = post.draft ? "private" : (post.visibility || "public");

    if (vis === "private" || post.draft) {
      io.to(ownerId).emit(eventName, post);
      return;
    }

    if (vis === "public") {
      io.emit(eventName, post);
      return;
    }

    if (vis === "followers") {
      const userFollowers = (post.user?.followers || []).map(String);
      const targets = new Set([ownerId, ...userFollowers]);
      for (const uid of targets) {
        io.to(uid).emit(eventName, post);
      }
    }
  } catch (e) {
    console.error("emitToAudience error:", e.message);
  }
}

// Create post with media/links + audience/draft
exports.createPost = async (req, res) => {
  const { content, links, visibility, draft } = req.body;
  const files = req.files || [];
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");

  try {
    if (!content && !files.length && !links) {
      return res.status(400).json({ error: "Post cannot be empty" });
    }

    const media = [];
    files.forEach((file) => {
      let type = "document";
      if (file.mimetype?.startsWith("image/")) type = "image";
      else if (file.mimetype?.startsWith("video/")) type = "video";
      media.push({
        url: `/uploads/posts/${file.filename}`,
        type,
        name: file.originalname || "",
        sizeBytes: Number(file.size) || 0,
        mime: file.mimetype || "",
      });
    });
    if (links) {
      media.push({ url: links, type: "link", name: "", sizeBytes: 0, mime: "" });
    }

    let post = new Post({
      user: req.user.id,
      content,
      media,
      likes: [],
      comments: [],
      draft: String(draft) === "true" || draft === true,
      visibility: normalizeVisibility(visibility),
    });

    await post.save();
    await User.findByIdAndUpdate(req.user.id, { $push: { posts: post._id } });

    post = await Post.findById(post._id)
      .populate("user", "firstName lastName username profileImage followers following")
      .populate("comments.user", "firstName lastName username profileImage")
      .populate("comments.replies.user", "firstName lastName username profileImage");

    emitToAudience(io, onlineUsers, post, "newPost");
    res.status(201).json(post);
  } catch (err) {
    console.error("❌ Create Post Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Feed: exclude hidden posts globally
exports.getPosts = async (req, res) => {
  try {
    const meId = String(req.user.id);
    const me = await User.findById(meId).select("following").lean();
    const followingIds = (me?.following || []).map((id) => new mongoose.Types.ObjectId(String(id)));

    const posts = await Post.find({
      hiddenFor: { $nin: [new mongoose.Types.ObjectId(meId)] },
      isHidden: false,
      $or: [
        { user: new mongoose.Types.ObjectId(meId) },
        { draft: false, visibility: "public" },
        { draft: false, visibility: "followers", user: { $in: followingIds } },
      ],
    })
      .populate("user", "firstName lastName username followers following profileImage")
      .populate("comments.user", "firstName lastName username profileImage")
      .populate("comments.replies.user", "firstName lastName username profileImage")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Like with notification (only on add)
exports.likePost = async (req, res) => {
  const io = req.app.get("io");
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user.id;
    if (!post) return res.status(404).json({ error: "Post not found" });

    const alreadyLiked = (post.likes || []).map(String).includes(String(userId));
    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();

    if (io) io.emit("updateLike", { postId: post._id, likes: post.likes });

    if (!alreadyLiked && String(post.user) !== String(userId)) {
      try {
        const notif = await Notification.create({
          user: post.user, // recipient
          actor: userId,   // liker
          type: "like",
          post: post._id,
          text: "liked your post",
          link: `/post/${post._id}`,
        });
        const populated = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(post.user)).emit("notification:new", populated);
      } catch (e) {}
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Comment with notification to post owner
exports.commentOnPost = async (req, res) => {
  const io = req.app.get("io");
  const { text } = req.body;
  try {
    if (!text || !text.trim()) return res.status(400).json({ error: "Comment text required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({ user: req.user.id, text });
    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate("user", "firstName lastName username followers following profileImage")
      .populate("comments.user", "firstName lastName username profileImage")
      .populate("comments.replies.user", "firstName lastName username profileImage");

    const newComment = populatedPost.comments.slice(-1)[0];
    io?.emit("newComment", { postId: post._id, comment: newComment });

    if (String(post.user) !== String(req.user.id)) {
      try {
        const notif = await Notification.create({
          user: post.user,
          actor: req.user.id,
          type: "comment",
          post: post._id,
          text: "commented on your post",
          link: `/post/${post._id}`,
        });
        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(post.user)).emit("notification:new", populatedNotif);
      } catch {}
    }

    res.json({ comment: newComment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// React to comment with notification to comment author (only on add)
exports.reactToComment = async (req, res) => {
  const io = req.app.get("io");
  const { emoji } = req.body;

  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const userId = String(req.user.id);
    const existing = (comment.reactions || []).find(
      (r) => String(r.user) === userId && r.emoji === emoji
    );

    if (existing) {
      // remove reaction
      comment.reactions = comment.reactions.filter(
        (r) => !(String(r.user) === userId && r.emoji === emoji)
      );
    } else {
      // add reaction
      comment.reactions = comment.reactions || [];
      comment.reactions.push({ user: req.user.id, emoji });
    }

    await post.save();

    const newComment = comment;

    if (io) io.emit("updateCommentReaction", { postId: post._id, comment: newComment });

    const commentAuthorId = String(comment.user);
    const isAdd = !existing;
    if (isAdd && commentAuthorId !== userId) {
      try {
        const notif = await Notification.create({
          user: commentAuthorId,   // recipient: comment author
          actor: req.user.id,      // reactor
          type: "comment_reaction",
          post: post._id,
          comment: comment._id,
          text: `reacted ${emoji} to your comment`,
          link: `/post/${post._id}`,
        });
        const populated = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(commentAuthorId)).emit("notification:new", populated);
      } catch (e) {}
    }

    res.json(newComment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reply to a comment
exports.replyToComment = async (req, res) => {
  const io = req.app.get("io");
  const { text } = req.body;

  try {
    if (!text || !text.trim()) return res.status(400).json({ error: "Reply text required" });

    const { postId, commentId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    comment.replies = comment.replies || [];
    comment.replies.push({ user: req.user.id, text: text.trim() });
    await post.save();

    // Populate the reply user for response + sockets
    const populated = await Post.findById(post._id)
      .select("_id comments")
      .populate("comments.user", "firstName lastName username profileImage")
      .populate("comments.replies.user", "firstName lastName username profileImage");

    const updatedComment = populated.comments.id(comment._id);
    const newReply = updatedComment.replies[updatedComment.replies.length - 1];

    // Socket event for UI
    io?.emit("newReply", {
      postId: post._id,
      commentId: comment._id,
      reply: newReply,
    });

    // NEW: Notification to comment author (skip if replying to own comment)
    const commentAuthorId = String(comment.user);
    const actorId = String(req.user.id);
    if (commentAuthorId !== actorId) {
      try {
        const notif = await Notification.create({
          user: commentAuthorId,            // recipient: comment author
          actor: actorId,                   // who replied
          type: "reply",
          post: post._id,
          comment: comment._id,
          text: "replied to your comment",
          link: `/post/${post._id}`,
        });

        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();

        io?.to(String(commentAuthorId)).emit("notification:new", populatedNotif);
      } catch (e) {
        // do not fail the reply if notification fails
        console.error("reply notification error:", e.message);
      }
    }

    res.json({ reply: newReply });
  } catch (err) {
    console.error("replyToComment error:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.reactToReply = async (req, res) => {
  const io = req.app.get("io");
  const { emoji } = req.body;

  try {
    const { postId, commentId, replyId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const reply = (comment.replies || []).id(replyId);
    if (!reply) return res.status(404).json({ error: "Reply not found" });

    const userId = String(req.user.id);
    const existing = (reply.reactions || []).find(
      (r) => String(r.user) === userId && r.emoji === emoji
    );

    if (existing) {
      // remove reaction
      reply.reactions = reply.reactions.filter(
        (r) => !(String(r.user) === userId && r.emoji === emoji)
      );
    } else {
      // add reaction
      reply.reactions = reply.reactions || [];
      reply.reactions.push({ user: req.user.id, emoji });
    }

    await post.save();

    // Populate the reply for response + sockets
    const populated = await Post.findById(post._id)
      .select("_id comments")
      .populate("comments.replies.user", "firstName lastName username profileImage");

    const updatedReply = populated.comments.id(commentId).replies.id(replyId);

    io?.emit("updateReplyReaction", {
      postId: post._id,
      commentId: comment._id,
      reply: updatedReply,
    });

    // NEW: notify reply author only when reaction is added (not removed), and not self
    const isAdd = !existing;
    const replyAuthorId = String(reply.user);
    if (isAdd && replyAuthorId !== userId) {
      try {
        const notif = await Notification.create({
          user: replyAuthorId,         // recipient: reply author
          actor: userId,               // reactor
          type: "reply_reaction",
          post: post._id,
          comment: comment._id,
          text: `reacted ${emoji} to your reply`,
          link: `/post/${post._id}`,
        });

        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();

        io?.to(String(replyAuthorId)).emit("notification:new", populatedNotif);
      } catch (e) {
        // don't fail the main action if notification fails
        console.error("reply_reaction notification error:", e.message);
      }
    }

    res.json(updatedReply);
  } catch (err) {
    console.error("reactToReply error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Delete post (owner only)
exports.deletePost = async (req, res) => {
  const io = req.app.get("io");
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (String(post.user) !== String(req.user.id)) return res.status(403).json({ error: "Not authorized" });

    // unlink media
    await unlinkMedia(post.media || []);

    await User.findByIdAndUpdate(post.user, { $pull: { posts: post._id } });
    await post.deleteOne();

    io?.emit("deletePost", post._id);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Single post view: block hidden posts for non-admins
exports.getPostById = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id)
      .populate("user", "firstName lastName username profileImage followers following")
      .populate("comments.user", "firstName lastName username profileImage")
      .populate("comments.replies.user", "firstName lastName username profileImage");

    if (!post) return res.status(404).json({ error: "Post not found" });

    const meId = String(req.user.id);
    const ownerId = String(post.user?._id || post.user);
    const isAdmin = req.user?.role === "admin";

    // Admin-hidden posts are unavailable to everyone except admins
    if (post.isHidden && !isAdmin) {
      return res.status(403).json({ error: "Post is unavailable" });
    }

    // Audience gates (for non-owners)
    if (ownerId !== meId) {
      if (post.draft) return res.status(403).json({ error: "Not authorized" });
      if (post.visibility === "private") return res.status(403).json({ error: "Not authorized" });
      if (post.visibility === "followers") {
        const me = await User.findById(meId).select("following").lean();
        const followingIds = (me?.following || []).map((x) => String(x));
        if (!followingIds.includes(ownerId)) {
          return res.status(403).json({ error: "Not authorized" });
        }
      }
    }

    res.json(post);
  } catch (err) {
    console.error("Failed to get post:", err);
    res.status(500).json({ error: err.message });
  }
};

// Save as draft (owner only)
exports.saveAsDraft = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (String(post.user) !== String(req.user.id))
      return res.status(403).json({ error: "Not authorized" });

    post.draft = true;
    await post.save();

    res.json({ message: "Post saved as draft" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit post (owner only)
exports.editPost = async (req, res) => {
  try {
    const { content, visibility } = req.body;
    let post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (String(post.user) !== String(req.user.id))
      return res.status(403).json({ error: "Not authorized" });

    if (content !== undefined) post.content = content;
    if (visibility !== undefined) post.visibility = normalizeVisibility(visibility);

    await post.save();

    post = await Post.findById(post._id)
      .populate("user", "firstName lastName username profileImage followers following")
      .populate("comments.user", "firstName lastName username profileImage")
      .populate("comments.replies.user", "firstName lastName username profileImage");

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    emitToAudience(io, onlineUsers, post, "updatePost");

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update post with media/files (owner only)
exports.updatePost = async (req, res) => {
  const { content, links, removeOldMedia, visibility } = req.body;
  const files = req.files || [];
  const io = req.app.get("io");
  const onlineUsers = req.app.get("onlineUsers");

  try {
    let post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (String(post.user) !== String(req.user.id)) return res.status(403).json({ error: "Not authorized" });

    if (content !== undefined) post.content = content;

    if (removeOldMedia === "true" || removeOldMedia === true) {
      await unlinkMedia(post.media || []);
      post.media = [];
    }

    files.forEach((file) => {
      let type = "document";
      if (file.mimetype?.startsWith("image/")) type = "image";
      else if (file.mimetype?.startsWith("video/")) type = "video";
      post.media.push({
        url: `/uploads/posts/${file.filename}`,
        type,
        name: file.originalname || "",
        sizeBytes: Number(file.size) || 0,
        mime: file.mimetype || "",
      });
    });

    if (links) post.media.push({ url: links, type: "link", name: "", sizeBytes: 0, mime: "" });
    if (visibility !== undefined) post.visibility = normalizeVisibility(visibility);

    await post.save();

    post = await Post.findById(post._id)
      .populate("user", "firstName lastName username profileImage followers following")
      .populate("comments.user", "firstName lastName username profileImage")
      .populate("comments.replies.user", "firstName lastName username profileImage");

    emitToAudience(io, onlineUsers, post, "updatePost");
    res.json(post);
  } catch (err) {
    console.error("❌ Update Post Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Drafts for owner
exports.getDrafts = async (req, res) => {
  try {
    const drafts = await Post.find({ user: req.user.id, draft: true })
      .populate("user", "username profileImage followers")
      .populate("comments.user", "username profileImage")
      .populate("comments.replies.user", "username profileImage");
    res.status(200).json(drafts);
  } catch (err) {
    console.error("Get drafts error:", err);
    res.status(500).json({ message: "Failed to fetch drafts" });
  }
};

// Publish draft with audience
exports.publishDraft = async (req, res) => {
  try {
    const { visibility } = req.body;
    let post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (String(post.user) !== String(req.user.id))
      return res.status(403).json({ error: "Not authorized" });

    post.draft = false;
    if (visibility !== undefined) post.visibility = normalizeVisibility(visibility);
    await post.save();

    post = await Post.findById(post._id)
      .populate("user", "firstName lastName username profileImage followers following")
      .populate("comments.user", "firstName lastName username profileImage")
      .populate("comments.replies.user", "firstName lastName username profileImage");

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    emitToAudience(io, onlineUsers, post, "newPost");

    res.json(post);
  } catch (err) {
    console.error("Publish draft error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.canUsersView = async (req, res) => {
  try {
    const postId = String(req.params.id || "");
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ success: false, msg: "Invalid post id" });
    }

    const userIdsParam = String(req.query.userIds || "").trim();
    const userIds = userIdsParam
      ? userIdsParam
          .split(",")
          .map((s) => s.trim())
          .filter((s) => mongoose.isValidObjectId(s))
          .map(String)
      : [];

    const post = await Post.findById(postId)
      .populate("user", "followers")
      .lean();

    if (!post) return res.status(404).json({ success: false, msg: "Post not found" });

    const isAdmin = String(req.user?.role || "") === "admin";
    const ownerId = String(post.user?._id || post.user || "");
    const vis = String(post.visibility || "public");
    const isHidden = !!post.isHidden;
    const isDraft = !!post.draft;

    const map = {};
    if (!userIds.length) return res.json({ success: true, map });

    // Admin-hidden posts unavailable to everyone except admins
    if (isHidden && !isAdmin) {
      for (const uid of userIds) map[uid] = false;
      return res.json({ success: true, map });
    }

    // Draft: only owner
    if (isDraft) {
      for (const uid of userIds) map[uid] = uid === ownerId;
      return res.json({ success: true, map });
    }

    if (vis === "private") {
      for (const uid of userIds) map[uid] = uid === ownerId;
      return res.json({ success: true, map });
    }

    if (vis === "public") {
      for (const uid of userIds) map[uid] = true;
      return res.json({ success: true, map });
    }

    // followers-only: owner or a follower
    const followers = (post.user?.followers || []).map((x) => String(x));
    for (const uid of userIds) {
      map[uid] = uid === ownerId || followers.includes(uid);
    }
    return res.json({ success: true, map });
  } catch (err) {
    console.error("canUsersView (post) error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};