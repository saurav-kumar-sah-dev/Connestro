import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { getUserReels, deleteReel } from "../../api/reels";
import ReelCard from "./ReelCard";
import { Loader2, Video } from "lucide-react";

export default function UserReelsList({ userId, currentUserId, className = "" }) {
  const { socket } = useContext(AppContext);
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);

  const meId = useMemo(() => String(currentUserId || ""), [currentUserId]);

  const itemRefs = useRef({});
  const idsAll = reels.map((r) => String(r._id));

  const scrollToIndex = (idx) => {
    const id = idsAll[idx];
    const el = itemRefs.current[String(id)];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getUserReels(userId);
        if (!mounted) return;
        const list = Array.isArray(res.data?.reels) ? res.data.reels : [];
        setReels(list);
      } catch (e) {
        console.error("getUserReels failed", e);
        setReels([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (reel) => {
      if (String(reel?.user?._id || reel?.user) !== String(userId)) return;
      if (reel.draft) return;
      setReels((prev) => {
        const exists = prev.find((r) => String(r._id) === String(reel._id));
        return exists ? prev.map((r) => (String(r._id) === String(reel._id) ? reel : r)) : [reel, ...prev];
      });
    };
    const onDeleted = ({ id, userId: owner }) => {
      if (String(owner) !== String(userId)) return;
      setReels((prev) => prev.filter((r) => String(r._id) !== String(id)));
    };
    socket.on("reel:new", onNew);
    socket.on("reel:deleted", onDeleted);
    return () => {
      socket.off("reel:new", onNew);
      socket.off("reel:deleted", onDeleted);
    };
  }, [socket, userId]);

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
          Loading user reels...
        </p>
      </div>
    );
  }
  
  if (reels.length === 0) {
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
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      {reels.map((reel, i) => (
        <div
          key={reel._id}
          ref={(el) => {
            if (el) itemRefs.current[String(reel._id)] = el;
          }}
          className="w-full flex items-center justify-center"
        >
          <ReelCard
            reel={reel}
            currentUserId={currentUserId}
            autoPlayInitially={i === 0}
            onSwipeLeft={() => {
              const idx = idsAll.indexOf(String(reel._id));
              if (idx >= 0 && idx + 1 < idsAll.length) scrollToIndex(idx + 1);
            }}
            onSwipeRight={() => {
              const idx = idsAll.indexOf(String(reel._id));
              if (idx > 0) scrollToIndex(idx - 1);
            }}
            onDelete={async (id) => {
              try {
                await deleteReel(id);
                setReels((prev) => prev.filter((r) => String(r._id) !== String(id)));
              } catch (e) {
                console.error("deleteReel failed", e);
                alert("Failed to delete reel");
              }
            }}
            onUpdateLocal={(partial) => {
              setReels((prev) =>
                prev.map((r) => (String(r._id) === String(reel._id) ? { ...r, ...partial } : r))
              );
            }}
          />
        </div>
      ))}
    </div>
  );
}