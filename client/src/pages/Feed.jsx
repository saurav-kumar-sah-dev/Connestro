import { useEffect, useContext, useState } from "react";
import { useLocation } from "react-router-dom";
import clsx from "clsx";

import { useTheme } from "../context/ThemeContext";
import { AppContext } from "../context/AppContext";
import API from "../api/axios";

import PostCard from "../components/PostCard";
import PostForm from "../components/PostForm";
import StoryBar from "../components/stories/StoryBar";
import ReelsRail from "../components/reels/ReelsRail";

import {
  Loader2,
  Inbox,
  Image as ImageIcon,
  Video,
  FileText,
  Link2,
  Grid3x3
} from "lucide-react";

const Spinner = () => (
  <div className="flex flex-col items-center justify-center gap-4">
    <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
      Loading your feed...
    </p>
  </div>
);

const EmptyStateIcon = ({ className }) => (
  <Inbox className={className} strokeWidth={1.5} />
);

const styles = {
  container: "min-h-screen py-6 sm:py-8 px-4 sm:px-6 transition-colors duration-500",
  containerLight: "bg-gradient-to-br from-gray-50 via-white to-gray-50",
  containerDark: "bg-gradient-to-br from-gray-950 via-gray-900 to-black",
  contentWrapper: "container mx-auto max-w-7xl",

  loadingContainer: "min-h-[70vh] flex flex-col justify-center items-center",
  
  headerCard: "relative mx-auto mb-8 max-w-5xl rounded-3xl border-2 p-6 sm:p-8 shadow-xl transition-all duration-300 overflow-hidden",
  headerCardLight: "border-gray-200 bg-white",
  headerCardDark: "border-gray-800 bg-gray-900",
  headerGradient: "absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500",
  headerTitle: "text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2",
  headerTagline: "text-base sm:text-lg text-gray-600 dark:text-gray-400",

  filterContainer: "flex flex-wrap gap-2 sm:gap-3 mb-8 justify-center",
  filterButton: "px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transform hover:scale-105 flex items-center gap-2",
  filterButtonActive: "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg",
  filterButtonInactive: "border-2 border-gray-300 text-gray-700 hover:border-blue-400 dark:border-gray-600 dark:text-gray-300 dark:hover:border-blue-500",
  filterButtonInactiveLight: "bg-white hover:bg-gray-50",
  filterButtonInactiveDark: "bg-gray-800 hover:bg-gray-700",

  postGrid: "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
  emptyStateContainer: "text-center py-20 px-6 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed",
  emptyStateContainerLight: "bg-gradient-to-br from-gray-100/50 to-gray-50 border-gray-300",
  emptyStateContainerDark: "bg-gradient-to-br from-gray-900/50 to-gray-950 border-gray-700",
  emptyStateIcon: "h-16 w-16 mb-4",
  emptyStateIconLight: "text-gray-400",
  emptyStateIconDark: "text-gray-600",
  emptyStateTitle: "text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2",
  emptyStateText: "text-base text-gray-500 dark:text-gray-400 max-w-md",
};

export default function Feed() {
  const { darkMode } = useTheme();
  const { posts, setPosts } = useContext(AppContext);
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const openStoryUser = params.get("openStoryUser");
  const openStoryId = params.get("openStoryId");

  const uniquePosts = (arr) => {
    const seen = new Set();
    return arr.filter((p) => {
      if (!p?._id) return false;
      if (seen.has(p._id)) return false;
      seen.add(p._id);
      return true;
    });
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await API.get("/posts");
      setPosts(uniquePosts(res.data));
    } catch (err) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);
  
  const typeMap = { images: "image", videos: "video", documents: "document", links: "link" };
  const matchesFilter = (post) => {
    if (post?.draft) return false;
    if (filter === "all") return true;
    const t = typeMap[filter];
    return Array.isArray(post.media) && post.media.some((m) => m.type === t);
  };

  const displayPosts = uniquePosts(posts).filter(matchesFilter);

  const filterButtons = [
    { key: "all", label: "All Posts", icon: Grid3x3 },
    { key: "images", label: "Images", icon: ImageIcon },
    { key: "videos", label: "Videos", icon: Video },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "links", label: "Links", icon: Link2 }
  ];

  if (loading) {
    return (
      <div className={clsx(styles.container, darkMode ? styles.containerDark : styles.containerLight)}>
        <div className={styles.loadingContainer}>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(styles.container, darkMode ? styles.containerDark : styles.containerLight)}>
      <div className={styles.contentWrapper}>
        {/* Header Card */}
        <div className={clsx(styles.headerCard, darkMode ? styles.headerCardDark : styles.headerCardLight)}>
          <div className={styles.headerGradient} />
          
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-500/10 to-blue-500/10 rounded-full blur-3xl -z-10"></div>
          
          <h1 className={styles.headerTitle}>
            Discover What's New
          </h1>
          <p className={styles.headerTagline}>
            The latest posts from your community, all in one place.
          </p>
        </div>

        {/* Stories */}
        <div className="mb-8">
          <StoryBar openUserId={openStoryUser} openStoryId={openStoryId} />
        </div>

        {/* Reels Rail */}
        <div className="mb-8">
          <ReelsRail limit={12} />
        </div>

        {/* Post Form */}
        <PostForm currentUser={currentUser} />

        {/* Media Filters */}
        <div className={styles.filterContainer}>
          {filterButtons.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              aria-pressed={filter === key}
              className={clsx(
                styles.filterButton,
                filter === key
                  ? styles.filterButtonActive
                  : [
                      styles.filterButtonInactive,
                      darkMode
                        ? styles.filterButtonInactiveDark
                        : styles.filterButtonInactiveLight,
                    ]
              )}
              onClick={() => setFilter(key)}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Post Grid */}
        {displayPosts.length ? (
          <div className={styles.postGrid}>
            {displayPosts.map((post) => {
              const postUser = post.user || { username: "Unknown", _id: null };
              const profileImage = postUser.profileImage || "/default-avatar.png";

              return (
                <PostCard
                  key={post._id}
                  post={{
                    ...post,
                    user: { ...postUser, profileImage },
                    comments: Array.isArray(post.comments)
                      ? post.comments
                          .filter(Boolean)
                          .map((c) => ({
                            ...c,
                            reactions: Array.isArray(c.reactions) ? c.reactions : [],
                            user: c.user || { username: "Unknown", _id: null, profileImage: "/default-avatar.png" },
                          }))
                      : [],
                  }}
                  currentUserId={currentUser.id}
                  hideFollowButton={false}
                  showAllComments={false}
                />
              );
            })}
          </div>
        ) : (
          <div className={clsx(styles.emptyStateContainer, darkMode ? styles.emptyStateContainerDark : styles.emptyStateContainerLight)}>
            <EmptyStateIcon className={clsx(styles.emptyStateIcon, darkMode ? styles.emptyStateIconDark : styles.emptyStateIconLight)} />
            <h3 className={styles.emptyStateTitle}>No Posts Found</h3>
            <p className={styles.emptyStateText}>
              {filter === "all" 
                ? "Be the first to share something new with your community!" 
                : `No ${filter} posts yet. Try selecting a different filter or create a new post!`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}