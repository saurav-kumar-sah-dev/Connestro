// src/api/messages.js
import API from "./axios";

export const fetchConversations = () => API.get("/messages/conversations");

export const getOrCreateConversationWithUser = (userId) =>
  API.post(`/messages/conversations/with/${userId}`);

export const fetchMessages = (conversationId, { before, limit = 25 } = {}) => {
  const qs = new URLSearchParams();
  if (before) qs.set("before", before);
  if (limit) qs.set("limit", String(limit));
  return API.get(`/messages/conversations/${conversationId}/messages?${qs.toString()}`);
};

export const sendMessageApi = (conversationId, { text, files }) => {
  const form = new FormData();
  if (text) form.append("text", text);
  if (Array.isArray(files)) files.forEach((f) => form.append("attachments", f));
  return API.post(`/messages/conversations/${conversationId}/messages`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const editMessageApi = (messageId, text) =>
  API.patch(`/messages/message/${messageId}`, { text });

export const deleteForMeApi = (messageId) =>
  API.delete(`/messages/message/${messageId}`);

export const deleteForEveryoneApi = (messageId) =>
  API.delete(`/messages/message/${messageId}/everyone`);

export const markReadApi = (conversationId) =>
  API.patch(`/messages/conversations/${conversationId}/read`);

export const clearConversationApi = (conversationId) =>
  API.post(`/messages/${conversationId}/clear`);