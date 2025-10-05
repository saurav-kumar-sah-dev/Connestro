import { useContext, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";

import { ChatContext } from "../../context/ChatContext";
import { AppContext } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import MessageBubble from "./MessageBubble";
import { buildFileUrl } from "../../utils/url";

function getVisibleStatus(status, ownerId, viewerId) {
  if (!status || (!status.text && !status.emoji)) return null;
  if (status.expiresAt && new Date(status.expiresAt) < new Date()) return null;
  const isOwner = String(ownerId) === String(viewerId);
  const vis = status.visibility || "public";
  if (!isOwner && vis !== "public") return null;
  return status;
}

const styles = {
  root: "flex flex-col flex-1 transition-colors duration-300",
  rootLight: "bg-white",
  rootDark: "bg-slate-900",

  header:
    "px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 border-b sticky top-0 z-10 transition-colors duration-300",
  headerLight: "bg-white border-slate-200",
  headerDark: "bg-slate-900 border-slate-800",

  headerRow: "flex items-center gap-3",

  closeBtn:
    "shrink-0 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
  closeBtnLight:
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-blue-500",
  closeBtnDark:
    "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 focus:ring-blue-400",

  avatarWrap: "relative",
  avatarImg: "w-10 h-10 rounded-full object-cover ring-1",
  avatarLight: "ring-slate-200",
  avatarDark: "ring-slate-800",

  onlineDot: "absolute bottom-0 right-0 w-3 h-3 rounded-full border",
  onlineDotLight: "border-white",
  onlineDotDark: "border-slate-900",
  onlineColor: "bg-emerald-500",
  offlineColor: "bg-slate-400",

  nameWrap: "flex-1 min-w-0",
  name: "font-semibold truncate",
  nameLight: "text-slate-900",
  nameDark: "text-slate-100",

  username: "truncate",
  usernameLight: "text-slate-500",
  usernameDark: "text-slate-400",

  statusLine: "text-xs truncate",
  statusLineLight: "text-slate-600",
  statusLineDark: "text-slate-400",

  meta: "text-xs",
  metaLight: "text-slate-500",
  metaDark: "text-slate-400",

  actions: "flex items-center gap-2",
  actionBtn:
    "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
  actionBtnLight:
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-blue-500",
  actionBtnDark:
    "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 focus:ring-blue-400",

  dangerBtn:
    "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
  dangerBtnLight:
    "border-rose-300 text-rose-600 hover:bg-rose-50 focus:ring-rose-400",
  dangerBtnDark:
    "border-rose-900/40 text-rose-300 hover:bg-rose-900/20 focus:ring-rose-500",

  messages: "flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-2 transition-colors duration-300",
  messagesLight: "bg-slate-50",
  messagesDark: "bg-slate-950",

  empty: "text-center py-8",
  emptyLight: "text-slate-400",
  emptyDark: "text-slate-500",

  composer: "border-t p-2.5 sm:p-3 sticky bottom-0 transition-colors duration-300",
  composerLight: "bg-white border-slate-200",
  composerDark: "bg-slate-900 border-slate-800",

  filePills: "flex gap-2 flex-wrap mb-2",
  fileChip: "text-xs rounded px-2 py-1",
  fileChipLight: "bg-slate-200 text-slate-800",
  fileChipDark: "bg-slate-700 text-slate-100",

  row: "flex items-center gap-2",

  attachBtn:
    "px-3 py-2 rounded-lg border font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
  attachBtnLight:
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-blue-500",
  attachBtnDark:
    "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 focus:ring-blue-400",

  textarea:
    "flex-1 rounded-lg border text-sm sm:text-base focus:outline-none focus:ring-2 min-h-[44px] max-h-[180px] px-3 py-2 transition-colors duration-200",
  textareaLight:
    "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:ring-blue-500",
  textareaDark:
    "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:ring-blue-400",

  sendBtn:
    "rounded-lg px-4 py-2 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0",
  sendBtnLight: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
  sendBtnDark: "bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-400",
};

export default function ChatWindow({ conversationId, conversation }) {
  const { messagesByConv, sendMessage, typingMap, openConversation, startCall, clearConversation } =
    useContext(ChatContext);
  const { socket, users } = useContext(AppContext);
  const { darkMode } = useTheme();
  const me = JSON.parse(localStorage.getItem("user") || "{}");
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const fileInput = useRef(null);

  useEffect(() => {
    if (conversationId) openConversation(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const messages = messagesByConv[conversationId] || [];
  const other = conversation?.other;
  const avatar = other?.profileImage ? buildFileUrl(other.profileImage) : "/default-avatar.png";

  // Visible status for the other participant (from users cache or convo.other)
  const st = getVisibleStatus(users[other?._id]?.status || other?.status || null, other?._id, me.id);
  const statusLine = st ? [st.emoji, st.text].filter(Boolean).join(" ") : "";

  const onSend = async () => {
    if (!text.trim() && files.length === 0) return;
    await sendMessage(conversationId, { text: text.trim(), files });
    setText("");
    setFiles([]);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    } else {
      if (socket) socket.emit("typing", { conversationId, isTyping: true });
    }
  };

  const addFiles = (e) => {
    const f = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...f]);
    if (fileInput.current) fileInput.current.value = null;
  };

  const doClear = async () => {
    if (!conversationId) return;
    const ok = window.confirm(
      "Clear chat? This hides all messages, media, and call logs for you only. This cannot be undone."
    );
    if (!ok) return;
    try {
      await clearConversation(conversationId);
    } catch (e) {
      console.error("clearConversation failed", e);
      alert("Failed to clear conversation. Please try again.");
    }
  };

  const closeChat = () => {
    navigate("/messages");
  };

  return (
    <div className={clsx(styles.root, darkMode ? styles.rootDark : styles.rootLight)}>
      {/* Header */}
      <div className={clsx(styles.header, darkMode ? styles.headerDark : styles.headerLight)}>
        <div className={styles.headerRow}>
          {/* Cut/Close button (mobile + desktop) */}
          <button
            onClick={closeChat}
            className={clsx(styles.closeBtn, darkMode ? styles.closeBtnDark : styles.closeBtnLight)}
            title="Close chat"
          >
            ✕ <span className="hidden md:inline">Close</span>
          </button>

          <div className={styles.avatarWrap}>
            <Link to={`/profile/${other?._id}`} title="View profile">
              <img
                src={avatar}
                alt=""
                className={clsx(styles.avatarImg, darkMode ? styles.avatarDark : styles.avatarLight)}
              />
            </Link>
            <span
              title={conversation?.otherOnline ? "Online" : "Offline"}
              className={clsx(
                styles.onlineDot,
                darkMode ? styles.onlineDotDark : styles.onlineDotLight,
                conversation?.otherOnline ? styles.onlineColor : styles.offlineColor
              )}
            />
          </div>

          <div className={styles.nameWrap}>
            <div className={clsx(styles.name, darkMode ? styles.nameDark : styles.nameLight)}>
              <Link to={`/profile/${other?._id}`} className="hover:underline" title="View profile">
                {other?.firstName} {other?.lastName}
              </Link>{" "}
              <Link
                to={`/profile/${other?._id}`}
                className={clsx("hover:underline", styles.username, darkMode ? styles.usernameDark : styles.usernameLight)}
                title="View profile"
              >
                @{other?.username}
              </Link>
            </div>
            {/* Status line under the name */}
            {statusLine && (
              <div className={clsx(styles.statusLine, darkMode ? styles.statusLineDark : styles.statusLineLight)}>
                {statusLine}
              </div>
            )}
            <div className={clsx(styles.meta, darkMode ? styles.metaDark : styles.metaLight)}>
              {conversation?.otherOnline ? "Online" : "Offline"}
              {typingMap[conversationId] ? " • Typing..." : ""}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={clsx(styles.actionBtn, darkMode ? styles.actionBtnDark : styles.actionBtnLight)}
              onClick={() => startCall(conversationId, other?._id, "audio")}
              title="Audio call"
            >
              Call
            </button>
            <button
              className={clsx(styles.actionBtn, darkMode ? styles.actionBtnDark : styles.actionBtnLight)}
              onClick={() => startCall(conversationId, other?._id, "video")}
              title="Video call"
            >
              Video
            </button>
            <button
              className={clsx(styles.dangerBtn, darkMode ? styles.dangerBtnDark : styles.dangerBtnLight)}
              onClick={doClear}
              title="Clear chat (for me)"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className={clsx(styles.messages, darkMode ? styles.messagesDark : styles.messagesLight)}>
        {messages.map((m) => (
          <MessageBubble key={m._id} msg={m} meId={me.id} otherId={other?._id} />
        ))}
        {messages.length === 0 && (
          <div className={clsx(styles.empty, darkMode ? styles.emptyDark : styles.emptyLight)}>
            No messages
          </div>
        )}
      </div>

      {/* Composer */}
      <div className={clsx(styles.composer, darkMode ? styles.composerDark : styles.composerLight)}>
        {files.length > 0 && (
          <div className={styles.filePills}>
            {files.map((f, i) => (
              <div key={i} className={clsx(styles.fileChip, darkMode ? styles.fileChipDark : styles.fileChipLight)}>
                {f.name} ({Math.round(f.size / 1024)} KB)
              </div>
            ))}
          </div>
        )}

        <div className={styles.row}>
          <button
            className={clsx(styles.attachBtn, darkMode ? styles.attachBtnDark : styles.attachBtnLight)}
            onClick={() => fileInput.current?.click()}
            title="Attach files"
          >
            ➕
          </button>
          <input
            ref={fileInput}
            onChange={addFiles}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
          />

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message… 😊"
            className={clsx(styles.textarea, darkMode ? styles.textareaDark : styles.textareaLight)}
          />

          <button
            className={clsx(styles.sendBtn, darkMode ? styles.sendBtnDark : styles.sendBtnLight)}
            onClick={onSend}
            title="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}