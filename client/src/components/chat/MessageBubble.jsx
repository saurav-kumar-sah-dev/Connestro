import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import {
  IoCheckmarkOutline,
  IoCheckmarkDoneOutline,
  IoCall,
  IoVideocam,
} from "react-icons/io5";
import { ChatContext } from "../../context/ChatContext";
import { buildFileUrl } from "../../utils/url";

export default function MessageBubble({ msg, meId, otherId }) {
  const isMine = String(msg.sender?._id || msg.sender) === String(meId);
  const { editMessage, deleteForMe, deleteForEveryone } = useContext(ChatContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.text || "");

  const isCall = msg.kind === "call";
  const delivered =
    (msg.deliveredTo || []).map(String).includes(String(otherId)) ||
    msg._localDelivered === true;
  const read =
    (msg.readBy || []).map(String).includes(String(otherId)) ||
    msg._localRead === true;

  const Tick = () => {
    if (!isMine || isCall) return null;
    if (read)
      return (
        <IoCheckmarkDoneOutline
          className="text-emerald-400 text-[1.25rem] drop-shadow-sm"
          title="Read"
        />
      );
    if (delivered)
      return (
        <IoCheckmarkDoneOutline
          className="text-white/95 text-[1.25rem] drop-shadow-sm"
          title="Delivered"
        />
      );
    return (
      <IoCheckmarkOutline
        className="text-white/90 text-[1.25rem] drop-shadow-sm"
        title="Sent"
      />
    );
  };

  const doEdit = async () => {
    if (draft.trim() === msg.text) {
      setEditing(false);
      setMenuOpen(false);
      return;
    }
    await editMessage(msg._id, draft.trim());
    setEditing(false);
    setMenuOpen(false);
  };

  const doDeleteForMe = async () => {
    await deleteForMe(msg._id, String(msg.conversation));
    setMenuOpen(false);
  };

  const doDeleteForEveryone = async () => {
    await deleteForEveryone(msg._id);
    setMenuOpen(false);
  };

  // polished bubble size and padding for better look on mobile vs desktop
  const bubbleClasses = `relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 md:px-4.5 rounded-2xl shadow ${
    isMine
      ? "bg-blue-600 text-white"
      : "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
  } transition-colors duration-200`;

  const formatDuration = (sec) => {
    if (!sec) return "00:00";
    const mm = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const renderCall = () => {
    const info = msg.callInfo || {};
    const icon =
      info.type === "video" ? (
        <IoVideocam className="text-lg" />
      ) : (
        <IoCall className="text-lg" />
      );
    const when = new Date(msg.createdAt).toLocaleString([], {
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
    const labelBase =
      info.status === "ended"
        ? `${info.type === "video" ? "Video call" : "Audio call"}`
        : info.status === "missed"
        ? `Missed ${info.type} call`
        : `Declined ${info.type} call`;
    const duration =
      info.status === "ended"
        ? ` • ${formatDuration(info.durationSec || 0)}`
        : "";
    const direction =
      String(info.initiator) === String(meId)
        ? "(Outgoing)"
        : "(Incoming)";

    return (
      <div className="max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl bg-white/80 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
        <div className="flex items-center gap-2 font-semibold">
          {icon}
          <span>
            {labelBase} {direction}
          </span>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {when}
          {duration}
        </div>
      </div>
    );
  };

  const linkify = (text) => {
    if (!text) return null;
    const str = String(text);
    const parts = [];
    const urlRe = /(https?:\/\/[^\s]+|\/(reels|post)\/[0-9a-fA-F]{24})/g;
    let last = 0;
    let m;
    while ((m = urlRe.exec(str)) !== null) {
      const start = m.index;
      const token = m[0];
      if (start > last) parts.push(<span key={`t-${last}`}>{str.slice(last, start)}</span>);
      const isAbsolute = /^https?:\/\//i.test(token);
      const sameOriginInternal = (() => {
        try {
          if (!isAbsolute) return null;
          const u = new URL(token);
          const same = typeof window !== "undefined" && u.origin === window.location.origin;
          const mReel = u.pathname.match(/^\/reels\/([0-9a-fA-F]{24})$/);
          const mPost = u.pathname.match(/^\/post\/([0-9a-fA-F]{24})$/);
          if (same && mReel) return `/reels/${mReel[1]}`;
          if (same && mPost) return `/post/${mPost[1]}`;
          return null;
        } catch {
          return null;
        }
      })();
      if (sameOriginInternal || (!isAbsolute && /^\/(reels|post)\/[0-9a-fA-F]{24}$/.test(token))) {
        const to = sameOriginInternal || token;
        parts.push(
          <Link key={`l-${start}`} to={to} className="underline text-blue-100 dark:text-blue-300 md:text-blue-700">
            {token}
          </Link>
        );
      } else if (isAbsolute) {
        parts.push(
          <a
            key={`a-${start}`}
            href={token}
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-100 dark:text-blue-300 md:text-blue-700"
          >
            {token}
          </a>
        );
      } else {
        parts.push(<span key={`t2-${start}`}>{token}</span>);
      }
      last = start + token.length;
    }
    if (last < str.length) parts.push(<span key={`t-end`}>{str.slice(last)}</span>);
    return parts;
  };

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} px-2 sm:px-4 py-1`}
      onMouseLeave={() => setMenuOpen(false)}
    >
      <div className="relative group">
        {isCall ? (
          renderCall()
        ) : (
          <div className={bubbleClasses}>
            {msg.isDeleted ? (
              <div className="italic opacity-80">This message was deleted</div>
            ) : editing ? (
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-md px-2 py-1 text-slate-900 bg-white border border-slate-300 text-sm"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  className="text-xs px-2 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-medium transition-colors"
                  onClick={doEdit}
                >
                  Save
                </button>
                <button
                  className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                {msg.text && (
                  <div className="whitespace-pre-wrap break-words leading-relaxed">
                    {linkify(msg.text)}
                  </div>
                )}
                {Array.isArray(msg.attachments) &&
                  msg.attachments.map((a, i) => {
                    const src = buildFileUrl(a.url);
                    return (
                      <div key={i} className="mt-2 rounded-md overflow-hidden">
                        {a.type === "image" ? (
                          <img
                            src={src}
                            alt={a.name || "image"}
                            className="max-h-64 rounded-md w-full object-contain shadow-sm"
                          />
                        ) : a.type === "video" ? (
                          <video src={src} controls className="max-h-64 rounded-md w-full shadow-sm" />
                        ) : (
                          <a className="underline text-sm break-all" href={src} target="_blank" rel="noreferrer">
                            {a.name || "File"}
                          </a>
                        )}
                      </div>
                    );
                  })}
              </>
            )}

            <div
              className={`flex items-center gap-2 mt-1 text-[11px] opacity-90 pr-6 ${
                isMine ? "text-white/90" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              <span>
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {msg.editedAt && !msg.isDeleted && <span>(edited)</span>}
            </div>

            {isMine && (
              <div className="absolute bottom-1 right-2">
                <Tick />
              </div>
            )}
          </div>
        )}

        {/* Responsive, modern menu */}
        {!isCall && !msg.isDeleted && !editing && (
          <div className={`absolute -top-3 ${isMine ? "right-0" : "left-0"}`}>
            <button
              className={`text-lg w-9 h-9 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-md border backdrop-blur-sm transition-colors duration-150 ${
                isMine
                  ? "bg-white text-blue-600 hover:bg-slate-100 border-slate-300"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              }`}
              onClick={() => setMenuOpen((v) => !v)}
              title="Message actions"
            >
              ⋯
            </button>

            {menuOpen && (
              <div
                className={`absolute ${isMine ? "right-0" : "left-0"} mt-2 w-56 max-w-[calc(100vw-3rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl text-sm z-50 overflow-hidden animate-fadeIn`}
              >
                {isMine && (
                  <button
                    className="block w-full text-left px-4 py-2.5 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setEditing(true)}
                  >
                    ✏️ Edit
                  </button>
                )}
                <button
                  className="block w-full text-left px-4 py-2.5 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={doDeleteForMe}
                >
                  🗑️ Delete for me
                </button>
                {isMine && (
                  <button
                    className="block w-full text-left px-4 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={doDeleteForEveryone}
                  >
                    🚫 Delete for everyone
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}