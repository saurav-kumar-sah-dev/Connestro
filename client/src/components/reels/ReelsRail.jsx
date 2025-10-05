import { useEffect, useState } from "react";
import { getReelsFeed } from "../../api/reels";
import { buildFileUrl } from "../../utils/url";
import { useNavigate } from "react-router-dom";

export default function ReelsRail({ limit = 12 }) {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getReelsFeed({ limit });
        if (!mounted) return;
        const list = Array.isArray(res.data?.reels) ? res.data.reels : [];
        setReels(list);
      } catch (e) {
        console.error("ReelsRail load error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [limit]);

  if (loading) return null;
  if (!reels.length) return null;

  return (
    <div className="w-full px-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-semibold">Reels</div>
        <button
          className="text-blue-600 hover:underline"
          onClick={() => navigate("/reels")}
          title="Open Reels"
        >
          View all
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="flex gap-3 pb-2">
          {reels.map((r) => {
            const src = buildFileUrl(r.url);
            return (
              <button
                key={r._id}
                onClick={() => navigate(`/reels/${r._id}`)}
                className="relative w-[130px] h-[220px] rounded-md overflow-hidden bg-black flex items-center justify-center group"
                title={r.caption || "Reel"}
              >
                {/* Use posterless video; preload metadata only */}
                <video
                  src={src}
                  className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                <div className="absolute bottom-1 left-1 right-1 text-white text-xs line-clamp-2 text-left">
                  {r.caption || ""}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-3xl drop-shadow">▶</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}