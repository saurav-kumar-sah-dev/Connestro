// controllers/reelController.js
const mongoose = require("mongoose");
const { Reel, ReelView } = require("../models/Reel");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { unlinkFiles, fsPathForPublicUrl } = require("../lib/uploads");
const { probeDurationSec } = require("../lib/ffprobe");

const REEL_MAX_SEC = Number(process.env.REELS_MAX_DURATION_SEC || 60);

const isAdminReq = (req) => String(req.user?.role || "") === "admin";

// Block helper: true if either user blocked the other
const isEitherBlocked = async (aId, bId) => {
  const [a, b] = await Promise.all([
    User.findById(aId).select("blocked").lean(),
    User.findById(bId).select("blocked").lean(),
  ]);
  const aBlocksB =
    Array.isArray(a?.blocked) && a.blocked.map(String).includes(String(bId));
  const bBlocksA =
    Array.isArray(b?.blocked) && b.blocked.map(String).includes(String(aId));
  return aBlocksB || bBlocksA;
};

function sanitizeUserSnippet(u) {
  if (!u) return null;
  return {
    _id: u._id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImage: u.profileImage || "",
  };
}

function sanitizeReel(doc) {
  const r = doc?.toObject ? doc.toObject() : doc;
  return {
    _id: r._id,
    user: r.user && r.user._id ? sanitizeUserSnippet(r.user) : r.user,
    url: r.url,
    caption: r.caption || "",
    durationSec: r.durationSec || 0,
    visibility: r.visibility || "public",
    draft: !!r.draft,
    isHidden: !!r.isHidden,
    likes: Array.isArray(r.likes) ? r.likes.map(String) : [],
    comments: Array.isArray(r.comments) ? r.comments : [],
    viewsCount: r.viewsCount || 0,
    createdAt: r.createdAt,
  };
}

// Helper: check if viewer can interact (like/comment/reply/vote/react)
async function canInteract(reelId, userId) {
  const reel = await Reel.findById(reelId).populate("user", "followers blocked").lean();
  if (!reel) return { ok: false, code: 404, msg: "Reel not found" };

  const ownerId = String(reel.user?._id || reel.user);
  const isOwner = ownerId === String(userId);

  // Block gate
  if (!isOwner) {
    const blocked = await isEitherBlocked(String(userId), ownerId);
    if (blocked) return { ok: false, code: 403, msg: "Not authorized" };
  }

  if (reel.draft && !isOwner) return { ok: false, code: 403, msg: "Not authorized" };
  if (!reel.draft && reel.visibility === "followers" && !isOwner) {
    const followers = (reel.user?.followers || []).map(String);
    if (!followers.includes(String(userId))) return { ok: false, code: 403, msg: "Not authorized" };
  }
  return { ok: true, reel, ownerId, isOwner };
}

// CREATE 
exports.create = async (req, res) => {
  const userId = String(req.user.id);
  const file = req.file;
  try {
    if (!file) return res.status(400).json({ success: false, msg: "No video uploaded (field: video)" });

    if (!file.mimetype?.startsWith("video/")) {
      await unlinkFiles([`/uploads/reels/${file.filename}`]).catch(() => {});
      return res.status(400).json({ success: false, msg: "Only video files are allowed for reels" });
    }

    const caption = String(req.body.caption || "").slice(0, 200);
    const visibility = ["public", "followers"].includes(String(req.body.visibility))
      ? String(req.body.visibility)
      : "public";
    const draft = String(req.body.draft || "") === "true" || req.body.draft === true;

    let durationSec = 0;
    const publicUrl = `/uploads/reels/${file.filename}`;
    const localPath = fsPathForPublicUrl(publicUrl);
    const probed = await probeDurationSec(localPath).catch(() => 0);
    if (Number.isFinite(probed) && probed > 0) durationSec = Math.round(probed);
    if (durationSec > REEL_MAX_SEC) {
      await unlinkFiles([publicUrl]).catch(() => {});
      return res.status(400).json({ success: false, msg: `Reel must be ${REEL_MAX_SEC}s or less` });
    }

    let reel = await Reel.create({
      user: userId,
      url: publicUrl,
      caption,
      durationSec,
      visibility,
      draft,
      isHidden: false,
      likes: [],
      comments: [],
      viewsCount: 0,
    });

    reel = await Reel.findById(reel._id).populate("user", "username firstName lastName profileImage followers");

    const out = sanitizeReel(reel);

    // Broadcast published reels only
    const io = req.app.get("io");
    if (!draft) {
      if (visibility === "public") {
        io?.emit("reel:new", out);
      } else {
        const followers = (reel.user?.followers || []).map((id) => String(id));
        const targets = new Set([String(userId), ...followers]);
        for (const uid of targets) io?.to(uid).emit("reel:new", out);
      }
    }

    res.status(201).json({ success: true, reel: out });
  } catch (err) {
    console.error("create reel error:", err);
    if (file?.filename) await unlinkFiles([`/uploads/reels/${file.filename}`]).catch(() => {});
    res.status(500).json({ success: false, error: err.message });
  }
};

//  FEED 
exports.listFeed = async (req, res) => {
  try {
    const meId = String(req.user.id);
    const me = await User.findById(meId).select("following").lean();
    const followingIds = (me?.following || []).map((x) => new mongoose.Types.ObjectId(String(x)));

    const authors = [new mongoose.Types.ObjectId(meId), ...followingIds];

    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const reels = await Reel.find({
      isHidden: { $ne: true }, // include false or missing
      draft: false, // exclude drafts
      $or: [{ user: { $in: authors } }, { visibility: "public" }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "username firstName lastName profileImage");

    res.json({ success: true, reels: reels.map(sanitizeReel) });
  } catch (err) {
    console.error("listFeed reels error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// USER REELS 
exports.listForUser = async (req, res) => {
  try {
    const viewerId = String(req.user.id);
    const userId = String(req.params.userId || "");
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ success: false, msg: "Invalid userId" });

    const target = await User.findById(userId).select("_id").lean();
    if (!target) return res.status(404).json({ success: false, msg: "User not found" });

    const isOwner = viewerId === userId;

    // Block gate: if not owner, and either blocked, deny
    if (!isOwner) {
      const blocked = await isEitherBlocked(viewerId, userId);
      if (blocked) return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    let followsOwner = false;
    if (!isOwner) {
      const viewer = await User.findById(viewerId).select("following").lean();
      followsOwner = (viewer?.following || []).map(String).includes(String(userId));
    }

    const query = { user: userId, isHidden: { $ne: true } };
    if (!isOwner) {
      query.draft = false;
      query.$or = [{ visibility: "public" }, ...(followsOwner ? [{ visibility: "followers" }] : [])];
    }

    const reels = await Reel.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "username firstName lastName profileImage");

    res.json({ success: true, reels: reels.map(sanitizeReel) });
  } catch (err) {
    console.error("listForUser reels error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// LIKE TOGGLE 
exports.like = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, msg: "Invalid reel id" });

    // Block + audience via canInteract
    const check = await canInteract(id, userId);
    if (!check.ok) return res.status(check.code).json({ success: false, msg: check.msg });

    const exists = await Reel.findOne({ _id: id, likes: userId }).select("_id").lean();
    let liked = false;
    if (exists) {
      await Reel.updateOne({ _id: id }, { $pull: { likes: userId } });
      liked = false;
    } else {
      await Reel.updateOne({ _id: id }, { $addToSet: { likes: userId } });
      liked = true;
    }

    const likesCount = await Reel.findById(id).select("likes").lean().then((r) => (r?.likes || []).length);

    // Notify owner (not for self like) — only for non-draft reels
    const ownerId = check.ownerId;
    const io = req.app.get("io");
    if (!check.reel.draft && ownerId !== userId && liked) {
      try {
        const notif = await Notification.create({
          user: ownerId,
          actor: userId,
          type: "like",
          text: "liked your reel",
          link: `/reels/${id}`,
        });
        const populated = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(ownerId)).emit("notification:new", populated);
      } catch {}
    }

    io?.emit("reel:updateLike", { reelId: id, likesCount });

    res.json({ success: true, liked, likesCount });
  } catch (err) {
    console.error("reel like error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// COMMENT
exports.comment = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const id = String(req.params.id);
    const text = String(req.body.text || "").trim().slice(0, 500);
    if (!text) return res.status(400).json({ success: false, msg: "Missing text" });
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, msg: "Invalid reel id" });

    const check = await canInteract(id, userId);
    if (!check.ok) return res.status(check.code).json({ success: false, msg: check.msg });

    const comment = { user: userId, text, emoji: "", createdAt: new Date(), likes: [], dislikes: [], replies: [] };
    await Reel.updateOne({ _id: id }, { $push: { comments: comment } });

    const populated = await Reel.findById(id)
      .select("comments")
      .populate("comments.user", "username firstName lastName profileImage")
      .lean();

    const c = (populated?.comments || []).slice(-1)[0];

    const io = req.app.get("io");
    if (!check.reel.draft && !check.isOwner) {
      try {
        const notif = await Notification.create({
          user: check.ownerId,
          actor: userId,
          type: "comment",
          text: "commented on your reel",
          link: `/reels/${id}`,
        });
        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(check.ownerId)).emit("notification:new", populatedNotif);
      } catch {}
    }

    io?.emit("reel:newComment", { reelId: id, comment: c });

    res.json({ success: true, comment: c });
  } catch (err) {
    console.error("reel comment error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  REPLY TO COMMENT 
exports.replyToComment = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const { id, commentId } = req.params;

    const check = await canInteract(id, userId);
    if (!check.ok) return res.status(check.code).json({ success: false, msg: check.msg });

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const comment = reel.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, msg: "Comment not found" });

    const text = String(req.body.text || "").trim().slice(0, 500);
    if (!text) return res.status(400).json({ success: false, msg: "Reply text required" });

    comment.replies = comment.replies || [];
    comment.replies.push({ user: userId, text, likes: [], dislikes: [], reactions: [] });
    await reel.save();

    const populated = await Reel.findById(id)
      .select("comments")
      .populate("comments.user", "username firstName lastName profileImage")
      .populate("comments.replies.user", "username firstName lastName profileImage")
      .lean();

    const updated = populated.comments.find((c) => String(c._id) === String(commentId));
    const newReply = updated?.replies?.[updated.replies.length - 1] || null;

    const io = req.app.get("io");
    io?.emit("reel:newReply", { reelId: id, commentId, reply: newReply });

    // Notify comment author (not self)
    const commentAuthorId = String(comment.user);
    if (commentAuthorId !== userId) {
      try {
        const notif = await Notification.create({
          user: commentAuthorId,
          actor: userId,
          type: "reply",
          text: "replied to your comment",
          link: `/reels/${id}`,
        });
        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(commentAuthorId)).emit("notification:new", populatedNotif);
      } catch {}
    }

    res.json({ success: true, reply: newReply });
  } catch (err) {
    console.error("replyToComment error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  VOTE COMMENT LIKE/DISLIKE 
exports.voteComment = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const { id, commentId } = req.params;
    const vote = String(req.body.vote || "").toLowerCase(); // "like" | "dislike"

    if (!["like", "dislike"].includes(vote))
      return res.status(400).json({ success: false, msg: "Invalid vote (like/dislike)" });

    const check = await canInteract(id, userId);
    if (!check.ok) return res.status(check.code).json({ success: false, msg: check.msg });

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const comment = reel.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, msg: "Comment not found" });

    comment.likes = Array.isArray(comment.likes) ? comment.likes : [];
    comment.dislikes = Array.isArray(comment.dislikes) ? comment.dislikes : [];

    const uid = new mongoose.Types.ObjectId(userId);

    const inLikes = comment.likes.some((x) => String(x) === String(uid));
    const inDislikes = comment.dislikes.some((x) => String(x) === String(uid));

    const addedLike = vote === "like" && !inLikes;
    const addedDislike = vote === "dislike" && !inDislikes;

    if (vote === "like") {
      if (inLikes) {
        comment.likes.pull(uid);
      } else {
        comment.likes.addToSet(uid);
        if (inDislikes) comment.dislikes.pull(uid);
      }
    } else {
      if (inDislikes) {
        comment.dislikes.pull(uid);
      } else {
        comment.dislikes.addToSet(uid);
        if (inLikes) comment.likes.pull(uid);
      }
    }

    await reel.save();

    const io = req.app.get("io");
    io?.emit("reel:updateCommentVote", {
      reelId: id,
      commentId,
      likesCount: comment.likes.length,
      dislikesCount: comment.dislikes.length,
      myVote: vote,
    });

    // Notify comment author (not self) only when a vote is added (not removed)
    const commentAuthorId = String(comment.user);
    if (commentAuthorId !== userId && (addedLike || addedDislike)) {
      try {
        const notif = await Notification.create({
          user: commentAuthorId,
          actor: userId,
          type: addedLike ? "comment_like" : "comment_dislike",
          text: addedLike ? "liked your comment" : "disliked your comment",
          link: `/reels/${id}`,
        });
        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(commentAuthorId)).emit("notification:new", populatedNotif);
      } catch (e) {}
    }

    res.json({
      success: true,
      likesCount: comment.likes.length,
      dislikesCount: comment.dislikes.length,
      myVote: vote,
    });
  } catch (err) {
    console.error("voteComment error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// VOTE REPLY LIKE/DISLIKE 
exports.voteReply = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const { id, commentId, replyId } = req.params;
    const vote = String(req.body.vote || "").toLowerCase();

    if (!["like", "dislike"].includes(vote))
      return res.status(400).json({ success: false, msg: "Invalid vote (like/dislike)" });

    const check = await canInteract(id, userId);
    if (!check.ok) return res.status(check.code).json({ success: false, msg: check.msg });

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const comment = reel.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, msg: "Comment not found" });

    const reply = (comment.replies || []).id(replyId);
    if (!reply) return res.status(404).json({ success: false, msg: "Reply not found" });

    reply.likes = Array.isArray(reply.likes) ? reply.likes : [];
    reply.dislikes = Array.isArray(reply.dislikes) ? reply.dislikes : [];

    const uid = new mongoose.Types.ObjectId(userId);
    const inLikes = reply.likes.some((x) => String(x) === String(uid));
    const inDislikes = reply.dislikes.some((x) => String(x) === String(uid));

    const addedLike = vote === "like" && !inLikes;
    const addedDislike = vote === "dislike" && !inDislikes;

    if (vote === "like") {
      if (inLikes) {
        reply.likes.pull(uid);
      } else {
        reply.likes.addToSet(uid);
        if (inDislikes) reply.dislikes.pull(uid);
      }
    } else {
      if (inDislikes) {
        reply.dislikes.pull(uid);
      } else {
        reply.dislikes.addToSet(uid);
        if (inLikes) reply.likes.pull(uid);
      }
    }

    await reel.save();

    const io = req.app.get("io");
    io?.emit("reel:updateReplyVote", {
      reelId: id,
      commentId,
      replyId,
      likesCount: reply.likes.length,
      dislikesCount: reply.dislikes.length,
      myVote: vote,
    });

    // Notify reply author (not self) only when a vote is added
    const replyAuthorId = String(reply.user);
    if (replyAuthorId !== userId && (addedLike || addedDislike)) {
      try {
        const notif = await Notification.create({
          user: replyAuthorId,
          actor: userId,
          type: addedLike ? "reply_like" : "reply_dislike",
          text: addedLike ? "liked your reply" : "disliked your reply",
          link: `/reels/${id}`,
        });
        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(replyAuthorId)).emit("notification:new", populatedNotif);
      } catch (e) {}
    }

    res.json({
      success: true,
      likesCount: reply.likes.length,
      dislikesCount: reply.dislikes.length,
      myVote: vote,
    });
  } catch (err) {
    console.error("voteReply error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  REACT TO REPLY EMOJI 
exports.reactToReply = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const { id, commentId, replyId } = req.params;
    const { emoji } = req.body || {};
    const em = String(emoji || "").slice(0, 8);
    if (!em) return res.status(400).json({ success: false, msg: "Missing emoji" });

    const check = await canInteract(id, userId);
    if (!check.ok) return res.status(check.code).json({ success: false, msg: check.msg });

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const comment = reel.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, msg: "Comment not found" });

    const reply = (comment.replies || []).id(replyId);
    if (!reply) return res.status(404).json({ success: false, msg: "Reply not found" });

    reply.reactions = Array.isArray(reply.reactions) ? reply.reactions : [];
    const idx = reply.reactions.findIndex(
      (r) => String(r.user) === String(userId) && r.emoji === em
    );
    const added = idx < 0;

    if (added) {
      reply.reactions.push({ user: req.user.id, emoji: em });
    } else {
      reply.reactions.splice(idx, 1);
    }

    await reel.save();

    // Populate just the reply for response
    const populated = await Reel.findById(id)
      .select("comments")
      .populate("comments.replies.user", "username firstName lastName profileImage")
      .lean();
    const updated = populated.comments
      .find((c) => String(c._id) === String(commentId))?.replies
      .find((r) => String(r._id) === String(replyId));

    const io = req.app.get("io");
    io?.emit("reel:updateReplyReaction", { reelId: id, commentId, reply: updated });

    // Notify reply author (not self) only when reaction is added
    const replyAuthorId = String(reply.user);
    if (added && replyAuthorId !== userId) {
      try {
        const notif = await Notification.create({
          user: replyAuthorId,
          actor: userId,
          type: "reply_reaction",
          text: `reacted ${em} to your reply`,
          link: `/reels/${id}`,
        });
        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(replyAuthorId)).emit("notification:new", populatedNotif);
      } catch (e) {}
    }

    res.json({ success: true, reply: updated });
  } catch (err) {
    console.error("reactToReply error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  VIEW (unique per user) 
exports.view = async (req, res) => {
  try {
    const viewerId = String(req.user.id);
    const id = String(req.params.id);
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, msg: "Invalid reel id" });

    const reel = await Reel.findById(id).populate("user", "followers").lean();
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const ownerId = String(reel.user?._id || reel.user);
    const isOwner = ownerId === viewerId;

    // Block gate
    if (!isOwner) {
      const blocked = await isEitherBlocked(viewerId, ownerId);
      if (blocked) return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    if (reel.draft && !isOwner) return res.status(403).json({ success: false, msg: "Not authorized" });
    if (!reel.draft && reel.visibility === "followers" && !isOwner) {
      const followers = (reel.user?.followers || []).map(String);
      if (!followers.includes(viewerId)) return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    const result = await ReelView.updateOne(
      { reel: id, viewer: viewerId },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );

    const newly = !!(result.upsertedCount || result.upsertedId);
    if (newly) {
      await Reel.updateOne({ _id: id }, { $inc: { viewsCount: 1 } });
    }

    res.json({ success: true, counted: newly });
  } catch (err) {
    console.error("reel view error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DRAFTS (owner only) 
exports.listDrafts = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const reels = await Reel.find({ user: userId, draft: true })
      .sort({ createdAt: -1 })
      .populate("user", "username firstName lastName profileImage");
    res.json({ success: true, reels: reels.map(sanitizeReel) });
  } catch (err) {
    console.error("listDrafts error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUBLISH (owner only) 
exports.publish = async (req, res) => {
  try {
    const id = String(req.params.id);
    const userId = String(req.user.id);
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, msg: "Invalid reel id" });

    let reel = await Reel.findById(id).populate("user", "followers username firstName lastName profileImage");
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });
    if (String(reel.user?._id || reel.user) !== userId) return res.status(403).json({ success: false, msg: "Not authorized" });

    const vis = String(req.body.visibility || "").toLowerCase();
    if (vis && ["public", "followers"].includes(vis)) {
      reel.visibility = vis;
    }
    reel.draft = false;
    await reel.save();

    reel = await Reel.findById(id).populate("user", "followers username firstName lastName profileImage");
    const out = sanitizeReel(reel);

    // Broadcast now that it's published
    const io = req.app.get("io");
    if (reel.visibility === "public") {
      io?.emit("reel:new", out);
    } else {
      const followers = (reel.user?.followers || []).map((x) => String(x));
      const targets = new Set([userId, ...followers]);
      for (const uid of targets) io?.to(uid).emit("reel:new", out);
    }

    res.json({ success: true, reel: out });
  } catch (err) {
    console.error("publish reel error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  DELETE 
exports.remove = async (req, res) => {
  try {
    const id = String(req.params.id);
    const meId = String(req.user.id);
    const r = await Reel.findById(id);
    if (!r) return res.status(404).json({ success: false, msg: "Reel not found" });
    if (String(r.user) !== meId) return res.status(403).json({ success: false, msg: "Not authorized" });

    const url = r.url;
    await r.deleteOne();
    await ReelView.deleteMany({ reel: id });

    if (url && url.startsWith("/uploads/")) {
      unlinkFiles([url]).catch(() => {});
    }

    const io = req.app.get("io");
    io?.emit("reel:deleted", { id, userId: meId });

    res.json({ success: true });
  } catch (err) {
    console.error("reel delete error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// LIST LIKES (visible users who liked a reel)
exports.listLikes = async (req, res) => {
  try {
    const viewerId = String(req.user.id);
    const id = String(req.params.id || "");
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, msg: "Invalid reel id" });

    const reel = await Reel.findById(id).populate("user", "followers").lean();
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const ownerId = String(reel.user?._id || reel.user);
    const isOwner = ownerId === viewerId;

    // Block gate
    if (!isOwner) {
      const blocked = await isEitherBlocked(viewerId, ownerId);
      if (blocked) return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    // Drafts: only owner can see likes
    if (reel.draft && !isOwner) return res.status(403).json({ success: false, msg: "Not authorized" });

    // Followers-only: must be owner or a follower
    if (!reel.draft && reel.visibility === "followers" && !isOwner) {
      const followers = (reel.user?.followers || []).map(String);
      if (!followers.includes(viewerId)) return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    const likeIds = Array.isArray(reel.likes) ? reel.likes.map((x) => String(x)) : [];
    if (!likeIds.length) return res.json({ success: true, count: 0, users: [] });

    // Preserve original order of likes array
    const users = await User.find({ _id: { $in: likeIds } })
      .select("username firstName lastName profileImage")
      .lean();

    const map = new Map(users.map((u) => [String(u._id), u]));
    const ordered = likeIds
      .map((id) => map.get(id))
      .filter(Boolean);

    res.json({ success: true, count: ordered.length, users: ordered });
  } catch (err) {
    console.error("listLikes error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  LIST VIEWS (owner only) 
exports.listViews = async (req, res) => {
  try {
    const viewerId = String(req.user.id);
    const id = String(req.params.id || "");
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, msg: "Invalid reel id" });

    const reel = await Reel.findById(id).select("user").lean();
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });
    const ownerId = String(reel.user);
    if (ownerId !== viewerId) return res.status(403).json({ success: false, msg: "Not authorized" });

    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const views = await ReelView.find({ reel: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("viewer", "username firstName lastName profileImage")
      .lean();

    const items = (views || []).map((v) => ({
      _id: v._id,
      viewer: v.viewer,
      createdAt: v.createdAt,
    }));

    res.json({ success: true, count: items.length, items });
  } catch (err) {
    console.error("listViews error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  LIST COMMENTS (users clickable) 
exports.listComments = async (req, res) => {
  try {
    const viewerId = String(req.user.id);
    const id = String(req.params.id || "");
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, msg: "Invalid reel id" });

    const reel = await Reel.findById(id)
      .populate("user", "followers")
      .populate("comments.user", "username firstName lastName profileImage")
      .populate("comments.replies.user", "username firstName lastName profileImage")
      .lean();

    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const ownerId = String(reel.user?._id || reel.user);
    const isOwner = ownerId === viewerId;

    // Block gate
    if (!isOwner) {
      const blocked = await isEitherBlocked(viewerId, ownerId);
      if (blocked) return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    // Drafts: only owner can view comments
    if (reel.draft && !isOwner) return res.status(403).json({ success: false, msg: "Not authorized" });

    // Followers-only: must be owner or a follower
    if (!reel.draft && reel.visibility === "followers" && !isOwner) {
      const followers = (reel.user?.followers || []).map(String);
      if (!followers.includes(viewerId)) return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const list = Array.isArray(reel.comments) ? [...reel.comments] : [];
    // Latest first
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    // Map to include minimal derived counts + replies
    const out = list.slice(0, limit).map((c) => ({
      _id: c._id,
      user: c.user,
      text: c.text || "",
      emoji: c.emoji || "",
      createdAt: c.createdAt || null,
      likesCount: Array.isArray(c.likes) ? c.likes.length : 0,
      dislikesCount: Array.isArray(c.dislikes) ? c.dislikes.length : 0,
      myVote:
        Array.isArray(c.likes) && c.likes.some((x) => String(x) === viewerId)
          ? "like"
          : Array.isArray(c.dislikes) && c.dislikes.some((x) => String(x) === viewerId)
          ? "dislike"
          : null,
      replies: Array.isArray(c.replies)
        ? c.replies.map((r) => ({
            _id: r._id,
            user: r.user,
            text: r.text || "",
            emoji: r.emoji || "",
            createdAt: r.createdAt || null,
            likesCount: Array.isArray(r.likes) ? r.likes.length : 0,
            dislikesCount: Array.isArray(r.dislikes) ? r.dislikes.length : 0,
            myVote:
              Array.isArray(r.likes) && r.likes.some((x) => String(x) === viewerId)
                ? "like"
                : Array.isArray(r.dislikes) && r.dislikes.some((x) => String(x) === viewerId)
                ? "dislike"
                : null,
            reactions: Array.isArray(r.reactions) ? r.reactions : [],
          }))
        : [],
    }));

    res.json({
      success: true,
      count: out.length,
      comments: out,
    });
  } catch (err) {
    console.error("listComments error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// CAN USERS VIEW (followers-only hint) 
exports.canUsersView = async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, msg: "Invalid reel id" });
    }

    const userIdsParam = String(req.query.userIds || "").trim();
    const userIds = userIdsParam
      ? userIdsParam
          .split(",")
          .map((s) => s.trim())
          .filter((s) => mongoose.isValidObjectId(s))
          .map(String)
      : [];

    const reel = await Reel.findById(id).populate("user", "followers").lean();
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const ownerId = String(reel.user?._id || reel.user);
    const map = {};

    if (!userIds.length) return res.json({ success: true, map });

    // Draft: only owner can view
    if (reel.draft) {
      for (const uid of userIds) map[uid] = uid === ownerId;
      return res.json({ success: true, map });
    }

    // Public: everyone can view
    if ((reel.visibility || "public") === "public") {
      for (const uid of userIds) map[uid] = true;
      return res.json({ success: true, map });
    }

    // Followers-only: owner or followers can view
    const followers = (reel.user?.followers || []).map((x) => String(x));
    for (const uid of userIds) {
      map[uid] = uid === ownerId || followers.includes(uid);
    }
    return res.json({ success: true, map });
  } catch (err) {
    console.error("canUsersView error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  GET ONE (with audience + hidden + block gates) 
exports.getById = async (req, res) => {
  try {
    const id = String(req.params.id || "");
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, msg: "Invalid reel id" });

    let reel = await Reel.findById(id)
      .populate("user", "username firstName lastName profileImage followers blocked")
      .lean();

    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const viewerId = String(req.user.id);
    const ownerId = String(reel.user?._id || reel.user);
    const isOwner = ownerId === viewerId;
    const isAdmin = isAdminReq(req);

    // Block gate
    if (!isOwner) {
      const blocked = await isEitherBlocked(viewerId, ownerId);
      if (blocked) return res.status(403).json({ success: false, msg: "Reel is unavailable" });
    }

    // Hidden gate
    if (reel.isHidden && !isAdmin) {
      return res.status(403).json({ success: false, msg: "Reel is unavailable" });
    }

    // Audience gates (non-owner)
    if (!isOwner) {
      if (reel.draft) return res.status(403).json({ success: false, msg: "Not authorized" });
      if ((reel.visibility || "public") === "followers") {
        const followers = (reel.user?.followers || []).map(String);
        if (!followers.includes(viewerId)) return res.status(403).json({ success: false, msg: "Not authorized" });
      }
    }

    // Return sanitized
    return res.json({ success: true, reel: sanitizeReel(reel) });
  } catch (err) {
    console.error("getById reel error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};