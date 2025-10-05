// src/api/audit.js
import API from "./axios";

export const adminListAudit = (params = {}) => API.get("/admin/audit", { params });
export const adminExportAudit = (params = {}) =>
  API.get("/admin/audit/export", { params, responseType: "blob" });