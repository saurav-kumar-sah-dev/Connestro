// controllers/adminAuditController.js
const AdminAuditLog = require("../models/AdminAuditLog");
const User = require("../models/User");
const Post = require("../models/Post");

function toCSV(rows) {
  const cols = ["id", "createdAt", "admin", "action", "targetType", "targetId", "meta"];
  const hdr = cols.join(",");
  const esc = (v) => {
    if (v == null) return "";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) => cols.map((c) => esc(r[c])).join(","));
  return [hdr, ...lines].join("\n");
}

exports.listAudit = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      action = "",
      targetType = "",
      q = "",
      adminId = "",
      adminQ = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const query = {};

    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Admin filter by id or by search text
    if (adminId) {
      query.admin = adminId;
    } else if (adminQ) {
      const rx = new RegExp(adminQ.trim(), "i");
      const admins = await User.find({ $or: [{ username: rx }, { firstName: rx }, { lastName: rx }] })
        .select("_id")
        .lean();
      const ids = admins.map((u) => u._id);
      query.admin = { $in: ids.length ? ids : [null] };
    }

    // Generic search q: look in action or meta
    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      // Not perfect to search meta in Mongo; use text-like check on stringified keys
      query.$or = [{ action: rx }, { "meta.message": rx }, { "meta.reason": rx }];
    }

    const total = await AdminAuditLog.countDocuments(query);
    const logs = await AdminAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("admin", "username firstName lastName")
      .lean();

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      logs,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportAudit = async (req, res) => {
  try {
    let {
      action = "",
      targetType = "",
      q = "",
      adminId = "",
      adminQ = "",
      dateFrom = "",
      dateTo = "",
    } = req.query;

    const query = {};
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    if (adminId) {
      query.admin = adminId;
    } else if (adminQ) {
      const rx = new RegExp(adminQ.trim(), "i");
      const admins = await User.find({ $or: [{ username: rx }, { firstName: rx }, { lastName: rx }] })
        .select("_id")
        .lean();
      const ids = admins.map((u) => u._id);
      query.admin = { $in: ids.length ? ids : [null] };
    }
    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), "i");
      query.$or = [{ action: rx }, { "meta.message": rx }, { "meta.reason": rx }];
    }

    const rowsRaw = await AdminAuditLog.find(query).sort({ createdAt: -1 }).populate("admin", "username").lean();

    const rows = rowsRaw.map((r) => ({
      id: String(r._id),
      createdAt: r.createdAt?.toISOString() || "",
      admin: r.admin?.username || "",
      action: r.action,
      targetType: r.targetType,
      targetId: String(r.targetId || ""),
      meta: r.meta ? JSON.stringify(r.meta) : "",
    }));

    const csv = toCSV(rows);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="admin-audit.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};