import { useEffect, useContext, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import useFollow from "../hooks/useFollow";
import API from "../api/axios";
import { buildFileUrl } from "../utils/url";

// NEW: stories
import {
  getActiveStoriesMap,
  getUserStories,
  deleteStory,
  getUnseenStoriesMap,
} from "../api/stories";
import StoryViewer from "../components/stories/StoryViewer";

export default function FollowersFollowingPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const { users, setUsers } = useContext(AppContext);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const { toggleFollow } = useFollow(currentUser?.id);
  const navigate = useNavigate();

  const [user, setUser] = useState(users[id] || null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(state?.type || "followers");

  // NEW: stories active map + unseen + viewer
  const [activeMap, setActiveMap] = useState({});
  const [unseenMap, setUnseenMap] = useState({});
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUser, setViewerUser] = useState(null);
  const [viewerStories, setViewerStories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const resUser = await API.get(`/users/${id}`);
        setUser(resUser.data);
        setUsers((prev) => ({ ...prev, [id]: resUser.data }));

        const resList = await API.get(`/users/${id}/${tab}`);
        const normalized = resList.data.map((u) => ({
          ...u,
          _id: u._id.toString(),
        }));
        setList(normalized);

        normalized.forEach((u) =>
          setUsers((prev) => ({ ...prev, [u._id]: { ...prev[u._id], ...u } }))
        );

        // NEW: load active + unseen stories map
        if (normalized.length) {
          const ids = normalized.map((u) => u._id);
          const act = await getActiveStoriesMap(ids);
          setActiveMap(act.data?.map || {});
          const unseen = await getUnseenStoriesMap(ids);
          setUnseenMap(unseen.data?.map || {});
        } else {
          setActiveMap({});
          setUnseenMap({});
        }
      } catch (err) {
        console.error("Error fetching list:", err);
        setList([]);
        setActiveMap({});
        setUnseenMap({});
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, tab, setUsers]);

  const handleToggleFollow = async (targetUser) => {
    try {
      await toggleFollow(targetUser);
    } catch (err) {
      console.error("Follow/unfollow error:", err);
    }
  };

  // NEW: open a user's stories viewer
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

  if (loading)
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-xl text-center text-slate-600 dark:text-slate-300">
          Loading…
        </div>
      </div>
    );
  if (!user)
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-xl text-center text-slate-600 dark:text-slate-300">
          User not found
        </div>
      </div>
    );

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header card with tabs */}
      <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-5 mb-6">
        <div className="absolute -top-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 rounded-t-2xl" />
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 text-center">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          @{user.username}
        </p>

        <div className="mt-4 flex justify-center gap-3">
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              tab === "followers"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            }`}
            onClick={() => setTab("followers")}
          >
            Followers ({user.followers?.length || 0})
          </button>
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium ${
              tab === "following"
                ? "bg-blue-600 text-white"
                : "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            }`}
            onClick={() => setTab("following")}
          >
            Following ({user.following?.length || 0})
          </button>
        </div>
      </div>

      {/* List */}
      <ul className="space-y-4">
        {list.map((u) => {
          const latest = users[u._id] || u;
          const isFollowing =
            Array.isArray(latest.followers) &&
            latest
              .followers
              .map((f) => (f?._id ? f._id : f))
              .includes(currentUser.id);

          const avatarUrl = latest.profileImage
            ? buildFileUrl(latest.profileImage)
            : "/default-avatar.png";

          const hasStories = (activeMap[latest._id] || 0) > 0;
          const unseen = unseenMap[latest._id] || 0;
          const ringClass = hasStories
            ? unseen > 0
              ? "bg-gradient-to-tr from-pink-500 to-yellow-500"
              : "bg-gray-300"
            : "";

          return (
            <li
              key={u._id}
              className="flex justify-between items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-3"
            >
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => navigate(`/profile/${u._id}`)}
              >
                {/* Story ring and click to view stories */}
                <div
                  className={hasStories ? `rounded-full p-[2px] ${ringClass}` : ""}
                  title={hasStories ? "View stories" : ""}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasStories) openUserStories(latest);
                  }}
                >
                  <img
                    src={avatarUrl}
                    alt={latest.username}
                    className={`w-11 h-11 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-800 ${
                      hasStories ? "bg-white p-[1px]" : ""
                    }`}
                  />
                </div>

                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                    {latest.firstName} {latest.lastName}
                    <span className="text-slate-500 dark:text-slate-400">
                      {" "}
                      (@{latest.username})
                    </span>
                  </p>
                </div>
              </div>

              {latest._id !== currentUser.id && (
                <button
                  onClick={() => handleToggleFollow(latest)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isFollowing
                      ? "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* Story viewer */}
      {viewerOpen && viewerUser && (
        <StoryViewer
          user={viewerUser}
          stories={viewerStories}
          startIndex={0}
          onClose={() => setViewerOpen(false)}
          canDelete={String(viewerUser?._id) === String(currentUser.id)}
          onDeleteRequest={async (story) => {
            await deleteStory(story._id);
          }}
          onDeleted={(storyId) => {
            setViewerStories((prev) =>
              prev.filter((s) => String(s._id) !== String(storyId))
            );
            // If that user had no more stories, update the ring maps to remove the ring
            if (viewerStories.length <= 1) {
              setActiveMap((prev) => ({ ...prev, [viewerUser._id]: 0 }));
              setUnseenMap((prev) => ({ ...prev, [viewerUser._id]: 0 }));
            }
          }}
          onViewed={({ userId }) => {
            if (!userId) return;
            setUnseenMap((prev) => ({
              ...prev,
              [userId]: Math.max(0, (prev[userId] || 0) - 1),
            }));
          }}
        />
      )}
    </div>
  );
}