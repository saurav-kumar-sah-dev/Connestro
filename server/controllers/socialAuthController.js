const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const validator = require("validator");
const User = require("../models/User");
const { generateUniqueUsername } = require("../utils/username");

const TERMS_VERSION = process.env.TERMS_VERSION || "1.0";

function buildClientUser(u) {
  return {
    id: u._id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role || "user",
    passwordSet: !!u.passwordSet,
  };
}

async function getOrCreateUserFromGoogle({
  sub,
  email,
  email_verified,
  given_name,
  family_name,
  name,
  picture,
  acceptTerms,
}) {
  let user = await User.findOne({ "providers.google": sub });
  if (!user && email) {
    const normalizedEmail =
      validator.normalizeEmail(String(email), { gmail_remove_dots: false }) ||
      String(email).trim().toLowerCase();
    user = await User.findOne({ email: normalizedEmail });
  }

  if (user) {
    if (!user.providers) user.providers = {};
    if (!user.providers.google) user.providers.google = sub;
    if (email_verified && !user.emailVerified) user.emailVerified = true;
    user.provider = user.provider === "local" ? "google" : user.provider;
    user.lastLoginAt = new Date();
    await user.save();
    return user;
  }

  if (!acceptTerms) {
    const err = new Error(
      "Please accept the Terms and Conditions to continue."
    );
    err.status = 403;
    err.code = "TERMS_NOT_ACCEPTED";
    throw err;
  }

  const normalizedEmail =
    validator.normalizeEmail(String(email), { gmail_remove_dots: false }) ||
    String(email).trim().toLowerCase();

  const username = await generateUniqueUsername(User, {
    firstName: given_name || name || "Google",
    lastName: family_name || "",
    email: normalizedEmail,
    fallback: "google",
  });

  const randomPassword = await bcrypt.hash(
    `google:${sub}:${Math.random().toString(36).slice(2)}`,
    10
  );

  const newUser = new User({
    firstName: given_name || name || "Google",
    lastName: family_name || "",
    username,
    email: normalizedEmail,
    password: randomPassword,
    provider: "google",
    providers: { google: sub },
    emailVerified: !!email_verified,
    passwordSet: false,
    terms: {
      accepted: true,
      acceptedAt: new Date(),
      version: TERMS_VERSION,
    },
    profileImage: picture || "",
    lastLoginAt: new Date(),
  });

  return await newUser.save();
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleAuth = async (req, res) => {
  try {
    const { idToken, acceptTerms } = req.body;
    if (!idToken)
      return res.status(400).json({ msg: "Missing Google idToken" });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const user = await getOrCreateUserFromGoogle({
      ...payload,
      acceptTerms: !!acceptTerms,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.json({ token, user: buildClientUser(user) });
  } catch (err) {
    if (err.code === "TERMS_NOT_ACCEPTED") {
      return res.status(403).json({ msg: err.message, code: err.code });
    }
    console.error("Google auth error:", err);
    return res.status(500).json({ msg: "Google login failed" });
  }
};
