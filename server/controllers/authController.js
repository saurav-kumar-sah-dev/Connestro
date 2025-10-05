// controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const { generateUniqueUsername } = require("../utils/username");
const { sendEmail } = require("../utils/email");
const crypto = require("crypto");

const TERMS_VERSION = process.env.TERMS_VERSION || "1.0";

// Helpers
function getPasswordErrors(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("an uppercase letter (A-Z)");
  if (!/[a-z]/.test(password)) errors.push("a lowercase letter (a-z)");
  if (!/\d/.test(password)) errors.push("a number (0-9)");
  if (!/[^A-Za-z0-9]/.test(password))
    errors.push("a special character (!@#$...)");
  return errors;
}

function getAge(d) {
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

const PLACE_REGEX = /^[A-Za-z\s,.'-]{2,}$/;
function normalizePlace(str = "") {
  return str.trim().replace(/\s+/g, " ");
}
function getDobErrors(dob) {
  const errors = [];
  const d = new Date(dob);
  if (isNaN(d.getTime())) {
    errors.push("Invalid date");
    return errors;
  }
  if (d > new Date()) errors.push("DOB cannot be in the future");
  if (getAge(d) < 13) errors.push("You must be at least 13 years old");
  return errors;
}
function getPlaceErrors(place) {
  const errors = [];
  const s = normalizePlace(place);
  if (s.length < 2) errors.push("Place must be at least 2 characters");
  if (s.length > 100) errors.push("Place cannot exceed 100 characters");
  if (!PLACE_REGEX.test(s))
    errors.push("Place can include letters, spaces, , . ' - only");
  return { errors, sanitized: s };
}
function getFrontendBase(req) {
  return (
    process.env.FRONTEND_URL ||
    req.headers.origin ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
}

// SIGNUP
exports.signup = async (req, res) => {
  const {
    firstName,
    lastName,
    gender,
    place,
    dob,
    username,
    email,
    password,
    confirmPassword,
    acceptTerms,
  } = req.body;

  try {
    if (
      !firstName ||
      !lastName ||
      !gender ||
      !place ||
      !dob ||
      !email ||
      !password
    ) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    if (!acceptTerms) {
      return res
        .status(400)
        .json({ msg: "You must accept the Terms and Conditions." });
    }

    const normalizedEmail =
      validator.normalizeEmail(String(email), { gmail_remove_dots: false }) ||
      String(email).trim().toLowerCase();

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ msg: "Invalid email format" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords do not match" });
    }
    const pwErrors = getPasswordErrors(password);
    if (pwErrors.length) {
      return res
        .status(400)
        .json({ msg: `Password must include ${pwErrors.join(", ")}.` });
    }

    const { errors: placeErrs, sanitized: cleanPlace } = getPlaceErrors(place);
    if (placeErrs.length) return res.status(400).json({ msg: placeErrs[0] });

    const dobErrs = getDobErrors(dob);
    if (dobErrs.length) return res.status(400).json({ msg: dobErrs[0] });

    const existsEmail = await User.findOne({ email: normalizedEmail });
    if (existsEmail)
      return res.status(400).json({ msg: "Email already exists" });

    let finalUsername = username?.trim();
    if (finalUsername) {
      const existsUser = await User.findOne({ username: finalUsername });
      if (existsUser)
        return res.status(400).json({ msg: "Username already exists" });
    } else {
      finalUsername = await generateUniqueUsername(User, {
        firstName,
        lastName,
        email: normalizedEmail,
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      gender,
      place: cleanPlace,
      dob,
      username: finalUsername,
      email: normalizedEmail,
      password: hashed,
      provider: "local",
      emailVerified: false,
      passwordSet: true,
      terms: {
        accepted: true,
        acceptedAt: new Date(),
        version: TERMS_VERSION,
      },
    });

    const savedUser = await newUser.save();

    const token = jwt.sign({ id: savedUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        role: savedUser.role || "user",
        passwordSet: savedUser.passwordSet,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// LOGIN (username or email)
exports.login = async (req, res) => {
  const { identifier, password, acceptTerms } = req.body;
  try {
    if (!identifier || !password) {
      return res
        .status(400)
        .json({ msg: "Missing username/email or password" });
    }

    let query;
    if (validator.isEmail(String(identifier))) {
      const normalized =
        validator.normalizeEmail(String(identifier), {
          gmail_remove_dots: false,
        }) || String(identifier).trim().toLowerCase();
      query = { email: normalized };
    } else {
      query = { username: identifier };
    }

    const user = await User.findOne(query);
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Terms acceptance flow
    if (!user.terms?.accepted) {
      if (!acceptTerms) {
        return res.status(403).json({
          msg: "Please accept the Terms and Conditions to continue.",
          code: "TERMS_NOT_ACCEPTED",
        });
      }
      user.terms = {
        accepted: true,
        acceptedAt: new Date(),
        version: TERMS_VERSION,
      };
    }

    // Block suspended accounts at login
    if (user.isSuspended) {
      return res.status(403).json({
        msg: "This account is suspended.",
        reason: user.suspendReason || "Violation of terms",
        suspendedAt: user.suspendedAt,
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        passwordSet: user.passwordSet,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const emailRaw = String(req.body.email || "");
    const normalizedEmail =
      validator.normalizeEmail(emailRaw, { gmail_remove_dots: false }) ||
      emailRaw.trim().toLowerCase();

    const generic = { msg: "If that email is registered, a reset link has been sent." };

    if (!validator.isEmail(normalizedEmail)) {
      return res.json(generic);
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json(generic);
    }

    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const base = getFrontendBase(req);
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(
      rawToken
    )}&email=${encodeURIComponent(user.email)}`;

    const subject = "Reset your password";
    const text = `Use this link to set a new password (valid 15 minutes): ${resetUrl}`;
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Password reset requested</h2>
        <p>Use this link (valid 15 minutes):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn’t request this, you can ignore.</p>
      </div>
    `;

    try {
      await sendEmail({ to: user.email, subject, text, html });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("sendEmail error:", err);
    }

    return res.json(generic);
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

exports.verifyResetToken = async (req, res) => {
  try {
    const { token, email } = req.query;
    if (!token || !email) {
      return res.status(400).json({ valid: false, msg: "Invalid request" });
    }

    const normalizedEmail =
      validator.normalizeEmail(String(email), { gmail_remove_dots: false }) ||
      String(email).trim().toLowerCase();

    const hashed = crypto.createHash("sha256").update(String(token)).digest("hex");

    const user = await User.findOne({
      email: normalizedEmail,
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    }).select("_id");

    return res.json({ valid: !!user });
  } catch (err) {
    console.error("Verify reset token error:", err);
    return res.status(500).json({ valid: false, msg: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, email, newPassword, confirmPassword } = req.body;

    if (!token || !email || !newPassword || !confirmPassword) {
      return res.status(400).json({ msg: "Missing required fields" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords do not match" });
    }

    const pwErrors = getPasswordErrors(newPassword);
    if (pwErrors.length) {
      return res
        .status(400)
        .json({ msg: `Password must include ${pwErrors.join(", ")}.` });
    }

    const normalizedEmail =
      validator.normalizeEmail(String(email), { gmail_remove_dots: false }) ||
      String(email).trim().toLowerCase();

    const hashed = crypto.createHash("sha256").update(String(token)).digest("hex");

    const user = await User.findOne({
      email: normalizedEmail,
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired reset link" });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    user.password = hashedNew;
    user.passwordSet = true;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    const tokenJwt = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.json({
      msg: "Password updated successfully.",
      token: tokenJwt,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || "user",
        passwordSet: user.passwordSet,
      },
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};