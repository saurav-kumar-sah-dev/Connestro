import axios from "axios";
import { API_BASE } from "../utils/url";

const API = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const hadAuth = Boolean(error?.config?.headers?.Authorization);
    const reqUrl = error?.config?.url || "";
    const isAuthEndpoint = /\/auth\/(login|signup|social)/i.test(reqUrl);

    if ((status === 401 || status === 403) && hadAuth && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login"))
        window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API;
