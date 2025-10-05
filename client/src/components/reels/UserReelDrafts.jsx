import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { getMyReelDrafts, deleteReel, publishReel } from "../../api/reels";
import ReelCard from "./ReelCard";

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

  if (loading) return <div className="text-center text-gray-500 mt-4">Loading drafts…</div>;
  if (drafts.length === 0) return <div className="text-center text-gray-500 mt-4">No drafts yet</div>;

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