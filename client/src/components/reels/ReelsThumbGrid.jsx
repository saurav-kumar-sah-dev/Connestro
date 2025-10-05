import { useEffect, useState } from "react";
import { getUserReels } from "../../api/reels";
import { buildFileUrl } from "../../utils/url";
import { useNavigate } from "react-router-dom";

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

  if (loading) return null;
  if (!reels.length) return <div className="text-center text-gray-500 mt-4">No reels</div>;

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