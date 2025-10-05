// src/api/stories.js
import API from "./axios";

export const getStoriesFeed = () => API.get("/stories");
export const getUserStories = (userId) => API.get(`/stories/user/${userId}`);

export const createStory = (
  file,
  { caption = "", visibility = "public", durationSec = 0 } = {}
) => {
  const form = new FormData();
  form.append("media", file);
  if (caption) form.append("caption", caption);
  if (visibility) form.append("visibility", visibility);
  if (durationSec) form.append("durationSec", String(durationSec));
  return API.post("/stories", form, { headers: { "Content-Type": "multipart/form-data" } });
};

export const deleteStory = (id) => API.delete(`/stories/${id}`);

// Active story counts for multiple users (for rings)
export const getActiveStoriesMap = (ids = []) => {
  const qs = new URLSearchParams();
  if (Array.isArray(ids) && ids.length) qs.set("ids", ids.join(","));
  return API.get(`/stories/active?${qs.toString()}`);
};

// Unseen story counts for multiple users (for seen/unseen rings)
export const getUnseenStoriesMap = (ids = []) => {
  const qs = new URLSearchParams();
  if (Array.isArray(ids) && ids.length) qs.set("ids", ids.join(","));
  return API.get(`/stories/unseen?${qs.toString()}`);
};

// Mark a story as viewed (idempotent); server returns { newlyViewed: boolean }
export const viewStory = (id) => API.post(`/stories/${id}/view`);

// React to a story: type: "like" | "emoji" | "text"; include emoji/text for those types
export const reactStory = (id, payload) => API.post(`/stories/${id}/react`, payload);

// List reactions summary (likesCount, userLiked, latest emoji/text)
export const getStoryReactions = (id) => API.get(`/stories/${id}/reactions`);

// List viewers (owner only)
export const getStoryViews = (id, { limit = 50 } = {}) =>
  API.get(`/stories/${id}/views?limit=${Math.min(200, Math.max(1, Number(limit)))}`);