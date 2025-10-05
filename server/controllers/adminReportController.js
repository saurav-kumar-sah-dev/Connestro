// controllers/adminReportController.js
const mongoose = require("mongoose");
const Report = require("../models/Report");
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const AdminAuditLog = require("../models/AdminAuditLog");


function toCSV(rows) {
  const cols = ["id","createdAt","reporter","targetType","targetId","reason","status","resolution","resolvedAt"];
  const hdr = cols.join(",");
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = rows.map(r => cols.map(c => esc(r[c])).join(","));
  return [hdr, ...lines].join("\n");
}

exports.listReports = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      status = "",
      type = "",
      reason = "",
      q = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;
    page = parseInt(page) || 1;
    limit = Math.min(100, parseInt(limit) || 10);

    const query = {};
    if (status && ["open", "reviewing", "resolved", "rejected"].includes(status)) query.status = status;
    if (type && ["post", "user"].includes(type)) query.targetType = type;
    if (reason) query.reason = reason;

    // Date filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Search by reporter/target username and post content
    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      const [userMatches, postMatches] = await Promise.all([
        User.find({ $or: [{ username: rx }, { firstName: rx }, { lastName: rx }] })
          .select("_id")
          .lean(),
        Post.find({ content: rx }).select("_id").lean(),
      ]);
      const userIds = userMatches.map((u) => u._id);
      const postIds = postMatches.map((p) => p._id);
      query.$or = [
        { reporter: { $in: userIds } },
        { targetUser: { $in: userIds } },
        { post: { $in: postIds } },
        { details: rx },
        { resolution: rx },
      ];
    }

    const total = await Report.countDocuments(query);
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("reporter", "username firstName lastName profileImage")
      .populate("post", "content user")
      .populate("targetUser", "username firstName lastName profileImage")
      .populate("assignedTo", "username firstName lastName")
      .lean();

    res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit), reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getReport = async (req, res) => {
  try {
    const r = await Report.findById(req.params.id)
      .populate("reporter", "username firstName lastName profileImage")
      .populate("post", "content user")
      .populate("targetUser", "username firstName lastName profileImage")
      .populate("assignedTo", "username firstName lastName")
      .lean();
    if (!r) return res.status(404).json({ success: false, msg: "Report not found" });
    res.json({ success: true, report: r });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.updateReport = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { status, resolution } = req.body || {};
    const updates = {};
    if (status && ["open", "reviewing", "resolved", "rejected"].includes(status)) {
      updates.status = status;
      if (status === "resolved" || status === "rejected") {
        updates.resolvedAt = new Date();
      } else {
        updates.resolvedAt = null;
      }
    }
    if (typeof resolution === "string") updates.resolution = resolution;
    updates.assignedTo = req.user.id;

    const r = await Report.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate("reporter", "username firstName lastName profileImage")
      .populate("post", "content user")
      .populate("targetUser", "username firstName lastName profileImage")
      .populate("assignedTo", "username firstName lastName");

    if (!r) return res.status(404).json({ success: false, msg: "Report not found" });

    // Notify reporter on status changes
    try {
      if (updates.status === "reviewing") {
        const notif = await Notification.create({
          user: r.reporter._id,
          actor: req.user.id,
          type: "report_update",
          text: "Your report is under review",
          link:
            r.targetType === "post" && r.post
              ? `/post/${r.post._id}`
              : r.targetUser
              ? `/profile/${r.targetUser._id}`
              : "/admin",
        });
        const populated = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(r.reporter._id)).emit("notification:new", populated);
      }
      if (updates.status === "resolved" || updates.status === "rejected") {
        const notif = await Notification.create({
          user: r.reporter._id,
          actor: req.user.id,
          type: "report_update",
          text: updates.status === "resolved" ? "Your report was resolved" : "Your report was rejected",
          link:
            r.targetType === "post" && r.post
              ? `/post/${r.post._id}`
              : r.targetUser
              ? `/profile/${r.targetUser._id}`
              : "/admin",
        });
        const populated = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(r.reporter._id)).emit("notification:new", populated);
      }
    } catch (e) {
      console.warn("report update notify error:", e.message);
    }

    // Audit
    try {
      await AdminAuditLog.create({
        admin: req.user.id,
        action: "report_update",
        targetType: "report",
        targetId: r._id,
        meta: { status: updates.status, resolution: updates.resolution || "" },
      });
    } catch {}

    res.json({ success: true, report: r.toObject() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportReports = async (req, res) => {
  try {
    // Reuse listReports filtering
    const { status = "", type = "", reason = "", q = "", dateFrom = "", dateTo = "" } = req.query;
    const query = {};
    if (status && ["open", "reviewing", "resolved", "rejected"].includes(status)) query.status = status;
    if (type && ["post", "user"].includes(type)) query.targetType = type;
    if (reason) query.reason = reason;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      const [userMatches, postMatches] = await Promise.all([
        User.find({ $or: [{ username: rx }, { firstName: rx }, { lastName: rx }] }).select("_id").lean(),
        Post.find({ content: rx }).select("_id").lean(),
      ]);
      const userIds = userMatches.map((u) => u._id);
      const postIds = postMatches.map((p) => p._id);
      query.$or = [
        { reporter: { $in: userIds } },
        { targetUser: { $in: userIds } },
        { post: { $in: postIds } },
        { details: rx },
        { resolution: rx },
      ];
    }

    const rowsRaw = await Report.find(query)
      .sort({ createdAt: -1 })
      .populate("reporter", "username")
      .lean();

    const rows = rowsRaw.map((r) => ({
      id: r._id,
      createdAt: r.createdAt?.toISOString() || "",
      reporter: r.reporter?.username || "",
      targetType: r.targetType,
      targetId: String(r.targetType === "post" ? r.post : r.targetUser || ""),
      reason: r.reason,
      status: r.status,
      resolution: r.resolution || "",
      resolvedAt: r.resolvedAt?.toISOString() || "",
    }));

    const csv = toCSV(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="reports.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};