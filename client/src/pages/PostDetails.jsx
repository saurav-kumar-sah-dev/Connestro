import { useParams, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import API from "../api/axios";
import PostCard from "../components/PostCard";
import { ArrowLeft, Loader2, FileQuestion } from "lucide-react";

export default function PostDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { posts, setPosts } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const cachedPost = posts.find((p) => p._id === id);
    if (cachedPost) {
      setPost(cachedPost);
      setLoading(false);
    }

    const loadPost = async () => {
      try {
        const res = await API.get(`/posts/${id}`);
        const fetchedPost = {
          ...res.data,
          comments: Array.isArray(res.data.comments)
            ? res.data.comments
                .filter(Boolean)
                .map((c) => ({
                  ...c,
                  text: c.text || "",
                  reactions: Array.isArray(c.reactions) ? c.reactions : [],
                  user:
                    c.user || {
                      username: "Unknown",
                      _id: null,
                      profileImage: "/default-avatar.png",
                    },
                }))
            : [],
          user:
            res.data.user || {
              username: "Unknown",
              _id: null,
              profileImage: "/default-avatar.png",
            },
        };

        if (!isMounted) return;

        setPost(fetchedPost);

        setPosts((prev) => {
          const exists = prev.find((p) => p._id === fetchedPost._id);
          if (exists) {
            return prev.map((p) => (p._id === fetchedPost._id ? fetchedPost : p));
          }
          return [fetchedPost, ...prev];
        });
      } catch (err) {
        console.error("Failed to load post:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPost();
    return () => {
      isMounted = false;
    };
  }, [id, posts, setPosts]);

  useEffect(() => {
    const updatedPost = posts.find((p) => p._id === id);
    if (updatedPost) setPost(updatedPost);
  }, [posts, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 transition-all transform hover:scale-105 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back</span>
          </button>

          {/* Loading card */}
          <div className="relative rounded-3xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl p-8 overflow-hidden">
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500" />
            
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
            
            {/* Content */}
            <div className="flex flex-col items-center gap-4 relative z-10">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Loading Post
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Please wait while we fetch the details...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-black flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 transition-all transform hover:scale-105 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back</span>
          </button>

          {/* Not found card */}
          <div className="relative rounded-3xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl p-8 overflow-hidden">
            {/* Gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500" />
            
            {/* Background decoration */}
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-pink-500/10 to-blue-500/10 rounded-full blur-3xl"></div>
            
            {/* Content */}
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className="p-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <FileQuestion className="w-12 h-12 text-gray-400 dark:text-gray-600" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  Post Not Found
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  This post may have been deleted or doesn't exist.
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 shadow-lg transform hover:scale-105 transition-all"
                >
                  Go to Feed
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-black px-4 py-6 sm:py-8">
      <div className="container mx-auto max-w-3xl">
        {/* Header with back button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 transition-all transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium">Back</span>
          </button>

          <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            Post Details
          </div>
        </div>

        {/* Post Card */}
        <div className="animate-fadeIn">
          <PostCard
            post={post}
            currentUserId={JSON.parse(localStorage.getItem("user"))?.id}
            hideFollowButton={false}
            showAllComments={true}
            showCommentInput={true}
          />
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Posted by{" "}
            <span
              className="font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
              onClick={() => post.user?._id && navigate(`/profile/${post.user._id}`)}
            >
              @{post.user?.username || "Unknown"}
            </span>
            {" "}on {new Date(post.createdAt).toLocaleDateString([], {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}