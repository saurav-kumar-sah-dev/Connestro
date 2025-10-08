import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  MoreVertical,
  Heart,
  Send,
  Edit3,
  Trash2,
  Flag,
  Share2,
  Globe,
  Users,
  Lock,
  ThumbsUp,
  Smile,
  Flame,
  Laugh,
} from "lucide-react";
import API from "../api/axios";
import { AppContext } from "../context/AppContext";
import { buildFileUrl } from "../utils/url";
import { createReport } from "../api/reports";
import PostShareModal from "./posts/PostShareModal";

function getVisibleStatus(status, ownerId, viewerId) {
  if (!status || (!status.text && !status.emoji)) return null;
  if (status.expiresAt && new Date(status.expiresAt) < new Date()) return null;
  const isOwner = String(ownerId) === String(viewerId);
  const vis = status.visibility || "public";
  if (!isOwner && vis !== "public") return null;
  return status;
}

const audienceLabel = (v) =>
  v === "followers" ? "Only followers" : v === "private" ? "Private" : "Public";

const safeUUID = () =>
  (typeof window !== "undefined" &&
    window.crypto &&
    window.crypto.randomUUID &&
    window.crypto.randomUUID()) ||
  Math.random().toString(36).slice(2) + Date.now().toString(36);

const humanFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const fileNameFromUrl = (url = "") => {
  try {
    const u = new URL(url, window.location.origin);
    return decodeURIComponent(u.pathname.split("/").pop() || "");
  } catch {
    const parts = String(url).split("/");
    return decodeURIComponent(parts.pop() || "");
  }
};

const extFromName = (name = "") => {
  const m = String(name)
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
};

const docIcon = (ext) => {
  switch (ext) {
    case "pdf":
      return "📄";
    case "doc":
    case "docx":
      return "📝";
    case "xls":
    case "xlsx":
      return "📊";
    case "ppt":
    case "pptx":
      return "📽️";
    case "csv":
      return "📑";
    case "txt":
      return "📃";
    default:
      return "📁";
  }
};

export default function PostCard({
  post,
  currentUserId,
  hideFollowButton,
  showAllComments = false,
  showCommentInput = false,
}) {
  const { socket, users, setUsers, posts, setPosts, drafts, setDrafts } =
    useContext(AppContext);
  const navigate = useNavigate();

  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState({});
  const [loadingLike, setLoadingLike] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [editMedia, setEditMedia] = useState([]);
  const [editLink, setEditLink] = useState("");
  const [showShare, setShowShare] = useState(false);

  if (!post || !post.user) return null;
  const postUser = post.user;

  const getUserData = (user, usersMap) => {
    if (!user)
      return {
        username: "Unknown",
        profileImage: "/default-avatar.png",
        _id: null,
      };
    const latestUser = usersMap[user._id] || user;
    const seed = new Date(latestUser.updatedAt || Date.now()).getTime();
    return {
      _id: latestUser._id || null,
      username: latestUser.username || "Unknown",
      profileImage: latestUser.profileImage
        ? buildFileUrl(latestUser.profileImage, seed)
        : "/default-avatar.png",
      status: latestUser.status || null,
    };
  };

  const userData = getUserData(postUser, users);
  const profileImageUrl = userData.profileImage;

  const st = getVisibleStatus(userData.status, postUser._id, currentUserId);
  const statusLine = st ? [st.emoji, st.text].filter(Boolean).join(" ") : "";

  const isLiked =
    Array.isArray(post.likes) &&
    post.likes.some((like) =>
      typeof like === "object"
        ? like._id === currentUserId
        : like === currentUserId
    );

  const isFollowing =
    Array.isArray(postUser.followers) &&
    postUser.followers.map((f) => (f?._id ? f._id : f)).includes(currentUserId);

  const goToProfile = () => {
    if (postUser._id) navigate(`/profile/${postUser._id}`);
  };

  useEffect(() => {
    if (!socket) return;

    const handleUserDeleted = (deletedUserId) => {
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

      setUsers((prev) => {
        const copy = { ...prev };
        if (copy[deletedUserId]) delete copy[deletedUserId];
        return copy;
      });
    };

    const handleUpdateProfileImage = ({ userId, profileImage, updatedAt }) => {
      const ts = updatedAt || Date.now();

      setUsers((prev) => {
        const u = prev[userId];
        if (!u) return prev;
        return { ...prev, [userId]: { ...u, profileImage, updatedAt: ts } };
      });

      setPosts((prev) =>
        prev.map((p) => {
          let next = p;

          if (String(p.user?._id) === String(userId)) {
            next = {
              ...next,
              user: { ...next.user, profileImage, updatedAt: ts },
            };
          }

          if (
            Array.isArray(next.comments) &&
            next.comments.some((c) => String(c?.user?._id) === String(userId))
          ) {
            next = {
              ...next,
              comments: next.comments.map((c) =>
                String(c?.user?._id) === String(userId)
                  ? { ...c, user: { ...c.user, profileImage, updatedAt: ts } }
                  : c
              ),
            };
          }

          if (
            Array.isArray(next.comments) &&
            next.comments.some((c) =>
              Array.isArray(c.replies)
                ? c.replies.some((r) => String(r?.user?._id) === String(userId))
                : false
            )
          ) {
            next = {
              ...next,
              comments: next.comments.map((c) => ({
                ...c,
                replies: Array.isArray(c.replies)
                  ? c.replies.map((r) =>
                      String(r?.user?._id) === String(userId)
                        ? {
                            ...r,
                            user: { ...r.user, profileImage, updatedAt: ts },
                          }
                        : r
                    )
                  : c.replies,
              })),
            };
          }

          return next;
        })
      );
    };

    socket.on("userDeleted", handleUserDeleted);
    socket.on("updateProfileImage", handleUpdateProfileImage);

    return () => {
      socket.off("userDeleted", handleUserDeleted);
      socket.off("updateProfileImage", handleUpdateProfileImage);
    };
  }, [socket, setPosts, setUsers]);

  const handleEditFileChange = (e) => setEditMedia([...e.target.files]);

  const handleLike = async () => {
    if (loadingLike) return;
    setLoadingLike(true);
    try {
      const res = await API.put(`/posts/like/${post._id}`);
      setPosts((prev) =>
        prev.map((p) =>
          p._id === post._id ? { ...p, likes: res.data.likes } : p
        )
      );
    } catch (err) {
      console.error("Like error:", err);
    } finally {
      setLoadingLike(false);
    }
  };

  const handleToggleFollow = async () => {
    if (loadingFollow || !postUser) return;
    setLoadingFollow(true);
    try {
      const endpoint = isFollowing ? "unfollow" : "follow";
      const res = await API.put(`/users/${postUser._id}/${endpoint}`);
      const updatedUser = res.data.user;

      setUsers((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));
      setPosts((prev) =>
        prev.map((p) =>
          p.user?._id === updatedUser._id ? { ...p, user: updatedUser } : p
        )
      );

      socket?.emit("updateFollow", {
        userId: updatedUser._id,
        currentUserId,
        follow: !isFollowing,
      });
    } catch (err) {
      console.error("Follow/unfollow error:", err);
    } finally {
      setLoadingFollow(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    try {
      await API.post(`/posts/comment/${post._id}`, { text });
      setCommentText("");
    } catch (err) {
      console.error("Comment error:", err);
    }
  };

  const handleReact = async (commentId, emoji) => {
    if (!commentId || !emoji) return;
    try {
      const res = await API.put(
        `/posts/${post._id}/comment/${commentId}/react`,
        { emoji }
      );
      setPosts((prev) =>
        prev.map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c._id === commentId
                    ? { ...c, reactions: res.data.reactions }
                    : c
                ),
              }
            : p
        )
      );
    } catch (err) {
      console.error("React error:", err.response?.data || err.message);
    }
  };

  const setReplyValue = (cid, v) =>
    setReplyText((prev) => ({ ...prev, [cid]: v }));

  const handleReplySubmit = async (commentId) => {
    const text = (replyText[commentId] || "").trim();
    if (!text) return;
    try {
      await API.post(`/posts/${post._id}/comment/${commentId}/reply`, { text });
      setReplyValue(commentId, "");
    } catch (err) {
      console.error("Reply error:", err);
    }
  };

  const handleReplyReact = async (commentId, replyId, emoji) => {
    if (!commentId || !replyId || !emoji) return;
    try {
      const res = await API.put(
        `/posts/${post._id}/comment/${commentId}/reply/${replyId}/react`,
        { emoji }
      );
      setPosts((prev) =>
        prev.map((p) =>
          p._id === post._id
            ? {
                ...p,
                comments: (p.comments || []).map((c) =>
                  c._id === commentId
                    ? {
                        ...c,
                        replies: (c.replies || []).map((r) =>
                          r._id === replyId
                            ? { ...r, reactions: res.data.reactions }
                            : r
                        ),
                      }
                    : c
                ),
              }
            : p
        )
      );
    } catch (err) {
      console.error("Reply react error:", err);
    }
  };

  const handleDeleteForEveryone = async () => {
    if (!window.confirm("Delete for everyone?")) return;
    try {
      await API.delete(`/posts/${post._id}`);
      setPosts((prev) => prev.filter((p) => p._id !== post._id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleEdit = async () => {
    try {
      const formData = new FormData();
      formData.append("content", editContent);
      if (editMedia.length > 0 || editLink.trim())
        formData.append("removeOldMedia", true);
      editMedia.forEach((file) => formData.append("media", file));
      if (editLink.trim()) formData.append("links", editLink);

      const res = await API.put(`/posts/${post._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPosts((prev) => prev.map((p) => (p._id === post._id ? res.data : p)));
      setIsEditing(false);
      setEditMedia([]);
      setEditLink("");
    } catch (err) {
      console.error("Edit error:", err);
    }
  };

  const changeAudience = async (aud) => {
    try {
      const res = await API.put(`/posts/${post._id}/edit`, { visibility: aud });
      setPosts((prev) => prev.map((p) => (p._id === post._id ? res.data : p)));
      setShowMenu(false);
    } catch (e) {
      console.error("Change audience error:", e);
    }
  };

  const publishAs = async (aud) => {
    try {
      const res = await API.put(`/posts/${post._id}/publish`, {
        visibility: aud,
      });
      setPosts((prev) => prev.map((p) => (p._id === post._id ? res.data : p)));
      setDrafts((prev) => prev.filter((p) => p._id !== post._id));
      setShowMenu(false);
    } catch (e) {
      console.error("Publish error:", e);
    }
  };

  const reportPost = async () => {
    const reason = window.prompt(
      "Reason (spam, abuse, nudity, violence, harassment, hate, misinformation, other):",
      "spam"
    );
    if (!reason) return;
    const details = window.prompt("Details (optional):", "");
    try {
      await createReport({
        targetType: "post",
        postId: post._id,
        reason: String(reason).trim().toLowerCase(),
        details: details || "",
      });
      alert("Report submitted. Thank you.");
    } catch (e) {
      console.error("Report error:", e);
      alert(e.response?.data?.msg || "Failed to submit report");
    }
  };

  const visibleComments = (Array.isArray(post.comments) ? post.comments : [])
    .filter(Boolean)
    .map((c) => ({
      _id: c._id || safeUUID(),
      text: c.text || "",
      reactions: Array.isArray(c.reactions) ? c.reactions : [],
      user: getUserData(c.user, users),
      replies: Array.isArray(c.replies)
        ? c.replies.filter(Boolean).map((r) => ({
            _id: r._id || safeUUID(),
            text: r.text || "",
            reactions: Array.isArray(r.reactions) ? r.reactions : [],
            user: getUserData(r.user, users),
          }))
        : [],
    }));

  const commentsToShow = showAllComments
    ? visibleComments
    : visibleComments.slice(-1);

  const AudienceIcon =
    post.visibility === "private"
      ? Lock
      : post.visibility === "followers"
      ? Users
      : Globe;

  return (
    <div className="relative rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500" />

      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div
            className="flex items-start gap-3 cursor-pointer flex-1"
            onClick={goToProfile}
          >
            <div className="relative">
              <img
                src={profileImageUrl}
                alt={userData.username}
                className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700 shadow-md hover:scale-105 transition-transform duration-200"
              />
              {/* online/offline indicator removed */}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate">
                {userData.username}
              </p>
              {statusLine && (
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate flex items-center gap-1">
                  ✨ {statusLine}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {post.createdAt
                    ? new Date(post.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300">
                  <AudienceIcon className="w-3 h-3" />
                  {audienceLabel(post.visibility || "public")}
                </span>
                {post.draft && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                    Draft
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!hideFollowButton && postUser._id !== currentUserId && (
              <button
                onClick={handleToggleFollow}
                disabled={loadingFollow}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                  isFollowing
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md"
                } disabled:opacity-50`}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}

            {postUser._id !== currentUserId && (
              <button
                onClick={reportPost}
                className="p-2 rounded-xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 transition-all"
                title="Report this post"
              >
                <Flag className="w-4 h-4" />
              </button>
            )}

            {!post.draft && (
              <button
                onClick={() => setShowShare(true)}
                className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md transform hover:scale-105 transition-all"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {postUser._id === currentUserId && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Post menu"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-64 z-50 overflow-hidden">
                      {post.draft ? (
                        <>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                            Publish as
                          </div>
                          {[
                            { value: "public", label: "Public", icon: Globe },
                            {
                              value: "followers",
                              label: "Followers Only",
                              icon: Users,
                            },
                            { value: "private", label: "Private", icon: Lock },
                          ].map(({ value, label, icon: Icon }) => (
                            <button
                              key={value}
                              onClick={() => publishAs(value)}
                              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-left"
                            >
                              <Icon className="w-4 h-4" />
                              {label}
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                            Change audience
                          </div>
                          {[
                            { value: "public", label: "Public", icon: Globe },
                            {
                              value: "followers",
                              label: "Followers Only",
                              icon: Users,
                            },
                            { value: "private", label: "Private", icon: Lock },
                          ].map(({ value, label, icon: Icon }) => (
                            <button
                              key={value}
                              onClick={() => changeAudience(value)}
                              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-left"
                            >
                              <Icon className="w-4 h-4" />
                              {label}
                            </button>
                          ))}

                          <button
                            onClick={async () => {
                              await API.put(`/posts/${post._id}/draft`);
                              const updatedPost = { ...post, draft: true };
                              setPosts((prev) =>
                                prev.map((p) =>
                                  p._id === post._id ? updatedPost : p
                                )
                              );
                              setDrafts((prev) =>
                                prev.some((p) => p._id === post._id)
                                  ? prev
                                  : [...prev, updatedPost]
                              );
                              setShowMenu(false);
                            }}
                            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors border-t border-gray-200 dark:border-gray-700"
                          >
                            <Edit3 className="w-4 h-4" />
                            Save as Draft
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors border-t border-gray-200 dark:border-gray-700"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={handleDeleteForEveryone}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors border-t border-gray-200 dark:border-gray-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="mt-4 space-y-3">
            <textarea
              className="w-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              placeholder="Update your post..."
            />
            <input
              type="file"
              multiple
              onChange={handleEditFileChange}
              className="text-sm file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-blue-600 file:to-purple-600 file:text-white hover:file:from-blue-700 hover:file:to-purple-700 file:font-medium file:cursor-pointer"
            />
            <input
              type="text"
              placeholder="Add a link..."
              value={editLink}
              onChange={(e) => setEditLink(e.target.value)}
              className="w-full border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg transform hover:scale-105 transition-all"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="mb-4 text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap text-base">
              {post.content}
            </p>
          )
        )}

        {/* Media */}
        {post.media?.map((m) => {
          if (m.type === "image") {
            return (
              <div
                key={m._id || m.url}
                className="mb-4 overflow-hidden rounded-2xl border-2 border-gray-200 dark:border-gray-800"
              >
                <img
                  src={buildFileUrl(m.url)}
                  alt="post"
                  className="w-full max-h-[32rem] object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            );
          }
          if (m.type === "video") {
            return (
              <div
                key={m._id || m.url}
                className="mb-4 overflow-hidden rounded-2xl border-2 border-gray-200 dark:border-gray-800"
              >
                <video controls className="w-full rounded-2xl">
                  <source src={buildFileUrl(m.url)} />
                </video>
              </div>
            );
          }
          if (m.type === "document") {
            const name = m.name || fileNameFromUrl(m.url) || "document";
            const ext = extFromName(name);
            const sizeLabel = humanFileSize(m.sizeBytes);
            const icon = docIcon(ext);
            const href = buildFileUrl(m.url);
            return (
              <div key={m._id || m.url} className="mb-4">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 border-2 border-gray-200 dark:border-gray-800 rounded-2xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-950/20 dark:hover:to-purple-950/20 transition-all transform hover:scale-[1.02] shadow-md"
                  title={name}
                >
                  <span className="text-3xl">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate text-gray-800 dark:text-gray-200">
                      {name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {ext ? ext.toUpperCase() : "DOC"}{" "}
                      {sizeLabel ? `• ${sizeLabel}` : ""}
                    </div>
                  </div>
                </a>
              </div>
            );
          }
          if (m.type === "link") {
            return (
              <div key={m._id || m.url} className="mb-4">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline break-all font-medium"
                  title={m.url}
                >
                  🔗 {m.url}
                </a>
              </div>
            );
          }
          return null;
        })}

        {/* Actions */}
        <div className="flex items-center gap-6 mb-4 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleLike}
            disabled={loadingLike}
            className={`inline-flex items-center gap-2 font-semibold transition-all transform hover:scale-110 ${
              isLiked
                ? "text-red-600 dark:text-red-400"
                : "text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
            } ${loadingLike ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            <span>{Array.isArray(post.likes) ? post.likes.length : 0}</span>
          </button>
          <button
            onClick={() => navigate(`/post/${post._id}`)}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 font-semibold transition-all transform hover:scale-110"
          >
            <MessageCircle className="w-5 h-5" />
            <span>
              {(Array.isArray(post.comments)
                ? post.comments.filter(Boolean)
                : []
              ).length || 0}
            </span>
          </button>
        </div>

        {/* Comments */}
        {commentsToShow.map((c, idx) => (
          <div
            key={c._id || `comment-${idx}`}
            className="mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl"
          >
            <div className="flex items-start gap-3">
              <img
                src={c.user.profileImage}
                alt={c.user.username}
                className="w-10 h-10 rounded-full object-cover cursor-pointer ring-2 ring-gray-200 dark:ring-gray-700 hover:scale-110 transition-transform"
                onClick={() => c.user._id && navigate(`/profile/${c.user._id}`)}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  <span
                    className="font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    onClick={() =>
                      c.user._id && navigate(`/profile/${c.user._id}`)
                    }
                  >
                    {c.user.username}
                  </span>{" "}
                  {c.text}
                </p>

                <div className="flex gap-2 mt-2">
                  {[
                    { emoji: "👍", icon: ThumbsUp },
                    { emoji: "❤️", icon: Heart },
                    { emoji: "😂", icon: Laugh },
                    { emoji: "🔥", icon: Flame },
                  ].map(({ emoji, icon: Icon }) => (
                    <button
                      key={emoji}
                      disabled={!c._id}
                      onClick={() => c._id && handleReact(c._id, emoji)}
                      className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors text-sm disabled:opacity-50"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline ml-2"
                    onClick={() =>
                      setReplyValue(
                        c._id,
                        replyText[c._id] !== undefined ? replyText[c._id] : ""
                      )
                    }
                  >
                    Reply
                  </button>
                </div>

                {c.reactions.length > 0 && (
                  <div className="flex gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {Object.entries(
                      c.reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count], idx2) => (
                      <span
                        key={`${emoji}-${idx2}`}
                        className="bg-white dark:bg-gray-700 px-2 py-1 rounded-full"
                      >
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                )}

                {replyText[c._id] !== undefined && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl flex-1 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Write a reply..."
                      value={replyText[c._id] || ""}
                      onChange={(e) => setReplyValue(c._id, e.target.value)}
                    />
                    <button
                      onClick={() => handleReplySubmit(c._id)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md transform hover:scale-105 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {Array.isArray(c.replies) && c.replies.length > 0 && (
                  <div className="mt-4 ml-6 space-y-3">
                    {c.replies.map((r) => (
                      <div key={r._id} className="flex items-start gap-2">
                        <img
                          src={r.user.profileImage}
                          alt={r.user.username}
                          className="w-8 h-8 rounded-full object-cover cursor-pointer ring-2 ring-gray-200 dark:ring-gray-700"
                          onClick={() =>
                            r.user._id && navigate(`/profile/${r.user._id}`)
                          }
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            <span
                              className="font-bold cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                              onClick={() =>
                                r.user._id && navigate(`/profile/${r.user._id}`)
                              }
                            >
                              {r.user.username}
                            </span>{" "}
                            {r.text}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            {["👍", "❤️", "😂", "🔥"].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() =>
                                  handleReplyReact(c._id, r._id, emoji)
                                }
                                className="text-sm p-1 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          {Array.isArray(r.reactions) &&
                            r.reactions.length > 0 && (
                              <div className="flex gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                {Object.entries(
                                  r.reactions.reduce((acc, rx) => {
                                    acc[rx.emoji] = (acc[rx.emoji] || 0) + 1;
                                    return acc;
                                  }, {})
                                ).map(([emoji, count]) => (
                                  <span
                                    key={emoji}
                                    className="bg-white dark:bg-gray-700 px-2 py-1 rounded-full"
                                  >
                                    {emoji} {count}
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {showCommentInput && (
          <form onSubmit={handleComment} className="mt-4 flex gap-2">
            <input
              type="text"
              className="border-2 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl flex-1 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        )}

        {showShare && (
          <PostShareModal
            open={showShare}
            onClose={() => setShowShare(false)}
            post={post}
          />
        )}
      </div>
    </div>
  );
}
