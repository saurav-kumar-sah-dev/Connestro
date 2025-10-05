// src/context/ChatContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import {
  fetchConversations,
  fetchMessages,
  getOrCreateConversationWithUser,
  sendMessageApi,
  editMessageApi,
  deleteForMeApi,
  deleteForEveryoneApi,
  markReadApi,
  clearConversationApi, // <-- added
} from "../api/messages";

export const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { socket } = useContext(AppContext);
  const me = JSON.parse(localStorage.getItem("user") || "{}");

  const [conversations, setConversations] = useState([]);
  const [messagesByConv, setMessagesByConv] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [typingMap, setTypingMap] = useState({});
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [onlineIds, setOnlineIds] = useState(new Set());

  // Calls
  const [call, setCall] = useState(null);

  // Pending caches to avoid race between socket events and HTTP responses
  const [pendingDelivered, setPendingDelivered] = useState({}); // { [conversationId]: { [messageId]: true } }
  const [pendingReadConvs, setPendingReadConvs] = useState(new Set()); // Set of conversationId

  // NEW: Reset all state on account switch
  useEffect(() => {
    const reset = () => {
      setConversations([]);
      setMessagesByConv({});
      setSelectedId(null);
      setTypingMap({});
      setOnlineIds(new Set());
      setCall(null);
      setPendingDelivered({});
      setPendingReadConvs(new Set());
    };
    window.addEventListener("auth:changed", reset);
    return () => window.removeEventListener("auth:changed", reset);
  }, []);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread || 0), 0),
    [conversations]
  );

  const loadConversations = useCallback(async () => {
    setLoadingConvos(true);
    try {
      const res = await fetchConversations();
      const convos = res.data.conversations || [];
      const onlineSet = onlineIds;
      setConversations(
        convos.map((c) => {
          const otherId = c.other?._id ? String(c.other._id) : null;
          return { ...c, otherOnline: otherId ? onlineSet.has(otherId) : false };
        })
      );
    } catch (e) {
      console.error("loadConversations error:", e);
    } finally {
      setLoadingConvos(false);
    }
  }, [onlineIds]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Presence
  useEffect(() => {
    if (!socket) return;

    const handleInitial = (list) => {
      const set = new Set((list || []).map(String));
      setOnlineIds(set);
      setConversations((prev) =>
        prev.map((c) => {
          const otherId = c.other?._id ? String(c.other._id) : null;
          return { ...c, otherOnline: otherId ? set.has(otherId) : false };
        })
      );
    };

    const handlePresenceUpdate = ({ userId, online }) => {
      setOnlineIds((prev) => {
        const next = new Set([...prev]);
        if (online) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.other && String(c.other._id) === String(userId) ? { ...c, otherOnline: !!online } : c
        )
      );
    };

    socket.on("presence:onlineUsers", handleInitial);
    socket.on("presence:update", handlePresenceUpdate);

    return () => {
      socket.off("presence:onlineUsers", handleInitial);
      socket.off("presence:update", handlePresenceUpdate);
    };
  }, [socket]);

  // Apply pending delivery/read flags to a list
  const applyPendingToList = useCallback(
    (conversationId, list) => {
      const pDel = pendingDelivered[conversationId] || {};
      const isReadConv = pendingReadConvs.has(conversationId);

      return (list || []).map((m) => {
        const mine = String(m.sender?._id || m.sender) === String(me.id);
        return {
          ...m,
          _localDelivered: m._localDelivered || !!pDel[String(m._id)],
          _localRead: m._localRead || (isReadConv && mine),
        };
      });
    },
    [pendingDelivered, pendingReadConvs, me.id]
  );

  // Join/leave conversation + mark read
  const openConversation = useCallback(
    async (conversationId) => {
      setSelectedId(conversationId);
      if (socket) socket.emit("conversation:open", { conversationId });

      // Optimistically clear unread immediately (so navbar badge updates now)
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, unread: 0 } : c))
      );

      // load messages if not loaded
      if (!messagesByConv[conversationId]) {
        try {
          const res = await fetchMessages(conversationId);
          const msgs = res.data.messages || [];
          setMessagesByConv((prev) => ({
            ...prev,
            [conversationId]: applyPendingToList(conversationId, msgs),
          }));
        } catch (e) {
          console.error(e);
        }
      } else {
        // re-apply pending flags (in case events landed before open)
        setMessagesByConv((prev) => ({
          ...prev,
          [conversationId]: applyPendingToList(conversationId, prev[conversationId]),
        }));
      }

      // Confirm with server
      try {
        await markReadApi(conversationId);
        // no-op; already cleared optimistically
      } catch (e) {
        console.warn("markRead failed", e);
      }
    },
    [messagesByConv, socket, applyPendingToList]
  );

  const closeConversation = useCallback(
    (conversationId) => {
      if (socket) socket.emit("conversation:close", { conversationId });
      if (selectedId === conversationId) setSelectedId(null);
    },
    [socket, selectedId]
  );

  const ensureConversationWithUser = useCallback(async (userId) => {
    const res = await getOrCreateConversationWithUser(userId);
    const convo = res.data.conversation;
    setConversations((prev) => {
      const exists = prev.find((c) => c._id === convo._id);
      if (exists) return prev.map((c) => (c._id === convo._id ? { ...c, ...convo } : c));
      return [convo, ...prev];
    });
    return convo._id;
  }, []);

  const openConversationWithUser = useCallback(
    async (userId, navigate) => {
      try {
        const id = await ensureConversationWithUser(userId);
        if (navigate) navigate(`/messages/${id}`);
        await openConversation(id);
      } catch (e) {
        console.error("openConversationWithUser error:", e);
      }
    },
    [ensureConversationWithUser, openConversation]
  );

  const sendMessage = useCallback(
    async (conversationId, { text, files }) => {
      const res = await sendMessageApi(conversationId, { text, files });
      const msg = res.data.message;
      setMessagesByConv((prev) => {
        const list = prev[conversationId] || [];
        const nextList = [...list, msg];
        const patched = applyPendingToList(conversationId, nextList);
        return { ...prev, [conversationId]: patched };
      });
    },
    [applyPendingToList]
  );

  const editMessage = useCallback(async (messageId, text) => {
    await editMessageApi(messageId, text);
  }, []);

  const deleteForMe = useCallback(async (messageId, conversationId) => {
    await deleteForMeApi(messageId);
    setMessagesByConv((prev) => {
      const list = (prev[conversationId] || []).filter((m) => m._id !== messageId);
      return { ...prev, [conversationId]: list };
    });
  }, []);

  const deleteForEveryone = useCallback(async (messageId) => {
    await deleteForEveryoneApi(messageId);
  }, []);

  // NEW: Clear conversation (for me)
  const clearConversation = useCallback(async (conversationId) => {
    await clearConversationApi(conversationId);
    // wipe local list
    setMessagesByConv((prev) => ({ ...prev, [conversationId]: [] }));
    // hide lastMessage + reset unread for this convo
    setConversations((prev) =>
      prev.map((c) =>
        c._id === conversationId ? { ...c, lastMessage: null, unread: 0 } : c
      )
    );
  }, []);

  // Calls
  const startCall = useCallback(
    (conversationId, toUserId, media = "audio") => {
      if (!socket) return;
      setCall({ role: "caller", state: "calling", conversationId, peerId: String(toUserId), media });
      socket.emit("call:invite", { toUserId, conversationId, media });
    },
    [socket]
  );

  const acceptCall = useCallback(() => {
    if (!call || !socket) return;
    socket.emit("call:answer", { toUserId: call.peerId, conversationId: call.conversationId, accept: true });
    setCall((prev) => (prev ? { ...prev, state: "accepted" } : prev));
  }, [call, socket]);

  const declineCall = useCallback(() => {
    if (!call || !socket) return;
    socket.emit("call:answer", { toUserId: call.peerId, conversationId: call.conversationId, accept: false });
    setCall(null);
  }, [call, socket]);

  const endCall = useCallback(() => {
    if (!call || !socket) return;
    socket.emit("call:end", { toUserId: call.peerId, conversationId: call.conversationId });
    setCall(null);
  }, [call, socket]);

  // Call signaling events
  useEffect(() => {
    if (!socket) return;

    const onInvite = ({ fromUserId, conversationId, media }) => {
      setCall({ role: "callee", state: "ringing", conversationId, peerId: String(fromUserId), media });
    };
    const onAnswer = ({ fromUserId, conversationId, accept }) => {
      setCall((prev) => {
        if (!prev || prev.role !== "caller" || prev.conversationId !== conversationId) return prev;
        if (!accept) return null;
        return { ...prev, state: "accepted" };
      });
    };
    const onEnd = ({ fromUserId, conversationId }) => {
      setCall((prev) => {
        if (!prev) return prev;
        if (prev.conversationId !== conversationId || String(prev.peerId) !== String(fromUserId)) return prev;
        return null;
      });
    };

    socket.on("call:invite", onInvite);
    socket.on("call:answer", onAnswer);
    socket.on("call:end", onEnd);

    return () => {
      socket.off("call:invite", onInvite);
      socket.off("call:answer", onAnswer);
      socket.off("call:end", onEnd);
    };
  }, [socket]);

  // Socket events for messages
  useEffect(() => {
    if (!socket) return;

    const onNew = ({ conversationId, message }) => {
      // Add to message list
      setMessagesByConv((prev) => {
        const list = prev[conversationId] || [];
        return { ...prev, [conversationId]: [...list, message] };
      });

      // Update conv list unread + lastMessage
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? {
                ...c,
                unread: selectedId === conversationId ? 0 : (c.unread || 0) + 1,
                lastMessage: message,
              }
            : c
        )
      );

      // If I'm currently viewing this conversation and it's from the other user,
      // immediately mark as read on server so Navbar/Sidebar don't show unread.
      const fromOther = String(message.sender?._id || message.sender) !== String(me.id);
      if (selectedId === conversationId && fromOther) {
        markReadApi(conversationId).catch(() => {});
      }
    };

    const onDelivered = ({ conversationId, messageIds }) => {
      setMessagesByConv((prev) => {
        const list = prev[conversationId];
        if (!list || list.length === 0) return prev;
        const setIds = new Set((messageIds || []).map(String));
        return {
          ...prev,
          [conversationId]: list.map((m) =>
            setIds.has(String(m._id)) ? { ...m, _localDelivered: true } : m
          ),
        };
      });
      setPendingDelivered((prev) => {
        const next = { ...prev };
        const curr = next[conversationId] ? { ...next[conversationId] } : {};
        for (const id of messageIds || []) curr[String(id)] = true;
        next[conversationId] = curr;
        return next;
      });
    };

    const onRead = ({ conversationId }) => {
      setMessagesByConv((prev) => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.map((m) =>
            String(m.sender?._id || m.sender) === String(me.id)
              ? { ...m, _localRead: true }
              : m
          ),
        };
      });
      setPendingReadConvs((prev) => {
        const next = new Set(prev);
        next.add(conversationId);
        return next;
      });
    };

    const onUpdated = () => {
      loadConversations();
    };

    const onTyping = ({ conversationId, userId, isTyping }) => {
      setTypingMap((prev) => ({
        ...prev,
        [conversationId]: !!isTyping && String(userId) !== String(me.id),
      }));
      if (isTyping) {
        setTimeout(() => {
          setTypingMap((prev) => ({ ...prev, [conversationId]: false }));
        }, 2000);
      }
    };

    const onEdited = ({ conversationId, message }) => {
      setMessagesByConv((prev) => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.map((m) => (m._id === message._id ? message : m)),
        };
      });
    };

    const onDeleted = ({ conversationId, messageId }) => {
      setMessagesByConv((prev) => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.map((m) =>
            m._id === messageId ? { ...m, isDeleted: true, text: "", attachments: [] } : m
          ),
        };
      });
    };

    socket.on("message:new", onNew);
    socket.on("message:delivered", onDelivered);
    socket.on("message:read", onRead);
    socket.on("conversation:updated", onUpdated);
    socket.on("typing", onTyping);
    socket.on("message:edited", onEdited);
    socket.on("message:deleted", onDeleted);

    return () => {
      socket.off("message:new", onNew);
      socket.off("message:delivered", onDelivered);
      socket.off("message:read", onRead);
      socket.off("conversation:updated", onUpdated);
      socket.off("typing", onTyping);
      socket.off("message:edited", onEdited);
      socket.off("message:deleted", onDeleted);
    };
  }, [socket, me.id, loadConversations, selectedId]);

  const value = {
    conversations,
    loadingConvos,
    messagesByConv,
    typingMap,
    unreadTotal,
    onlineIds,

    openConversation,
    closeConversation,
    openConversationWithUser,
    ensureConversationWithUser,

    sendMessage,
    editMessage,
    deleteForMe,
    deleteForEveryone,
    clearConversation, // <-- export it

    // Calls
    call,
    setCall,
    startCall,
    acceptCall,
    declineCall,
    endCall,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}