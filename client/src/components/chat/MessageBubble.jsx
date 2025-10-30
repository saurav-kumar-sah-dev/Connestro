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

  // Enhanced bubble design with modern styling
  const bubbleClasses = `relative max-w-[85%] sm:max-w-[70%] px-4 py-3 md:px-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${
    isMine
      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border border-blue-400/20"
      : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
  } backdrop-blur-sm`;

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
      className={`flex ${isMine ? "justify-end" : "justify-start"} px-2 sm:px-4 py-2 animate-fadeIn`}
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
                      <div key={i} className="mt-3 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200">
                        {a.type === "image" ? (
                          <div className="relative group">
                            <img
                              src={src}
                              alt={a.name || "image"}
                              className="max-h-80 rounded-xl w-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                              onClick={() => window.open(src, '_blank')}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-xl flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full p-2">
                                <span className="text-lg">🔍</span>
                              </div>
                            </div>
                          </div>
                        ) : a.type === "video" ? (
                          <div className="relative">
                            <video 
                              src={src} 
                              controls 
                              className="max-h-80 rounded-xl w-full shadow-lg" 
                              poster={src}
                            />
                          </div>
                        ) : (
                          <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <span className="text-lg">📄</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {a.name || "File"}
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                  {a.size ? `${(a.size / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                                </div>
                              </div>
                              <a 
                                href={src} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                              >
                                Download
                              </a>
                            </div>
                          </div>
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

        {/* Enhanced modern menu */}
        {!isCall && !msg.isDeleted && !editing && (
          <div className={`absolute -top-2 ${isMine ? "right-0" : "left-0"} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
            <button
              className={`text-lg w-8 h-8 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
                isMine
                  ? "bg-white/90 text-blue-600 hover:bg-blue-50 border-blue-200"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200 border-slate-300 dark:bg-slate-700/90 dark:text-slate-100 dark:hover:bg-slate-600 dark:border-slate-600"
              }`}
              onClick={() => setMenuOpen((v) => !v)}
              title="Message actions"
            >
              ⋯
            </button>

            {menuOpen && (
              <div
                className={`absolute ${isMine ? "right-0" : "left-0"} mt-2 w-56 max-w-[calc(100vw-3rem)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-2xl text-sm z-50 overflow-hidden animate-fadeIn backdrop-blur-md`}
              >
                {isMine && (
                  <button
                    className="w-full text-left px-4 py-3 text-slate-800 dark:text-slate-100 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors duration-200 flex items-center gap-3"
                    onClick={() => setEditing(true)}
                  >
                    <span className="text-lg">✏️</span>
                    <span>Edit message</span>
                  </button>
                )}
                <button
                  className="w-full text-left px-4 py-3 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 flex items-center gap-3"
                  onClick={doDeleteForMe}
                >
                  <span className="text-lg">🗑️</span>
                  <span>Delete for me</span>
                </button>
                {isMine && (
                  <button
                    className="w-full text-left px-4 py-3 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors duration-200 flex items-center gap-3"
                    onClick={doDeleteForEveryone}
                  >
                    <span className="text-lg">🚫</span>
                    <span>Delete for everyone</span>
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