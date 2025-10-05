// controllers/messageController.js
const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { unlinkFiles } = require("../lib/uploads");

const toId = (id) => new mongoose.Types.ObjectId(String(id));

const ensureConversation = async (meId, otherId) => {
  if (String(meId) === String(otherId)) {
    const err = new Error("Cannot message yourself");
    err.status = 400;
    throw err;
  }

  const me = toId(meId);
  const other = toId(otherId);
  const key = [String(meId), String(otherId)].sort().join("|");

  // 1) Try by key/participantHash first (fast path)
  let convo =
    (await Conversation.findOne({ key })) ||
    (await Conversation.findOne({ participantHash: key }));

  // 2) Fallback: find exact two-participant conversation
  if (!convo) {
    convo = await Conversation.findOne({
      participants: { $all: [me, other] },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    });
  }

  // 3) If found, backfill key/participantHash if missing or wrong
  if (convo) {
    let changed = false;
    if (!convo.key || convo.key !== key) {
      convo.key = key;
      changed = true;
    }
    if (!convo.participantHash || convo.participantHash !== key) {
      convo.participantHash = key;
      changed = true;
    }
    if (changed) {
      try {
        await convo.save();
      } catch (e) {
        const fallback =
          (await Conversation.findOne({ key })) ||
          (await Conversation.findOne({ participantHash: key }));
        if (fallback) return fallback;
        throw e;
      }
    }
    return convo;
  }

  // 4) Create new
  try {
    const created = await Conversation.create({
      participants: [me, other],
      key,
      participantHash: key,
    });
    return created;
  } catch (err) {
    if (err && err.code === 11000) {
      const existing =
        (await Conversation.findOne({ key })) ||
        (await Conversation.findOne({ participantHash: key })) ||
        (await Conversation.findOne({
          participants: { $all: [me, other] },
          $expr: { $eq: [{ $size: "$participants" }, 2] },
        }));
      if (existing) return existing;
    }
    throw err;
  }
};

exports.getOrCreateConversationWithUser = async (req, res) => {
  try {
    const meId = req.user.id;
    const otherId = req.params.userId || req.body.userId;
    if (!otherId) return res.status(400).json({ msg: "userId required" });
    if (!mongoose.isValidObjectId(otherId)) {
      return res.status(400).json({ msg: "Invalid userId" });
    }
    if (String(meId) === String(otherId)) {
      return res.status(400).json({ msg: "Cannot message yourself" });
    }

    const other = await User.findById(otherId).select("_id");
    if (!other) return res.status(404).json({ msg: "User not found" });

    const convo = await ensureConversation(meId, otherId);

    const populated = await Conversation.findById(convo._id)
      .populate("participants", "firstName lastName username profileImage updatedAt")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username firstName lastName profileImage" },
      });

    res.json({ conversation: populated });
  } catch (err) {
    console.error("getOrCreateConversationWithUser error:", err);
    res.status(err.status || 500).json({ error: err.message || "Server error" });
  }
};

exports.getConversations = async (req, res) => {
  try {
    const meId = req.user.id;
    const convos = await Conversation.find({ participants: meId })
      .sort({ updatedAt: -1 })
      .populate("participants", "firstName lastName username profileImage updatedAt")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username firstName lastName profileImage" },
      })
      .lean();

    const onlineUsers = req.app.get("onlineUsers"); // Map userId -> { sockets:Set, lastSeen:Date }

    const list = convos.map((c) => {
      const other = (c.participants || []).find((p) => String(p._id) !== String(meId));
      const online = Boolean(onlineUsers && onlineUsers.get(String(other?._id)));
      const unread = (c.unreadCounts && c.unreadCounts[String(meId)]) || 0;

      // Respect clearedAt for this user: hide lastMessage if it’s older
      const clearedAtObj = c.clearedAt || {};
      const clearedAtForMe =
        clearedAtObj[String(meId)] || (clearedAtObj.get && clearedAtObj.get(String(meId)));
      let lastMessage = c.lastMessage || null;
      if (clearedAtForMe && lastMessage && new Date(lastMessage.createdAt) <= new Date(clearedAtForMe)) {
        lastMessage = null;
      }

      return { ...c, other, unread, otherOnline: online, lastMessage };
    });

    res.json({ conversations: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const meId = req.user.id;
    const { id } = req.params; // conversationId
    const { before, limit = 25 } = req.query;

    // Must include clearedAt for "clear chat" boundary
    const convo = await Conversation.findById(id).select("participants clearedAt");
    if (!convo) return res.status(404).json({ msg: "Conversation not found" });
    if (!convo.participants.some((p) => String(p) === String(meId)))
      return res.status(403).json({ msg: "Not a participant" });

    const filter = {
      conversation: id,
      deletedFor: { $ne: toId(meId) },
    };

    // Respect per-user clear boundary
    const clearedAtForMe =
      convo.clearedAt?.get?.(String(meId)) || convo.clearedAt?.[String(meId)] || null;
    if (clearedAtForMe) {
      filter.createdAt = { ...(filter.createdAt || {}), $gt: new Date(clearedAtForMe) };
    }

    // Keyset pagination: load messages created before a given message
    if (before) {
      const beforeMsg = await Message.findById(before).select("createdAt");
      if (beforeMsg) {
        filter.createdAt = { ...(filter.createdAt || {}), $lt: beforeMsg.createdAt };
      }
    }

    const msgs = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit), 100))
      .populate("sender", "username firstName lastName profileImage")
      .lean();

    res.json({ messages: msgs.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// helpers
const getAttachmentType = (mimetype) => {
  if (!mimetype) return "file";
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/")) return "video";
  return "file";
};

// controllers/messageController.js -> replace exports.sendMessage with this version
exports.sendMessage = async (req, res) => {
  try {
    const meId = req.user.id;
    const { id } = req.params; // conversationId
    const { text = "" } = req.body;

    const convo = await Conversation.findById(id);
    if (!convo) return res.status(404).json({ msg: "Conversation not found" });
    if (!convo.participants.some((p) => String(p) === String(meId)))
      return res.status(403).json({ msg: "Not a participant" });

    // Build attachments
    const attachments = (req.files || []).map((f) => ({
      type: getAttachmentType(f.mimetype),
      url: `/uploads/chat/${f.filename}`,
      mime: f.mimetype,
      size: f.size,
      name: f.originalname,
    }));

    if (!text && attachments.length === 0) {
      return res.status(400).json({ msg: "Empty message" });
    }

    const msg = await Message.create({
      conversation: convo._id,
      sender: meId,
      text,
      attachments,
      deliveredTo: [],
      readBy: [],
    });

    const io = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");

    // Detect active viewers in this conversation
    const recipients = convo.participants.filter((p) => String(p) !== String(meId));
    const viewersInRoom = new Set();
    try {
      const roomName = `conversation:${String(convo._id)}`;
      const room = io.sockets.adapter.rooms.get(roomName);
      for (const rid of recipients) {
        const ridStr = String(rid);
        const rec = onlineUsers && onlineUsers.get(ridStr);
        if (!rec || !room) continue;
        for (const sid of rec.sockets || []) {
          if (room.has(sid)) {
            viewersInRoom.add(ridStr);
            break;
          }
        }
      }
    } catch {}

    // Update conversation (unreadCounts)
    convo.lastMessage = msg._id;
    for (const p of convo.participants) {
      const pid = String(p);
      if (pid !== String(meId)) {
        const prev = convo.unreadCounts.get(pid) || 0;
        if (viewersInRoom.has(pid)) {
          convo.unreadCounts.set(pid, 0);
        } else {
          convo.unreadCounts.set(pid, prev + 1);
        }
      }
    }
    await convo.save();

    // If viewer is in room, mark this message delivered + read immediately
    for (const rid of recipients) {
      const ridStr = String(rid);
      if (viewersInRoom.has(ridStr)) {
        await Message.updateOne(
          { _id: msg._id },
          { $addToSet: { deliveredTo: rid, readBy: rid } }
        ).catch(() => {});
        io.to(String(meId)).emit("message:read", {
          conversationId: String(convo._id),
          readerId: ridStr,
        });
      }
    }

    const populatedMsg = await Message.findById(msg._id)
      .populate("sender", "username firstName lastName profileImage")
      .lean();

    // emit to recipients and mark delivered if online
    recipients.forEach((rid) => {
      const ridStr = String(rid);
      io.to(ridStr).emit("message:new", {
        conversationId: String(convo._id),
        message: populatedMsg,
      });

      if (onlineUsers && onlineUsers.get(ridStr)) {
        Message.updateOne(
          { _id: msg._id, deliveredTo: { $ne: rid } },
          { $addToSet: { deliveredTo: rid } }
        ).catch(() => {});
        io.to(String(meId)).emit("message:delivered", {
          conversationId: String(convo._id),
          messageIds: [String(msg._id)],
        });
      }
    });

    // Create notification for recipients NOT actively viewing this chat
    for (const rid of recipients) {
      const ridStr = String(rid);
      if (!viewersInRoom.has(ridStr)) {
        try {
          const notif = await Notification.create({
            user: ridStr,
            actor: meId,
            type: "message",
            conversation: convo._id,
            message: msg._id,
            text: "sent you a message",
            link: `/messages/${convo._id}`,
          });
          const populatedNotif = await Notification.findById(notif._id)
            .populate("actor", "username firstName lastName profileImage")
            .lean();
          io.to(ridStr).emit("notification:new", populatedNotif);
        } catch (e) {}
      }
    }

    // Notify both participants to update conversation list (last message, unread)
    convo.participants.forEach((pid) => {
      io.to(String(pid)).emit("conversation:updated", {
        conversationId: String(convo._id),
      });
    });

    res.status(201).json({ message: populatedMsg });
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const meId = req.user.id;
    const { id } = req.params; // conversationId
    const convo = await Conversation.findById(id);
    if (!convo) return res.status(404).json({ msg: "Conversation not found" });
    if (!convo.participants.some((p) => String(p) === String(meId)))
      return res.status(403).json({ msg: "Not a participant" });

    const others = convo.participants.filter((p) => String(p) !== String(meId));
    const result = await Message.updateMany(
      {
        conversation: id,
        sender: { $in: others },
        readBy: { $ne: meId },
      },
      { $addToSet: { readBy: meId } }
    );

    // Reset my unread counter
    convo.unreadCounts.set(String(meId), 0);
    await convo.save();

    const io = req.app.get("io");
    // notify others about read receipts
    others.forEach((rid) => {
      io.to(String(rid)).emit("message:read", {
        conversationId: String(convo._id),
        readerId: String(meId),
      });
      io.to(String(rid)).emit("conversation:updated", {
        conversationId: String(convo._id),
      });
    });

    // Notify the reader as well so their list/badge refresh immediately
    io.to(String(meId)).emit("conversation:updated", {
      conversationId: String(convo._id),
    });

    res.json({ success: true, updated: result.modifiedCount || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NEW: Clear conversation for me (hide everything for this user only)
exports.clearConversationForMe = async (req, res) => {
  try {
    const meId = req.user.id;
    const { id } = req.params; // conversationId

    const convo = await Conversation.findById(id);
    if (!convo) return res.status(404).json({ msg: "Conversation not found" });
    if (!convo.participants.some((p) => String(p) === String(meId))) {
      return res.status(403).json({ msg: "Not a participant" });
    }

    // Mark boundary and reset my unread
    convo.clearedAt.set(String(meId), new Date());
    convo.unreadCounts.set(String(meId), 0);
    await convo.save();

    const io = req.app.get("io");
    // Update only me (and optionally others if you want, but they don't need it)
    io.to(String(meId)).emit("conversation:updated", { conversationId: String(convo._id) });

    res.json({ success: true });
  } catch (err) {
    console.error("clearConversationForMe error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Edit message (sender only)
exports.editMessage = async (req, res) => {
  try {
    const meId = req.user.id;
    const { messageId } = req.params;
    const { text = "" } = req.body;

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ msg: "Message not found" });
    if (String(msg.sender) !== String(meId)) return res.status(403).json({ msg: "Forbidden" });
    if (msg.isDeleted) return res.status(400).json({ msg: "Cannot edit a deleted message" });

    msg.text = text;
    msg.editedAt = new Date();
    await msg.save();

    const io = req.app.get("io");
    const updated = await Message.findById(msg._id)
      .populate("sender", "username firstName lastName profileImage")
      .lean();

    const convo = await Conversation.findById(msg.conversation).select("participants");
    convo.participants.forEach((pid) => {
      io.to(String(pid)).emit("message:edited", {
        conversationId: String(msg.conversation),
        message: updated,
      });
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete for me (hide for requester only)
exports.deleteForMe = async (req, res) => {
  try {
    const meId = req.user.id;
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ msg: "Message not found" });

    if (!msg.deletedFor.map(String).includes(String(meId))) {
      msg.deletedFor.push(meId);
      await msg.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete for everyone (sender only)
exports.deleteForEveryone = async (req, res) => {
  try {
    const meId = req.user.id;
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ msg: "Message not found" });
    if (String(msg.sender) !== String(meId)) return res.status(403).json({ msg: "Forbidden" });

    // unlink local attachments
    const urls = (msg.attachments || []).map((a) => a.url).filter((u) => typeof u === "string" && u.startsWith("/uploads/"));
    if (urls.length) await unlinkFiles(urls);

    msg.isDeleted = true;
    msg.text = "";
    msg.attachments = [];
    await msg.save();

    const io = req.app.get("io");
    const convo = await Conversation.findById(msg.conversation).select("participants");
    convo.participants.forEach((pid) => {
      io.to(String(pid)).emit("message:deleted", {
        conversationId: String(msg.conversation),
        messageId: String(msg._id),
      });
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};