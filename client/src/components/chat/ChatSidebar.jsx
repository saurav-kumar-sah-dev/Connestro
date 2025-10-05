import { useContext, useMemo, useState, useEffect } from "react";
import { ChatContext } from "../../context/ChatContext";
import { AppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import { buildFileUrl } from "../../utils/url";
import { IoSearchOutline, IoSparkles, IoCheckmarkCircle, IoChatbubbles } from "react-icons/io5";

// Stories
import { getActiveStoriesMap, getUserStories, deleteStory, getUnseenStoriesMap } from "../../api/stories";
import StoryViewer from "../stories/StoryViewer";

function getVisibleStatus(status, ownerId, viewerId) {
  if (!status || (!status.text && !status.emoji)) return null;
  if (status.expiresAt && new Date(status.expiresAt) < new Date()) return null;
  const isOwner = String(ownerId) === String(viewerId);
  const vis = status.visibility || "public";
  if (!isOwner && vis !== "public") return null;
  return status;
}

export default function ChatSidebar() {
  const { conversations, loadingConvos } = useContext(ChatContext);
  const { socket } = useContext(AppContext);
  const [q, setQ] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [activeMap, setActiveMap] = useState({});
  const [unseenMap, setUnseenMap] = useState({});
  const navigate = useNavigate();

  const me = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUser, setViewerUser] = useState(null);
  const [viewerStories, setViewerStories] = useState([]);

  const filtered = useMemo(() => {
    if (!q.trim()) return conversations;
    const lower = q.trim().toLowerCase();
    return conversations.filter((c) => {
      const o = c.other || {};
      const name = `${o?.firstName || ""} ${o?.lastName || ""} @${o?.username || ""}`.toLowerCase();
      return name.includes(lower);
    });
  }, [conversations, q]);

  useEffect(() => {
    const ids = Array.from(
      new Set(
        (conversations || [])
          .map((c) => c.other?._id)
          .filter(Boolean)
          .map(String)
      )
    );
    if (!ids.length) {
      setActiveMap({});
      setUnseenMap({});
      return;
    }
    (async () => {
      try {
        const res = await getActiveStoriesMap(ids);
        setActiveMap(res.data?.map || {});
        const unseen = await getUnseenStoriesMap(ids);
        setUnseenMap(unseen.data?.map || {});
      } catch {
        setActiveMap({});
        setUnseenMap({});
      }
    })();
  }, [conversations]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (story) => {
      const uid = String(story?.user?._id || story?.user || "");
      if (!uid) return;
      setActiveMap((prev) => {
        if (!(uid in prev)) return prev;
        return { ...prev, [uid]: (prev[uid] || 0) + 1 };
      });
      setUnseenMap((prev) => {
        if (!(uid in prev)) return prev;
        return { ...prev, [uid]: (prev[uid] || 0) + 1 };
      });
    };
    const onDeleted = ({ userId }) => {
      const uid = String(userId || "");
      if (!uid) return;
      setActiveMap((prev) => {
        if (!(uid in prev)) return prev;
        const n = Math.max(0, (prev[uid] || 0) - 1);
        return { ...prev, [uid]: n };
      });
      setUnseenMap((prev) => {
        if (!(uid in prev)) return prev;
        const n = Math.max(0, (prev[uid] || 0) - 1);
        return { ...prev, [uid]: n };
      });
    };
    socket.on("story:new", onNew);
    socket.on("story:deleted", onDeleted);
    return () => {
      socket.off("story:new", onNew);
      socket.off("story:deleted", onDeleted);
    };
  }, [socket]);

  const searchUsers = async (val) => {
    setQ(val);
    if (!val.trim()) {
      setUserResults([]);
      return;
    }
    try {
      const res = await API.get(`/users/search?query=${encodeURIComponent(val)}`);
      setUserResults(res.data.users || []);
    } catch (e) {
      console.error(e);
    }
  };

  const openUserStories = async (u) => {
    try {
      const res = await getUserStories(u._id);
      const stories = res.data?.stories || [];
      if (stories.length) {
        setViewerUser(u);
        setViewerStories(stories);
        setViewerOpen(true);
      }
    } catch (e) {
      console.error("getUserStories failed", e);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Search header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
        <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
          <IoChatbubbles className="text-blue-600 dark:text-blue-400" />
          Messages
        </h2>
        <div className="relative">
          <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
          <input
            value={q}
            onChange={(e) => searchUsers(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          />

          {q && userResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl max-h-72 overflow-y-auto z-20">
              {userResults.map((u) => {
                const avatar = u.profileImage ? buildFileUrl(u.profileImage) : "/default-avatar.png";
                return (
                  <div
                    key={u._id}
                    className="px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 cursor-pointer flex items-center gap-3 transition-all duration-200 border-b border-gray-100 dark:border-gray-800 last:border-0"
                    onClick={() => {
                      navigate(`/messages/u/${u._id}`);
                      setQ("");
                      setUserResults([]);
                    }}
                  >
                    <img src={avatar} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 shadow-md" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">@{u.username}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {loadingConvos ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <IoChatbubbles className="text-6xl text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No conversations yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Start chatting with someone!</p>
          </div>
        ) : (
          filtered.map((c) => {
            const o = c.other || {};
            const lastText =
              c.lastMessage?.kind === "call"
                ? (() => {
                    const t = c.lastMessage?.callInfo?.type === "video" ? "Video" : "Audio";
                    const s = c.lastMessage?.callInfo?.status;
                    if (s === "ended") {
                      const sec = c.lastMessage?.callInfo?.durationSec || 0;
                      const mm = String(Math.floor(sec / 60)).padStart(2, "0");
                      const ss = String(sec % 60).padStart(2, "0");
                      return `${t} call • ${mm}:${ss}`;
                    }
                    if (s === "missed") return `Missed ${t.toLowerCase()} call`;
                    if (s === "declined") return `Declined ${t.toLowerCase()} call`;
                    return `${t} call`;
                  })()
                : c.lastMessage?.text || (c.lastMessage?.attachments?.length ? "📎 Attachment" : "");

            const online = c.otherOnline;
            const avatar = o.profileImage ? buildFileUrl(o.profileImage) : "/default-avatar.png";

            const st = getVisibleStatus(o.status || null, o._id, me.id);
            const statusLine = st ? [st.emoji, st.text].filter(Boolean).join(" ") : "";

            const hasStories = (activeMap[String(o._id)] || 0) > 0;
            const unseen = unseenMap[String(o._id)] || 0;
            const ringClass = hasStories ? (unseen > 0 ? "bg-gradient-to-tr from-pink-500 via-purple-500 to-yellow-500 animate-pulse" : "bg-gradient-to-tr from-gray-400 to-gray-300") : "";

            const gotoProfile = (e) => {
              e.stopPropagation();
              navigate(`/profile/${o._id}`);
            };

            return (
              <div
                key={c._id}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20 active:scale-[0.99] cursor-pointer transition-all duration-200 group"
                onClick={() => navigate(`/messages/${c._id}`)}
              >
                <div className="relative shrink-0" title={hasStories ? "View stories" : "View profile"}>
                  <div
                    className={hasStories ? `rounded-full p-[2px] ${ringClass}` : ""}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasStories) openUserStories(o);
                      else gotoProfile(e);
                    }}
                  >
                    <img
                      src={avatar}
                      alt="avatar"
                      className={`w-14 h-14 rounded-full object-cover ring-2 ring-white dark:ring-gray-900 shadow-md group-hover:scale-105 transition-transform duration-200 ${hasStories ? "bg-white p-[1px]" : ""}`}
                    />
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 ${
                      online ? "bg-green-500" : "bg-gray-400"
                    } shadow-sm`}
                    title={online ? "Online" : "Offline"}
                  />
                  {unseen > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white dark:border-gray-900">
                      {unseen}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span onClick={gotoProfile} className="hover:underline">
                      {o.firstName} {o.lastName}
                    </span>
                    {o.verified && <IoCheckmarkCircle className="text-blue-500 text-sm" />}
                  </div>

                  <div onClick={gotoProfile} className="text-sm text-gray-500 dark:text-gray-400 hover:underline truncate">
                    @{o.username}
                  </div>

                  {statusLine && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      <IoSparkles className="text-yellow-500 text-xs" />
                      {statusLine}
                    </div>
                  )}

                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                    {lastText}
                  </div>
                </div>

                {c.unread > 0 && (
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold rounded-full px-2.5 py-1 min-w-[1.5rem] text-center shadow-lg animate-pulse">
                    {c.unread}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {viewerOpen && viewerUser && (
        <StoryViewer
          user={viewerUser}
          stories={viewerStories}
          startIndex={0}
          onClose={() => setViewerOpen(false)}
          canDelete={false}
          onDeleteRequest={async (story) => {
            await deleteStory(story._id);
          }}
          onDeleted={() => {}}
          onViewed={({ userId }) => {
            if (!userId) return;
            setUnseenMap((prev) => ({ ...prev, [userId]: Math.max(0, (prev[userId] || 0) - 1) }));
          }}
        />
      )}
    </div>
  );
}