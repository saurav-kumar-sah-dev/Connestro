// controllers/adminReelController.js
const { Reel } = require("../models/Reel"); // FIX: named export
const User = require("../models/User");
const AdminAuditLog = require("../models/AdminAuditLog");
const Notification = require("../models/Notification");
const { unlinkFiles } = require("../lib/uploads");

exports.getAllReels = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", isHidden = "", draft = "", visibility = "" } = req.query;
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const query = {};
    if (search && search.trim()) {
      const escapeRx = (s = "") => s.replace(/[.*+?^${}()|[```\\/-]/g, "\\$&");
      query.caption = { $regex: escapeRx(search.trim()), $options: "i" };
    }
    if (isHidden === "true") query.isHidden = true;
    if (isHidden === "false") query.isHidden = { $ne: true }; // <- include missing as not hidden
    if (draft === "true") query.draft = true;
    if (draft === "false") query.draft = false;
    if (["public", "followers"].includes(String(visibility))) query.visibility = String(visibility);

    const total = await Reel.countDocuments(query);
    const reels = await Reel.find(query)
      .populate("user", "firstName lastName username profileImage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit), reels });
  } catch (e) {
    console.error("getAllReels error:", e);
    res.status(500).json({ success: false, error: e.message });
  }
};


exports.hideReel = async (req, res) => {
  try {
    const io = req.app.get("io");
    const reel = await Reel.findByIdAndUpdate(req.params.id, { isHidden: true }, { new: true })
      .populate("user", "firstName lastName username profileImage");
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    try {
      const notif = await Notification.create({
        user: reel.user._id, actor: req.user.id, type: "moderation",
        reel: reel._id, text: "Your reel has been hidden by moderation", link: `/reels/${reel._id}`,
      });
      const populated = await Notification.findById(notif._id)
        .populate("actor", "username firstName lastName profileImage")
        .lean();
      io?.to(String(reel.user._id)).emit("notification:new", populated);
    } catch {}

    try {
      await AdminAuditLog.create({ admin: req.user.id, action: "hide_reel", targetType: "reel", targetId: reel._id, meta: {} });
    } catch {}

    res.json({ success: true, msg: "Reel hidden", reel });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.unhideReel = async (req, res) => {
  try {
    const io = req.app.get("io");
    const reel = await Reel.findByIdAndUpdate(req.params.id, { isHidden: false }, { new: true })
      .populate("user", "firstName lastName username profileImage");
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    try {
      const notif = await Notification.create({
        user: reel.user._id, actor: req.user.id, type: "moderation",
        reel: reel._id, text: "Your reel has been restored by moderation", link: `/reels/${reel._id}`,
      });
      const populated = await Notification.findById(notif._id)
        .populate("actor", "username firstName lastName profileImage")
        .lean();
      io?.to(String(reel.user._id)).emit("notification:new", populated);
    } catch {}

    try {
      await AdminAuditLog.create({ admin: req.user.id, action: "unhide_reel", targetType: "reel", targetId: reel._id, meta: {} });
    } catch {}

    res.json({ success: true, msg: "Reel unhidden", reel });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.deleteReelByAdmin = async (req, res) => {
  try {
    const io = req.app.get("io");
    const reel = await Reel.findById(req.params.id).populate("user", "firstName lastName username profileImage");
    if (!reel) return res.status(404).json({ success: false, msg: "Reel not found" });

    const ownerId = reel.user?._id || reel.user;

    try {
      const notif = await Notification.create({
        user: ownerId, actor: req.user.id, type: "moderation",
        reel: reel._id, text: "Your reel has been deleted by moderation", link: `/profile/${ownerId}`,
      });
      const populated = await Notification.findById(notif._id)
        .populate("actor", "username firstName lastName profileImage")
        .lean();
      io?.to(String(ownerId)).emit("notification:new", populated);
    } catch {}

    // delete media file if local
    const url = reel.url;
    if (url && url.startsWith("/uploads/")) {
      unlinkFiles([url]).catch(() => {});
    }
    await reel.deleteOne();

    try {
      await AdminAuditLog.create({ admin: req.user.id, action: "delete_reel", targetType: "reel", targetId: req.params.id, meta: {} });
    } catch {}

    res.json({ success: true, msg: "Reel deleted by admin" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};