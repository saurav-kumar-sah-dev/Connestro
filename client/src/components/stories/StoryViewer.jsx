// src/components/stories/StoryViewer.jsx
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { buildFileUrl } from "../../utils/url";
import {
  viewStory,
  reactStory,
  getStoryReactions,
  getStoryViews,
} from "../../api/stories";
import {
  IoClose,
  IoPlayCircle,
  IoPauseCircle,
  IoHeart,
  IoHeartOutline,
  IoEye,
  IoTrash,
  IoSend,
  IoTimeOutline,
  IoCheckmarkCircle,
} from "react-icons/io5";

const IMAGE_DURATION_MS = 5000;
const DOUBLE_TAP_MS = 300;
const EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"];

// Time-left formatter
const fmtTimeLeft = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export default function StoryViewer({
  user,
  stories,
  startIndex = 0,
  onClose,
  onDeleted,
  canDelete = false,
  onDeleteRequest,
  onViewed,
  onRequestNextUser,
  onRequestPrevUser,
}) {
  const { socket } = useContext(AppContext);

  const [index, setIndex] = useState(startIndex);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  const [likesCount, setLikesCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [latestReacts, setLatestReacts] = useState([]);

  const [textReply, setTextReply] = useState("");
  const [sending, setSending] = useState(false);

  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loadingViews, setLoadingViews] = useState(false);
  const [viewsCount, setViewsCount] = useState(0);

  const [timeLeftLabel, setTimeLeftLabel] = useState("");

  const rafRef = useRef(null);
  const videoRef = useRef(null);
  const imageBaseRef = useRef(0);
  const imageDurRef = useRef(IMAGE_DURATION_MS);

  const centerTapTimeoutRef = useRef(null);
  const lastCenterTapRef = useRef(0);

  const meId = useMemo(() => {
    try {
      return String(JSON.parse(localStorage.getItem("user") || "{}")?.id || "");
    } catch {
      return "";
    }
  }, []);

  const current = stories?.[index] || null;

  const durationMs = useMemo(() => {
    if (!current) return 0;
    if (current.type === "image") {
      const sec = Number(current.durationSec || 0);
      const ms = Math.max(
        500,
        Math.min(15000, isFinite(sec) && sec > 0 ? sec * 1000 : IMAGE_DURATION_MS)
      );
      imageDurRef.current = ms;
      return ms;
    }
    return 0;
  }, [current]);

  useEffect(() => {
    setIndex(Math.max(0, Math.min(startIndex, (stories?.length || 1) - 1)));
  }, [stories, startIndex]);

  async function fetchViewsCount(id) {
    try {
      const res = await getStoryViews(id, { limit: 1 });
      const total = Number(res?.data?.total);
      const count = Number(res?.data?.count);
      setViewsCount(Number.isFinite(total) ? total : Number.isFinite(count) ? count : 0);
    } catch {
      setViewsCount(0);
    }
  }

  useEffect(() => {
    setProgress(0);
    cancelAnimationFrame(rafRef.current);
    clearTimeout(centerTapTimeoutRef.current);
    setTextReply("");
    if (!current) return;

    viewStorySafe(current._id);
    loadReactions(current._id);

    const ownerId = String(user?._id || user || "");
    if (ownerId && ownerId === String(meId)) {
      fetchViewsCount(current._id);
    } else {
      setViewsCount(0);
    }

    if (current.type === "image") {
      imageBaseRef.current = Date.now();
      if (playing) startImageLoop();
    } else {
      setTimeout(() => {
        try {
          videoRef.current?.play?.();
        } catch {}
      }, 50);
    }
  }, [index, current]);

  useEffect(() => {
    if (!socket) return;
    const onReact = ({ storyId, likesCount: lc }) => {
      if (!current || String(storyId) !== String(current._id)) return;
      if (typeof lc === "number") setLikesCount(lc);
    };
    socket.on("story:reaction", onReact);
    return () => socket.off("story:reaction", onReact);
  }, [socket, current]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, stories, playing]);

  useEffect(() => {
    if (!current) return;
    if (current.type === "image") {
      cancelAnimationFrame(rafRef.current);
      if (playing) startImageLoop();
    } else {
      const v = videoRef.current;
      if (!v) return;
      try {
        if (playing) v.play().catch(() => {});
        else v.pause();
      } catch {}
    }
  }, [playing, current]);

  useEffect(() => {
    if (!current || current.type !== "video") return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v && v.duration && !isNaN(v.duration) && v.duration > 0) {
        const p = Math.min(1, Math.max(0, v.currentTime / v.duration));
        setProgress(p);
      }
    }, 80);
    return () => clearInterval(id);
  }, [current]);

  useEffect(() => {
    const refresh = () => {
      const exp = current?.expiresAt ? new Date(current.expiresAt).getTime() : 0;
      const diff = exp - Date.now();
      setTimeLeftLabel(fmtTimeLeft(diff));
    };
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, [current]);

  function startImageLoop() {
    const loop = () => {
      const now = Date.now();
      const elapsed = Math.max(0, now - imageBaseRef.current);
      const p = Math.min(1, elapsed / imageDurRef.current);
      setProgress(p);
      if (p >= 1) {
        next();
      } else if (playing) {
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  async function viewStorySafe(id) {
    try {
      const res = await viewStory(id);
      if (res?.data?.newlyViewed && typeof onViewed === "function") {
        const uid = user?._id || user;
        onViewed({ storyId: id, userId: String(uid || "") });
      }
    } catch {}
  }

  async function loadReactions(id) {
    try {
      const res = await getStoryReactions(id);
      const data = res.data || {};
      setLikesCount(Number(data.likesCount || 0));
      setUserLiked(Boolean(data.userLiked));
      setLatestReacts(Array.isArray(data.latest) ? data.latest : []);
    } catch {
      setLikesCount(0);
      setUserLiked(false);
      setLatestReacts([]);
    }
  }

  async function toggleLike() {
    if (!current || sending) return;
    setSending(true);
    try {
      const res = await reactStory(current._id, { type: "like" });
      const { likesCount: lc, userLiked: ul } = res.data || {};
      if (typeof lc === "number") setLikesCount(lc);
      if (typeof ul === "boolean") setUserLiked(ul);
    } catch {}
    setSending(false);
  }

  async function sendEmoji(em) {
    if (!current || sending) return;
    setSending(true);
    try {
      await reactStory(current._id, { type: "emoji", emoji: em });
      setLatestReacts((prev) =>
        [
          {
            _id: "tmp-" + Date.now(),
            type: "emoji",
            emoji: em,
            text: "",
            user: { _id: meId },
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 30)
      );
    } catch {}
    setSending(false);
  }

  async function sendText() {
    const t = String(textReply || "").trim();
    if (!current || !t || sending) return;
    setSending(true);
    try {
      await reactStory(current._id, { type: "text", text: t });
      setTextReply("");
      setLatestReacts((prev) =>
        [
          {
            _id: "tmp-" + Date.now(),
            type: "text",
            emoji: "",
            text: t,
            user: { _id: meId },
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 30)
      );
    } catch {}
    setSending(false);
  }

  async function openViewers() {
    if (!current) return;
    setShowViewers(true);
    setLoadingViews(true);
    try {
      const res = await getStoryViews(current._id, { limit: 100 });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      setViewers(items);
      const total = Number(res?.data?.total);
      const count = Number(res?.data?.count);
      setViewsCount(Number.isFinite(total) ? total : Number.isFinite(count) ? count : items.length);
    } catch {
      setViewers([]);
    }
    setLoadingViews(false);
  }

  function togglePlay() {
    if (!current) return;
    if (current.type === "image") {
      if (playing) {
        const now = Date.now();
        const elapsed = Math.max(0, now - imageBaseRef.current);
        imageBaseRef.current = now - elapsed;
        cancelAnimationFrame(rafRef.current);
        setPlaying(false);
      } else {
        const now = Date.now();
        const elapsedMs = Math.min(imageDurRef.current, progress * imageDurRef.current);
        imageBaseRef.current = now - elapsedMs;
        setPlaying(true);
        startImageLoop();
      }
    } else {
      const v = videoRef.current;
      if (!v) return;
      if (playing) {
        try {
          v.pause();
        } catch {}
        setPlaying(false);
      } else {
        try {
          v.play();
        } catch {}
        setPlaying(true);
      }
    }
  }

  function next() {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(centerTapTimeoutRef.current);
    if (index < stories.length - 1) setIndex(index + 1);
    else if (!(typeof onRequestNextUser === "function" && onRequestNextUser())) onClose?.();
  }

  function prev() {
    cancelAnimationFrame(rafRef.current);
    clearTimeout(centerTapTimeoutRef.current);
    if (index > 0) setIndex(index - 1);
    else if (!(typeof onRequestPrevUser === "function" && onRequestPrevUser())) onClose?.();
  }

  function handleVideoEnded() {
    next();
  }

  function handleCenterTap(e) {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastCenterTapRef.current < DOUBLE_TAP_MS) {
      lastCenterTapRef.current = 0;
      clearTimeout(centerTapTimeoutRef.current);
      next();
      return;
    }
    lastCenterTapRef.current = now;
    clearTimeout(centerTapTimeoutRef.current);
    centerTapTimeoutRef.current = setTimeout(() => {
      togglePlay();
    }, DOUBLE_TAP_MS);
  }

  async function doDelete() {
    if (!current || !canDelete) return;
    if (!window.confirm("Delete this story?")) return;
    try {
      await onDeleteRequest?.(current);
      onDeleted?.(current._id);
      if (index >= stories.length - 1) {
        if (typeof onRequestNextUser === "function" && onRequestNextUser()) return;
        onClose?.();
      } else {
        setIndex(index + 1);
      }
    } catch {
      alert("Failed to delete story");
    }
  }

  if (!current) return null;

  const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "";
  const avatar = user?.profileImage ? buildFileUrl(user.profileImage) : "/default-avatar.png";
  const isOwner = String(user?._id || "") === String(meId);

  return (
    <div className="fixed inset-0 z-50 bg-black select-none">
      {/* Decorative gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-blue-900/10 pointer-events-none" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black via-black/70 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/70 to-transparent z-10" />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 md:top-6 md:right-6 z-30 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 grid place-items-center shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-all duration-200 transform hover:scale-110 group"
        title="Close"
        aria-label="Close"
      >
        <IoClose className="text-white text-2xl group-hover:rotate-90 transition-transform duration-300" />
      </button>

      {/* Progress bars */}
      <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 w-[min(92vw,700px)] flex gap-2 z-30 px-3">
        {stories.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-white via-blue-200 to-purple-200 rounded-full shadow-lg transition-[width] duration-100 ease-linear"
              style={{ width: `${i < index ? 100 : i === index ? Math.round(progress * 100) : 0}%` }}
            />
          </div>
        ))}
      </div>

      {/* User header */}
      <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 w-[min(92vw,700px)] flex items-center justify-between px-3 z-30">
        <div className="flex items-center gap-3 text-white bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-2xl border border-white/20">
          <div className="relative">
            <img 
              src={avatar} 
              alt="" 
              className="w-11 h-11 rounded-full object-cover ring-2 ring-white/30 shadow-lg" 
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white/30"></div>
          </div>
          <div className="flex flex-col">
            <div className="font-bold text-sm md:text-base flex items-center gap-2">
              {userName}
              {isOwner && <IoCheckmarkCircle className="text-blue-400" />}
            </div>
            <div className="text-xs text-white/70">@{user?.username}</div>
          </div>
        </div>

        {timeLeftLabel && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-md border border-orange-400/30 text-white text-xs md:text-sm font-medium shadow-lg"
            title={current?.expiresAt ? new Date(current.expiresAt).toLocaleString() : ""}
          >
            <IoTimeOutline className="text-orange-400" />
            {timeLeftLabel === "Expired" ? (
              <span className="text-red-400">Expired</span>
            ) : (
              <span>{timeLeftLabel} left</span>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="h-full w-full flex flex-col items-center justify-between pt-28 md:pt-32">
        {/* Media container */}
        <div className="relative w-[min(92vw,700px)] flex-1 min-h-0 flex items-center justify-center rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl bg-gradient-to-br from-gray-900 to-black">
          {/* Media */}
          {current.type === "image" ? (
            <img 
              src={buildFileUrl(current.url)} 
              alt="" 
              className="max-w-full max-h-full object-contain" 
            />
          ) : (
            <video
              ref={videoRef}
              src={buildFileUrl(current.url)}
              className="max-w-full max-h-full"
              controls={false}
              playsInline
              autoPlay
              onEnded={handleVideoEnded}
            />
          )}

          {/* Reactions overlay */}
          {latestReacts.length > 0 && (
            <div className="absolute left-4 bottom-4 max-w-[70%] text-white text-sm space-y-2 z-20">
              {latestReacts.slice(0, 6).map((r, idx) => (
                <div 
                  key={r._id} 
                  className="inline-block bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-md rounded-xl px-3 py-2 border border-white/20 shadow-lg mr-2 mb-2 animate-fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {r.type === "emoji" ? (
                    <span className="text-xl">{r.emoji}</span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      💬 <span className="font-medium">{r.text}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Paused overlay */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
              playing ? "opacity-0 scale-75" : "opacity-100 scale-100"
            }`}
          >
            <div className="px-6 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/20 shadow-2xl">
              <div className="flex items-center gap-2 text-white font-medium">
                <IoPauseCircle className="text-3xl" />
                <span>Paused</span>
              </div>
            </div>
          </div>

          {/* Tap zones */}
          <div
            className="absolute left-[33%] right-[33%] top-0 bottom-0 z-10 cursor-pointer"
            onClick={handleCenterTap}
            aria-label="Toggle play or skip next"
            title={playing ? "Pause" : "Play"}
          />
          <div
            className="absolute left-0 right-[67%] top-0 bottom-0 z-10 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={prev}
            aria-label="Previous story"
            title="Previous"
          />
          <div
            className="absolute right-0 left-[67%] top-0 bottom-0 z-10 cursor-pointer hover:bg-white/5 transition-colors"
            onClick={next}
            aria-label="Next story"
            title="Next"
          />
        </div>

        {/* Bottom controls */}
        <div className="w-[min(92vw,700px)] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 space-y-3 z-30">
          {/* Emoji reactions */}
          <div
            className="mx-auto flex items-center justify-center gap-2 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl px-3 py-2 rounded-2xl border border-white/20 shadow-xl overflow-x-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {EMOJIS.map((em, idx) => (
              <button
                key={em}
                onClick={() => sendEmoji(em)}
                disabled={sending}
                className="text-2xl md:text-3xl px-3 py-2 rounded-xl hover:bg-white/20 active:scale-90 transform transition-all disabled:opacity-50 hover:shadow-lg"
                title={`React ${em}`}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {em}
              </button>
            ))}
          </div>

          {/* Reply input */}
          <div
            className="flex items-center gap-2 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl rounded-2xl px-3 py-2 border border-white/20 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              value={textReply}
              onChange={(e) => setTextReply(e.target.value)}
              placeholder="Send a message..."
              className="min-w-0 flex-1 bg-transparent text-white placeholder-white/60 px-3 py-2.5 outline-none text-sm md:text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendText();
                }
              }}
            />
            <button
              onClick={sendText}
              disabled={sending || !textReply.trim()}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 active:scale-95"
            >
              <IoSend className="text-lg" />
              <span className="hidden sm:inline font-medium">Send</span>
            </button>
          </div>

          {/* Action buttons */}
          <div
            className="mx-auto flex items-center justify-center flex-wrap gap-2 bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl p-2 rounded-2xl shadow-xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 active:bg-white/25 px-4 py-2.5 rounded-xl transition-all shadow-lg transform hover:scale-105 active:scale-95 border border-white/10"
              title={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <IoPauseCircle className="text-xl" />
              ) : (
                <IoPlayCircle className="text-xl" />
              )}
              <span className="hidden sm:inline font-medium">{playing ? "Pause" : "Play"}</span>
            </button>

            <button
              onClick={toggleLike}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-lg transform hover:scale-105 active:scale-95 border ${
                userLiked
                  ? "bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-700 hover:to-red-700 text-white border-pink-400"
                  : "bg-white/10 hover:bg-white/20 text-white border-white/10"
              }`}
              title={userLiked ? "Unlike" : "Like"}
              disabled={sending}
            >
              {userLiked ? (
                <IoHeart className="text-xl animate-pulse" />
              ) : (
                <IoHeartOutline className="text-xl" />
              )}
              <span className="hidden sm:inline font-medium">{userLiked ? "Liked" : "Like"}</span>
              {likesCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                  {likesCount}
                </span>
              )}
            </button>

            {isOwner && (
              <button
                onClick={openViewers}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all shadow-lg transform hover:scale-105 active:scale-95 border border-white/10"
                title="Viewers"
              >
                <IoEye className="text-xl" />
                <span className="hidden sm:inline font-medium">Views</span>
                {viewsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-xs font-bold">
                    {viewsCount}
                  </span>
                )}
              </button>
            )}

            {canDelete && (
              <button
                onClick={doDelete}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white transition-all shadow-lg transform hover:scale-105 active:scale-95 border border-red-400"
                title="Delete story"
              >
                <IoTrash className="text-xl" />
                <span className="hidden sm:inline font-medium">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Viewers modal */}
      {showViewers && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-fade-in"
          onClick={() => setShowViewers(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-black border-2 border-white/10 rounded-3xl p-6 md:p-7 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-xl text-white flex items-center gap-2">
                <IoEye className="text-blue-400" />
                Story Viewers
                {viewsCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-sm">
                    {viewsCount}
                  </span>
                )}
              </h3>
              <button
                className="w-10 h-10 rounded-full hover:bg-white/10 grid place-items-center transition-all border border-white/10"
                onClick={() => setShowViewers(false)}
                aria-label="Close viewers"
                title="Close"
              >
                <IoClose className="text-white text-xl" />
              </button>
            </div>

            {loadingViews ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
              </div>
            ) : viewers.length === 0 ? (
              <div className="text-center py-12">
                <IoEye className="text-6xl text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No views yet</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {viewers.map((v) => {
                  const u = v.viewer || {};
                  const avatar = u.profileImage ? buildFileUrl(u.profileImage) : "/default-avatar.png";
                  return (
                    <li
                      key={v._id}
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all border border-white/5 hover:border-white/10 group"
                    >
                      <img
                        src={avatar}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-blue-400/50 transition-all"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-white">
                          {u.firstName} {u.lastName}
                        </div>
                        <div className="text-xs text-gray-400">@{u.username}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {v.createdAt ? new Date(v.createdAt).toLocaleString() : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}