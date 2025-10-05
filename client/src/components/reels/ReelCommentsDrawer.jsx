// src/components/reels/ReelCommentsDrawer.jsx
import { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getReelComments,
  voteReelComment,
  replyToReelComment,
  voteReelReply,
  reactReelReply,
} from "../../api/reels";
import { buildFileUrl } from "../../utils/url";
import { AppContext } from "../../context/AppContext";

const EMOJIS = ["👍", "❤️", "😂", "🔥", "😮", "😢"];

// Aggregate reactions by emoji
const reactionCounts = (reactions = []) => {
  const map = {};
  for (const r of reactions) {
    if (!r?.emoji) continue;
    map[r.emoji] = (map[r.emoji] || 0) + 1;
  }
  return map;
};

export default function ReelCommentsDrawer({ open, onClose, reelId }) {
  const { socket } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [err, setErr] = useState("");
  const [replyText, setReplyText] = useState({}); // { [commentId]: string }
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const meId = useMemo(() => {
    try {
      return String(JSON.parse(localStorage.getItem("user") || "{}")?.id || "");
    } catch {
      return "";
    }
  }, []);

  // Load comments on open
  useEffect(() => {
    if (!open || !reelId) return;
    let mounted = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await getReelComments(reelId, { limit: 100 });
        if (!mounted) return;
        const list = Array.isArray(res.data?.comments) ? res.data.comments : [];
        setComments(list);
      } catch (e) {
        setErr(e?.response?.data?.msg || "Failed to load comments");
        setComments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, reelId]);

  // Live socket updates while drawer is open
  useEffect(() => {
    if (!open || !socket || !reelId) return;

    const onNewReply = ({ reelId: rid, commentId, reply }) => {
      if (String(rid) !== String(reelId) || !reply) return;
      setComments((prev) =>
        prev.map((c) =>
          String(c._id) === String(commentId)
            ? {
                ...c,
                replies: [...(c.replies || []).filter((r) => String(r._id) !== String(reply._id)), reply],
              }
            : c
        )
      );
    };

    const onUpdateCommentVote = ({ reelId: rid, commentId, likesCount, dislikesCount }) => {
      if (String(rid) !== String(reelId)) return;
      setComments((prev) =>
        prev.map((c) =>
          String(c._id) === String(commentId)
            ? { ...c, likesCount: Number(likesCount || 0), dislikesCount: Number(dislikesCount || 0) }
            : c
        )
      );
    };

    const onUpdateReplyVote = ({ reelId: rid, commentId, replyId, likesCount, dislikesCount }) => {
      if (String(rid) !== String(reelId)) return;
      setComments((prev) =>
        prev.map((c) =>
          String(c._id) === String(commentId)
            ? {
                ...c,
                replies: (c.replies || []).map((r) =>
                  String(r._id) === String(replyId)
                    ? { ...r, likesCount: Number(likesCount || 0), dislikesCount: Number(dislikesCount || 0) }
                    : r
                ),
              }
            : c
        )
      );
    };

    const onUpdateReplyReaction = ({ reelId: rid, commentId, reply }) => {
      if (String(rid) !== String(reelId) || !reply) return;
      setComments((prev) =>
        prev.map((c) =>
          String(c._id) === String(commentId)
            ? {
                ...c,
                replies: (c.replies || []).map((r) => (String(r._id) === String(reply._id) ? reply : r)),
              }
            : c
        )
      );
    };

    socket.on("reel:newReply", onNewReply);
    socket.on("reel:updateCommentVote", onUpdateCommentVote);
    socket.on("reel:updateReplyVote", onUpdateReplyVote);
    socket.on("reel:updateReplyReaction", onUpdateReplyReaction);

    return () => {
      socket.off("reel:newReply", onNewReply);
      socket.off("reel:updateCommentVote", onUpdateCommentVote);
      socket.off("reel:updateReplyVote", onUpdateReplyVote);
      socket.off("reel:updateReplyReaction", onUpdateReplyReaction);
    };
  }, [open, socket, reelId]);

  const setReplyVal = (cid, val) => setReplyText((prev) => ({ ...prev, [cid]: val }));

  // Vote handlers with optimistic myVote update (counts from server)
  const onVoteComment = async (commentId, vote) => {
    try {
      const prev = comments.find((c) => String(c._id) === String(commentId));
      const prevVote = prev?.myVote || null;
      const newMyVote = prevVote === vote ? null : vote;

      const res = await voteReelComment(reelId, commentId, vote);
      const likesCount = Number(res.data?.likesCount || 0);
      const dislikesCount = Number(res.data?.dislikesCount || 0);

      setComments((prevList) =>
        prevList.map((c) =>
          String(c._id) === String(commentId) ? { ...c, likesCount, dislikesCount, myVote: newMyVote } : c
        )
      );
    } catch (e) {
      console.error("vote comment failed", e);
    }
  };

  const onVoteReply = async (commentId, replyId, vote) => {
    try {
      const parent = comments.find((c) => String(c._id) === String(commentId));
      const rPrev = (parent?.replies || []).find((r) => String(r._id) === String(replyId));
      const prevVote = rPrev?.myVote || null;
      const newMyVote = prevVote === vote ? null : vote;

      const res = await voteReelReply(reelId, commentId, replyId, vote);
      const likesCount = Number(res.data?.likesCount || 0);
      const dislikesCount = Number(res.data?.dislikesCount || 0);

      setComments((prevList) =>
        prevList.map((c) =>
          String(c._id) === String(commentId)
            ? {
                ...c,
                replies: (c.replies || []).map((r) =>
                  String(r._id) === String(replyId)
                    ? { ...r, likesCount, dislikesCount, myVote: newMyVote }
                    : r
                ),
              }
            : c
        )
      );
    } catch (e) {
      console.error("vote reply failed", e);
    }
  };

  const onReactReply = async (commentId, replyId, emoji) => {
    try {
      const res = await reactReelReply(reelId, commentId, replyId, emoji);
      const updated = res.data?.reply;
      if (!updated) return;
      setComments((prevList) =>
        prevList.map((c) =>
          String(c._id) === String(commentId)
            ? {
                ...c,
                replies: (c.replies || []).map((r) => (String(r._id) === String(replyId) ? updated : r)),
              }
            : c
        )
      );
    } catch (e) {
      console.error("react reply failed", e);
    }
  };

  const onSendReply = async (commentId) => {
    const text = String(replyText[commentId] || "").trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await replyToReelComment(reelId, commentId, text);
      const newReply = res.data?.reply || null;
      setReplyVal(commentId, "");
      if (newReply) {
        setComments((prev) =>
          prev.map((c) =>
            String(c._id) === String(commentId)
              ? {
                  ...c,
                  replies: [...(c.replies || []).filter((r) => String(r._id) !== String(newReply._id)), newReply],
                }
              : c
          )
        );
      }
    } catch (e) {
      console.error("send reply failed", e);
    }
    setSending(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />

      {/* Bottom sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-lg max-h-[75vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold">Comments</div>
          <button className="px-2 py-1 rounded hover:bg-gray-100" onClick={onClose}>✕</button>
        </div>

        <div className="p-3">
          {loading ? (
            <div className="text-sm text-gray-600">Loading…</div>
          ) : err ? (
            <div className="text-sm text-red-600">{err}</div>
          ) : comments.length === 0 ? (
            <div className="text-sm text-gray-600">No comments yet</div>
          ) : (
            <ul className="space-y-4">
              {comments.map((c) => {
                const u = c?.user || {};
                const avatar = u?.profileImage ? buildFileUrl(u.profileImage) : "/default-avatar.png";
                const fullName = `${u?.firstName || ""} ${u?.lastName || ""}`.trim();
                const when = c?.createdAt ? new Date(c.createdAt).toLocaleString() : "";
                const myVote = c?.myVote || null;

                return (
                  <li key={c._id} className="flex gap-3">
                    <button
                      onClick={() => {
                        onClose?.();
                        navigate(`/profile/${u._id}`);
                      }}
                      className="shrink-0"
                      title={`@${u?.username}`}
                    >
                      <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <button
                          onClick={() => {
                            onClose?.();
                            navigate(`/profile/${u._id}`);
                          }}
                          className="font-semibold hover:underline"
                          title={fullName || `@${u?.username}`}
                        >
                          {fullName || `@${u?.username}`}
                        </button>{" "}
                        <span className="text-gray-700 break-words">{c.text}</span>
                      </div>

                      <div className="text-xs text-gray-500">{when}</div>

                      {/* Comment actions */}
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <button
                          onClick={() => onVoteComment(c._id, "like")}
                          className={`px-2 py-0.5 rounded ${myVote === "like" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}
                          title="Like"
                        >
                          👍 {Number.isFinite(c.likesCount) ? c.likesCount : 0}
                        </button>
                        <button
                          onClick={() => onVoteComment(c._id, "dislike")}
                          className={`px-2 py-0.5 rounded ${myVote === "dislike" ? "bg-red-100 text-red-700" : "hover:bg-gray-100"}`}
                          title="Dislike"
                        >
                          👎 {Number.isFinite(c.dislikesCount) ? c.dislikesCount : 0}
                        </button>

                        <button
                          onClick={() => setReplyVal(c._id, replyText[c._id] !== undefined ? replyText[c._id] : "")}
                          className="px-2 py-0.5 rounded hover:bg-gray-100"
                          title="Reply"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Reply input */}
                      {replyText[c._id] !== undefined && (
                        <div className="mt-2 flex gap-2">
                          <input
                            type="text"
                            value={replyText[c._id] || ""}
                            onChange={(e) => setReplyVal(c._id, e.target.value)}
                            className="flex-1 border rounded px-2 py-1 text-sm"
                            placeholder="Write a reply..."
                          />
                          <button
                            onClick={() => onSendReply(c._id)}
                            disabled={sending || !(replyText[c._id] || "").trim()}
                            className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
                          >
                            Send
                          </button>
                        </div>
                      )}

                      {/* Replies */}
                      {Array.isArray(c.replies) && c.replies.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {c.replies.map((r) => {
                            const ru = r?.user || {};
                            const ravatar = ru?.profileImage ? buildFileUrl(ru.profileImage) : "/default-avatar.png";
                            const rfullName = `${ru?.firstName || ""} ${ru?.lastName || ""}`.trim();
                            const rwhen = r?.createdAt ? new Date(r.createdAt).toLocaleString() : "";
                            const rVotes = { like: r?.likesCount || 0, dislike: r?.dislikesCount || 0 };
                            const rMyVote = r?.myVote || null;
                            const counts = reactionCounts(r?.reactions || []);

                            return (
                              <div key={r._id} className="flex gap-2 ml-10">
                                <button
                                  onClick={() => {
                                    onClose?.();
                                    navigate(`/profile/${ru._id}`);
                                  }}
                                  className="shrink-0"
                                  title={`@${ru?.username}`}
                                >
                                  <img src={ravatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                                </button>
                                <div className="flex-1">
                                  <div className="text-sm">
                                    <button
                                      onClick={() => {
                                        onClose?.();
                                        navigate(`/profile/${ru._id}`);
                                      }}
                                      className="font-semibold hover:underline"
                                      title={rfullName || `@${ru?.username}`}
                                    >
                                      {rfullName || `@${ru?.username}`}
                                    </button>{" "}
                                    <span className="text-gray-700 break-words">{r.text}</span>
                                  </div>
                                  <div className="text-xs text-gray-500">{rwhen}</div>

                                  <div className="mt-1 flex items-center gap-2 text-sm">
                                    <button
                                      onClick={() => onVoteReply(c._id, r._id, "like")}
                                      className={`px-2 py-0.5 rounded ${rMyVote === "like" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}
                                      title="Like reply"
                                    >
                                      👍 {rVotes.like}
                                    </button>
                                    <button
                                      onClick={() => onVoteReply(c._id, r._id, "dislike")}
                                      className={`px-2 py-0.5 rounded ${rMyVote === "dislike" ? "bg-red-100 text-red-700" : "hover:bg-gray-100"}`}
                                      title="Dislike reply"
                                    >
                                      👎 {rVotes.dislike}
                                    </button>

                                    {/* Emoji reactions */}
                                    <div className="flex items-center gap-1 ml-2">
                                      {EMOJIS.map((e) => (
                                        <button
                                          key={e}
                                          onClick={() => onReactReply(c._id, r._id, e)}
                                          className="text-sm px-1.5 py-0.5 rounded hover:bg-gray-100"
                                          title={`React ${e}`}
                                        >
                                          {e}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Reaction counts */}
                                  {Object.keys(counts).length > 0 && (
                                    <div className="mt-1 text-xs text-gray-600 flex gap-2">
                                      {Object.entries(counts).map(([e, ct]) => (
                                        <span key={e}>
                                          {e} {ct}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}