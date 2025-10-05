// src/api/notifications.js
import API from "./axios";

export const fetchNotifications = (limit = 50) =>
  API.get(`/notifications?limit=${limit}`);

export const markNotificationRead = (id) =>
  API.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = () =>
  API.patch(`/notifications/read-all`);

export const deleteNotification = (id) =>
  API.delete(`/notifications/${id}`);

export const clearAllNotifications = () =>
  API.delete(`/notifications`);

export const getNotificationSettings = () =>
  API.get("/users/me/notification-settings");

export const updateNotificationSettings = (payload) =>
  API.patch("/users/me/notification-settings", payload);