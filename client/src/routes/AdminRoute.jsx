// src/routes/AdminRoute.jsx
import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token) return <Navigate to="/home" replace />;
  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return children;
}