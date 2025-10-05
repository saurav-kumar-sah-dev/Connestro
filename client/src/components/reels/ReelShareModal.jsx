// src/components/reels/ReelShareModal.jsx
import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatContext } from "../../context/ChatContext";
import API from "../../api/axios";
import { buildFileUrl } from "../../utils/url";
import { checkReelAccess } from "../../api/reels";
import { useTheme } from "../../context/ThemeContext";
import clsx from "clsx";

export default function ReelShareModal({ open, onClose, reel }) {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const { conversations, ensureConversationWithUser, sendMessage } =
    useContext(ChatContext);

  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sending, setSending] = useState({});
  const [sentTo, setSentTo] = useState({});
  const [accessMap, setAccessMap] = useState({});

  const link = useMemo(
    () => (reel?._id ? `${window.location.origin}/reels/${reel._id}` : ""),
    [reel?._id]
  );

  const suggestions = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const c of conversations || []) {
      const o = c.other;
      if (!o || !o._id) continue;
      const id = String(o._id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push(o);
      if (out.length >= 15) break;
    }
    return out;
  }, [conversations]);

  // search users
  useEffect(() => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoadingSearch(true);
        const res = await API.get(`/users/search?query=${encodeURIComponent(q)}`);
        if (active) setSearchResults(res.data.users || []);
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setLoadingSearch(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [q]);

  // check access
  useEffect(() => {
    if (!open || !reel?._id) {
      setAccessMap({});
      return;
    }
    const list = q.trim() ? searchResults : suggestions;
    const ids = (list || []).map((u) => String(u._id));
    if (!ids.length) {
      setAccessMap({});
      return;
    }
    let canceled = false;
    (async () => {
      try {
        const res = await checkReelAccess(reel._id, ids);
        if (!canceled) setAccessMap(res.data?.map || {});
      } catch {
        if (!canceled) setAccessMap({});
      }
    })();
    return () => {
      canceled = true;
    };
  }, [open, reel?._id, q, searchResults, suggestions]);

  const canUserView = (uid) => {
    const restricted = reel?.visibility === "followers" || !!reel?.draft;
    if (!restricted) return true;
    return Object.prototype.hasOwnProperty.call(accessMap, uid)
      ? !!accessMap[uid]
      : true;
  };
  const showAccessHint = (uid) => {
    const restricted = reel?.visibility === "followers" || !!reel?.draft;
    return restricted && !canUserView(uid);
  };

  const doSend = async (user) => {
    const uid = String(user._id);
    if (sending[uid]) return;
    if (!canUserView(uid)) return;

    setSending((p) => ({ ...p, [uid]: true }));
    try {
      const convoId = await ensureConversationWithUser(uid);
      const text = `${note.trim() ? note.trim() + "\n" : ""}${link}`;
      await sendMessage(convoId, { text, files: [] });
      setSentTo((p) => ({ ...p, [uid]: true }));
    } catch (e) {
      console.error("share reel send failed", e);
      alert("Failed to send. Please try again.");
    } finally {
      setSending((p) => ({ ...p, [uid]: false }));
    }
  };

  if (!open || !reel) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl p-5 transition-colors",
          darkMode
            ? "bg-gray-900 text-gray-100 border border-gray-800 shadow-2xl"
            : "bg-white text-gray-900 border border-gray-200 shadow-lg"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            className={clsx(
              "text-lg font-semibold",
              darkMode ? "text-blue-300" : "text-blue-700"
            )}
          >
            Share Reel
          </h2>
          <button
            onClick={onClose}
            className={clsx(
              "px-2 py-1 rounded transition-colors",
              darkMode
                ? "hover:bg-gray-800 text-gray-300"
                : "hover:bg-gray-100 text-gray-600"
            )}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Reel preview */}
        <div className="flex items-center gap-3 mb-3">
          <video
            src={buildFileUrl(reel.url)}
            className="w-24 h-36 bg-black rounded object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {reel.caption || "Reel"}
            </div>
            <div
              className={clsx(
                "text-xs break-all",
                darkMode ? "text-gray-400" : "text-gray-500"
              )}
            >
              {link}
            </div>
            {reel.visibility === "followers" && (
              <div
                className={clsx(
                  "mt-1 text-xs",
                  darkMode ? "text-amber-400" : "text-amber-600"
                )}
              >
                Followers‑only reel. Some recipients may not have access.
              </div>
            )}
            {reel.draft && (
              <div
                className={clsx(
                  "mt-1 text-xs",
                  darkMode ? "text-red-400" : "text-red-600"
                )}
              >
                Draft reel. Only you can view it.
              </div>
            )}
          </div>
        </div>

        {/* Optional note */}
        <div className="mb-4">
          <label
            className={clsx(
              "text-sm font-medium block mb-1",
              darkMode ? "text-gray-300" : "text-gray-700"
            )}
          >
            Add a note (optional)
          </label>
          <textarea
            className={clsx(
              "w-full rounded-md px-3 py-2 text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 focus:ring-blue-400"
            )}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Say something about this reel..."
          />
        </div>

        {/* Search users */}
        <div className="mb-3">
          <input
            className={clsx(
              "w-full rounded-md px-3 py-2 text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-blue-400"
            )}
            placeholder="Search users to send to..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* Results */}
        <div
          className={clsx(
            "border rounded-md overflow-hidden",
            darkMode ? "border-gray-700" : "border-gray-300"
          )}
        >
          {q.trim() ? (
            loadingSearch ? (
              <div className="px-3 py-2 text-sm">
                <span className={darkMode ? "text-gray-400" : "text-gray-600"}>
                  Searching…
                </span>
              </div>
            ) : (searchResults || []).length === 0 ? (
              <div className="px-3 py-2 text-sm">
                <span className={darkMode ? "text-gray-500" : "text-gray-600"}>
                  No users found
                </span>
              </div>
            ) : (
              (searchResults || []).map((u) =>
                renderUserRow(u, {
                  darkMode,
                  sending,
                  sentTo,
                  showAccessHint,
                  canUserView,
                  ensureConversationWithUser,
                  navigate,
                  onClose,
                  doSend,
                })
              )
            )
          ) : (
            <>
              <div
                className={clsx(
                  "px-3 py-2 text-sm font-medium",
                  darkMode ? "text-gray-300" : "text-gray-700"
                )}
              >
                Recent
              </div>
              {(suggestions || []).length === 0 ? (
                <div className="px-3 py-2 text-sm">
                  <span className={darkMode ? "text-gray-500" : "text-gray-600"}>
                    No recent chats
                  </span>
                </div>
              ) : (
                suggestions.map((u) =>
                  renderUserRow(u, {
                    darkMode,
                    sending,
                    sentTo,
                    showAccessHint,
                    canUserView,
                    ensureConversationWithUser,
                    navigate,
                    onClose,
                    doSend,
                  })
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Helper renderer for each user row ---------- */
function renderUserRow(
  u,
  {
    darkMode,
    sending,
    sentTo,
    showAccessHint,
    canUserView,
    ensureConversationWithUser,
    navigate,
    onClose,
    doSend,
  }
) {
  const avatar = u.profileImage ? buildFileUrl(u.profileImage) : "/default-avatar.png";
  const uid = String(u._id);
  const isSending = !!sending[uid];
  const done = !!sentTo[uid];
  const hint = showAccessHint(uid);
  const canView = canUserView(uid);

  return (
    <div
      key={uid}
      className={clsx(
        "flex items-center justify-between px-3 py-2 text-sm border-b last:border-0 transition-colors",
        darkMode
          ? "border-gray-800 hover:bg-gray-800/70"
          : "border-gray-200 hover:bg-gray-50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <img
          src={avatar}
          alt=""
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="min-w-0">
          <div className="font-medium truncate">
            {u.firstName} {u.lastName}
          </div>
          <div
            className={clsx(
              "text-xs truncate",
              darkMode ? "text-gray-400" : "text-gray-600"
            )}
          >
            @{u.username}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {hint && (
          <span
            className={clsx(
              "text-xs",
              darkMode ? "text-amber-400" : "text-amber-600"
            )}
          >
            May not have access
          </span>
        )}
        {done ? (
          <>
            <span
              className={clsx(
                "text-sm",
                darkMode ? "text-green-400" : "text-green-600"
              )}
            >
              Sent
            </span>
            <button
              className={clsx(
                "text-xs px-2 py-1 rounded font-medium text-white transition-colors",
                darkMode
                  ? "bg-blue-700 hover:bg-blue-600"
                  : "bg-blue-600 hover:bg-blue-700"
              )}
              onClick={() => {
                ensureConversationWithUser(uid).then((cid) => {
                  onClose?.();
                  navigate(`/messages/${cid}`);
                });
              }}
            >
              Open chat
            </button>
          </>
        ) : (
          <button
            disabled={isSending || !canView}
            onClick={() => doSend(u)}
            title={!canView ? "Recipient cannot view this reel" : "Send"}
            className={clsx(
              "text-xs px-2 py-1 rounded font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
              darkMode
                ? "bg-blue-700 hover:bg-blue-600"
                : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        )}
      </div>
    </div>
  );
}