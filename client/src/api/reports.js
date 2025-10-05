// src/api/reports.js
import API from "./axios";

export const createReport = (payload) => {
  if (payload instanceof FormData) {
    return API.post("/reports", payload, { headers: { "Content-Type": "multipart/form-data" } });
  }
  return API.post("/reports", payload);
};
export const getMyReports = () => API.get("/reports/mine");

export const adminListReports = (params = {}) => API.get("/admin/reports", { params });
export const adminGetReport = (id) => API.get(`/admin/reports/${id}`);
export const adminUpdateReport = (id, payload) => API.put(`/admin/reports/${id}`, payload);

export const adminExportReports = (params = {}) =>
  API.get("/admin/reports/export", { params, responseType: "blob" });