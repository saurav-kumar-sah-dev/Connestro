// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

module.exports = async function auth(req, res, next) {
  const authHeader = req.header("Authorization") || req.header("authorization");
  const token = authHeader?.replace?.(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ error: "User not found" });

    // Block suspended accounts globally
    if (user.isSuspended) {
      return res.status(403).json({
        error: "Account suspended",
        reason: user.suspendReason || "Violation of terms",
        suspendedAt: user.suspendedAt,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};