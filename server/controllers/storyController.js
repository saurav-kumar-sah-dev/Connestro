// controllers/storyController.js
const mongoose = require("mongoose");
const Story = require("../models/Story");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { StoryView, StoryReaction } = require("../models/StoryEngagement");
const { unlinkFiles, fsPathForPublicUrl } = require("../lib/uploads");
const { probeDurationSec } = require("../lib/ffprobe");

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_STORIES_PER_DAY = Number(process.env.STORIES_DAILY_LIMIT || 50);

function sanitizeStory(doc) {
  const s = doc?.toObject ? doc.toObject() : doc;
  return {
    _id: s._id,
    user:
      s.user && s.user._id
        ? {
            _id: s.user._id,
            username: s.user.username,
            firstName: s.user.firstName,
            lastName: s.user.lastName,
            profileImage: s.user.profileImage || "",
          }
        : s.user,
    type: s.type,
    url: s.url,
    caption: s.caption || "",
    durationSec: s.durationSec || 0,
    visibility: s.visibility || "public",
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  };
}

//  CREATE 
exports.create = async (req, res) => {
  const userId = req.user.id;
  const file = req.file;
  try {
    if (!file)
      return res.status(400).json({ success: false, msg: "No media uploaded (field: media)" });

    // Daily limit
    const cutoff = new Date(Date.now() - DAY_MS);
    const count = await Story.countDocuments({ user: userId, createdAt: { $gte: cutoff } });
    if (count >= MAX_STORIES_PER_DAY) {
      await unlinkFiles([`/uploads/stories/${file.filename}`]).catch(() => {});
      return res
        .status(429)
        .json({ success: false, msg: "Daily story limit reached. Try again later." });
    }

    // Type check
    let type = "image";
    if (file.mimetype?.startsWith("video/")) type = "video";
    else if (file.mimetype?.startsWith("image/")) type = "image";
    else {
      await unlinkFiles([`/uploads/stories/${file.filename}`]).catch(() => {});
      return res.status(400).json({ success: false, msg: "Only image or video allowed" });
    }

    const caption = String(req.body.caption || "").slice(0, 200);
    const visibility = ["public", "followers"].includes(String(req.body.visibility))
      ? String(req.body.visibility)
      : "public";

    let durationSec = Number(req.body.durationSec || 0);
    if (!Number.isFinite(durationSec) || durationSec < 0) durationSec = 0;

    // Accurate server-side check for videos
    if (type === "video") {
      const publicUrl = `/uploads/stories/${file.filename}`;
      const localPath = fsPathForPublicUrl(publicUrl);
      const probed = await probeDurationSec(localPath);
      if (Number.isFinite(probed) && probed > 0) durationSec = Math.round(probed);
      // allow tiny encoder drift
      if (probed > 15.2) {
        await unlinkFiles([publicUrl]).catch(() => {});
        return res.status(400).json({ success: false, msg: "Video must be 15 seconds or less" });
      }
    }

    const now = new Date();
    const story = await Story.create({
      user: userId,
      type,
      url: `/uploads/stories/${file.filename}`,
      caption,
      durationSec: type === "video" ? durationSec : 0,
      visibility,
      createdAt: now,
      expiresAt: new Date(now.getTime() + DAY_MS),
    });

    const populated = await Story.findById(story._id).populate(
      "user",
      "username firstName lastName profileImage followers"
    );
    const out = sanitizeStory(populated);

    // Broadcast
    const io = req.app.get("io");
    if (visibility === "public") {
      io?.emit("story:new", out);
    } else {
      const followers = (populated.user?.followers || []).map((id) => String(id));
      const targets = new Set([String(userId), ...followers]);
      for (const uid of targets) io?.to(uid).emit("story:new", out);
    }

    // Notifications: story_publish to followers who enabled it
    try {
      const ownerId = String(userId);
      const followerIds = (populated.user?.followers || [])
        .map((id) => String(id))
        .filter((fid) => fid !== ownerId);

      if (followerIds.length) {
        const recipients = await User.find({
          _id: { $in: followerIds },
          $or: [
            { "settings.notifications.storyPublish": { $exists: false } },
            { "settings.notifications.storyPublish": true },
          ],
        })
          .select("_id")
          .lean();

        if (recipients.length) {
          const actorData = {
            _id: populated.user._id,
            username: populated.user.username,
            firstName: populated.user.firstName,
            lastName: populated.user.lastName,
            profileImage: populated.user.profileImage || "",
          };
          const link = `/?openStoryUser=${ownerId}&openStoryId=${String(story._id)}`;

          const docs = recipients.map((r) => ({
            user: r._id,
            actor: ownerId,
            type: "story_publish",
            text: "posted a new story",
            link,
          }));

          const createdNotifs = await Notification.insertMany(docs, { ordered: false });

          for (const n of createdNotifs) {
            const payload = {
              _id: n._id,
              user: n.user,
              actor: actorData,
              type: n.type,
              text: n.text,
              link: n.link,
              read: false,
              readAt: null,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
            };
            io?.to(String(n.user)).emit("notification:new", payload);
          }
        }
      }
    } catch (e) {
      console.error("story_publish notifications error:", e?.message || e);
    }

    res.status(201).json({ success: true, story: out });
  } catch (err) {
    console.error("create story error:", err);
    if (file?.filename) await unlinkFiles([`/uploads/stories/${file.filename}`]).catch(() => {});
    res.status(500).json({ success: false, error: err.message });
  }
};

// LIST FEED / USER 
exports.listFeed = async (req, res) => {
  try {
    const meId = String(req.user.id);
    const me = await User.findById(meId).select("following").lean();
    const followingIds = (me?.following || []).map(
      (x) => new mongoose.Types.ObjectId(String(x))
    );

    const authors = [new mongoose.Types.ObjectId(meId), ...followingIds];
    const now = new Date();

    const stories = await Story.find({
      user: { $in: authors },
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .populate("user", "username firstName lastName profileImage");

    const byUser = new Map();
    for (const s of stories) {
      const uId = String(s.user?._id || s.user);
      if (!byUser.has(uId)) {
        byUser.set(uId, { user: s.user, stories: [] });
      }
      byUser.get(uId).stories.push(sanitizeStory(s));
    }

    res.json({ success: true, items: Array.from(byUser.values()) });
  } catch (err) {
    console.error("listFeed error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.listForUser = async (req, res) => {
  try {
    const viewerId = String(req.user.id);
    const userId = String(req.params.userId || "");
    if (!mongoose.isValidObjectId(userId))
      return res.status(400).json({ success: false, msg: "Invalid userId" });

    const target = await User.findById(userId).select("_id").lean();
    if (!target) return res.status(404).json({ success: false, msg: "User not found" });

    const now = new Date();
    let stories = await Story.find({
      user: userId,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .populate("user", "username firstName lastName profileImage");

    const isOwner = viewerId === userId;
    if (!isOwner) {
      const viewer = await User.findById(viewerId).select("following").lean();
      const follows = (viewer?.following || []).map(String).includes(String(userId));
      stories = stories.filter((s) => s.visibility === "public" || follows);
    }

    res.json({ success: true, stories: stories.map(sanitizeStory) });
  } catch (err) {
    console.error("listForUser error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Map of userId -> visible active story count for viewer
exports.activeForUsers = async (req, res) => {
  try {
    const idsParam = String(req.query.ids || "");
    const raw = idsParam.split(",").map((x) => x.trim()).filter(Boolean);
    const ids = Array.from(new Set(raw)).filter((id) => mongoose.isValidObjectId(id));
    if (!ids.length) return res.json({ success: true, map: {} });

    const viewerId = String(req.user.id);
    const viewer = await User.findById(viewerId).select("following").lean();
    const followingSet = new Set((viewer?.following || []).map((x) => String(x)));

    const now = new Date();
    const stories = await Story.find({
      user: { $in: ids },
      expiresAt: { $gt: now },
    })
      .select("user visibility")
      .lean();

    const counts = {};
    for (const s of stories) {
      const owner = String(s.user);
      const vis = s.visibility || "public";
      const isOwner = owner === viewerId;
      const canSee = vis === "public" || isOwner || followingSet.has(owner);
      if (!canSee) continue;
      counts[owner] = (counts[owner] || 0) + 1;
    }

    res.json({ success: true, map: counts });
  } catch (err) {
    console.error("activeForUsers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  UNSEEN COUNTS
exports.unseenForUsers = async (req, res) => {
  try {
    const idsParam = String(req.query.ids || "");
    const raw = idsParam.split(",").map((x) => x.trim()).filter(Boolean);
    const ids = Array.from(new Set(raw)).filter((id) => mongoose.isValidObjectId(id));
    if (!ids.length) return res.json({ success: true, map: {} });

    const viewerId = String(req.user.id);
    const viewer = await User.findById(viewerId).select("following").lean();
    const followingSet = new Set((viewer?.following || []).map((x) => String(x)));

    const now = new Date();
    // Active stories for those authors
    const stories = await Story.find({
      user: { $in: ids },
      expiresAt: { $gt: now },
    })
      .select("_id user visibility")
      .lean();

    // Filter by visibility and bucket by owner
    const storiesByOwner = {};
    for (const s of stories) {
      const owner = String(s.user);
      const vis = s.visibility || "public";
      const isOwner = owner === viewerId;
      const canSee = vis === "public" || isOwner || followingSet.has(owner);
      if (!canSee) continue;
      if (!storiesByOwner[owner]) storiesByOwner[owner] = [];
      storiesByOwner[owner].push(String(s._id));
    }

    const allStoryIds = Object.values(storiesByOwner).flat();
    if (!allStoryIds.length) {
      const zeroMap = {};
      for (const id of ids) zeroMap[id] = 0;
      return res.json({ success: true, map: zeroMap });
    }

    // Viewed by this viewer
    const views = await StoryView.find({
      story: { $in: allStoryIds },
      viewer: viewerId,
    })
      .select("story")
      .lean();
    const viewedSet = new Set(views.map((v) => String(v.story)));

    // Compute unseen per owner
    const out = {};
    for (const [owner, list] of Object.entries(storiesByOwner)) {
      const unseen = list.reduce((acc, sid) => acc + (viewedSet.has(sid) ? 0 : 1), 0);
      out[owner] = unseen;
    }
    for (const id of ids) if (!(id in out)) out[id] = 0;

    res.json({ success: true, map: out });
  } catch (err) {
    console.error("unseenForUsers error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// VIEW 
exports.markView = async (req, res) => {
  try {
    const viewerId = String(req.user.id);
    const storyId = String(req.params.id);

    if (!mongoose.isValidObjectId(storyId))
      return res.status(400).json({ success: false, msg: "Invalid story id" });

    const s = await Story.findById(storyId).populate("user", "followers").lean();
    if (!s) return res.status(404).json({ success: false, msg: "Story not found" });
    if (s.expiresAt && new Date(s.expiresAt) <= new Date()) {
      return res.status(410).json({ success: false, msg: "Story expired" });
    }

    // Visibility
    const ownerId = String(s.user?._id || s.user);
    const isOwner = ownerId === viewerId;
    if (s.visibility === "followers" && !isOwner) {
      const follows = (s.user?.followers || []).map((x) => String(x));
      const isViewerAFollower = follows.includes(viewerId);
      if (!isViewerAFollower) {
        return res.status(403).json({ success: false, msg: "Not authorized" });
      }
    }

    // Upsert view and detect if it's newly created (not seen before)
    const prev = await StoryView.findOneAndUpdate(
      { story: storyId, viewer: viewerId },
      { $setOnInsert: { createdAt: new Date() }, $set: { expiresAt: new Date(s.expiresAt) } },
      { upsert: true, new: false }
    );
    const newlyViewed = !prev;

    res.json({ success: true, newlyViewed });
  } catch (err) {
    console.error("markView error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// List viewers (owner only)
exports.listViews = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const storyId = String(req.params.id);
    if (!mongoose.isValidObjectId(storyId))
      return res.status(400).json({ success: false, msg: "Invalid story id" });

    const s = await Story.findById(storyId).select("user expiresAt").lean();
    if (!s) return res.status(404).json({ success: false, msg: "Story not found" });
    if (String(s.user) !== userId) return res.status(403).json({ success: false, msg: "Forbidden" });

    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));

    const [total, views] = await Promise.all([
      StoryView.countDocuments({ story: storyId }),
      StoryView.find({ story: storyId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("viewer", "username firstName lastName profileImage")
        .lean(),
    ]);

    const items = views.map((v) => ({
      _id: v._id,
      viewer: v.viewer,
      createdAt: v.createdAt,
    }));

    res.json({ success: true, total, count: items.length, items });
  } catch (err) {
    console.error("listViews error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

//  REACTION
exports.react = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const storyId = String(req.params.id);
    const { type, emoji = "", text = "" } = req.body || {};

    if (!mongoose.isValidObjectId(storyId))
      return res.status(400).json({ success: false, msg: "Invalid story id" });
    if (!["like", "emoji", "text"].includes(String(type))) {
      return res.status(400).json({ success: false, msg: "Invalid reaction type" });
    }

    const s = await Story.findById(storyId).populate("user", "followers").lean();
    if (!s) return res.status(404).json({ success: false, msg: "Story not found" });
    if (s.expiresAt && new Date(s.expiresAt) <= new Date())
      return res.status(410).json({ success: false, msg: "Story expired" });

    const ownerId = String(s.user?._id || s.user);
    const isOwner = ownerId === userId;
    // Visibility check
    if (s.visibility === "followers" && !isOwner) {
      const followers = (s.user?.followers || []).map(String);
      const isViewerAFollower = followers.includes(userId);
      if (!isViewerAFollower) return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    const expiresAt = new Date(s.expiresAt);

    let liked = false;
    let reaction = null;

    if (type === "like") {
      // toggle like
      const existing = await StoryReaction.findOne({ story: storyId, user: userId, type: "like" });
      if (existing) {
        await StoryReaction.deleteOne({ _id: existing._id });
        liked = false;
      } else {
        reaction = await StoryReaction.create({ story: storyId, user: userId, type: "like", expiresAt });
        liked = true;
      }
    } else if (type === "emoji") {
      const em = String(emoji || "").slice(0, 8);
      if (!em) return res.status(400).json({ success: false, msg: "Missing emoji" });
      reaction = await StoryReaction.create({ story: storyId, user: userId, type: "emoji", emoji: em, expiresAt });
    } else if (type === "text") {
      const t = String(text || "").slice(0, 200);
      if (!t) return res.status(400).json({ success: false, msg: "Missing text" });
      reaction = await StoryReaction.create({ story: storyId, user: userId, type: "text", text: t, expiresAt });
    }

    // counts and state
    const likesCount = await StoryReaction.countDocuments({ story: storyId, type: "like" });
    const userLiked = !!(await StoryReaction.findOne({ story: storyId, user: userId, type: "like" }).select("_id"));

    // Notify owner (not for self like/reaction) with deep-link
    const io = req.app.get("io");
    if (!isOwner && (type === "like" ? liked : true)) {
      try {
        let notifType = "story_reaction";
        let notifText = "";
        if (type === "like") {
          notifType = "story_like";
          notifText = "liked your story";
        } else if (type === "emoji") {
          notifType = "story_reaction";
          notifText = `reacted ${emoji} to your story`;
        } else if (type === "text") {
          notifType = "story_reply";
          notifText = "replied to your story";
        }

        const link = `/?openStoryUser=${ownerId}&openStoryId=${storyId}`;

        const notif = await Notification.create({
          user: ownerId,
          actor: userId,
          type: notifType,
          text: notifText,
          link,
        });
        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io?.to(String(ownerId)).emit("notification:new", populatedNotif);
      } catch {}
    }

    // Broadcast lightweight socket update to owner for live UI
    io?.to(String(ownerId)).emit("story:reaction", {
      storyId: storyId,
      from: userId,
      type,
      emoji: type === "emoji" ? emoji : "",
      text: type === "text" ? text : "",
      likesCount,
    });

    return res.json({
      success: true,
      liked: type === "like" ? liked : undefined,
      likesCount,
      userLiked,
    });
  } catch (err) {
    console.error("react error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// List reactions summary (likes count + latest reactions)
exports.listReactions = async (req, res) => {
  try {
    const userId = String(req.user.id);
    const storyId = String(req.params.id);
    if (!mongoose.isValidObjectId(storyId))
      return res.status(400).json({ success: false, msg: "Invalid story id" });

    const s = await Story.findById(storyId).populate("user", "followers").lean();
    if (!s) return res.status(404).json({ success: false, msg: "Story not found" });
    if (s.expiresAt && new Date(s.expiresAt) <= new Date())
      return res.status(410).json({ success: false, msg: "Story expired" });

    // Visibility enforcement (same as viewing)
    const ownerId = String(s.user?._id || s.user);
    const isOwner = ownerId === userId;
    if (s.visibility === "followers" && !isOwner) {
      const followers = (s.user?.followers || []).map(String);
      const isViewerAFollower = followers.includes(userId);
      if (!isViewerAFollower) return res.status(403).json({ success: false, msg: "Not authorized" });
    }

    const likesCount = await StoryReaction.countDocuments({ story: storyId, type: "like" });
    const userLiked = !!(await StoryReaction.findOne({ story: storyId, user: userId, type: "like" }).select("_id"));

    // latest 30 reactions (emoji/text only, not likes)
    const latest = await StoryReaction.find({ story: storyId, type: { $in: ["emoji", "text"] } })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("user", "username firstName lastName profileImage")
      .lean();

    res.json({
      success: true,
      likesCount,
      userLiked,
      latest: latest.map((r) => ({
        _id: r._id,
        type: r.type,
        emoji: r.emoji || "",
        text: r.text || "",
        user: r.user,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error("listReactions error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE 
exports.remove = async (req, res) => {
  try {
    const storyId = req.params.id;
    const meId = String(req.user.id);
    const s = await Story.findById(storyId);
    if (!s) return res.status(404).json({ success: false, msg: "Story not found" });
    if (String(s.user) !== meId) return res.status(403).json({ success: false, msg: "Not authorized" });

    const url = s.url;
    await s.deleteOne();

    if (url && url.startsWith("/uploads/")) {
      unlinkFiles([url]).catch(() => {});
    }

    const io = req.app.get("io");
    io?.emit("story:deleted", { id: storyId, userId: meId });

    res.json({ success: true });
  } catch (err) {
    console.error("delete story error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};