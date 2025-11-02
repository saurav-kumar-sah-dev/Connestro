import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { getMyReelDrafts, deleteReel, publishReel } from "../../api/reels";
import ReelCard from "./ReelCard";
import { Loader2, FileText } from "lucide-react";

export default function UserReelDrafts({ currentUserId, refreshKey = 0, onPublished }) {
  const { socket } = useContext(AppContext);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const meId = useMemo(() => String(currentUserId || ""), [currentUserId]);

  // For swipe scroll
  const itemRefs = useRef({});
  const idsDrafts = drafts.map((r) => String(r._id));

  const scrollToIndex = (idx) => {
    const id = idsDrafts[idx];
    const el = itemRefs.current[String(id)];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await getMyReelDrafts();
      const list = Array.isArray(res.data?.reels) ? res.data.reels : [];
      setDrafts(list);
    } catch (e) {
      console.error("UserReelDrafts load error", e);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  // Live deletes (e.g., from elsewhere)
  useEffect(() => {
    if (!socket) return;
    const onDeleted = ({ id }) => {
      setDrafts((prev) => prev.filter((r) => String(r._id) !== String(id)));
    };
    socket.on("reel:deleted", onDeleted);
    return () => socket.off("reel:deleted", onDeleted);
  }, [socket]);

  const doPublish = async (reel) => {
    const choice = window.prompt("Publish visibility: public or followers", "public");
    if (!choice) return;
    const vis = String(choice).toLowerCase().trim();
    if (!["public", "followers"].includes(vis)) {
      alert("Invalid visibility. Use public or followers.");
      return;
    }
    try {
      const res = await publishReel(reel._id, { visibility: vis });
      const pub = res.data?.reel || null;
      setDrafts((prev) => prev.filter((r) => String(r._id) !== String(reel._id)));
      onPublished?.(pub);
    } catch (e) {
      console.error("publishReel failed", e);
      alert(e.response?.data?.msg || "Failed to publish reel");
    }
  };

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
          Loading your drafts...
        </p>
      </div>
    );
  }
  
  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="p-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 mb-4">
          <FileText className="w-12 h-12 text-gray-400 dark:text-gray-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">
          No Draft Reels
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
          You don't have any saved drafts. When creating a reel, you can save it as a draft to publish later!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {drafts.map((reel, i) => (
        <div
          key={reel._id}
          ref={(el) => {
            if (el) itemRefs.current[String(reel._id)] = el;
          }}
          className="w-full flex items-center justify-center"
        >
          <ReelCard
            reel={reel}
            currentUserId={meId}
            draft
            autoPlayInitially={i === 0}
            onSwipeLeft={() => {
              const idx = idsDrafts.indexOf(String(reel._id));
              if (idx >= 0 && idx + 1 < idsDrafts.length) scrollToIndex(idx + 1);
            }}
            onSwipeRight={() => {
              const idx = idsDrafts.indexOf(String(reel._id));
              if (idx > 0) scrollToIndex(idx - 1);
            }}
            onPublish={() => doPublish(reel)}
            onDelete={async (id) => {
              try {
                await deleteReel(id);
                setDrafts((prev) => prev.filter((r) => String(r._id) !== String(id)));
              } catch (e) {
                console.error("deleteReel failed", e);
                alert("Failed to delete draft");
              }
            }}
            onUpdateLocal={(partial) => {
              setDrafts((prev) =>
                prev.map((r) => (String(r._id) === String(reel._id) ? { ...r, ...partial } : r))
              );
            }}
          />
        </div>
      ))}
    </div>
  );
}