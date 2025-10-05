// src/components/admin/AdminOverview.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import { useTheme } from "../../context/ThemeContext";
import clsx from "clsx";

export default function AdminOverview() {
  const { darkMode } = useTheme();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/metrics");
      setMetrics(res.data);
    } catch (e) {
      console.error(e);
      alert("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const go = (tab, params = {}) => {
    const sp = new URLSearchParams({ tab, ...params });
    navigate({ pathname: "/admin", search: `?${sp.toString()}` });
  };

  if (loading || !metrics)
    return (
      <p
        className={clsx(
          "text-center mt-6 font-medium",
          darkMode ? "text-gray-300" : "text-gray-600"
        )}
      >
        Loading metrics...
      </p>
    );

  const { users, posts, reels } = metrics;

  const Card = ({ title, children }) => (
    <div
      className={clsx(
        "p-5 rounded-xl border shadow-sm transition-colors",
        darkMode
          ? "bg-gray-900 border-gray-800 shadow-black/30"
          : "bg-white border-gray-200 shadow-gray-100"
      )}
    >
      <h3
        className={clsx(
          "font-semibold mb-3 text-lg tracking-tight",
          darkMode ? "text-blue-300" : "text-blue-700"
        )}
      >
        {title}
      </h3>
      {children}
    </div>
  );

  const Item = ({ label, value, onClick, danger }) => (
    <div
      onClick={onClick}
      role="button"
      title={`View ${label.toLowerCase()}`}
      className={clsx(
        "cursor-pointer select-none flex justify-between items-center px-2 py-1 rounded-md text-sm transition-colors",
        darkMode
          ? "hover:bg-gray-800 text-gray-300"
          : "hover:bg-gray-100 text-gray-800",
        danger && (darkMode ? "text-rose-400" : "text-rose-600")
      )}
    >
      <span>{label}</span>
      <span
        className={clsx(
          "font-semibold",
          danger && (darkMode ? "text-rose-400" : "text-rose-600")
        )}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      className={clsx(
        "grid gap-5 md:grid-cols-3 transition-colors duration-500",
        darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"
      )}
    >
      {/* Users */}
      <Card title="Users">
        <div className="space-y-1">
          <Item label="Total" value={users.total} onClick={() => go("users")} />
          <Item
            label="Active"
            value={users.active}
            onClick={() => go("users", { suspended: "false" })}
          />
          <Item
            label="Suspended"
            value={users.suspended}
            danger
            onClick={() => go("users", { suspended: "true" })}
          />
        </div>
      </Card>

      {/* Posts */}
      <Card title="Posts">
        <div className="space-y-1">
          <Item label="Total" value={posts.total} onClick={() => go("posts")} />
          <Item
            label="Hidden"
            value={posts.hidden}
            danger
            onClick={() => go("posts", { isHidden: "true" })}
          />
          <Item
            label="Drafts"
            value={posts.drafts}
            onClick={() => go("posts", { draft: "true" })}
          />
        </div>
      </Card>

      <Card title="By Audience">
        <div className="space-y-1">
          <Item
            label="Public"
            value={posts.byAudience.public}
            onClick={() => go("posts", { visibility: "public" })}
          />
          <Item
            label="Followers"
            value={posts.byAudience.followers}
            onClick={() => go("posts", { visibility: "followers" })}
          />
          <Item
            label="Private"
            value={posts.byAudience.private}
            onClick={() => go("posts", { visibility: "private" })}
          />
        </div>
      </Card>

      {/* Reels */}
      <Card title="Reels">
        <div className="space-y-1">
          <Item label="Total" value={reels.total} onClick={() => go("reels")} />
          <Item
            label="Hidden"
            value={reels.hidden}
            danger
            onClick={() => go("reels", { isHidden: "true" })}
          />
          <Item
            label="Drafts"
            value={reels.drafts}
            onClick={() => go("reels", { draft: "true" })}
          />
        </div>
      </Card>

      <Card title="Reels by Audience">
        <div className="space-y-1">
          <Item
            label="Public"
            value={reels.byAudience.public}
            onClick={() => go("reels", { visibility: "public" })}
          />
          <Item
            label="Followers"
            value={reels.byAudience.followers}
            onClick={() => go("reels", { visibility: "followers" })}
          />
        </div>
      </Card>
    </div>
  );
}