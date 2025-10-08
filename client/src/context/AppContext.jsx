// src/context/AppContext.jsx
import { createContext, useState, useEffect, useRef, useCallback } from "react";
import API from "../api/axios";
import { io } from "socket.io-client";
import { API_BASE } from "../utils/url";

// Use notifications API helpers
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "../api/notifications";

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [posts, setPosts] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  // Track token to reconnect socket on account switch
  const [authToken, setAuthToken] = useState(
    () => localStorage.getItem("token") || ""
  );
  useEffect(() => {
    const update = () => setAuthToken(localStorage.getItem("token") || "");
    window.addEventListener("auth:changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("auth:changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notifUnread, setNotifUnread] = useState(0);

  // Notification sound (enabled + volume)
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(() => {
    const raw = localStorage.getItem("notifSoundEnabled");
    return raw == null ? true : raw === "true";
  });
  const [notifSoundVolume, setNotifSoundVolume] = useState(() => {
    const raw = localStorage.getItem("notifSoundVolume");
    const v = raw == null ? 0.8 : Number(raw);
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8;
  });

  // Preload/prime audio
  const audioRef = useRef(null);
  useEffect(() => {
    audioRef.current = new Audio("/sounds/notification.mp3");
    audioRef.current.preload = "auto";
    audioRef.current.volume = notifSoundVolume;
  }, []);

  // Persist preferences
  useEffect(() => {
    localStorage.setItem("notifSoundEnabled", String(notifSoundEnabled));
  }, [notifSoundEnabled]);
  useEffect(() => {
    localStorage.setItem("notifSoundVolume", String(notifSoundVolume));
    if (audioRef.current) audioRef.current.volume = notifSoundVolume;
  }, [notifSoundVolume]);

  // Autoplay-friendly priming on first interaction (silent)
  useEffect(() => {
    const prime = () => {
      const a = audioRef.current;
      if (!a) return;
      const wasMuted = a.muted;
      a.muted = true;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.muted = wasMuted;
        })
        .catch(() => {
          a.muted = wasMuted;
        });
      document.removeEventListener("click", prime);
      document.removeEventListener("keydown", prime);
    };
    document.addEventListener("click", prime, { once: true });
    document.addEventListener("keydown", prime, { once: true });
    return () => {
      document.removeEventListener("click", prime);
      document.removeEventListener("keydown", prime);
    };
  }, []);

  const playNotifSound = useCallback(() => {
    if (!notifSoundEnabled) return;
    try {
      const a = new Audio("/sounds/notification.mp3");
      a.volume = notifSoundVolume;
      a.play().catch(() => {});
    } catch {}
  }, [notifSoundEnabled, notifSoundVolume]);

  const toggleNotifSound = useCallback(
    () => setNotifSoundEnabled((s) => !s),
    []
  );

  const normalizeIds = (arr = []) => arr.map((f) => (f?._id ? f._id : f));

  // HARD RESET state on account switch
  useEffect(() => {
    setPosts([]);
    setDrafts([]);
    setUsers({});
    setNotifications([]);
    setNotifUnread(0);
  }, [authToken]);

  // Socket connect/disconnect on token changes
  useEffect(() => {
    if (!authToken) {
      if (socket) {
        try {
          socket.removeAllListeners();
          socket.disconnect();
        } catch {}
      }
      setSocket(null);
      return;
    }

    const newSocket = io(API_BASE, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token: authToken },
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      timeout: 15000,
    });

    newSocket.on("connect", () => {
      // Connected, no log
    });

    newSocket.on("connect_error", (err) =>
      console.error("❌ Socket connect error:", err?.message || err)
    );
    newSocket.on("disconnect", (reason) =>
      console.warn("⚠ Socket disconnected:", reason)
    );

    setSocket(newSocket);

    return () => {
      try {
        newSocket.removeAllListeners();
        newSocket.disconnect();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const res = await API.get("/posts");
      setPosts(res.data);
    } catch (err) {
      console.error("Load posts error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetchNotifications(50);
      const list = res.data.notifications || [];
      setNotifications(list);
      setNotifUnread(
        typeof res.data.unread === "number"
          ? res.data.unread
          : list.filter((n) => !n.read).length
      );
    } catch (e) {
      console.error("Load notifications error:", e);
    }
  };

  const markNotifRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id
            ? { ...n, read: true, readAt: new Date().toISOString() }
            : n
        )
      );
      setNotifUnread((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error("markNotifRead error:", e);
    }
  };

  const markAllNotifsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
          readAt: new Date().toISOString(),
        }))
      );
      setNotifUnread(0);
    } catch (e) {
      console.error("markAllNotifsRead error:", e);
    }
  };

  const deleteNotif = async (id) => {
    try {
      const n = notifications.find((x) => x._id === id);
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((x) => x._id !== id));
      if (n && !n.read) setNotifUnread((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error("deleteNotif error:", e);
    }
  };

  const clearAllNotifs = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setNotifUnread(0);
    } catch (e) {
      console.error("clearAllNotifs error:", e);
    }
  };

  const updateFollow = (userId, currentUserId, follow) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (!p.user || p.user._id !== userId) return p;
        const followers = normalizeIds(p.user.followers);
        return {
          ...p,
          user: {
            ...p.user,
            followers: follow
              ? [...new Set([...followers, currentUserId])]
              : followers.filter((f) => f !== currentUserId),
          },
        };
      })
    );

    setUsers((prev) => {
      const targetUser = prev[userId];
      const currentUser = prev[currentUserId];
      if (!targetUser) return prev;

      const updatedFollowers = follow
        ? [...new Set([...normalizeIds(targetUser.followers), currentUserId])]
        : normalizeIds(targetUser.followers).filter((f) => f !== currentUserId);

      let updatedCurrentUser = currentUser;
      if (currentUser) {
        const updatedFollowing = follow
          ? [...new Set([...normalizeIds(currentUser.following), userId])]
          : normalizeIds(currentUser.following).filter((f) => f !== userId);

        updatedCurrentUser = { ...currentUser, following: updatedFollowing };
      }

      return {
        ...prev,
        [userId]: { ...targetUser, followers: updatedFollowers },
        ...(updatedCurrentUser && { [currentUserId]: updatedCurrentUser }),
      };
    });
  };

  // Bind socket listeners and load data AFTER socket is connected
  useEffect(() => {
    if (!socket) return;

    // Ensure loads happen only when connected to the new account
    const runInitialLoads = () => {
      loadPosts();
      loadNotifications();
    };
    if (socket.connected) {
      runInitialLoads();
    } else {
      socket.once("connect", runInitialLoads);
    }

    const handleNewPost = (post) => setPosts((prev) => [post, ...prev]);

    const handleUpdateLike = ({ postId, likes }) =>
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, likes } : p))
      );

    const handleNewComment = ({ postId, comment }) =>
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                comments: [
                  ...(p.comments || []).filter((c) => c._id !== comment._id),
                  comment,
                ],
              }
            : p
        )
      );

    const handleDeletePost = (postId) =>
      setPosts((prev) => prev.filter((p) => p._id !== postId));

    const handleFollowUpdate = ({ userId, currentUserId, follow }) =>
      updateFollow(userId, currentUserId, follow);

    const handleEnhancedProfileUpdate = (payload) => {
      const currentUserId = JSON.parse(
        localStorage.getItem("user") || "{}"
      )?.id;
      const raw = payload?.updatedUser || payload;
      if (!raw) return;
      const updatedUser = { ...raw, _id: raw._id || raw.id };
      if (!updatedUser._id) return;
      if (String(updatedUser._id) === String(currentUserId)) return;

      setUsers((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));
      setPosts((prev) =>
        prev.map((p) =>
          p.user?._id === updatedUser._id ? { ...p, user: updatedUser } : p
        )
      );
    };

    const handleUserDeleted = (deletedUserId) => {
      setUsers((prev) => {
        const copy = { ...prev };
        if (copy[deletedUserId]) delete copy[deletedUserId];
        return copy;
      });

      setPosts((prev) =>
        prev
          .filter(
            (p) => String(p.user?._id || p.user) !== String(deletedUserId)
          )
          .map((p) => {
            const comments = Array.isArray(p.comments)
              ? p.comments.map((c) => {
                  const replies = Array.isArray(c.replies)
                    ? c.replies.filter(
                        (r) =>
                          String(r.user?._id || r.user) !==
                          String(deletedUserId)
                      )
                    : [];
                  return { ...c, replies };
                })
              : [];
            return { ...p, comments };
          })
      );
    };

    const handleNewNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 100));
      setNotifUnread((c) => c + 1);
      playNotifSound();
    };

    const handleStatusUpdate = ({ userId, status }) => {
      setUsers((prev) => {
        const u = prev[userId] || { _id: userId };
        const next = { ...prev, [userId]: { ...u, status: status || null } };
        return next;
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.user && String(p.user._id) === String(userId)
            ? { ...p, user: { ...p.user, status: status || null } }
            : p
        )
      );
    };

    const handleNewReply = ({ postId, commentId, reply }) => {
      setPosts((prev) =>
        prev.map((p) =>
          String(p._id) === String(postId)
            ? {
                ...p,
                comments: (p.comments || []).map((c) =>
                  String(c._id) === String(commentId)
                    ? {
                        ...c,
                        replies: [
                          ...(Array.isArray(c.replies) ? c.replies : []).filter(
                            (r) => String(r._id) !== String(reply._id)
                          ),
                          reply,
                        ],
                      }
                    : c
                ),
              }
            : p
        )
      );
    };

    const handleUpdateReplyReaction = ({ postId, commentId, reply }) => {
      setPosts((prev) =>
        prev.map((p) =>
          String(p._id) === String(postId)
            ? {
                ...p,
                comments: (p.comments || []).map((c) =>
                  String(c._id) === String(commentId)
                    ? {
                        ...c,
                        replies: (Array.isArray(c.replies)
                          ? c.replies
                          : []
                        ).map((r) =>
                          String(r._id) === String(reply._id) ? reply : r
                        ),
                      }
                    : c
                ),
              }
            : p
        )
      );
    };

    // Bind all listeners
    socket.on("newPost", handleNewPost);
    socket.on("updateLike", handleUpdateLike);
    socket.on("newComment", handleNewComment);
    socket.on("deletePost", handleDeletePost);
    socket.on("updateFollow", handleFollowUpdate);
    socket.on("updateEnhancedProfile", handleEnhancedProfileUpdate);
    socket.on("userDeleted", handleUserDeleted);
    socket.on("notification:new", handleNewNotification);
    socket.on("status:update", handleStatusUpdate);
    socket.on("newReply", handleNewReply);
    socket.on("updateReplyReaction", handleUpdateReplyReaction);

    return () => {
      try {
        socket.off("newPost", handleNewPost);
        socket.off("updateLike", handleUpdateLike);
        socket.off("newComment", handleNewComment);
        socket.off("deletePost", handleDeletePost);
        socket.off("updateFollow", handleFollowUpdate);
        socket.off("updateEnhancedProfile", handleEnhancedProfileUpdate);
        socket.off("userDeleted", handleUserDeleted);
        socket.off("notification:new", handleNewNotification);
        socket.off("status:update", handleStatusUpdate);
        socket.off("newReply", handleNewReply);
        socket.off("updateReplyReaction", handleUpdateReplyReaction);
        socket.off("connect", runInitialLoads);
      } catch {}
    };
  }, [socket, playNotifSound]);

  return (
    <AppContext.Provider
      value={{
        posts,
        setPosts,
        users,
        setUsers,
        loading,
        loadPosts,
        drafts,
        setDrafts,
        updateFollow,
        socket,

        // Notifications
        notifications,
        notifUnread,
        loadNotifications,
        markNotifRead,
        markAllNotifsRead,
        deleteNotif,
        clearAllNotifs,

        // Notification sound controls
        notifSoundEnabled,
        notifSoundVolume,
        toggleNotifSound,
        setNotifSoundVolume,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
