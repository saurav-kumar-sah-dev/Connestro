// controllers/userController.js
const User = require("../models/User");
const Post = require("../models/Post");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const { validateUsername } = require("../utils/username");
const Notification = require("../models/Notification");
const { unlinkFiles } = require("../lib/uploads");
const mongoose = require("mongoose");


function getAge(d) {
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

const PLACE_REGEX = /^[A-Za-z\s,.'-]{2,}$/;
function normalizePlace(str = "") {
  return String(str).trim().replace(/\s+/g, " ");
}

function getPlaceErrors(place) {
  const errors = [];
  const s = normalizePlace(place);
  if (s.length < 2) errors.push("Place must be at least 2 characters");
  if (s.length > 100) errors.push("Place cannot exceed 100 characters");
  if (!PLACE_REGEX.test(s)) errors.push("Place can include letters, spaces, , . ' - only");
  return { errors, sanitized: s };
}

function getDobErrors(dob) {
  const errors = [];
  if (!dob) return errors;
  const d = new Date(dob);
  if (isNaN(d.getTime())) {
    errors.push("Invalid date");
    return errors;
  }
  if (d > new Date()) errors.push("DOB cannot be in the future");
  if (getAge(d) < 13) errors.push("You must be at least 13 years old");
  return errors;
}

function getPasswordErrors(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push("at least 8 characters");
  if (!/[A-Z]/.test(password)) errors.push("an uppercase letter (A-Z)");
  if (!/[a-z]/.test(password)) errors.push("a lowercase letter (a-z)");
  if (!/\d/.test(password)) errors.push("a number (0-9)");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("a special character (!@#$...)");
  return errors;
}

//  Follow
exports.followUser = async (req, res) => {
  const io = req.app.get("io");
  try {
    const targetId = req.params.id;
    const currentUserId = req.user.id;
    if (targetId === currentUserId) return res.status(400).json({ msg: "Cannot follow yourself" });

    await Promise.all([
      User.findByIdAndUpdate(targetId, { $addToSet: { followers: currentUserId } }),
      User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetId } }),
    ]);

    const updatedUser = await User.findById(targetId)
      .select("-password")
      .populate("followers following", "username firstName lastName");

    if (io) io.emit("updateFollow", { userId: targetId, currentUserId, follow: true });

    try {
      const notif = await Notification.create({
        user: targetId,
        actor: currentUserId,
        type: "follow",
        text: "started following you",
        link: `/profile/${currentUserId}`,
      });
      const populatedNotif = await Notification.findById(notif._id)
        .populate("actor", "username firstName lastName profileImage")
        .lean();
      io?.to(String(targetId)).emit("notification:new", populatedNotif);
    } catch (e) {}

    res.json({ msg: "Followed successfully", user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//  Unfollow
exports.unfollowUser = async (req, res) => {
  const io = req.app.get("io");
  try {
    const targetId = req.params.id;
    const currentUserId = req.user.id;

    await Promise.all([
      User.findByIdAndUpdate(targetId, { $pull: { followers: currentUserId } }),
      User.findByIdAndUpdate(currentUserId, { $pull: { following: targetId } }),
    ]);

    const updatedUser = await User.findById(targetId)
      .select("-password")
      .populate("followers following", "username firstName lastName");

    if (io) io.emit("updateFollow", { userId: targetId, currentUserId, follow: false });
    res.json({ msg: "Unfollowed successfully", user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//  Sanitize User 
const sanitizeUser = (user, requesterId) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  const v = obj.visibility || {};
  const isOwner = requesterId && String(requesterId) === String(obj._id);

  if (isOwner) return obj;

  ["dob", "email", "place", "location", "bio", "about", "nickname", "pronouns"].forEach((f) => {
    if (v[f] !== "public") delete obj[f];
  });

  if (v.contactInfo !== "public") {
    delete obj.contactInfo;
  } else if (Array.isArray(obj.contactInfo)) {
    obj.contactInfo = obj.contactInfo.filter((c) => c && c.value && c.visibility === "public");
  }

  const defaultVisible = (it) => it && it.visibility !== "private";
  ["websites", "linkedAccounts", "achievements"].forEach((arr) => {
    if (Array.isArray(obj[arr])) {
      obj[arr] = obj[arr].filter(defaultVisible);
    }
  });

  delete obj.previousEmails;
  delete obj.previousUsernames;

  return obj;
};

// Get Profile 
exports.getUserProfile = async (req, res) => {
  try {
    const viewerId = String(req.user.id);

    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers following", "username firstName lastName")
      .populate({
        path: "posts",
        options: { sort: { createdAt: -1 } },
        populate: { path: "user", select: "firstName lastName username profileImage followers following" },
      });

    if (!user) return res.status(404).json({ msg: "User not found" });

    const viewer = await User.findById(viewerId).select("following").lean();
    const followingIds = (viewer?.following || []).map((id) => String(id));

    const filteredPosts = (user.posts || []).filter((p) => {
      const ownerId = String(p.user?._id || p.user);
      if (ownerId === viewerId) return true;
      if (p.draft) return false;
      if (p.visibility === "public") return true;
      if (p.visibility === "followers" && followingIds.includes(ownerId)) return true;
      return false;
    });

    const out = user.toObject();
    out.posts = filteredPosts;

    res.json(sanitizeUser(out, viewerId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//  Update Profile Image 
exports.updateProfileImage = async (req, res) => {
  try {
    const file =
      req.file ||
      req.files?.profileImage?.[0] ||
      req.files?.image?.[0] ||
      (Array.isArray(req.files) ? req.files[0] : null);

    if (!file) return res.status(400).json({ msg: "No file uploaded (expected field: profileImage)" });

    if (req.params?.id && String(req.params.id) !== String(req.user.id)) {
      return res.status(403).json({ msg: "You can only update your own profile image" });
    }

    const newUrl = `/uploads/profileImages/${file.filename}`;

    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    const oldUrl = user.profileImage;
    user.profileImage = newUrl;
    await user.save();

    if (oldUrl && oldUrl !== newUrl && oldUrl.startsWith("/uploads/")) {
      unlinkFiles([oldUrl]).catch(() => {});
    }

    const io = req.app.get("io");
    io?.emit("updateProfileImage", {
      userId: String(user._id),
      profileImage: newUrl,
      updatedAt: user.updatedAt?.getTime?.() || Date.now(),
    });

    res.json({ msg: "Profile image updated", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Basic Profile (VALIDATED) 
exports.updateProfile = async (req, res) => {
  try {
    const {
      username,
      firstName,
      lastName,
      gender,
      bio,
      email,
      place,
      dob,
      middleName,
      nickname,
      surname,
      pronouns,
      about,
      visibility,
    } = req.body;

    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (typeof firstName === "string" && firstName.trim()) user.firstName = firstName.trim();
    if (typeof lastName === "string" && lastName.trim()) user.lastName = lastName.trim();

    if (typeof gender === "string" && gender.trim()) {
      const allowedGenders = ["Male", "Female", "Other"];
      if (!allowedGenders.includes(gender)) {
        return res.status(400).json({ msg: "Invalid gender" });
      }
      user.gender = gender;
    }

    if (typeof bio === "string") user.bio = bio;
    if (typeof middleName === "string") user.middleName = middleName;
    if (typeof nickname === "string") user.nickname = nickname;
    if (typeof surname === "string") user.surname = surname;
    if (typeof pronouns === "string") user.pronouns = pronouns;
    if (typeof about === "string") user.about = about;

    if (typeof place === "string") {
      const { errors: placeErrs, sanitized: cleanPlace } = getPlaceErrors(place);
      if (cleanPlace || place.length > 0) {
        if (placeErrs.length) return res.status(400).json({ msg: placeErrs[0] });
        user.place = cleanPlace;
      }
    }

    if (dob !== undefined && dob !== null && dob !== "") {
      const dobErrs = getDobErrors(dob);
      if (dobErrs.length) return res.status(400).json({ msg: dobErrs[0] });
      user.dob = new Date(dob);
    }

    let usernameChanged = false;
    if (typeof username === "string" && username.trim() && username !== user.username) {
      const v = validateUsername(username);
      if (!v.ok) return res.status(400).json({ msg: v.msg });

      const exists = await User.findOne({ username }).collation({ locale: "en", strength: 2 }).select("_id").lean();
      if (exists && String(exists._id) !== String(user._id)) {
        return res.status(400).json({ msg: "Username taken" });
      }

      if (!Array.isArray(user.previousUsernames)) user.previousUsernames = [];
      if (user.username && !user.previousUsernames.includes(user.username)) {
        user.previousUsernames.push(user.username);
      }
      user.username = username;
      user.usernameChangedAt = new Date();
      usernameChanged = true;
    }

    if (typeof email === "string" && email.trim() && email !== user.email) {
      const normalizedEmail =
        validator.normalizeEmail(String(email), { gmail_remove_dots: false }) ||
        String(email).trim().toLowerCase();

      if (!validator.isEmail(normalizedEmail)) {
        return res.status(400).json({ msg: "Invalid email format" });
      }

      const exists = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (exists) return res.status(400).json({ msg: "Email taken" });

      if (!Array.isArray(user.previousEmails)) user.previousEmails = [];
      if (user.email && !user.previousEmails.includes(user.email)) {
        user.previousEmails.push(user.email);
      }
      user.email = normalizedEmail;
    }

    if (visibility) {
      const allowed = ["dob", "email", "place", "location", "bio", "contactInfo", "about", "nickname", "pronouns"];
      user.visibility = user.visibility || {};
      for (const k of allowed) {
        if (visibility[k] && ["public", "private"].includes(visibility[k])) {
          user.visibility[k] = visibility[k];
        }
      }
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");
    res.json({ msg: "Profile updated", user: updatedUser });

    if (usernameChanged) {
      const io = req.app.get("io");
      io?.emit("usernameUpdated", { userId: String(user._id), username: user.username });
    }
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update Enhanced Profile 
exports.updateEnhancedProfile = async (req, res) => {
  const {
    nickname,
    surname,
    pronouns,
    about,
    skills,
    education,
    experience,
    contactInfo,
    websites,
    linkedAccounts,
    achievements,
    visibility,
  } = req.body;

  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (nickname !== undefined) user.nickname = nickname;
    if (surname !== undefined) user.surname = surname;
    if (pronouns !== undefined) user.pronouns = pronouns;
    if (about !== undefined) user.about = about;

    if (skills) user.skills = skills;

    const clean = (arr) =>
      Array.isArray(arr)
        ? arr.filter((item) => Object.values(item || {}).some((v) => v != null && String(v).trim() !== ""))
        : arr;

    if (education) user.education = clean(education);
    if (experience) user.experience = clean(experience);
    if (websites) user.websites = clean(websites);
    if (linkedAccounts) user.linkedAccounts = clean(linkedAccounts);
    if (achievements) user.achievements = clean(achievements);

    if (contactInfo) user.contactInfo = contactInfo.filter((c) => c.value && c.value.trim() !== "");

    if (visibility) user.visibility = { ...user.visibility, ...visibility };

    const updatedUser = await user.save();

    res.json({ msg: "Enhanced profile updated", user: updatedUser });

    const io = req.app.get("io");
    if (io) {
      const publicUser = sanitizeUser(updatedUser, null);
      io.emit("updateEnhancedProfile", publicUser);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

//  Delete User 
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const io = req.app.get("io");
    await user.deleteOne();

    io?.emit("userDeleted", user._id.toString());

    res.json({ msg: "User and related data deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: err.message });
  }
};

//  Search Users 
exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.query?.trim();
    if (!query) return res.json({ users: [] });

     const escapeRegex = (s = "") => s.replace(/[-/\^$*+?.()|[```{}]/g, "\$&");
    const rx = new RegExp(escapeRegex(query), "i");

    const users = await User.find({
      $or: [{ username: rx }, { firstName: rx }, { lastName: rx }, { place: rx }],
    })
      .select("firstName lastName username place profileImage") // <-- CHANGE HERE
      .limit(20);

    res.json({ users });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error while searching users" });
  }
};

// Followers / Following 
exports.getFollowers = async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("followers")
    .populate("followers", "firstName lastName username profileImage updatedAt followers");
  if (!user) return res.status(404).json({ msg: "User not found" });
  res.json(user.followers.map((u) => ({ ...u.toObject(), _id: u._id.toString() })));
};

exports.getFollowing = async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("following")
    .populate("following", "firstName lastName username profileImage updatedAt followers");
  if (!user) return res.status(404).json({ msg: "User not found" });
  res.json(user.following.map((u) => ({ ...u.toObject(), _id: u._id.toString() })));
};

// Set/change password
exports.setPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, msg: "New password and confirmation are required." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, msg: "Passwords do not match." });
    }

    const pwErrors = getPasswordErrors(newPassword);
    if (pwErrors.length) {
      return res.status(400).json({ success: false, msg: `Password must include ${pwErrors.join(", ")}.` });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    if (user.passwordSet) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, msg: "Current password is required." });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, msg: "Current password is incorrect." });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.passwordSet = true;
    await user.save();

    res.json({ success: true, msg: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Public: check username availability
exports.checkUsername = async (req, res) => {
  try {
    const username = String(req.query.username || req.query.u || "").trim();
    if (!username) {
      return res.status(400).json({ success: false, available: false, msg: "Username is required" });
    }

    const v = validateUsername(username);
    if (!v.ok) {
      return res.json({ success: true, available: false, msg: v.msg });
    }

    const existing = await User.findOne({ username })
      .collation({ locale: "en", strength: 2 })
      .select("_id")
      .lean();

    return res.json({ success: true, available: !existing });
  } catch (err) {
    return res.status(500).json({ success: false, available: false, error: err.message });
  }
};

// Get my notification settings
exports.getNotificationSettings = async (req, res) => {
  try {
    const u = await User.findById(req.user.id).select("settings").lean();
    const reelPublish = u?.settings?.notifications?.reelPublish !== false;  
    const storyPublish = u?.settings?.notifications?.storyPublish !== false; 
    res.json({ success: true, settings: { reelPublish, storyPublish } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update my notification settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { reelPublish, storyPublish } = req.body;
    const update = {};
    if (typeof reelPublish === "boolean") {
      update["settings.notifications.reelPublish"] = reelPublish;
    }
    if (typeof storyPublish === "boolean") {
      update["settings.notifications.storyPublish"] = storyPublish;
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, msg: "No valid settings provided" });
    }
    await User.updateOne({ _id: req.user.id }, { $set: update });
    res.json({ success: true, settings: { reelPublish, storyPublish } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};