// server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
const Notification = require("./models/Notification");
const { UPLOADS_DIR, ensureUploadDirs } = require("./lib/uploads");

const app = express();

// CORS Setup 
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://connestro.vercel.app", 
];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Static uploads
ensureUploadDirs();
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    etag: true,
    maxAge: "7d",
    index: false,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "public, max-age=604800, must-revalidate");
    },
  })
);

//  Routes 
app.use("/api/auth", require("./routes/auth"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/stories", require("./routes/stories"));
app.use("/api/reels", require("./routes/reels"));

// Multer-friendly error handler (after routes)
const multer = require("multer");
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message }); // e.g., LIMIT_FILE_SIZE
  }
  if (err && /Invalid (image|media|attachment|type)/i.test(err.message)) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

//  HTTP + Socket.IO 
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  },
});


app.set("io", io);

// Presence store
const onlineUsers = new Map();
app.set("onlineUsers", onlineUsers);


const activeCalls = new Map();


const RING_TIMEOUT_MS = Number(process.env.CALL_RING_TIMEOUT_MS || 30000);

// Socket.IO Middleware for JWT authentication 
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error("Unauthorized"));
      socket.userId = String(decoded.id);
      next();
    });
  } catch (err) {
    next(new Error("Socket auth error"));
  }
});

// Helpers
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");

async function createCallLog({
  conversationId,
  initiator,
  recipient,
  media,
  startedAt,
  endedAt,
  status,
}) {
  try {
    const durationSec =
      startedAt && endedAt
        ? Math.max(
            0,
            Math.round((new Date(endedAt) - new Date(startedAt)) / 1000)
          )
        : 0;

    const msg = await Message.create({
      conversation: conversationId,
      sender: initiator,
      kind: "call",
      callInfo: {
        type: media,
        status,
        initiator,
        recipient,
        startedAt: startedAt || null,
        endedAt: endedAt || new Date(),
        durationSec,
      },
      text: "",
      attachments: [],
      deliveredTo: [],
      readBy: [],
    });

    const convo = await Conversation.findById(conversationId);
    if (convo) {
      convo.lastMessage = msg._id;
      await convo.save();
      const populated = await Message.findById(msg._id)
        .populate("sender", "username firstName lastName profileImage")
        .lean();
      convo.participants.forEach((pid) => {
        io.to(String(pid)).emit("message:new", {
          conversationId: String(convo._id),
          message: populated,
        });
        io.to(String(pid)).emit("conversation:updated", {
          conversationId: String(convo._id),
        });
      });
    }

    try {
      let notifUser = null;
      let actor = null;
      if (status === "missed") {
        notifUser = recipient;
        actor = initiator;
      } else if (status === "declined") {
        notifUser = initiator;
        actor = recipient;
      }

      if (notifUser && actor) {
        const notif = await Notification.create({
          user: notifUser,
          actor,
          type: "call",
          conversation: conversationId,
          text:
            status === "missed"
              ? `Missed ${media} call`
              : `Declined ${media} call`,
          link: `/messages/${conversationId}`,
        });
        const populatedNotif = await Notification.findById(notif._id)
          .populate("actor", "username firstName lastName profileImage")
          .lean();
        io.to(String(notifUser)).emit("notification:new", populatedNotif);
      }
    } catch (e) {
      console.warn("call notification error:", e.message);
    }
  } catch (e) {
    console.error("createCallLog error:", e);
  }
}

async function markUndeliveredForUser(userId) {
  try {
    const DAYS = 30;
    const LIMIT = 2000;
    const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

    const convos = await Conversation.find({ participants: userId })
      .select("_id")
      .lean();
    if (!convos.length) return;
    const convoIds = convos.map((c) => c._id);

    const undelivered = await Message.find({
      conversation: { $in: convoIds },
      sender: { $ne: userId },
      deliveredTo: { $ne: userId },
      createdAt: { $gte: cutoff },
    })
      .sort({ createdAt: 1 })
      .limit(LIMIT)
      .select("_id conversation sender")
      .lean();

    if (!undelivered.length) return;

    const ids = undelivered.map((m) => m._id);
    await Message.updateMany(
      { _id: { $in: ids } },
      { $addToSet: { deliveredTo: userId } }
    );

    const byConvSender = new Map();
    for (const m of undelivered) {
      const key = `${String(m.sender)}|${String(m.conversation)}`;
      if (!byConvSender.has(key)) byConvSender.set(key, []);
      byConvSender.get(key).push(String(m._id));
    }

    for (const [key, messageIds] of byConvSender.entries()) {
      const [senderId, conversationId] = key.split("|");
      if (onlineUsers.get(String(senderId))) {
        io.to(String(senderId)).emit("message:delivered", {
          conversationId: String(conversationId),
          messageIds,
        });
      }
    }
  } catch (e) {
    console.error("markUndeliveredForUser error:", e);
  }
}

io.on("connection", async (socket) => {
  const userId = socket.userId;
  socket.join(userId);

  // mark online
  const rec = onlineUsers.get(userId) || { sockets: new Set(), lastSeen: new Date() };
  rec.sockets.add(socket.id);
  onlineUsers.set(userId, rec);

  // send initial presence to this user
  socket.emit("presence:onlineUsers", Array.from(onlineUsers.keys()));
  // broadcast presence update
  socket.broadcast.emit("presence:update", { userId, online: true });

  console.log(`⚡ User connected: ${userId} (socket ${socket.id})`);

  // Delivered-on-connect
  markUndeliveredForUser(userId);

  // Open conversation room and mark deliveries
  socket.on("conversation:open", async ({ conversationId }) => {
    try {
      socket.join(`conversation:${conversationId}`);

      const convo = await Conversation.findById(conversationId).select("participants");
      if (!convo) return;

      const others = convo.participants.filter((p) => String(p) !== String(userId));

      const undelivered = await Message.find({
        conversation: conversationId,
        sender: { $in: others },
        deliveredTo: { $ne: userId },
      }).select("_id");

      if (undelivered.length) {
        await Message.updateMany(
          { _id: { $in: undelivered.map((m) => m._id) } },
          { $addToSet: { deliveredTo: userId } }
        );
        // notify sender(s)
        others.forEach((rid) => {
          io.to(String(rid)).emit("message:delivered", {
            conversationId,
            messageIds: undelivered.map((m) => String(m._id)),
          });
        });
      }
    } catch (e) {
      console.error("conversation:open error", e.message);
    }
  });

  socket.on("conversation:close", ({ conversationId }) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on("typing", ({ conversationId, isTyping }) => {
    socket.to(`conversation:${conversationId}`).emit("typing", { conversationId, userId, isTyping: !!isTyping });
  });
  socket.on("call:invite", async (payload) => {
     const { toUserId, conversationId, media } = payload || {};
     try {
       const convo = await Conversation.findById(conversationId).select("participants");
       if (!convo) return;
       const participants = (convo.participants || []).map((p) => String(p));
       if (!participants.includes(String(userId)) || !participants.includes(String(toUserId))) return;
 
       const sessKey = String(conversationId);
       // If any existing session for same conversation, end it
       const existing = activeCalls.get(sessKey);
       if (existing && existing.timer) {
         clearTimeout(existing.timer);
       }
 
       // store session with ring timeout
       const session = {
         caller: String(userId),
         callee: String(toUserId),
         media: media === "video" ? "video" : "audio",
         startedAt: null,
         accepted: false,
         timer: setTimeout(async () => {
           // No answer within timeout => missed
           const s = activeCalls.get(sessKey);
           if (!s || s.accepted) return;
           await createCallLog({
             conversationId,
             initiator: s.caller,
             recipient: s.callee,
             media: s.media,
             startedAt: null,
             endedAt: new Date(),
             status: "missed",
           });
           activeCalls.delete(sessKey);
           // notify both ends
           io.to(String(s.caller)).emit("call:end", { fromUserId: s.callee, conversationId });
           io.to(String(s.callee)).emit("call:end", { fromUserId: s.caller, conversationId });
         }, RING_TIMEOUT_MS),
       };
 
       activeCalls.set(sessKey, session);
 
       // notify callee
       io.to(String(toUserId)).emit("call:invite", {
         fromUserId: userId,
         conversationId,
         media: media === "video" ? "video" : "audio",
       });
     } catch (e) {
       console.error("call:invite error:", e);
     }
   });

  socket.on("call:answer", async (payload) => {
    const { toUserId, conversationId, accept } = payload || {};
    try {
      const sessKey = String(conversationId);
      const sess = activeCalls.get(sessKey);
      if (!sess) return;

      if (accept) {
        sess.accepted = true;
        sess.startedAt = new Date();
        if (sess.timer) {
          clearTimeout(sess.timer);
          sess.timer = null;
        }
        activeCalls.set(sessKey, sess);
      } else {
        // declined -> log and cleanup
        if (sess.timer) {
          clearTimeout(sess.timer);
          sess.timer = null;
        }
        await createCallLog({
          conversationId,
          initiator: sess.caller,
          recipient: sess.callee,
          media: sess.media,
          startedAt: null,
          endedAt: new Date(),
          status: "declined",
        });
        activeCalls.delete(sessKey);
      }

      io.to(String(toUserId)).emit("call:answer", {
        fromUserId: userId,
        conversationId,
        accept: !!accept,
      });

      // If declined, also ensure both peers get call:end
      if (!accept) {
        io.to(String(sess.caller)).emit("call:end", { fromUserId: sess.callee, conversationId });
        io.to(String(sess.callee)).emit("call:end", { fromUserId: sess.caller, conversationId });
      }
    } catch (e) {
      console.error("call:answer error:", e);
    }
  });

  socket.on("call:signal", (payload) => {
    const { toUserId, data } = payload || {};
    io.to(String(toUserId)).emit("call:signal", { fromUserId: userId, data });
  });

  socket.on("call:end", async (payload) => {
    const { toUserId, conversationId } = payload || {};
    try {
      const sessKey = String(conversationId);
      const sess = activeCalls.get(sessKey);
      if (sess) {
        if (sess.timer) {
          clearTimeout(sess.timer);
          sess.timer = null;
        }
        if (sess.accepted && sess.startedAt) {
          await createCallLog({
            conversationId,
            initiator: sess.caller,
            recipient: sess.callee,
            media: sess.media,
            startedAt: sess.startedAt,
            endedAt: new Date(),
            status: "ended",
          });
        } else {
          await createCallLog({
            conversationId,
            initiator: sess.caller,
            recipient: sess.callee,
            media: sess.media,
            startedAt: null,
            endedAt: new Date(),
            status: "missed",
          });
        }
        activeCalls.delete(sessKey);
      }

      // notify peer
      io.to(String(toUserId)).emit("call:end", { fromUserId: userId, conversationId });
    } catch (e) {
      console.error("call:end error:", e);
    }
  });

   socket.on("disconnect", async () => {
    // mark offline if last socket
    const rec = onlineUsers.get(userId);
    if (rec) {
      rec.sockets.delete(socket.id);
      if (rec.sockets.size === 0) {
        rec.lastSeen = new Date();
        onlineUsers.delete(userId);
        socket.broadcast.emit("presence:update", { userId, online: false, lastSeen: rec.lastSeen });
      } else {
        onlineUsers.set(userId, rec);
      }
    }

    // Clean any active call sessions this user was part of
    try {
      for (const [cid, sess] of activeCalls.entries()) {
        if (sess.caller === userId || sess.callee === userId) {
          if (sess.timer) {
            clearTimeout(sess.timer);
            sess.timer = null;
          }
          const other = sess.caller === userId ? sess.callee : sess.caller;
          await createCallLog({
            conversationId: cid,
            initiator: sess.caller,
            recipient: sess.callee,
            media: sess.media,
            startedAt: sess.startedAt,
            endedAt: new Date(),
            status: sess.accepted ? "ended" : "missed",
          });
          activeCalls.delete(cid);
          io.to(String(other)).emit("call:end", { fromUserId: userId, conversationId: cid });
        }
      }
    } catch (e) {
      console.error("disconnect cleanup error:", e);
    }

    console.log(`User disconnected: ${userId}`);
  });
});

// MongoDB Connection & Server Start 
const start = async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  }
};

start();
