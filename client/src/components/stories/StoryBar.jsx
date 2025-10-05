// src/components/stories/StoryBar.jsx
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppContext } from "../../context/AppContext";
import { getStoriesFeed, createStory, deleteStory, getUnseenStoriesMap } from "../../api/stories";
import StoryViewer from "./StoryViewer";
import { buildFileUrl } from "../../utils/url";

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

// Group helpers
function groupUpsert(list, story) {
  const uid = String(story.user?._id || story.user);
  const i = list.findIndex((g) => String(g.user?._id || g.user) === uid);
  if (i >= 0) {
    const existIdx = list[i].stories.findIndex((s) => String(s._id) === String(story._id));
    if (existIdx >= 0) list[i].stories[existIdx] = story;
    else list[i].stories.unshift(story);
    list[i].stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const g = list.splice(i, 1)[0];
    return [g, ...list];
  } else {
    return [{ user: story.user, stories: [story] }, ...list];
  }
}

function groupRemove(list, storyId) {
  let changed = false;
  const next = list
    .map((g) => {
      const stories = g.stories.filter((s) => String(s._id) !== String(storyId));
      if (stories.length !== g.stories.length) changed = true;
      return { ...g, stories };
    })
    .filter((g) => g.stories.length > 0);
  return changed ? next : list;
}

// Filter out expired stories (front-end safety net for TTL)
function purgeExpiredGroups(groups) {
  const now = Date.now();
  const next = groups
    .map((g) => ({
      ...g,
      stories: (g.stories || []).filter((s) => new Date(s.expiresAt).getTime() > now),
    }))
    .filter((g) => g.stories.length > 0);
  return next;
}

export default function StoryBar({ openUserId, openStoryId }) {
  const { socket } = useContext(AppContext);
  const me = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUser, setViewerUser] = useState(null);
  const [viewerStories, setViewerStories] = useState([]);
  const [viewerStart, setViewerStart] = useState(0);

  // Add story modal state
  const [showAdd, setShowAdd] = useState(false);
  const [addFile, setAddFile] = useState(null);
  const [addPreviewUrl, setAddPreviewUrl] = useState("");
  const [addCaption, setAddCaption] = useState("");
  const [addVisibility, setAddVisibility] = useState("public");
  const [addDurationSec, setAddDurationSec] = useState(0);
  const fileInputRef = useRef(null);
  const videoProbeRef = useRef(null);

  // Unseen counts
  const [unseenMap, setUnseenMap] = useState({}); // userId -> unseen count

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getStoriesFeed();
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        const ordered = items.sort((a, b) => {
          const aT = new Date(a.stories?.[0]?.createdAt || 0).getTime();
          const bT = new Date(b.stories?.[0]?.createdAt || 0).getTime();
          return bT - aT;
        });
        const gs = purgeExpiredGroups(ordered);
        setGroups(gs);

        // Fetch unseen counts for listed users
        const ids = gs.map((g) => String(g.user?._id || g.user)).filter(Boolean);
        if (ids.length) {
          const unseenRes = await getUnseenStoriesMap(ids);
          setUnseenMap(unseenRes.data?.map || {});
        } else {
          setUnseenMap({});
        }
      } catch (e) {
        console.error("Load stories error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Background purge of expired stories (TTL won't emit events)
  useEffect(() => {
    const id = setInterval(() => {
      setGroups((prev) => {
        const next = purgeExpiredGroups(prev);
        return next === prev ? prev : next;
      });
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // When groups change (e.g., on new story), refresh unseen map for those users
  useEffect(() => {
    const ids = groups.map((g) => String(g.user?._id || g.user)).filter(Boolean);
    if (!ids.length) return;
    (async () => {
      try {
        const unseenRes = await getUnseenStoriesMap(ids);
        setUnseenMap(unseenRes.data?.map || {});
      } catch {
        // ignore
      }
    })();
  }, [groups]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    const onNew = (story) => {
      setGroups((prev) => purgeExpiredGroups(groupUpsert([...prev], story)));
      const uid = String(story?.user?._id || story?.user || "");
      if (!uid) return;
      setUnseenMap((prev) => {
        if (!(uid in prev)) return prev; // update only if present in our bar
        return { ...prev, [uid]: (prev[uid] || 0) + 1 };
      });
    };
    const onDeleted = ({ id, userId }) => {
      setGroups((prev) => groupRemove(prev, id));
      if (!userId) return;
      setUnseenMap((prev) => {
        if (!(userId in prev)) return prev;
        const n = Math.max(0, (prev[userId] || 0) - 1);
        return { ...prev, [userId]: n };
      });
    };
    socket.on("story:new", onNew);
    socket.on("story:deleted", onDeleted);
    return () => {
      socket.off("story:new", onNew);
      socket.off("story:deleted", onDeleted);
    };
  }, [socket]);

  const openViewer = (group, startIdx = 0) => {
    setViewerUser(group.user);
    setViewerStories(group.stories);
    setViewerStart(startIdx);
    setShowViewer(true);
  };

  const onDeletedInViewer = (storyId) => {
    setGroups((prev) => groupRemove(prev, storyId));
    setViewerStories((prev) => prev.filter((s) => String(s._id) !== String(storyId)));
  };

  // Decrement unseen when a story is newly viewed
  const onViewedInViewer = ({ userId }) => {
    if (!userId) return;
    setUnseenMap((prev) => ({ ...prev, [userId]: Math.max(0, (prev[userId] || 0) - 1) }));
  };

  // Cross-user navigation from inside the viewer
  const onRequestNextUser = () => {
    if (!viewerUser) return false;
    const uid = String(viewerUser?._id || viewerUser);
    const idx = groups.findIndex((g) => String(g.user?._id || g.user) === uid);
    if (idx >= 0 && idx + 1 < groups.length) {
      const nextGroup = groups[idx + 1];
      setViewerUser(nextGroup.user);
      setViewerStories(nextGroup.stories);
      setViewerStart(0);
      return true;
    }
    return false;
  };

  const onRequestPrevUser = () => {
    if (!viewerUser) return false;
    const uid = String(viewerUser?._id || viewerUser);
    const idx = groups.findIndex((g) => String(g.user?._id || g.user) === uid);
    if (idx > 0) {
      const prevGroup = groups[idx - 1];
      setViewerUser(prevGroup.user);
      setViewerStories(prevGroup.stories);
      setViewerStart(Math.max(0, prevGroup.stories.length - 1));
      return true;
    }
    return false;
  };

  const pickFile = () => fileInputRef.current?.click();

  // Robust video probe
  const onFileSelected = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const isVideo = f.type.startsWith("video/");
    const isImage = f.type.startsWith("image/");
    if (!isVideo && !isImage) {
      alert("Only images or videos allowed");
      e.target.value = "";
      return;
    }

    setAddFile(f);
    setAddCaption("");
    setAddVisibility("public");

    const url = URL.createObjectURL(f);
    setAddPreviewUrl(url);

    if (isVideo) {
      const v = document.createElement("video");
      videoProbeRef.current = v;
      v.preload = "metadata";
      v.muted = true;
      v.playsInline = true;

      let handled = false;
      const done = (durSec) => {
        if (handled) return;
        handled = true;
        if (Number.isFinite(durSec) && durSec > 15) {
          alert("Video must be 15 seconds or less");
          cleanupPick();
          return;
        }
        setAddDurationSec(Number.isFinite(durSec) && durSec > 0 ? Math.round(durSec) : 0);
        setShowAdd(true);
      };

      v.addEventListener(
        "loadedmetadata",
        () => {
          const dur = v.duration && isFinite(v.duration) ? v.duration : 0;
          done(dur);
        },
        { once: true }
      );

      v.addEventListener(
        "loadeddata",
        () => {
          if (!handled) {
            const dur = v.duration && isFinite(v.duration) ? v.duration : 0;
            done(dur);
          }
        },
        { once: true }
      );

      v.addEventListener(
        "error",
        () => {
          done(0);
        },
        { once: true }
      );

      v.src = url;
      try {
        v.load();
      } catch {}
      setTimeout(() => {
        if (!handled) done(0);
      }, 1500);
    } else {
      setAddDurationSec(0);
      setShowAdd(true);
    }
  };

  const cleanupPick = () => {
    setAddFile(null);
    setAddPreviewUrl("");
    setAddCaption("");
    setAddVisibility("public");
    setAddDurationSec(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    try {
      if (videoProbeRef.current) {
        videoProbeRef.current.src = "";
        videoProbeRef.current.load();
      }
    } catch {}
  };

  const submitAdd = async () => {
    if (!addFile) return;
    try {
      const res = await createStory(addFile, {
        caption: addCaption,
        visibility: addVisibility,
        durationSec: addDurationSec || 0,
      });
      const st = res.data?.story;
      if (st) setGroups((prev) => purgeExpiredGroups(groupUpsert([...prev], st)));
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.msg || "Failed to upload story");
    } finally {
      setShowAdd(false);
      cleanupPick();
    }
  };

  // Find my group
  const meGroupIdx = groups.findIndex((g) => String(g.user?._id) === String(me.id));
  const meGroup = meGroupIdx >= 0 ? groups[meGroupIdx] : null;
  const myAvatar = meGroup?.user?.profileImage ? buildFileUrl(meGroup.user.profileImage) : "/default-avatar.png";

  // Dynamic ring for your own bubble (colored if unseen > 0)
  const myUid = String(me?.id || "");
  const myUnseen = myUid ? (unseenMap[myUid] || 0) : 0;
  const myRingClass = myUnseen > 0 ? "bg-gradient-to-tr from-pink-500 to-yellow-500" : "bg-gray-300";

  // Deep-link open: by props or URL search params fallback
  useEffect(() => {
    // Prefer props; if not provided, read from URL
    const url = new URL(window.location.href);
    const queryUser = url.searchParams.get("openStoryUser");
    const queryStory = url.searchParams.get("openStoryId");
    const targetUserId = openUserId || queryUser;
    const targetStoryId = openStoryId || queryStory;

    if (!targetUserId || !groups.length) return;
    const g = groups.find((gg) => String(gg.user?._id || gg.user) === String(targetUserId));
    if (!g) return;

    let startIdx = 0;
    if (targetStoryId) {
      const i = (g.stories || []).findIndex((s) => String(s._id) === String(targetStoryId));
      if (i >= 0) startIdx = i;
    }

    openViewer(g, startIdx);

    // Clear query params so it doesn't reopen on navigation
    try {
      if (queryUser || queryStory) {
        url.searchParams.delete("openStoryUser");
        url.searchParams.delete("openStoryId");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {}
  }, [openUserId, openStoryId, groups]);

  return (
    <>
      <div className="w-full overflow-x-auto">
        <div className="flex items-center gap-3 p-2">
          {/* Your story bubble */}
          <div className="flex flex-col items-center">
            <button
              onClick={meGroup ? () => openViewer(meGroup, 0) : pickFile}
              className={`relative w-16 h-16 rounded-full ${myRingClass} p-[2px]`}
              title={meGroup ? "View your stories" : "Add story"}
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                {meGroup ? (
                  <>
                    <img src={myAvatar} alt="me" className="w-full h-full rounded-full object-cover" />
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        pickFile();
                      }}
                      title="Add new"
                      className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center"
                    >
                      +
                    </span>
                  </>
                ) : (
                  <span className="text-2xl">+</span>
                )}
              </div>
            </button>
            <div className="text-xs mt-1">Your story</div>
          </div>

          {/* Story users */}
          {loading ? (
            <div className="text-sm text-gray-500">Loading stories…</div>
          ) : groups.length === 0 ? (
            <div className="text-sm text-gray-500">No stories yet</div>
          ) : (
            groups.map((g) => {
              // skip my group in the list (it's already at left)
              if (String(g.user?._id) === String(me.id)) return null;
              const avatar = g.user?.profileImage ? buildFileUrl(g.user.profileImage) : "/default-avatar.png";
              const count = g.stories?.length || 0;
              const uid = String(g.user?._id);
              const unseen = unseenMap[uid] || 0;
              const ringClass = unseen > 0 ? "bg-gradient-to-tr from-pink-500 to-yellow-500" : "bg-gray-300";

              // Compute earliest expiry and a compact label
              const exps = (g.stories || [])
                .map((s) => new Date(s.expiresAt).getTime())
                .filter((t) => Number.isFinite(t));
              const soonest = exps.length ? Math.min(...exps) : 0;
              const leftMs = soonest ? Math.max(0, soonest - Date.now()) : 0;
              const leftLabel = leftMs ? fmtTimeLeft(leftMs) : "";

              return (
                <div key={uid} className="flex flex-col items-center">
                  <button
                    onClick={() => openViewer(g, 0)}
                    className={`relative w-16 h-16 rounded-full ${ringClass} p-[2px]`}
                    title={
                      leftLabel
                        ? `@${g.user?.username} (${count}) • ${leftLabel} left`
                        : `@${g.user?.username} (${count})`
                    }
                  >
                    <img
                      src={avatar}
                      alt={g.user?.username}
                      className="w-full h-full rounded-full object-cover bg-white p-[2px]"
                    />
                    {/* Small time-left badge (visible) */}
                    {leftLabel && leftLabel !== "Expired" && (
                      <span className="absolute -bottom-1 -right-1 px-1.5 py-[1px] rounded bg-black/70 text-white text-[10px] leading-none">
                        {leftLabel}
                      </span>
                    )}
                  </button>
                  <div className="text-xs mt-1 max-w-[64px] truncate">@{g.user?.username}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Hidden input for media picking */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" hidden onChange={onFileSelected} />

      {/* Add story modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-md p-4 w-full max-w-md">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Add story</h3>
              <button
                onClick={() => {
                  setShowAdd(false);
                  cleanupPick();
                }}
                className="px-2 py-1 rounded hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-center mb-3">
              {addPreviewUrl &&
                (addFile?.type?.startsWith("video/") ? (
                  <video src={addPreviewUrl} className="max-w-full max-h-64" controls />
                ) : (
                  <img src={addPreviewUrl} alt="" className="max-w-full max-h-64 object-contain" />
                ))}
            </div>

            <div className="space-y-2">
              <input
                value={addCaption}
                onChange={(e) => setAddCaption(e.target.value)}
                placeholder="Caption (optional)"
                maxLength={200}
                className="w-full border rounded px-3 py-2"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Visibility:</label>
                <select value={addVisibility} onChange={(e) => setAddVisibility(e.target.value)} className="border rounded px-2 py-1">
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                </select>
                {addFile?.type?.startsWith("video/") && (
                  <div className="text-sm text-gray-600 ml-auto">
                    Duration: {addDurationSec > 0 ? `${addDurationSec}s` : "unknown"} (max 15s)
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setShowAdd(false);
                  cleanupPick();
                }}
                className="px-3 py-1 rounded border"
              >
                Cancel
              </button>
              <button onClick={submitAdd} className="px-3 py-1 rounded bg-blue-600 text-white">
                Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer */}
      {showViewer && viewerUser && (
        <StoryViewer
          user={viewerUser}
          stories={viewerStories}
          startIndex={viewerStart}
          onClose={() => setShowViewer(false)}
          onDeleted={onDeletedInViewer}
          canDelete={String(viewerUser?._id) === String(me.id)}
          onDeleteRequest={async (story) => {
            await deleteStory(story._id);
          }}
          onViewed={onViewedInViewer}
          onRequestNextUser={onRequestNextUser}
          onRequestPrevUser={onRequestPrevUser}
        />
      )}
    </>
  );
}