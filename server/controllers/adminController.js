// controllers/adminController.js
const User = require("../models/User");
const Post = require("../models/Post");
const AdminAuditLog = require("../models/AdminAuditLog");
const Notification = require("../models/Notification");
const { unlinkMedia } = require("../lib/uploads");
const { Reel } = require("../models/Reel"); 


// Get all users with search & pagination (+ suspended filter)
exports.getAllUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", suspended = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = search
      ? {
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    if (suspended === "true") query.isSuspended = true;
    if (suspended === "false") query.isSuspended = false;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      users,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Delete a user by admin
exports.deleteUserByAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, msg: "User not found" });

    await user.deleteOne();

    try {
      await AdminAuditLog.create({
        admin: req.user.id,
        action: "delete_user",
        targetType: "user",
        targetId: user._id,
        meta: {},
      });
    } catch {}

    res
      .status(200)
      .json({ success: true, msg: "User deleted successfully by admin" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update user role (handled as a 403 stub in routes)

exports.suspendUser = async (req, res) => {
  try {
    const io = req.app.get("io");
    const { reason = "" } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isSuspended: true, suspendedAt: new Date(), suspendReason: reason },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    // Notify suspended user
    try {
      const notif = await Notification.create({
        user: user._id,
        actor: req.user.id,
        type: "moderation",
        text: `Your account has been suspended${reason ? `: ${reason}` : ""}`,
        link: "/home",
      });
      const populated = await Notification.findById(notif._id)
        .populate("actor", "username firstName lastName profileImage")
        .lean();
      io?.to(String(user._id)).emit("notification:new", populated);
    } catch {}

    try {
      await AdminAuditLog.create({
        admin: req.user.id,
        action: "suspend_user",
        targetType: "user",
        targetId: user._id,
        meta: { reason },
      });
    } catch {}

    res.json({ success: true, msg: "User suspended", user });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.unsuspendUser = async (req, res) => {
  try {
    const io = req.app.get("io");
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isSuspended: false, suspendedAt: null, suspendReason: "" },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    // Notify user
    try {
      const notif = await Notification.create({
        user: user._id,
        actor: req.user.id,
        type: "moderation",
        text: "Your account has been unsuspended",
        link: "/home",
      });
      const populated = await Notification.findById(notif._id)
        .populate("actor", "username firstName lastName profileImage")
        .lean();
      io?.to(String(user._id)).emit("notification:new", populated);
    } catch {}

    try {
      await AdminAuditLog.create({
        admin: req.user.id,
        action: "unsuspend_user",
        targetType: "user",
        targetId: user._id,
        meta: {},
      });
    } catch {}

    res.json({ success: true, msg: "User unsuspended", user });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};


// Get all posts with search & pagination (+ hidden/draft/visibility filters)
exports.getAllPosts = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      isHidden = "",
      draft = "",
      visibility = "",
    } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};
    if (search) query.content = { $regex: search, $options: "i" };

    if (isHidden === "true") query.isHidden = true;
    if (isHidden === "false") query.isHidden = false;

    if (draft === "true") query.draft = true;
    if (draft === "false") query.draft = false;

    if (["public", "followers", "private"].includes(String(visibility))) {
      query.visibility = String(visibility);
    }

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate("user", "firstName lastName username profileImage")
      .populate("comments.user", "firstName lastName username profileImage")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      posts,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.deletePostByAdmin = async (req, res) => {
  try {
    const io = req.app.get("io");
    const post = await Post.findById(req.params.id).populate("user", "firstName lastName username profileImage");
    if (!post) return res.status(404).json({ success: false, msg: "Post not found" });

    const ownerId = post.user?._id || post.user;

    // notify owner
    try {
      const notif = await Notification.create({
        user: ownerId,
        actor: req.user.id,
        type: "moderation",
        post: post._id,
        text: "Your post has been deleted by moderation",
        link: `/profile/${ownerId}`,
      });
      const populated = await Notification.findById(notif._id).populate("actor", "username firstName lastName profileImage").lean();
      io?.to(String(ownerId)).emit("notification:new", populated);
    } catch {}

    // unlink media
    await unlinkMedia(post.media || []);

    await User.findByIdAndUpdate(ownerId, { $pull: { posts: post._id } });
    await post.deleteOne();

    try {
      await AdminAuditLog.create({
        admin: req.user.id,
        action: "delete_post",
        targetType: "post",
        targetId: req.params.id,
        meta: {},
      });
    } catch {}

    res.status(200).json({ success: true, msg: "Post deleted successfully by admin" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



exports.hidePost = async (req, res) => {
  try {
    const io = req.app.get("io");
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { isHidden: true },
      { new: true }
    ).populate("user", "firstName lastName username profileImage");
    if (!post) return res.status(404).json({ success: false, msg: "Post not found" });

    // Notify owner
    try {
      const notif = await Notification.create({
        user: post.user._id,
        actor: req.user.id,
        type: "moderation",
        post: post._id,
        text: "Your post has been hidden by moderation",
        link: `/post/${post._id}`,
      });
      const populated = await Notification.findById(notif._id)
        .populate("actor", "username firstName lastName profileImage")
        .lean();
      io?.to(String(post.user._id)).emit("notification:new", populated);
    } catch {}

    try {
      await AdminAuditLog.create({
        admin: req.user.id,
        action: "hide_post",
        targetType: "post",
        targetId: post._id,
        meta: {},
      });
    } catch {}

    res.json({ success: true, msg: "Post hidden", post: post.toObject() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

exports.unhidePost = async (req, res) => {
  try {
    const io = req.app.get("io");
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { isHidden: false },
      { new: true }
    ).populate("user", "firstName lastName username profileImage");
    if (!post) return res.status(404).json({ success: false, msg: "Post not found" });

    // Notify owner
    try {
      const notif = await Notification.create({
        user: post.user._id,
        actor: req.user.id,
        type: "moderation",
        post: post._id,
        text: "Your post has been restored by moderation",
        link: `/post/${post._id}`,
      });
      const populated = await Notification.findById(notif._id)
        .populate("actor", "username firstName lastName profileImage")
        .lean();
      io?.to(String(post.user._id)).emit("notification:new", populated);
    } catch {}

    try {
      await AdminAuditLog.create({
        admin: req.user.id,
        action: "unhide_post",
        targetType: "post",
        targetId: post._id,
        meta: {},
      });
    } catch {}

    res.json({ success: true, msg: "Post unhidden", post: post.toObject() });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

// METRICS 

exports.getAllMetrics = async (req, res) => {
  try {
    const [
      // Users
      totalUsers,
      suspendedUsers,

      // Posts
      totalPosts,
      hiddenPosts,
      draftPosts,
      publicPosts,
      followersPosts,
      privatePosts,

      // Reels
      totalReels,
      hiddenReels,
      draftReels,
      publicReels,
      followersReels,
    ] = await Promise.all([
      // Users
      User.countDocuments(),
      User.countDocuments({ isSuspended: true }),

      // Posts
      Post.countDocuments(),
      Post.countDocuments({ isHidden: true }),
      Post.countDocuments({ draft: true }),
      Post.countDocuments({ draft: false, isHidden: { $ne: true }, visibility: "public" }),
      Post.countDocuments({ draft: false, isHidden: { $ne: true }, visibility: "followers" }),
      Post.countDocuments({ draft: false, isHidden: { $ne: true }, visibility: "private" }),

      // Reels
      Reel.countDocuments(),
      Reel.countDocuments({ isHidden: true }),
      Reel.countDocuments({ draft: true }),
      Reel.countDocuments({ draft: false, isHidden: { $ne: true }, visibility: "public" }),
      Reel.countDocuments({ draft: false, isHidden: { $ne: true }, visibility: "followers" }),
    ]);

    res.json({
      users: {
        total: totalUsers,
        suspended: suspendedUsers,
        active: Math.max(0, totalUsers - suspendedUsers),
      },
      posts: {
        total: totalPosts,
        hidden: hiddenPosts,
        drafts: draftPosts,
        byAudience: { public: publicPosts, followers: followersPosts, private: privatePosts },
      },
      reels: {
        total: totalReels,
        hidden: hiddenReels,
        drafts: draftReels,
        byAudience: { public: publicReels, followers: followersReels },
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};