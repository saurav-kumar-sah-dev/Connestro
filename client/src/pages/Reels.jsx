// src/pages/Reels.jsx
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import {
  getReelsFeed,
  deleteReel,
  getMyReelDrafts,
  publishReel,
  getUserReels,
} from "../api/reels";
import ReelCard from "../components/reels/ReelCard";
import ReelComposer from "../components/reels/ReelComposer";
import {
  Loader2,
  Video,
  Upload,
  Grid3x3,
  User,
  FileText,
  Film,
  Sparkles,
} from "lucide-react";

const uniqueById = (arr = []) => {
  const seen = new Set();
  const out = [];
  for (const r of arr) {
    const id = r?._id ? String(r._id) : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }
  return out;
};

export default function Reels() {
  const { socket } = useContext(AppContext);
  const { startId } = useParams();
  const navigate = useNavigate();

  const me = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const meId = String(me?.id || "");

  const [reels, setReels] = useState([]);
  const [myReels, setMyReels] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMine, setLoadingMine] = useState(false);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [tab, setTab] = useState("all");

  const itemRefs = useRef({});
  const scrolledRef = useRef(false);

  useEffect(() => {
    const unlock = () => {
      window.dispatchEvent(new CustomEvent("reel:unlockAudio"));
      window.removeEventListener("pointerdown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    return () => window.removeEventListener("pointerdown", unlock, true);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getReelsFeed({ limit: 30 });
        if (!mounted) return;
        const list = Array.isArray(res.data?.reels) ? res.data.reels : [];
        setReels(uniqueById(list));
      } catch (e) {
        console.error("Load reels error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== "mine") return;
    let mounted = true;
    (async () => {
      try {
        setLoadingMine(true);
        const res = await getUserReels(meId);
        if (!mounted) return;
        const list = Array.isArray(res.data?.reels) ? res.data.reels : [];
        const publishedOnly = list.filter((r) => !r.draft);
        setMyReels(uniqueById(publishedOnly));
      } catch (e) {
        console.error("getUserReels (mine) error:", e);
        setMyReels([]);
      } finally {
        if (mounted) setLoadingMine(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tab, meId]);

  useEffect(() => {
    if (tab !== "drafts") return;
    let mounted = true;
    (async () => {
      try {
        setLoadingDrafts(true);
        const res = await getMyReelDrafts();
        if (!mounted) return;
        const list = Array.isArray(res.data?.reels) ? res.data.reels : [];
        setDrafts(uniqueById(list));
      } catch (e) {
        console.error("getMyReelDrafts error:", e);
        setDrafts([]);
      } finally {
        if (mounted) setLoadingDrafts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tab]);

  useEffect(() => {
    if (!startId || tab !== "all" || !reels.length || scrolledRef.current) return;
    const el = itemRefs.current[String(startId)];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      scrolledRef.current = true;
    }
  }, [startId, reels, tab]);

  useEffect(() => {
    if (!loading && startId) {
      const exists = reels.some((r) => String(r._id) === String(startId));
      if (!exists) {
        navigate("/reels", { replace: true });
      }
    }
  }, [loading, startId, reels, navigate]);

  useEffect(() => {
    if (!socket) return;

    const onNew = (reel) => {
      if (!reel || !reel._id || reel.draft) return;
      setReels((prev) => uniqueById([reel, ...prev]));
      const owner = String(reel?.user?._id || reel?.user || "");
      if (owner === meId) setMyReels((prev) => uniqueById([reel, ...prev]));
    };

    const applyLikeUpdate = (listSetter) => (reelId, likesCount) => {
      listSetter((prev) =>
        prev.map((r) =>
          String(r._id) === String(reelId)
            ? { ...r, likesCountOverride: typeof likesCount === "number" ? likesCount : r.likesCountOverride }
            : r
        )
      );
    };

    const onLikeUpdate = ({ reelId, likesCount }) => {
      applyLikeUpdate(setReels)(reelId, likesCount);
      applyLikeUpdate(setMyReels)(reelId, likesCount);
    };

    const applyNewComment = (listSetter) => (reelId, comment) => {
      listSetter((prev) =>
        prev.map((r) =>
          String(r._id) === String(reelId)
            ? { ...r, comments: [...(r.comments || []), comment] }
            : r
        )
      );
    };

    const onNewComment = ({ reelId, comment }) => {
      applyNewComment(setReels)(reelId, comment);
      applyNewComment(setMyReels)(reelId, comment);
    };

    const onDeleted = ({ id, userId: owner }) => {
      setReels((prev) => prev.filter((r) => String(r._id) !== String(id)));
      if (String(owner) === meId) {
        setMyReels((prev) => prev.filter((r) => String(r._id) !== String(id)));
      }
      setDrafts((prev) => prev.filter((r) => String(r._id) !== String(id)));
    };

    socket.on("reel:new", onNew);
    socket.on("reel:updateLike", onLikeUpdate);
    socket.on("reel:newComment", onNewComment);
    socket.on("reel:deleted", onDeleted);

    return () => {
      socket.off("reel:new", onNew);
      socket.off("reel:updateLike", onLikeUpdate);
      socket.off("reel:newComment", onNewComment);
      socket.off("reel:deleted", onDeleted);
    };
  }, [socket, meId]);

  const idsAll = reels.map((r) => String(r._id));
  const idsMine = myReels.map((r) => String(r._id));
  const idsDrafts = drafts.map((r) => String(r._id));
  const scrollToIndex = (list, idx) => {
    const id = list[idx];
    const el = itemRefs.current[String(id)];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

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
      const pub = res.data?.reel;
      setDrafts((prev) => prev.filter((r) => String(r._id) !== String(reel._id)));
      if (pub) {
        setReels((prev) => uniqueById([pub, ...prev]));
        if (String(pub?.user?._id || pub?.user) === meId) {
          setMyReels((prev) => uniqueById([pub, ...prev]));
          setTab("mine");
        } else {
          setTab("all");
        }
        setTimeout(() => {
          const el = itemRefs.current[String(pub?._id || reel._id)];
          if (el && typeof el.scrollIntoView === "function") {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 50);
      }
    } catch (e) {
      console.error("publishReel failed", e);
      alert(e.response?.data?.msg || "Failed to publish reel");
    }
  };

  const currentList =
    tab === "all" ? reels : tab === "mine" ? myReels : drafts;
  const idsCurrent = tab === "all" ? idsAll : tab === "mine" ? idsMine : idsDrafts;

  const tabButtons = [
    { key: "all", label: "All Reels", icon: Grid3x3 },
    { key: "mine", label: "My Reels", icon: User },
    { key: "drafts", label: "Drafts", icon: FileText },
  ];

  const EmptyState = ({ icon: Icon, title, description }) => (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="p-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 mb-4">
        <Icon className="w-16 h-16 text-gray-400 dark:text-gray-600" />
      </div>
      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
        {title}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
        {description}
      </p>
    </div>
  );

  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <p className="text-gray-600 dark:text-gray-400 font-medium">
        Loading reels...
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-black transition-colors duration-300">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="relative mb-6 rounded-3xl border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl p-6 overflow-hidden">
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500" />
          
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                <Film className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Reels
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Discover short videos from your community
                </p>
              </div>
            </div>

            {/* Tab buttons */}
            <div className="flex flex-wrap gap-2">
              {tabButtons.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 ${
                    tab === key
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
                  }`}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}

              <button
                onClick={() => setShowComposer(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700 shadow-lg transform hover:scale-105 transition-all"
                title="Upload new reel"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative">
          {tab === "all" ? (
            loading ? (
              <LoadingState />
            ) : reels.length === 0 ? (
              <EmptyState
                icon={Video}
                title="No Reels Yet"
                description="Be the first to share a reel with your community!"
              />
            ) : (
              <div className="flex flex-col items-center gap-6">
                {reels.map((reel, i) => (
                  <div
                    key={reel._id}
                    ref={(el) => {
                      if (el) itemRefs.current[String(reel._id)] = el;
                    }}
                    className="w-full flex items-center justify-center animate-fadeIn"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <ReelCard
                      reel={reel}
                      currentUserId={meId}
                      autoPlayInitially={startId ? String(reel._id) === String(startId) : i === 0}
                      onSwipeLeft={() => {
                        const idx = idsAll.indexOf(String(reel._id));
                        if (idx >= 0 && idx + 1 < idsAll.length) scrollToIndex(idsAll, idx + 1);
                      }}
                      onSwipeRight={() => {
                        const idx = idsAll.indexOf(String(reel._id));
                        if (idx > 0) scrollToIndex(idsAll, idx - 1);
                      }}
                      onDelete={async (id) => {
                        try {
                          await deleteReel(id);
                          setReels((prev) => prev.filter((r) => String(r._id) !== String(id)));
                          setMyReels((prev) => prev.filter((r) => String(r._id) !== String(id)));
                        } catch (e) {
                          console.error("deleteReel failed", e);
                          alert("Failed to delete reel");
                        }
                      }}
                      onUpdateLocal={(partial) => {
                        setReels((prev) =>
                          prev.map((r) => (String(r._id) === String(reel._id) ? { ...r, ...partial } : r))
                        );
                        setMyReels((prev) =>
                          prev.map((r) => (String(r._id) === String(reel._id) ? { ...r, ...partial } : r))
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            )
          ) : tab === "mine" ? (
            loadingMine ? (
              <LoadingState />
            ) : myReels.length === 0 ? (
              <EmptyState
                icon={User}
                title="No Published Reels"
                description="Upload your first reel to share with your followers!"
              />
            ) : (
              <div className="flex flex-col items-center gap-6">
                {myReels.map((reel, i) => (
                  <div
                    key={reel._id}
                    ref={(el) => {
                      if (el) itemRefs.current[String(reel._id)] = el;
                    }}
                    className="w-full flex items-center justify-center animate-fadeIn"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <ReelCard
                      reel={reel}
                      currentUserId={meId}
                      autoPlayInitially={i === 0}
                      onSwipeLeft={() => {
                        const idx = idsMine.indexOf(String(reel._id));
                        if (idx >= 0 && idx + 1 < idsMine.length) scrollToIndex(idsMine, idx + 1);
                      }}
                      onSwipeRight={() => {
                        const idx = idsMine.indexOf(String(reel._id));
                        if (idx > 0) scrollToIndex(idsMine, idx - 1);
                      }}
                      onDelete={async (id) => {
                        try {
                          await deleteReel(id);
                          setReels((prev) => prev.filter((r) => String(r._id) !== String(id)));
                          setMyReels((prev) => prev.filter((r) => String(r._id) !== String(id)));
                        } catch (e) {
                          console.error("deleteReel failed", e);
                          alert("Failed to delete reel");
                        }
                      }}
                      onUpdateLocal={(partial) => {
                        setReels((prev) =>
                          prev.map((r) => (String(r._id) === String(reel._id) ? { ...r, ...partial } : r))
                        );
                        setMyReels((prev) =>
                          prev.map((r) => (String(r._id) === String(reel._id) ? { ...r, ...partial } : r))
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            )
          ) : (
            loadingDrafts ? (
              <LoadingState />
            ) : drafts.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Drafts"
                description="Save reels as drafts before publishing them!"
              />
            ) : (
              <div className="flex flex-col items-center gap-6">
                {drafts.map((reel, i) => (
                  <div
                    key={reel._id}
                    ref={(el) => {
                      if (el) itemRefs.current[String(reel._id)] = el;
                    }}
                    className="w-full flex items-center justify-center animate-fadeIn"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <ReelCard
                      reel={reel}
                      currentUserId={meId}
                      draft
                      autoPlayInitially={i === 0}
                      onSwipeLeft={() => {
                        const idx = idsDrafts.indexOf(String(reel._id));
                        if (idx >= 0 && idx + 1 < idsDrafts.length) scrollToIndex(idsDrafts, idx + 1);
                      }}
                      onSwipeRight={() => {
                        const idx = idsDrafts.indexOf(String(reel._id));
                        if (idx > 0) scrollToIndex(idsDrafts, idx - 1);
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
            )
          )}
        </div>
      </div>

      {/* Composer */}
      {showComposer && (
        <ReelComposer
          onClose={() => setShowComposer(false)}
          onUploaded={(newReel) => {
            if (newReel?.draft) {
              setDrafts((prev) => uniqueById([newReel, ...prev]));
              setTab("drafts");
              setTimeout(() => {
                const el = itemRefs.current[String(newReel._id)];
                if (el && typeof el.scrollIntoView === "function") {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }, 100);
            } else if (newReel) {
              setReels((prev) => uniqueById([newReel, ...prev]));
              if (String(newReel?.user?._id || newReel?.user) === meId) {
                setMyReels((prev) => uniqueById([newReel, ...prev]));
                setTab("mine");
              } else {
                setTab("all");
              }
              setTimeout(() => {
                const el = itemRefs.current[String(newReel._id)];
                if (el && typeof el.scrollIntoView === "function") {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                }
              }, 100);
            }
            setShowComposer(false);
          }}
        />
      )}

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
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}