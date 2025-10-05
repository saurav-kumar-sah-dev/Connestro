// controllers/notificationController.js
const mongoose = require("mongoose");
const Notification = require("../models/Notification");

exports.list = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

    const [notifications, unread] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("actor", "username firstName lastName profileImage")
        .lean(),
      Notification.countDocuments({ user: userId, read: false }),
    ]);

    res.json({ notifications, unread });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markOneRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "Invalid notification id" });
    }

    const n = await Notification.findOne({ _id: id, user: userId });
    if (!n) return res.status(404).json({ msg: "Notification not found" });

    if (!n.read) {
      n.read = true;
      n.readAt = new Date();
      await n.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany(
      { user: userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete one notification (for this user)
exports.deleteOne = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ msg: "Invalid notification id" });
    }

    const n = await Notification.findOneAndDelete({ _id: id, user: userId });
    if (!n) return res.status(404).json({ msg: "Notification not found" });

    res.json({ success: true, removedUnread: n.read ? 0 : 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Clear all notifications for this user
exports.clearAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const unread = await Notification.countDocuments({ user: userId, read: false });
    const result = await Notification.deleteMany({ user: userId });
    res.json({
      success: true,
      deleted: result?.deletedCount || 0,
      unreadRemoved: unread,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};