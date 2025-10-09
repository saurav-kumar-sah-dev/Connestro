import { useContext, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import clsx from "clsx";

import { ChatContext } from "../../context/ChatContext";
import { AppContext } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import MessageBubble from "./MessageBubble";
import { buildFileUrl } from "../../utils/url";
import { IoArrowBack, IoCall, IoVideocam, IoAttach, IoSend, IoTrash } from "react-icons/io5";

function getVisibleStatus(status, ownerId, viewerId) {
  if (!status || (!status.text && !status.emoji)) return null;
  if (status.expiresAt && new Date(status.expiresAt) < new Date()) return null;
  const isOwner = String(ownerId) === String(viewerId);
  const vis = status.visibility || "public";
  if (!isOwner && vis !== "public") return null;
  return status;
}

const styles = {
  root: "flex flex-col h-full w-full overflow-hidden transition-colors duration-300",
  rootLight: "bg-white",
  rootDark: "bg-slate-900",

  header:
    "px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 border-b flex-shrink-0 transition-colors duration-300",
  headerLight: "bg-white border-slate-200",
  headerDark: "bg-slate-900 border-slate-800",

  headerRow: "flex items-center gap-2 sm:gap-3",

  closeBtn:
    "shrink-0 p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
  closeBtnLight:
    "text-slate-700 hover:bg-slate-100 focus:ring-blue-500",
  closeBtnDark:
    "text-slate-200 hover:bg-slate-800 focus:ring-blue-400",

  avatarWrap: "relative shrink-0",
  avatarImg: "w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 shadow-sm",
  avatarLight: "ring-slate-200",
  avatarDark: "ring-slate-800",

  onlineDot: "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2",
  onlineDotLight: "border-white",
  onlineDotDark: "border-slate-900",
  onlineColor: "bg-emerald-500",
  offlineColor: "bg-slate-400",

  nameWrap: "flex-1 min-w-0",
  name: "font-semibold text-sm sm:text-base truncate flex items-center gap-1",
  nameLight: "text-slate-900",
  nameDark: "text-slate-100",

  username: "text-xs sm:text-sm truncate",
  usernameLight: "text-slate-500",
  usernameDark: "text-slate-400",

  statusLine: "text-xs truncate",
  statusLineLight: "text-slate-600",
  statusLineDark: "text-slate-400",

  meta: "text-xs",
  metaLight: "text-slate-500",
  metaDark: "text-slate-400",

  actions: "flex items-center gap-1 sm:gap-2 shrink-0",
  actionBtn:
    "p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
  actionBtnLight:
    "text-slate-700 hover:bg-slate-100 focus:ring-blue-500",
  actionBtnDark:
    "text-slate-200 hover:bg-slate-800 focus:ring-blue-400",

  dangerBtn:
    "p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
  dangerBtnLight:
    "text-rose-600 hover:bg-rose-50 focus:ring-rose-400",
  dangerBtnDark:
    "text-rose-300 hover:bg-rose-900/20 focus:ring-rose-500",

  messages: "flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-2 transition-colors duration-300",
  messagesLight: "bg-gradient-to-b from-slate-50 to-white",
  messagesDark: "bg-gradient-to-b from-slate-950 to-slate-900",

  empty: "text-center py-8",
  emptyLight: "text-slate-400",
  emptyDark: "text-slate-500",

  composer: "border-t px-3 sm:px-4 py-2 sm:py-3 flex-shrink-0 transition-colors duration-300",
  composerLight: "bg-white border-slate-200",
  composerDark: "bg-slate-900 border-slate-800",

  filePills: "flex gap-2 flex-wrap mb-2",
  fileChip: "text-xs rounded-full px-3 py-1",
  fileChipLight: "bg-slate-200 text-slate-800",
  fileChipDark: "bg-slate-700 text-slate-100",

  row: "flex items-center gap-2",

  attachBtn:
    "p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
  attachBtnLight:
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-blue-500",
  attachBtnDark:
    "text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus:ring-blue-400",

  textarea:
    "flex-1 rounded-full border-2 text-sm sm:text-base focus:outline-none focus:ring-2 px-4 py-2.5 resize-none transition-all duration-200",
  textareaLight:
    "border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500/20",
  textareaDark:
    "border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:border-blue-400 focus:bg-slate-900 focus:ring-blue-400/20",

  sendBtn:
    "p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
  sendBtnEnabled: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl",
  sendBtnDisabled: "bg-slate-300 text-slate-500 cursor-not-allowed",
  sendBtnDarkDisabled: "bg-slate-700 text-slate-500",
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
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversationId) openConversation(conversationId);
  }, [conversationId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesByConv[conversationId]]);

  const messages = messagesByConv[conversationId] || [];
  const other = conversation?.other;
  const avatar = other?.profileImage ? buildFileUrl(other.profileImage) : "/default-avatar.png";

  const st = getVisibleStatus(users[other?._id]?.status || other?.status || null, other?._id, me.id);
  const statusLine = st ? [st.emoji, st.text].filter(Boolean).join(" ") : "";

  const canSend = text.trim() || files.length > 0;

  const onSend = async () => {
    if (!canSend) return;
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

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
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
          <button
            onClick={closeChat}
            className={clsx(styles.closeBtn, darkMode ? styles.closeBtnDark : styles.closeBtnLight)}
            title="Back to messages"
          >
            <IoArrowBack className="text-xl" />
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
              <Link to={`/profile/${other?._id}`} className="hover:underline truncate" title="View profile">
                {other?.firstName} {other?.lastName}
              </Link>
            </div>
            <div className={clsx(styles.username, darkMode ? styles.usernameDark : styles.usernameLight)}>
              @{other?.username}
              {statusLine && <span className="ml-2">• {statusLine}</span>}
            </div>
            {typingMap[conversationId] && (
              <div className={clsx(styles.meta, darkMode ? styles.metaDark : styles.metaLight)}>
                Typing...
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button
              className={clsx(styles.actionBtn, darkMode ? styles.actionBtnDark : styles.actionBtnLight)}
              onClick={() => startCall(conversationId, other?._id, "audio")}
              title="Audio call"
            >
              <IoCall className="text-xl" />
            </button>
            <button
              className={clsx(styles.actionBtn, darkMode ? styles.actionBtnDark : styles.actionBtnLight)}
              onClick={() => startCall(conversationId, other?._id, "video")}
              title="Video call"
            >
              <IoVideocam className="text-xl" />
            </button>
            <button
              className={clsx(styles.dangerBtn, darkMode ? styles.dangerBtnDark : styles.dangerBtnLight)}
              onClick={doClear}
              title="Clear chat"
            >
              <IoTrash className="text-xl" />
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
            <div className="text-6xl mb-4 opacity-30">💬</div>
            <div className="text-lg font-medium mb-1">No messages yet</div>
            <div className="text-sm opacity-70">Send a message to start the conversation</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className={clsx(styles.composer, darkMode ? styles.composerDark : styles.composerLight)}>
        {files.length > 0 && (
          <div className={styles.filePills}>
            {files.map((f, i) => (
              <div key={i} className={clsx(styles.fileChip, darkMode ? styles.fileChipDark : styles.fileChipLight)}>
                <span className="truncate max-w-[150px]">{f.name}</span>
                <button 
                  onClick={() => removeFile(i)}
                  className="ml-2 text-xs hover:text-rose-500"
                >
                  ✕
                </button>
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
            <IoAttach className="text-xl" />
          </button>
          <input
            ref={fileInput}
            onChange={addFiles}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
          />

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message..."
            className={clsx(styles.textarea, darkMode ? styles.textareaDark : styles.textareaLight)}
            type="text"
          />

          <button
            className={clsx(
              styles.sendBtn,
              canSend 
                ? styles.sendBtnEnabled 
                : (darkMode ? styles.sendBtnDarkDisabled : styles.sendBtnDisabled),
              darkMode && canSend ? "focus:ring-blue-400" : "focus:ring-blue-500"
            )}
            onClick={onSend}
            disabled={!canSend}
            title="Send message"
          >
            <IoSend className="text-xl" />
          </button>
        </div>
      </div>
    </div>
  );
}