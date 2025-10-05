// src/api/posts.js
import API from "./axios";

export const checkPostAccess = (id, userIds = []) => {
  const qs = new URLSearchParams();
  if (userIds.length) qs.set("userIds", userIds.join(","));
  return API.get(`/posts/${id}/can-view${qs.toString() ? `?${qs.toString()}` : ""}`);
};