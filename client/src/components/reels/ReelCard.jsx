// src/components/reels/ReelCard.jsx
import { useEffect, useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import { buildFileUrl } from "../../utils/url";
import { likeReel, commentReel, viewReel } from "../../api/reels";
import { createReport } from "../../api/reports"; // NEW

// Modals/Drawer
import ReelLikesModal from "./ReelLikesModal";
import ReelViewsModal from "./ReelViewsModal";
import ReelCommentsDrawer from "./ReelCommentsDrawer";
import ReelShareModal from "./ReelShareModal";

export default function ReelCard({
  reel,
  currentUserId,
  onDelete,
  onUpdateLocal,
  onSwipeLeft,
  onSwipeRight,
  autoPlayInitially = false,
  draft = false,
  onPublish,
}) {
  const { socket } = useContext(AppContext);
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const observedRef = useRef(false);
  const viewedRef = useRef(false);

  // Single-active coordination
  const reelIdStr = String(reel._id);
  const isActiveRef = useRef(false);

  // Guard against early IO pause
  const initialGuardUntilRef = useRef(0);
  const userPausedRef = useRef(false);

  // Visibility thresholds
  const PLAY_THRESHOLD = 0.3;
  const PAUSE_THRESHOLD = 0.1;
  const ACTIVE_THRESHOLD = 0.6; // must be fairly centered to become active

  const [playing, setPlaying] = useState(false);
  const [liking, setLiking] = useState(false);
  const [commentText, setCommentText] = useState("");

  // Sound: default unmuted for the active reel
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  // UI
  const [showLikes, setShowLikes] = useState(false);
  const [showViews, setShowViews] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const touchStartRef = useRef({ x: 0, y: 0, t: 0 });
  const lastTapRef = useRef(0);
  const [showHeart, setShowHeart] = useState(false);

  const meId = String(currentUserId || "");
  const likesArray = Array.isArray(reel.likes) ? reel.likes.map(String) : [];
  const userLiked = likesArray.includes(meId);
  const likesCount =
    typeof reel.likesCountOverride === "number"
      ? reel.likesCountOverride
      : likesArray.length;

  const ownerId = String(reel?.user?._id || reel?.user || "");
  const isOwner = ownerId === meId;
  const avatar = reel?.user?.profileImage ? buildFileUrl(reel.user.profileImage) : "/default-avatar.png";
  const username = reel?.user?.username || "user";
  const fullName = `${reel?.user?.firstName || ""} ${reel?.user?.lastName || ""}`.trim();

  const isInteractiveTarget = (target) => {
    let el = target;
    while (el && el !== containerRef.current) {
      if (!el) break;
      if (el.dataset && (el.dataset.stopGesture === "true" || el.dataset.noGesture === "true")) return true;
      const tag = (el.tagName || "").toLowerCase();
      if (["button", "a", "input", "textarea", "select", "label"].includes(tag)) return true;
      const role = el.getAttribute && el.getAttribute("role");
      if (role === "button" || role === "link") return true;
      const ce = el.getAttribute && el.getAttribute("contenteditable");
      if (ce === "" || ce === "true") return true;
      el = el.parentElement;
    }
    return false;
  };

  function goToProfile(e) {
    e?.stopPropagation?.();
    if (ownerId) navigate(`/profile/${ownerId}`);
  }

  async function safePlay() {
    const v = videoRef.current;
    if (!v) return;

    try {
      v.loop = true;
      v.playsInline = true;
      v.muted = mutedRef.current;
      await v.play();
      setPlaying(true);
      userPausedRef.current = false;

      if (!viewedRef.current && !draft) {
        viewedRef.current = true;
        viewReelSafe();
      }
    } catch {
      // If autoplay with audio is blocked, fallback to muted
      if (!v.muted) {
        v.muted = true;
        setMuted(true);
        try {
          await v.play();
          setPlaying(true);
          userPausedRef.current = false;
          if (!viewedRef.current && !draft) {
            viewedRef.current = true;
            viewReelSafe();
          }
        } catch {}
      }
    }
  }

  function safePause(manual = false) {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.pause();
    } catch {}
    setPlaying(false);
    if (manual) userPausedRef.current = true;
  }

  // Make me the active reel now
  function setActiveSelf() {
    window.dispatchEvent(new CustomEvent("reel:setActive", { detail: { id: reelIdStr } }));
  }

  // Auto-activate on initial open (first card or deep-link)
  useEffect(() => {
    if (!autoPlayInitially) return;
    initialGuardUntilRef.current = Date.now() + 2500;
    // Announce as active; the active listener will handle playback
    setActiveSelf();

    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      // Try again once metadata is ready and we are active
      if (isActiveRef.current && !playing && !userPausedRef.current) safePlay();
    };
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("canplay", onLoaded);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("canplay", onLoaded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlayInitially]);

  // Pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        safePause(false);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // IntersectionObserver for visibility + active dispatch
  useEffect(() => {
    const el = containerRef.current;
    if (!el || observedRef.current) return;
    observedRef.current = true;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const now = Date.now();
          const guardActive = now < initialGuardUntilRef.current;
          const ratio = entry.intersectionRatio || 0;

          if (!entry.isIntersecting) {
            // Off screen: pause regardless
            if (playing) safePause(false);
            return;
          }

          // If sufficiently centered, announce as active
          if (ratio >= ACTIVE_THRESHOLD) {
            if (!isActiveRef.current) setActiveSelf();
          }

          // Only the active reel may play
          if (ratio >= PLAY_THRESHOLD) {
            if (isActiveRef.current && !playing && !userPausedRef.current) {
              safePlay();
            }
            return;
          }

          // Low visibility: avoid pausing during initial guard
          if (!guardActive && ratio < PAUSE_THRESHOLD) {
            if (playing) safePause(false);
          }
        });
      },
      { threshold: [0, 0.1, 0.3, 0.6, 1] }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Listen for active reel announcements
  useEffect(() => {
    function onActive(e) {
      const activeId = String(e.detail?.id || "");
      const me = activeId === reelIdStr;

      if (me) {
        isActiveRef.current = true;
        // Always unmute the newly active reel
        setMuted(false);
        if (!playing && !userPausedRef.current) safePlay();
      } else {
        isActiveRef.current = false;
        safePause(false);
        setMuted(true);
      }
    }
    window.addEventListener("reel:setActive", onActive);
    return () => window.removeEventListener("reel:setActive", onActive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reelIdStr, playing]);

  // Unlock audio on first pointer gesture anywhere (from Reels page)
  useEffect(() => {
    function onUnlock() {
      if (isActiveRef.current) {
        setMuted(false);
        if (!playing || mutedRef.current) safePlay();
      }
    }
    window.addEventListener("reel:unlockAudio", onUnlock);
    return () => window.removeEventListener("reel:unlockAudio", onUnlock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Live like count socket sync
  useEffect(() => {
    if (!socket) return;
    const onLikeUpdate = ({ reelId, likesCount }) => {
      if (String(reelId) !== String(reel._id)) return;
      if (typeof likesCount === "number") onUpdateLocal?.({ likesCountOverride: likesCount });
    };
    socket.on("reel:updateLike", onLikeUpdate);
    return () => socket.off("reel:updateLike", onLikeUpdate);
  }, [socket, reel?._id, onUpdateLocal]);

  async function viewReelSafe() {
    if (draft) return; // no views for drafts
    try {
      await viewReel(reel._id);
    } catch {}
  }

  async function doLike() {
    if (liking || draft) return;
    setLiking(true);
    try {
      const res = await likeReel(reel._id);
      const { liked, likesCount: lc } = res.data || {};
      const nextLikes = new Set(likesArray);
      if (liked) nextLikes.add(meId);
      else nextLikes.delete(meId);
      onUpdateLocal?.({
        likes: Array.from(nextLikes),
        likesCountOverride: typeof lc === "number" ? lc : undefined,
      });
    } catch (e) {
      console.error("likeReel failed", e);
    }
    setLiking(false);
  }

  async function sendComment() {
    const t = String(commentText || "").trim();
    if (!t || draft) return;
    setCommentText("");
    try {
      const res = await commentReel(reel._id, t);
      const c = res.data?.comment;
      if (c) onUpdateLocal?.({ comments: [...(reel.comments || []), c] });
    } catch (e) {
      console.error("commentReel failed", e);
    }
  }

  // NEW: report reel
  async function reportReel() {
    const reason = window.prompt(
      "Reason (spam, abuse, nudity, violence, harassment, hate, misinformation, other):",
      "spam"
    );
    if (!reason) return;
    const details = window.prompt("Details (optional):", "") || "";
    try {
      await createReport({
        targetType: "reel",
        reelId: reel._id,
        reason: String(reason).trim().toLowerCase(),
        details,
      });
      alert("Report submitted. Thank you.");
    } catch (e) {
      console.error("Report reel error:", e);
      alert(e?.response?.data?.msg || "Failed to submit report");
    }
  }

  const TAP_MS = 250;
  const SWIPE_THRESHOLD = 60;

  function handleTapOrDoubleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < TAP_MS) {
      // Double tap -> like + heart
      lastTapRef.current = 0;
      if (!userLiked && !draft) {
        doLike();
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 700);
    } else {
      // Single tap toggles play/pause (manual)
      lastTapRef.current = now;
      setTimeout(() => {
        if (Date.now() - lastTapRef.current >= TAP_MS) {
          if (playing) {
            safePause(true);
          } else {
            // Make this reel active before playing
            setActiveSelf();
            safePlay();
          }
        }
      }, TAP_MS + 10);
    }
  }

  function onTouchStart(e) {
    if (isInteractiveTarget(e.target)) return;
    const t = e.touches?.[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }
  function onTouchEnd(e) {
    if (isInteractiveTarget(e.target)) return;
    const tEnd = e.changedTouches?.[0];
    if (!tEnd) return;

    const { x, y } = touchStartRef.current;
    const dx = tEnd.clientX - x;
    const dy = tEnd.clientY - y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
      return;
    }

    handleTapOrDoubleTap();
  }

  function onClick(e) {
    if (isInteractiveTarget(e.target)) return;
    handleTapOrDoubleTap();
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[540px] bg-black rounded-md overflow-hidden shadow relative"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={onClick}
    >
      {/* Header */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <button
          data-stop-gesture="true"
          onClick={goToProfile}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          className="rounded-full border border-white/50"
          title={`@${username}`}
        >
          <img
            src={avatar}
            alt={username}
            className="w-8 h-8 rounded-full object-cover"
          />
        </button>

        <div className="flex flex-col leading-4">
          {fullName && (
            <button
              data-stop-gesture="true"
              onClick={goToProfile}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              className="text-white font-semibold text-sm text-left hover:underline"
              title={fullName}
            >
              {fullName}
            </button>
          )}
          <button
            data-stop-gesture="true"
            onClick={goToProfile}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            className="text-white/90 text-xs text-left hover:underline"
            title={`@${username}`}
          >
            @{username}
          </button>
        </div>

        {draft && (
          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-yellow-500 text-white">
            Draft
          </span>
        )}
      </div>

      {/* Top-right actions */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        {!draft && (
          <button
            data-stop-gesture="true"
            onClick={(e) => {
              e.stopPropagation();
              setShowShare(true);
            }}
            className="px-2 py-1 rounded bg-white/20 text-white hover:bg-white/30"
            title="Share via message"
          >
            Share
          </button>
        )}
        {/* NEW: Report button for non-owners */}
        {!draft && !isOwner && (
          <button
            data-stop-gesture="true"
            onClick={(e) => {
              e.stopPropagation();
              reportReel();
            }}
            className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
            title="Report this reel"
          >
            Report
          </button>
        )}
        {draft && typeof onPublish === "function" && (
          <button
            data-stop-gesture="true"
            onClick={(e) => {
              e.stopPropagation();
              onPublish?.();
            }}
            className="px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700"
            title="Publish reel"
          >
            Publish
          </button>
        )}
        {isOwner && (
          <button
            data-stop-gesture="true"
            onClick={(e) => { e.stopPropagation(); onDelete?.(reel._id); }}
            className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
            title="Delete reel"
          >
            Delete
          </button>
        )}
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        src={buildFileUrl(reel.url)}
        className="w-full h-[72vh] sm:h-[80vh] object-contain bg-black"
        playsInline
        loop
        preload="metadata"
      />

      {/* Heart animation */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          showHeart ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="text-white/90 text-6xl drop-shadow-lg select-none">❤️</div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10">
        <div className="max-w-[70%] text-white">
          {reel.caption && <div className="text-sm mb-2">{reel.caption}</div>}
          {!draft && (
            <div className="flex items-center gap-2">
              <button
                data-stop-gesture="true"
                onClick={(e) => {
                  e.stopPropagation();
                  if (playing) {
                    safePause(true);
                  } else {
                    setActiveSelf();
                    safePlay();
                  }
                }}
                disabled={liking}
                className={`px-3 py-1 rounded ${
                  playing ? "bg-white/20 text-white" : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={playing ? "Pause" : "Play"}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {playing ? "Pause" : "Play"}
              </button>

              {/* Sound toggle */}
              <button
                data-stop-gesture="true"
                onClick={(e) => {
                  e.stopPropagation();
                  const nextMuted = !muted;
                  setMuted(nextMuted);
                  if (isActiveRef.current) safePlay(); // re-apply playback with new mute state
                }}
                className="px-3 py-1 rounded bg-white/20 text-white hover:bg-white/30"
                title={muted ? "Unmute" : "Mute"}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <button
              data-stop-gesture="true"
              onClick={(e) => { e.stopPropagation(); doLike(); }}
              disabled={liking || draft}
              className={`px-2 py-1 rounded ${
                userLiked ? "bg-pink-600 text-white" : "bg-white/20 text-white hover:bg-white/30"
              } text-sm`}
              title={userLiked ? "Unlike" : "Like"}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {userLiked ? "♥" : "♡"} {likesCount > 0 ? likesCount : ""}
            </button>

            <button
              data-stop-gesture="true"
              onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
              className="px-2 py-1 rounded bg-white/20 text-white hover:bg-white/30 text-sm"
              title="View comments"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              💬 {Array.isArray(reel.comments) ? reel.comments.length : 0}
            </button>

            {!draft && isOwner && (
              <button
                data-stop-gesture="true"
                onClick={(e) => { e.stopPropagation(); setShowViews(true); }}
                className="px-2 py-1 rounded bg-white/20 text-white hover:bg-white/30 text-sm"
                title="View viewers"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              >
                👁 {Number(reel.viewsCount || 0)}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Comment input */}
      {!draft && (
        <div className="absolute bottom-3 left-3 right-3 z-10 translate-y-[-3rem]">
          <div className="flex gap-2">
            <input
              data-stop-gesture="true"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendComment();
                }
              }}
              placeholder="Comment..."
              className="flex-1 bg-white/15 text-white placeholder-white/70 rounded px-3 py-1 outline-none"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            />
            <button
              data-stop-gesture="true"
              onClick={(e) => { e.stopPropagation(); sendComment(); }}
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Modals/Drawer */}
      <ReelLikesModal open={showLikes} onClose={() => setShowLikes(false)} reelId={reel._id} />
      <ReelViewsModal open={showViews} onClose={() => setShowViews(false)} reelId={reel._id} />
      <ReelCommentsDrawer open={showComments} onClose={() => setShowComments(false)} reelId={reel._id} />

      {/* Share modal */}
      <ReelShareModal open={showShare} onClose={() => setShowShare(false)} reel={reel} />
    </div>
  );
}