// src/pages/Notifications.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { buildFileUrl } from "../utils/url";

// Helper to build a readable label for each notification
const notifLabel = (n) => {
  const serverText = (n?.text || "").trim();
  if (serverText) return serverText;

  const link = String(n?.link || "");
  const isReel = link.startsWith("/reels/");

  switch (n?.type) {
    case "reel_publish":
      return "posted a new reel";
    case "story_publish":
      return "posted a new story";
    case "like":
      return isReel ? "liked your reel" : "liked your post";
    case "comment":
      return isReel ? "commented on your reel" : "commented on your post";
    case "reply":
      return "replied to your comment";
    case "comment_like":
      return "liked your comment";
    case "comment_dislike":
      return "disliked your comment";
    case "reply_like":
      return "liked your reply";
    case "reply_dislike":
      return "disliked your reply";
    case "reply_reaction":
      return "reacted to your reply";
    case "comment_reaction":
      return "reacted to your comment";
    case "follow":
      return "started following you";
    case "message":
      return "sent you a message";
    case "call":
      return serverText || "call update";
    case "report_update":
      return serverText || "report update";
    case "moderation":
      return serverText || "moderation update";
    case "story_like":
      return "liked your story";
    case "story_reaction":
      return serverText || "reacted to your story";
    case "story_reply":
      return "replied to your story";
    default:
      return serverText || "Notification";
  }
};

// Icon component for notification types
const NotificationIcon = ({ type, darkMode }) => {
  const iconColor = darkMode ? "text-slate-400" : "text-slate-500";

  switch (type) {
    case "like":
    case "story_like":
    case "comment_like":
    case "reply_like":
      return (
        <svg
          className={`w-5 h-5 ${iconColor}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
      );
    case "comment":
    case "reply":
    case "story_reply":
      return (
        <svg
          className={`w-5 h-5 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      );
    case "follow":
      return (
        <svg
          className={`w-5 h-5 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      );
    case "message":
      return (
        <svg
          className={`w-5 h-5 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    case "reel_publish":
    case "story_publish":
      return (
        <svg
          className={`w-5 h-5 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      );
    default:
      return (
        <svg
          className={`w-5 h-5 ${iconColor}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      );
  }
};

// Format time helper
const formatTime = (date) => {
  if (!date) return "";
  const now = new Date();
  const notifDate = new Date(date);
  const diff = Math.floor((now - notifDate) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return notifDate.toLocaleDateString();
};

function Item({ n, onClick, onClear, darkMode }) {
  const actor = n?.actor || {};
  const avatar = actor?.profileImage
    ? buildFileUrl(actor.profileImage)
    : "/default-avatar.png";
  const label = notifLabel(n);

  return (
    <div
      className={`group relative flex items-start gap-3 p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${
        !n.read
          ? darkMode
            ? "bg-blue-900/10 border-l-4 border-blue-500"
            : "bg-blue-50/50 border-l-4 border-blue-500"
          : darkMode
          ? "hover:bg-slate-800/50"
          : "hover:bg-slate-50"
      } ${
        darkMode ? "border-b border-slate-800" : "border-b border-slate-200"
      }`}
      title={n?.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={avatar}
          alt={actor?.username}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-offset-2 ring-offset-transparent ring-slate-200 dark:ring-slate-700"
        />
        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-0.5">
          <NotificationIcon type={n?.type} darkMode={darkMode} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button
          onClick={onClick}
          className="text-left w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-lg p-1 -m-1"
        >
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span
              className={`font-semibold text-sm sm:text-base ${
                darkMode ? "text-slate-200" : "text-slate-900"
              }`}
            >
              @{actor?.username || "user"}
            </span>
            <span
              className={`text-sm ${
                darkMode ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {label}
            </span>
          </div>
          <div
            className={`text-xs sm:text-sm mt-1 ${
              darkMode ? "text-slate-500" : "text-slate-500"
            }`}
          >
            {formatTime(n?.createdAt)}
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!n.read && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white animate-pulse">
            New
          </span>
        )}
        <button
          onClick={onClear}
          className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs px-2.5 py-1.5 rounded-lg font-medium ${
            darkMode
              ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          }`}
          title="Clear this notification"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Notifications() {
  const {
    notifications,
    markNotifRead,
    markAllNotifsRead,
    deleteNotif,
    clearAllNotifs,
  } = useContext(AppContext);
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const go = async (n) => {
    try {
      if (!n.read) await markNotifRead(n._id);
    } finally {
      if (n.link) navigate(n.link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-slate-950"
          : "bg-gradient-to-br from-slate-50 via-white to-blue-50"
      }`}
    >
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute -top-40 -right-40 h-80 w-80 rounded-full blur-[100px] ${
            darkMode ? "bg-blue-500/10" : "bg-blue-400/20"
          }`}
        />
        <div
          className={`absolute -bottom-40 -left-40 h-80 w-80 rounded-full blur-[100px] ${
            darkMode ? "bg-purple-500/10" : "bg-purple-400/20"
          }`}
        />
      </div>

      <div className="relative container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1
              className={`text-2xl sm:text-3xl font-bold ${
                darkMode ? "text-slate-100" : "text-slate-900"
              }`}
            >
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p
                className={`text-sm mt-1 ${
                  darkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                You have {unreadCount} unread{" "}
                {unreadCount === 1 ? "notification" : "notifications"}
              </p>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                darkMode
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              }`}
              onClick={markAllNotifsRead}
              disabled={unreadCount === 0}
            >
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="hidden sm:inline">Mark all read</span>
                <span className="sm:hidden">Read all</span>
              </span>
            </button>
            <button
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                darkMode
                  ? "bg-red-900/20 text-red-400 hover:bg-red-900/30 hover:text-red-300 border border-red-800/30"
                  : "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200"
              }`}
              onClick={clearAllNotifs}
              disabled={notifications.length === 0}
            >
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span className="hidden sm:inline">Clear all</span>
                <span className="sm:hidden">Clear</span>
              </span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div
          className={`rounded-2xl shadow-xl border overflow-hidden ${
            darkMode
              ? "bg-slate-900/90 border-slate-800 shadow-slate-900/50"
              : "bg-white border-slate-200 shadow-slate-200/50"
          }`}
        >
          {notifications.length === 0 ? (
            <div className="p-12 sm:p-16 text-center">
              <div
                className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                  darkMode ? "bg-slate-800" : "bg-slate-100"
                }`}
              >
                <svg
                  className={`w-10 h-10 ${
                    darkMode ? "text-slate-600" : "text-slate-400"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h3
                className={`text-lg font-semibold mb-2 ${
                  darkMode ? "text-slate-300" : "text-slate-700"
                }`}
              >
                No notifications yet
              </h3>
              <p
                className={`text-sm ${
                  darkMode ? "text-slate-500" : "text-slate-500"
                }`}
              >
                When you get notifications, they'll show up here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {notifications.map((n) => (
                <Item
                  key={n._id}
                  n={n}
                  onClick={() => go(n)}
                  onClear={() => deleteNotif(n._id)}
                  darkMode={darkMode}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        {notifications.length > 5 && (
          <div
            className={`mt-6 text-center text-sm ${
              darkMode ? "text-slate-500" : "text-slate-500"
            }`}
          >
            Showing {notifications.length} notifications
          </div>
        )}
      </div>
    </div>
  );
}
