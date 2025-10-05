// src/utils/url.js
export const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

// Build a full URL to a server-hosted file
export function buildFileUrl(p, seed) {
  if (!p) return "";
  const path = String(p);
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  const full = path.startsWith("/") ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  if (!seed) return full;
  if (/\bt=/.test(full)) return full;
  return `${full}${full.includes("?") ? "&" : "?"}t=${seed}`;
}