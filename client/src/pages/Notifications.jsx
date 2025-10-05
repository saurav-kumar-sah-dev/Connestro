// src/pages/Notifications.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
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
      return "posted a new story"; // NEW
    case "like":
      return isReel ? "liked your reel" : "liked your post";
    case "comment":
      return isReel ? "commented on your reel" : "commented on your post";
    case "reply":
      return "replied to your comment";

    // NEW: reel comment/reply votes
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

function Item({ n, onClick, onClear }) {
  const actor = n?.actor || {};
  const avatar = actor?.profileImage ? buildFileUrl(actor.profileImage) : "/default-avatar.png";
  const label = notifLabel(n);

  return (
    <div
      className={`flex items-center gap-3 p-3 border-b ${!n.read ? "bg-blue-50" : ""}`}
      title={n?.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
    >
      <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
      <div className="flex-1">
        <button onClick={onClick} className="text-left w-full">
          <div className="text-sm">
            <span className="font-semibold">@{actor?.username || "user"}</span> {label}
          </div>
          <div className="text-xs text-gray-500">
            {n?.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
          </div>
        </button>
      </div>
      {!n.read && (
        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded mr-2">New</span>
      )}
      <button
        onClick={onClear}
        className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
        title="Clear this notification"
      >
        Clear
      </button>
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
  const navigate = useNavigate();

  const go = async (n) => {
    try {
      if (!n.read) await markNotifRead(n._id);
    } finally {
      if (n.link) navigate(n.link);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Notifications</h1>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            onClick={markAllNotifsRead}
          >
            Mark all as read
          </button>
          <button
            className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600"
            onClick={clearAllNotifs}
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No notifications</div>
        ) : (
          notifications.map((n) => (
            <Item
              key={n._id}
              n={n}
              onClick={() => go(n)}
              onClear={() => deleteNotif(n._id)}
            />
          ))
        )}
      </div>
    </div>
  );
}