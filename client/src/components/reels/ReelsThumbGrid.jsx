import { useEffect, useState } from "react";
import { getUserReels } from "../../api/reels";
import { buildFileUrl } from "../../utils/url";
import { useNavigate } from "react-router-dom";
import { Loader2, Video, Inbox } from "lucide-react";

export default function ReelsThumbGrid({
  userId,
  limit = 100,
  className = "",
  showCounts = true,
}) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getUserReels(userId);
        if (!mounted) return;
        const list = Array.isArray(res.data?.reels) ? res.data.reels : [];
        // published only (backend already excludes drafts for non-owner)
        const pub = list.filter((r) => !r.draft).slice(0, limit);
        setReels(pub);
      } catch (e) {
        console.error("ReelsThumbGrid getUserReels error", e);
        setReels([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId, limit]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="relative mb-4">
          <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Loading reels...
        </p>
      </div>
    );
  }
  
  if (!reels.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="p-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 mb-4">
          <Video className="w-12 h-12 text-gray-400 dark:text-gray-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
          No Reels Available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
          This user hasn't published any reels yet.
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {reels.map((r) => {
          const src = buildFileUrl(r.url);
          const likesCount = Array.isArray(r.likes) ? r.likes.length : 0;
          const viewsCount = Number(r.viewsCount || 0);
          return (
            <button
              key={r._id}
              onClick={() => navigate(`/reels/${r._id}`)}
              className="relative w-full h-64 bg-black rounded-md overflow-hidden group"
              title={r.caption || "Reel"}
            >
              {/* Use video posterless preview, metadata only to keep it light */}
              <video
                src={src}
                className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                muted
                playsInline
                preload="metadata"
              />
              <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />
              {showCounts && (
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                  <span title="Likes">♥ {likesCount}</span>
                  <span title="Views">👁 {viewsCount}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}