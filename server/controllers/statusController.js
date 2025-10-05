// controllers/statusController.js
const User = require("../models/User");

// Helper: sanitize status for consumers (drop expired)
function sanitizeStatus(user, viewerId) {
  const s = user.status || {};
  if (!s || (!s.text && !s.emoji)) return null;

  // Expiry
  if (s.expiresAt && new Date(s.expiresAt) < new Date()) return null;

  // Privacy: owner always sees; others require public
  const isOwner = String(user._id) === String(viewerId);
  const vis = s.visibility || "public";
  if (!isOwner && vis !== "public") return null;

  return {
    text: s.text || "",
    emoji: s.emoji || "",
    setAt: s.setAt || null,
    expiresAt: s.expiresAt || null,
    visibility: vis,
  };
}


exports.setStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { text = "", emoji = "", expiresInMinutes = 0, visibility } = req.body || {};

    const t = String(text || "").trim();
    if (t.length > 140) {
      return res.status(400).json({ success: false, msg: "Status must be 140 characters or less." });
    }
    const em = String(emoji || "").slice(0, 4); // small safeguard
    const setAt = new Date();
    let expiresAt = null;
    const minutes = Number(expiresInMinutes);
    if (Number.isFinite(minutes) && minutes > 0) {
      expiresAt = new Date(Date.now() + minutes * 60 * 1000);
    }

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    user.status = user.status || {};
    user.status.text = t;
    user.status.emoji = em;
    user.status.setAt = setAt;
    user.status.expiresAt = expiresAt;

    if (visibility && ["public", "private"].includes(String(visibility))) {
      user.status.visibility = visibility;
    }

    await user.save();

    const io = req.app.get("io");
    const payload = {
      userId: String(user._id),
      status: sanitizeStatus(user, null), // viewers (not owner) get sanitized
    };
    // Broadcast to everyone (or you can target followers if you implement that mapping)
    io?.emit("status:update", payload);

    return res.json({
      success: true,
      status: sanitizeStatus(user, userId), // owner gets their full visible status
    });
  } catch (err) {
    console.error("setStatus error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE /api/users/me/status
exports.clearStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    user.status = {
      text: "",
      emoji: "",
      setAt: null,
      expiresAt: null,
      visibility: user.status?.visibility || "public",
    };
    await user.save();

    const io = req.app.get("io");
    io?.emit("status:update", { userId: String(user._id), status: null });

    return res.json({ success: true });
  } catch (err) {
    console.error("clearStatus error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};