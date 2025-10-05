import { useEffect, useContext, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import useFollow from "../hooks/useFollow";
import PostCard from "../components/PostCard";
import PostForm from "../components/PostForm";
import API from "../api/axios";
import EditProfileModal from "../components/ProfileRelated/EditProfileModal";
import EditEnhancedProfileModal from "../components/ProfileRelated/EditEnhancedProfileModal";
import ViewEnhancedProfileModal from "../components/ProfileRelated/ViewEnhancedProfileModal";
import { buildFileUrl } from "../utils/url";
import { ChatContext } from "../context/ChatContext";
import { createReport } from "../api/reports";
import StatusModal from "../components/ProfileRelated/StatusModal";

// Stories
import { getActiveStoriesMap, getUserStories, deleteStory, getUnseenStoriesMap } from "../api/stories";
import StoryViewer from "../components/stories/StoryViewer";

// Reels
import UserReelsList from "../components/reels/UserReelsList";
import UserReelDrafts from "../components/reels/UserReelDrafts";
import ReelComposer from "../components/reels/ReelComposer";
// NEW: Thumbnail grid for published reels
import ReelsThumbGrid from "../components/reels/ReelsThumbGrid";

export default function Profile() {
  const { id } = useParams();
  const { users, setUsers, posts, setPosts, socket, drafts, setDrafts } = useContext(AppContext);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const { toggleFollow } = useFollow(currentUser?.id);
  const navigate = useNavigate();

  const me = JSON.parse(localStorage.getItem("user") || "{}");
  const { openConversationWithUser } = useContext(ChatContext);
  const isOwn = String(me?.id) === String(users[id]?._id || "");

  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEnhancedModal, setShowEnhancedModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Stories ring + viewer
  const [hasStory, setHasStory] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStories, setViewerStories] = useState([]);

  // Posts filter + tab
  const [pFilter, setPFilter] = useState("all");
  const [tab, setTab] = useState("posts"); // "posts" | "reels"
  const [reelsTab, setReelsTab] = useState("published"); // "published" | "drafts"
  const [showReelComposer, setShowReelComposer] = useState(false);
  const [draftsRefreshKey, setDraftsRefreshKey] = useState(0);

  const user = users[id];

  const isFollowing =
    Array.isArray(user?.followers) &&
    user.followers.map((f) => (f?._id ? f._id : f)).includes(currentUser.id);

  // Stable hooks BEFORE conditional returns
  const typeMap = useMemo(
    () => ({ images: "image", videos: "video", documents: "document", links: "link" }),
    []
  );
  const userPublishedPosts = useMemo(
    () => (posts || []).filter((p) => p.user?._id === id && !p.draft),
    [posts, id]
  );
  const filteredPublished = useMemo(() => {
    if (pFilter === "all") return userPublishedPosts;
    if (pFilter === "drafts") return [];
    const t = typeMap[pFilter];
    return userPublishedPosts.filter(
      (p) => Array.isArray(p.media) && p.media.some((m) => m.type === t)
    );
  }, [userPublishedPosts, pFilter, typeMap]);
  const visiblePosts = pFilter === "drafts" ? drafts : filteredPublished;

  // Dedupe
  const uniqueById = (arr = []) => {
    const seen = new Set();
    const out = [];
    for (const p of arr) {
      const pid = p?._id ? String(p._id) : "";
      if (!pid || seen.has(pid)) continue;
      seen.add(pid);
      out.push(p);
    }
    return out;
  };
  const dedupedVisible = uniqueById(visiblePosts);

  // Load user
  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      try {
        if (users[id]) return setLoading(false);
        const res = await API.get(`/users/${id}`);
        if (isMounted) setUsers((prev) => ({ ...prev, [id]: res.data }));
      } catch (err) {
        console.error("Load user error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadUser();
    return () => {
      isMounted = false;
    };
  }, [id, users, setUsers]);

  // Stories active + unseen
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!id) return;
        const res = await getActiveStoriesMap([id]);
        const count = res.data?.map?.[id] || 0;
        if (mounted) setHasStory(count > 0);

        const unseen = await getUnseenStoriesMap([id]);
        if (mounted) setUnseenCount(unseen.data?.map?.[id] || 0);
      } catch {
        if (mounted) {
          setHasStory(false);
          setUnseenCount(0);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Load drafts when own profile and drafts filter selected
  useEffect(() => {
    if (!isOwn) return;
    if (pFilter !== "drafts") return;
    (async () => {
      try {
        const res = await API.get("/posts/drafts");
        setDrafts(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to load drafts:", e);
        setDrafts([]);
      }
    })();
  }, [isOwn, pFilter, setDrafts]);

  // Socket updates (same as before, unchanged)
  useEffect(() => {
    if (!socket) return;

    const handleFollowUpdate = ({ userId, currentUserId, follow }) => {
      setUsers((prev) => {
        const u = prev[userId];
        if (!u) return prev;
        const followers = Array.isArray(u.followers) ? [...u.followers] : [];
        const updatedFollowers = follow
          ? [
              ...new Set([
                ...followers.filter((f) => f?._id !== currentUserId),
                { _id: currentUserId },
              ]),
            ]
          : followers.filter((f) => f?._id !== currentUserId);
        return { ...prev, [userId]: { ...u, followers: updatedFollowers } };
      });

      setPosts((prev) =>
        prev.map((p) =>
          p.user?._id === userId
            ? {
                ...p,
                user: {
                  ...p.user,
                  followers: follow
                    ? [...new Set([...(p.user.followers || []), currentUserId])]
                    : (p.user.followers || []).filter((f) => f !== currentUserId),
                },
              }
            : p
        )
      );
    };

    const handleEnhancedProfileUpdate = (payload) => {
      const raw = payload?.updatedUser || payload;
      if (!raw) return;
      const updatedUser = { ...raw, _id: raw._id || raw.id };
      if (!updatedUser._id) return;
      if (String(updatedUser._id) === String(currentUser.id)) return;

      setUsers((prev) => ({ ...prev, [updatedUser._id]: updatedUser }));
      setPosts((prev) =>
        prev.map((p) =>
          p.user?._id === updatedUser._id ? { ...p, user: updatedUser } : p
        )
      );
    };

    const handleUpdateProfileImage = ({ userId, profileImage, updatedAt }) => {
      const ts = updatedAt || Date.now();
      setUsers((prev) => {
        const u = prev[userId];
        if (!u) return prev;
        return { ...prev, [userId]: { ...u, profileImage, updatedAt: ts } };
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.user?._id === userId
            ? { ...p, user: { ...p.user, profileImage, updatedAt: ts } }
            : p
        )
      );
    };

    const handleUserDeleted = (deletedUserId) => {
      setUsers((prev) => {
        const copy = { ...prev };
        if (copy[deletedUserId]) delete copy[deletedUserId];
        return copy;
      });

      setPosts((prev) =>
        prev
          .filter((p) => (p.user?._id || p.user) !== deletedUserId)
          .map((p) => {
            const likes = Array.isArray(p.likes)
              ? p.likes.filter((l) => {
                  if (!l) return false;
                  if (typeof l === "object")
                    return String(l._id || l) !== String(deletedUserId);
                  return String(l) !== String(deletedUserId);
                })
              : [];

            const comments = Array.isArray(p.comments)
              ? p.comments
                  .filter(Boolean)
                  .map((c) => {
                    const reactions = Array.isArray(c.reactions)
                      ? c.reactions.filter((r) => String(r.user) !== String(deletedUserId))
                      : [];
                    return { ...c, reactions };
                  })
                  .filter(
                    (c) =>
                      String(c.user?._id || c.user || "") !==
                      String(deletedUserId)
                  )
              : [];

            return { ...p, likes, comments };
          })
      );

      if (id === deletedUserId) navigate("/login");
    };

    socket.on("updateFollow", handleFollowUpdate);
    socket.on("updateEnhancedProfile", handleEnhancedProfileUpdate);
    socket.on("updateProfileImage", handleUpdateProfileImage);
    socket.on("userDeleted", handleUserDeleted);

    return () => {
      socket.off("updateFollow", handleFollowUpdate);
      socket.off("updateEnhancedProfile", handleEnhancedProfileUpdate);
      socket.off("updateProfileImage", handleUpdateProfileImage);
      socket.off("userDeleted", handleUserDeleted);
    };
  }, [socket, users, setUsers, setPosts, id, navigate, currentUser]);

  // Early returns
  if (loading) return <p className="text-center mt-10 text-slate-600 dark:text-slate-300">Loading...</p>;
  if (!user) return <p className="text-center mt-10 text-slate-600 dark:text-slate-300">User not found</p>;

  const profileImageUrl = user.profileImage
    ? buildFileUrl(user.profileImage, new Date(user.updatedAt || Date.now()).getTime())
    : "/default-avatar.png";

  const isSelf = user._id === currentUser.id;

  // Visible status
  const visibleStatus = (() => {
    const s = user?.status || null;
    if (!s || (!s.text && !s.emoji)) return null;
    if (s.expiresAt && new Date(s.expiresAt) < new Date()) return null;
    const isOwner = String(user._id) === String(currentUser.id);
    const vis = s.visibility || "public";
    if (!isOwner && vis !== "public") return null;
    return s;
  })();

  const statusLine = visibleStatus ? [visibleStatus.emoji, visibleStatus.text].filter(Boolean).join(" ") : "";

  const onStatusSaved = (st) => {
    setUsers((prev) => ({ ...prev, [id]: { ...prev[id], status: st || null } }));
  };
  const onStatusCleared = () => {
    setUsers((prev) => ({ ...prev, [id]: { ...prev[id], status: null } }));
  };

  // Open this user's stories
  const openStories = async () => {
    try {
      const res = await getUserStories(id);
      const list = res.data?.stories || [];
      if (list.length) {
        setViewerStories(list);
        setViewerOpen(true);
      }
    } catch (e) {
      console.error("load user stories failed", e);
    }
  };

  const ringClass = hasStory
    ? isSelf || unseenCount > 0
      ? "bg-gradient-to-tr from-pink-500 to-yellow-500"
      : "bg-gray-300"
    : "";

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="relative max-w-2xl mx-auto mb-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow p-6 md:p-7 flex flex-col items-center">
        <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 rounded-t-2xl" />

        <div
          className={hasStory ? `rounded-full p-[3px] ${ringClass} cursor-pointer` : ""}
          onClick={hasStory ? openStories : undefined}
          title={hasStory ? "View stories" : ""}
        >
          <img
            src={profileImageUrl}
            alt="Profile"
            className={`w-24 h-24 rounded-full object-cover mb-4 ring-1 ring-slate-200 dark:ring-slate-800 ${hasStory ? "bg-white p-[2px]" : ""}`}
          />
        </div>

        <h2 className="text-2xl font-bold mb-1 text-slate-900 dark:text-slate-100 text-center">
          {user.firstName} {user.lastName} <span className="text-slate-500 dark:text-slate-400">(@{user.username})</span>
        </h2>

        <div className="mb-2 text-center min-h-[1.25rem]">
          {statusLine ? (
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {statusLine}
              {visibleStatus?.expiresAt && (
                <span className="text-slate-500 dark:text-slate-400"> • until {new Date(visibleStatus.expiresAt).toLocaleString()}</span>
              )}
            </div>
          ) : (
            isSelf && <div className="text-sm text-slate-400">No status</div>
          )}
        </div>

        {user.bio && <p className="mb-2 text-center text-slate-700 dark:text-slate-300">{user.bio}</p>}

        {/* Followers / Following */}
        <p
          className="mb-1 cursor-pointer hover:underline text-slate-700 dark:text-slate-300"
          onClick={() =>
            navigate(`/profile/${user._id}/followers`, {
              state: { type: "followers" },
            })
          }
        >
          <strong>Followers:</strong> {user.followers?.length || 0}
        </p>
        <p
          className="mb-3 cursor-pointer hover:underline text-slate-700 dark:text-slate-300"
          onClick={() =>
            navigate(`/profile/${user._id}/following`, {
              state: { type: "following" },
            })
          }
        >
          <strong>Following:</strong> {user.following?.length || 0}
        </p>

        {/* Action Buttons */}
        {isSelf ? (
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={() => setShowStatusModal(true)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
              {statusLine ? "Update Status" : "Set Status"}
            </button>
            <button onClick={() => setShowEditModal(true)} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              Edit Profile
            </button>
            <button onClick={() => setShowEnhancedModal(true)} className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
              Enhance Profile
            </button>

            <Link to="/settings/password" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              {currentUser?.passwordSet ? "Change Password" : "Set Password"}
            </Link>

            <button
              onClick={async () => {
                if (!window.confirm("Are you sure? This will permanently delete your account and data.")) return;
                try {
                  await API.delete("/users/delete");
                  localStorage.removeItem("token");
                  localStorage.removeItem("user");
                  setPosts([]);
                  setUsers({});
                  socket?.disconnect();
                  navigate("/login");
                } catch (err) {
                  console.error("Delete account error:", err);
                  alert("Failed to delete account. Try again.");
                }
              }}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
            >
              Delete Account
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={() => setShowEnhancedModal(true)} className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
              View Details
            </button>
            <button
              onClick={async () => {
                try {
                  await toggleFollow(user);
                } catch (err) {
                  console.error(err);
                }
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                isFollowing
                  ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isFollowing ? "Unfollow" : "Follow"}
            </button>

            <button
              onClick={async () => {
                const reason = window.prompt(
                  "Reason (spam, abuse, nudity, violence, harassment, hate, misinformation, other):",
                  "spam"
                );
                if (!reason) return;
                const details = window.prompt("Details (optional):", "");
                try {
                  await createReport({
                    targetType: "user",
                    targetUserId: user._id,
                    reason: String(reason).trim().toLowerCase(),
                    details: details || "",
                  });
                  alert("Report submitted. Thank you.");
                } catch (e) {
                  console.error("Report error:", e);
                  alert(e.response?.data?.msg || "Failed to submit report");
                }
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              title="Report this user"
            >
              Report
            </button>

            <button
              onClick={() => openConversationWithUser(user._id, navigate)}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Message
            </button>
          </div>
        )}

        {showEditModal && (
          <EditProfileModal
            user={user}
            onClose={() => setShowEditModal(false)}
            onUpdate={(updatedUser) => setUsers((prev) => ({ ...prev, [id]: updatedUser }))}
          />
        )}

        {showEnhancedModal &&
          (isOwn ? (
            <EditEnhancedProfileModal
              user={user}
              onClose={() => setShowEnhancedModal(false)}
              onUpdate={(updatedUser) => setUsers((prev) => ({ ...prev, [id]: updatedUser }))}
            />
          ) : (
            <ViewEnhancedProfileModal user={user} onClose={() => setShowEnhancedModal(false)} />
          ))}

        {showStatusModal && (
          <StatusModal
            initial={user.status || null}
            onClose={() => setShowStatusModal(false)}
            onSaved={(st) => setUsers((prev) => ({ ...prev, [id]: { ...prev[id], status: st || null } }))}
            onCleared={() => setUsers((prev) => ({ ...prev, [id]: { ...prev[id], status: null } }))}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-5">
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            tab === "posts" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"
          }`}
          onClick={() => setTab("posts")}
        >
          Posts
        </button>
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${
            tab === "reels" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"
          }`}
          onClick={() => setTab("reels")}
        >
          Reels
        </button>
      </div>

      {tab === "posts" ? (
        <>
          {isOwn && <PostForm currentUser={currentUser} />}

          {/* Profile post filters */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            {["all", "images", "videos", "documents", "links", ...(isOwn ? ["drafts"] : [])].map((f) => (
              <button
                key={f}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  pFilter === f ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                }`}
                onClick={() => setPFilter(f)}
              >
                {f[0].toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <h3 className="text-xl font-bold mb-4 text-center text-slate-900 dark:text-slate-100">Posts</h3>
          {dedupedVisible.length ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {dedupedVisible.map((post) => (
                <PostCard key={post._id} post={post} currentUserId={currentUser.id} hideFollowButton />
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400">
              {pFilter === "drafts" ? "No drafts yet." : "No posts match this filter."}
            </p>
          )}
        </>
      ) : (
        <>
          {/* Reels sub-tabs */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                reelsTab === "published" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"
              }`}
              onClick={() => setReelsTab("published")}
            >
              Published
            </button>
            {isOwn && (
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  reelsTab === "drafts" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                }`}
                onClick={() => setReelsTab("drafts")}
              >
                Drafts
              </button>
            )}
            {isOwn && (
              <button
                onClick={() => setShowReelComposer(true)}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 ml-1"
              >
                Upload Reel
              </button>
            )}
          </div>

          {/* Published grid or Drafts list */}
          {reelsTab === "published" ? (
            <ReelsThumbGrid userId={id} />
          ) : isOwn ? (
            <UserReelDrafts
              currentUserId={currentUser.id}
              refreshKey={draftsRefreshKey}
              onPublished={() => {
                setReelsTab("published");
              }}
            />
          ) : null}
        </>
      )}

      {/* Story viewer */}
      

      {/* Reel composer modal */}
      {showReelComposer && (
        <ReelComposer
          onClose={() => setShowReelComposer(false)}
          onUploaded={(reel) => {
            if (reel?.draft) {
              setReelsTab("drafts");
              setDraftsRefreshKey((k) => k + 1);
            } else if (reel) {
              setReelsTab("published");
            }
          }}
        />
      )}
    </div>
  );
}