// controllers/reportController.js
const mongoose = require("mongoose");
const Report = require("../models/Report");
const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { Reel } = require("../models/Reel"); // named export from models/Reel

const HOURS_THROTTLE = Number(process.env.REPORTS_THROTTLE_HOURS || 24);
const AUTOMOD_COUNT = Number(process.env.REPORTS_AUTOMOD_COUNT || 5);
const AUTOMOD_WINDOW_HOURS = Number(process.env.REPORTS_AUTOMOD_WINDOW_HOURS || 6);

// Helper: notify all admins about a new report (post/user/reel)
async function notifyAdminsOfNewReport(io, { reporterId, kind, postId, targetUserId, reason }) {
  try {
    const admins = await User.find({ role: "admin" }).select("_id").lean();
    if (!admins || !admins.length) return;

    for (const a of admins) {
      const notif = await Notification.create({
        user: a._id, // admin recipient
        actor: reporterId, // reporter (context only)
        type: "moderation",
        ...(postId ? { post: postId } : {}),
        text:
          kind === "post"
            ? `New report on a post (${reason})`
            : kind === "reel"
            ? `New report on a reel (${reason})`
            : `New report on a user (${reason})`,
        link: `/admin?tab=reports`,
      });

      const populated = await Notification.findById(notif._id)
        .populate("actor", "username firstName lastName profileImage")
        .lean();

      io?.to(String(a._id)).emit("notification:new", populated);
    }

    // Optional server log
    console.log(`[reports] notified ${admins.length} admin(s) about new ${kind} report`);
  } catch (e) {
    console.warn("notifyAdminsOfNewReport error:", e.message);
  }
}

exports.createReport = async (req, res) => {
  try {
    const reporter = req.user.id;
    const { targetType, postId, targetUserId, reelId, reason = "other", details = "" } = req.body || {};
    const io = req.app.get("io");

    // Accept post, user, reel
    if (!["post", "user", "reel"].includes(String(targetType))) {
      return res.status(400).json({ msg: "Invalid targetType" });
    }

    // Attachments (optional)
    const attachments = (req.files || []).map((f) => ({
      url: `/uploads/reports/${f.filename}`,
      mime: f.mimetype,
      size: f.size,
      name: f.originalname,
    }));

    // 24h throttle window
    const throttleCutoff = new Date(Date.now() - HOURS_THROTTLE * 60 * 60 * 1000);

    // POST 
    if (targetType === "post") {
      if (!mongoose.isValidObjectId(postId)) return res.status(400).json({ msg: "Invalid postId" });

      const post = await Post.findById(postId).select("_id user content isHidden");
      if (!post) return res.status(404).json({ msg: "Post not found" });

      // Throttle: one report per 24h
      const recent = await Report.findOne({
        reporter,
        targetType: "post",
        post: post._id,
        createdAt: { $gte: throttleCutoff },
      }).select("_id");
      if (recent) return res.status(409).json({ msg: "You already reported this post recently." });

      const rep = await Report.create({
        reporter,
        targetType,
        post: post._id,
        reason,
        details,
        attachments,
      });

      // Notify admins
      notifyAdminsOfNewReport(io, { reporterId: reporter, kind: "post", postId: post._id, reason }).catch(() => {});

      // Auto-moderation (posts)
      try {
        const winCutoff = new Date(Date.now() - AUTOMOD_WINDOW_HOURS * 60 * 60 * 1000);
        const openCount = await Report.countDocuments({
          targetType: "post",
          post: post._id,
          status: { $in: ["open", "reviewing"] },
          createdAt: { $gte: winCutoff },
        });

        if (openCount >= AUTOMOD_COUNT && !post.isHidden) {
          post.isHidden = true;
          await post.save();

          // Notify owner
          try {
            const notif = await Notification.create({
              user: post.user,
              actor: post.user,
              type: "moderation",
              post: post._id,
              text: "Your post has been hidden for review due to multiple reports.",
              link: `/post/${post._id}`,
            });
            const populated = await Notification.findById(notif._id)
              .populate("actor", "username firstName lastName profileImage")
              .lean();
            io?.to(String(post.user)).emit("notification:new", populated);
          } catch {}
        }
      } catch (e) {
        console.warn("automod error (post):", e.message);
      }

      return res.status(201).json({ success: true, report: rep });
    }

    // REEL 
    if (targetType === "reel") {
      if (!mongoose.isValidObjectId(reelId)) return res.status(400).json({ msg: "Invalid reelId" });

      const reel = await Reel.findById(reelId).select("_id user isHidden draft visibility");
      if (!reel) return res.status(404).json({ msg: "Reel not found" });

      // Throttle: one report per 24h
      const recent = await Report.findOne({
        reporter,
        targetType: "reel",
        reel: reel._id,
        createdAt: { $gte: throttleCutoff },
      }).select("_id");
      if (recent) return res.status(409).json({ msg: "You already reported this reel recently." });

      const rep = await Report.create({
        reporter,
        targetType,
        reel: reel._id,
        reason,
        details,
        attachments,
      });

      // Notify admins
      notifyAdminsOfNewReport(io, { reporterId: reporter, kind: "reel", reason }).catch(() => {});

      // Auto-moderation (reels)
      try {
        const winCutoff = new Date(Date.now() - AUTOMOD_WINDOW_HOURS * 60 * 60 * 1000);
        const openCount = await Report.countDocuments({
          targetType: "reel",
          reel: reel._id,
          status: { $in: ["open", "reviewing"] },
          createdAt: { $gte: winCutoff },
        });

        if (openCount >= AUTOMOD_COUNT && !reel.isHidden) {
          reel.isHidden = true;
          await reel.save();

          // Notify owner
          try {
            const notif = await Notification.create({
              user: reel.user,
              actor: reel.user,
              type: "moderation",
              reel: reel._id,
              text: "Your reel has been hidden for review due to multiple reports.",
              link: `/reels/${reel._id}`,
            });
            const populated = await Notification.findById(notif._id)
              .populate("actor", "username firstName lastName profileImage")
              .lean();
            io?.to(String(reel.user)).emit("notification:new", populated);
          } catch {}
        }
      } catch (e) {
        console.warn("automod error (reel):", e.message);
      }

      return res.status(201).json({ success: true, report: rep });
    }

    // USER 
    if (targetType === "user") {
      if (!mongoose.isValidObjectId(targetUserId)) return res.status(400).json({ msg: "Invalid targetUserId" });
      if (String(targetUserId) === String(reporter)) {
        return res.status(400).json({ msg: "You cannot report yourself" });
      }

      const tgt = await User.findById(targetUserId).select("_id");
      if (!tgt) return res.status(404).json({ msg: "User not found" });

      // Throttle: one report per 24h
      const recent = await Report.findOne({
        reporter,
        targetType: "user",
        targetUser: tgt._id,
        createdAt: { $gte: throttleCutoff },
      }).select("_id");
      if (recent) return res.status(409).json({ msg: "You already reported this user recently." });

      const rep = await Report.create({
        reporter,
        targetType,
        targetUser: tgt._id,
        reason,
        details,
        attachments,
      });

      // Notify admins
      notifyAdminsOfNewReport(io, { reporterId: reporter, kind: "user", targetUserId: tgt._id, reason }).catch(() => {});

      return res.status(201).json({ success: true, report: rep });
    }

    return res.status(400).json({ msg: "Invalid payload" });
  } catch (err) {
    if (err && err.code === 11000) {
      // Unique index hit (reporter+target). Note: your unique indexes block duplicates forever.
      return res.status(409).json({ msg: "You already reported this recently." });
    }
    console.error("createReport error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.myReports = async (req, res) => {
  try {
    const reporter = req.user.id;

    // Select only safe fields (no assignedTo etc.)
    const list = await Report.find({ reporter })
      .select("targetType post targetUser reel reason details attachments status resolution createdAt resolvedAt")
      .populate("post", "content user isHidden")
      .populate("reel", "caption user isHidden") // include reel preview
      .populate("targetUser", "username firstName lastName profileImage")
      .sort({ createdAt: -1 })
      .lean();

    // Defensive sanitize
    const sanitized = list.map((r) => ({
      _id: r._id,
      targetType: r.targetType,
      post: r.post
        ? {
            _id: r.post._id,
            content: r.post.content || "",
            user: r.post.user,
            isHidden: !!r.post.isHidden,
          }
        : null,
      reel: r.reel
        ? {
            _id: r.reel._id,
            caption: r.reel.caption || "",
            user: r.reel.user,
            isHidden: !!r.reel.isHidden,
          }
        : null,
      targetUser: r.targetUser
        ? {
            _id: r.targetUser._id,
            username: r.targetUser.username,
            firstName: r.targetUser.firstName,
            lastName: r.targetUser.lastName,
            profileImage: r.targetUser.profileImage,
          }
        : null,
      reason: r.reason,
      details: r.details || "",
      attachments: Array.isArray(r.attachments)
        ? r.attachments.map((a) => ({
            url: a.url,
            mime: a.mime,
            size: a.size,
            name: a.name,
          }))
        : [],
      status: r.status,
      resolution: r.resolution || "",
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt || null,
    }));

    res.json({ reports: sanitized });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};