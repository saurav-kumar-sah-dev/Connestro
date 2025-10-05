// src/api/reels.js
import API from "./axios";

export const getReelsFeed = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  return API.get(`/reels${qs.toString() ? `?${qs.toString()}` : ""}`);
};

export const getUserReels = (userId) => API.get(`/reels/user/${userId}`);

export const createReel = (
  file,
  { caption = "", visibility = "public", draft = false } = {}
) => {
  const form = new FormData();
  form.append("video", file);
  if (caption) form.append("caption", caption);
  if (visibility) form.append("visibility", visibility);
  if (draft != null) form.append("draft", String(draft));
  return API.post("/reels", form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const likeReel = (id) => API.post(`/reels/${id}/like`);
export const commentReel = (id, text) => API.post(`/reels/${id}/comment`, { text });
export const viewReel = (id) => API.post(`/reels/${id}/view`);
export const deleteReel = (id) => API.delete(`/reels/${id}`);

export const getMyReelDrafts = () => API.get("/reels/drafts");
export const publishReel = (id, { visibility = "public" } = {}) =>
  API.put(`/reels/${id}/publish`, { visibility });

export const getReelLikes = (id) => API.get(`/reels/${id}/likes`);
export const getReelComments = (id, { limit = 50 } = {}) =>
  API.get(`/reels/${id}/comments?limit=${Math.min(200, Math.max(1, Number(limit)))}`);
export const getReelViews = (id, { limit = 50 } = {}) =>
  API.get(`/reels/${id}/views?limit=${Math.min(200, Math.max(1, Number(limit)))}`);

export const voteReelComment = (id, commentId, vote) =>
  API.post(`/reels/${id}/comment/${commentId}/vote`, { vote });

export const replyToReelComment = (id, commentId, text) =>
  API.post(`/reels/${id}/comment/${commentId}/reply`, { text });

export const voteReelReply = (id, commentId, replyId, vote) =>
  API.post(`/reels/${id}/comment/${commentId}/reply/${replyId}/vote`, { vote });

export const reactReelReply = (id, commentId, replyId, emoji) =>
  API.put(`/reels/${id}/comment/${commentId}/reply/${replyId}/react`, { emoji });

export const checkReelAccess = (id, userIds = []) => {
  const qs = new URLSearchParams();
  if (userIds.length) qs.set("userIds", userIds.join(","));
  return API.get(`/reels/${id}/can-view${qs.toString() ? `?${qs.toString()}` : ""}`);
};