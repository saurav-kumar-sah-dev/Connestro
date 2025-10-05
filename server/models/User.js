// models/User.js
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { unlinkMedia, unlinkFiles } = require("../lib/uploads");
const Post = require("./Post");
const Story = require("./Story");

const educationSchema = new mongoose.Schema({
  school: String,
  degree: String,
  field: String,
  cgpa: Number,
  marks: Number,
  place: String,
  startYear: Number,
  endYear: Number,
});

const experienceSchema = new mongoose.Schema({
  company: String,
  role: String,
  startDate: Date,
  endDate: Date,
  description: String,
});

const websiteSchema = new mongoose.Schema({
  label: String,
  url: String,
  visibility: { type: String, enum: ["public", "private"], default: "public" },
});

const contactSchema = new mongoose.Schema({
  type: { type: String, enum: ["phone", "email", "other"], required: true },
  value: { type: String, required: true },
  visibility: { type: String, enum: ["public", "private"], default: "private" },
});

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    middleName: String,
    lastName: { type: String, required: true },
    nickname: String,
    surname: String,
    pronouns: String,
    username: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isSuspended: { type: Boolean, default: false, index: true },
    suspendedAt: { type: Date },
    suspendReason: { type: String, default: "" },

    place: String,
    location: String,
    dob: Date,
    bio: String,
    about: String,
    profileImage: { type: String, default: "" },
    profileBanner: { type: String, default: "" },

    // Status (short text/emoji with optional expiry)
    status: {
      text: { type: String, default: "" },
      emoji: { type: String, default: "" },
      setAt: { type: Date },
      expiresAt: { type: Date },
      visibility: {
        type: String,
        enum: ["public", "private"],
        default: "public",
      },
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    previousUsernames: [{ type: String }],
    previousEmails: [{ type: String }],

    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],

    skills: [String],
    education: [educationSchema],
    experience: [experienceSchema],
    contactInfo: [contactSchema],
    websites: [websiteSchema],

    tags: [String],

    visibility: {
      dob: { type: String, enum: ["public", "private"], default: "private" },
      email: { type: String, enum: ["public", "private"], default: "private" },
      place: { type: String, enum: ["public", "private"], default: "private" },
      status: { type: String, enum: ["public", "private"], default: "public" },
      location: {
        type: String,
        enum: ["public", "private"],
        default: "private",
      },
      bio: { type: String, enum: ["public", "private"], default: "private" },
      about: { type: String, enum: ["public", "private"], default: "private" },
      nickname: {
        type: String,
        enum: ["public", "private"],
        default: "private",
      },
      pronouns: {
        type: String,
        enum: ["public", "private"],
        default: "private",
      },
      // Ensure contact info visibility persists
      contactInfo: {
        type: String,
        enum: ["public", "private"],
        default: "private",
      },
    },

    linkedAccounts: [
      {
        platform: String,
        url: String,
        visibility: {
          type: String,
          enum: ["public", "private"],
          default: "public",
        },
      },
    ],
    achievements: [
      {
        title: String,
        description: String,
        year: Number,
        visibility: {
          type: String,
          enum: ["public", "private"],
          default: "public",
        },
      },
    ],

    // Auth provider info (only local + google)
    provider: { type: String, enum: ["local", "google"], default: "local" },
    providers: {
      google: { type: String, unique: true, sparse: true },
    },
    emailVerified: { type: Boolean, default: false },
    passwordSet: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    usernameChangedAt: { type: Date },

    // Terms & Conditions acceptance
    terms: {
      accepted: { type: Boolean, default: false },
      acceptedAt: { type: Date },
      version: { type: String, default: "1.0" },
    },

    // Settings (notifications etc.)
    settings: {
      notifications: {
        // If false, user won't get "new reel" alerts. Missing/true => enabled.
        reelPublish: { type: Boolean, default: true },
        // NEW: If false, user won't get "new story" alerts. Missing/true => enabled.
        storyPublish: { type: Boolean, default: true },
      },
    },

    // Password reset
    passwordResetToken: { type: String, index: true },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.virtual("postsVirtual", {
  ref: "Post",
  localField: "_id",
  foreignField: "user",
});
userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });

// Cascade cleanup + file deletion.
userSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    const userId = this._id;
    try {
      // collect and delete user's posts media
      const posts = await Post.find({ user: userId }).select("media").lean();
      const allUrls = [];
      for (const p of posts)
        for (const m of p.media || []) if (m?.url) allUrls.push(m.url);
      if (allUrls.length) await unlinkFiles(allUrls);

      // Delete user's own posts entirely
      await Post.deleteMany({ user: userId });

      // KEEP likes, comments, and comment reactions — do NOT pull them.

      // ONLY remove replies authored by this user (their embedded reactions go with the reply)
      await Post.updateMany(
        {},
        { $pull: { "comments.$[].replies": { user: userId } } }
      );

      // Followers/following cleanup
      const User = mongoose.model("User");
      await User.updateMany(
        {},
        { $pull: { followers: userId, following: userId } }
      );

      // Delete user's stories + media
      const stories = await Story.find({ user: userId }).select("url").lean();
      const storyUrls = stories
        .map((s) => s?.url)
        .filter((u) => typeof u === "string" && u.startsWith("/uploads/"));
      if (storyUrls.length) await unlinkFiles(storyUrls);
      await Story.deleteMany({ user: userId });

      // delete profile images/banners (if local)
      const toRemove = [];
      if (this.profileImage && this.profileImage.startsWith("/uploads/"))
        toRemove.push(this.profileImage);
      if (this.profileBanner && this.profileBanner.startsWith("/uploads/"))
        toRemove.push(this.profileBanner);
      if (toRemove.length) await unlinkFiles(toRemove);

      next();
    } catch (err) {
      next(err);
    }
  }
);

// Generate and set password reset token (hashed) + expiry
userSchema.methods.createPasswordResetToken = function () {
  const raw = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(raw)
    .digest("hex");
  this.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  return raw;
};

module.exports = mongoose.model("User", userSchema);