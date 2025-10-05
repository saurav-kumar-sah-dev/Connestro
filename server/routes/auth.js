// routes/auth.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  verifyResetToken,
} = require("../controllers/authController");
const { googleAuth } = require("../controllers/socialAuthController");

// Forgot-password rate limiting
const forgotPasswordIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many reset requests. Please try again later." },
});

// Per-email limiter (no req.ip here to avoid IPv6 issues)
const forgotPasswordAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // per email
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return `email:${email}`;
  },
  skip: (req) => !req.body?.email, // if no email, skip this limiter (IP limiter still applies)
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: "Too many reset requests for this email. Please try again later." },
});

router.post("/signup", signup);
router.post("/login", login);

// Forgot/Reset Password (with rate limiting)
router.post(
  "/forgot-password",
  forgotPasswordIpLimiter,
  forgotPasswordAccountLimiter,
  forgotPassword
);
router.get("/reset-password/verify", verifyResetToken);
router.post("/reset-password", resetPassword);

// Social auth (Google only)
router.post("/social/google", googleAuth);

module.exports = router;