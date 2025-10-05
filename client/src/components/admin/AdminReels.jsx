// src/components/admin/AdminReels.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import API from "../../api/axios";
import { buildFileUrl } from "../../utils/url";
import clsx from "clsx";

export default function AdminReels({
  filterHidden = null,
  filterDraft = null,
  filterVisibility = null,
}) {
  const { darkMode } = useTheme();

  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterHidden, filterDraft, filterVisibility]);

  const loadReels = async (pageNum = 1, searchTerm = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "10",
      });
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      if (filterHidden === "true") params.set("isHidden", "true");
      if (filterHidden === "false") params.set("isHidden", "false");
      if (filterDraft === "true") params.set("draft", "true");
      if (filterDraft === "false") params.set("draft", "false");
      if (["public", "followers"].includes(String(filterVisibility))) {
        params.set("visibility", String(filterVisibility));
      }

      const res = await API.get(`/admin/reels?${params.toString()}`);
      setReels(res.data?.reels || []);
      setPage(res.data?.page || 1);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch reels");
    } finally {
      setLoading(false);
    }
  };

  // Load when dependencies change
  useEffect(() => {
    loadReels(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterHidden, filterDraft, filterVisibility]);

  // Actions
  const hideReel = async (id) => {
    try {
      await API.put(`/admin/reels/${id}/hide`);
      loadReels(page, search);
    } catch (e) {
      console.error(e);
      alert("Failed to hide reel");
    }
  };

  const unhideReel = async (id) => {
    try {
      await API.put(`/admin/reels/${id}/unhide`);
      loadReels(page, search);
    } catch (e) {
      console.error(e);
      alert("Failed to unhide reel");
    }
  };

  const deleteReel = async (id) => {
    if (!window.confirm("Delete this reel?")) return;
    try {
      await API.delete(`/admin/reels/${id}`);
      if (reels.length === 1 && page > 1) setPage((p) => p - 1);
      else loadReels(page, search);
    } catch (e) {
      console.error(e);
      alert("Failed to delete reel");
    }
  };

  // ---------- Rendering ----------
  if (loading)
    return (
      <p
        className={clsx(
          "text-center mt-8 font-medium",
          darkMode ? "text-gray-300" : "text-gray-600"
        )}
      >
        Loading reels...
      </p>
    );

  return (
    <div
      className={clsx(
        "rounded-xl transition-colors duration-500",
        darkMode ? "text-gray-100" : "text-gray-900"
      )}
    >
      {/* Header */}
      <h2
        className={clsx(
          "text-2xl font-bold mb-4 tracking-tight",
          darkMode ? "text-blue-300" : "text-blue-700"
        )}
      >
        Reels
      </h2>

      {/* Search */}
      <input
        type="text"
        placeholder="Search captions..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className={clsx(
          "w-full mb-6 px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all",
          darkMode
            ? "bg-gray-900 border-gray-700 placeholder-gray-400 text-gray-100 focus:ring-blue-500"
            : "bg-white border border-gray-300 placeholder-gray-500 text-gray-800 focus:ring-blue-500"
        )}
      />

      {/* Reels List */}
      <div className="space-y-5">
        {reels.map((r) => {
          const avatar = r.user?.profileImage
            ? buildFileUrl(r.user.profileImage)
            : "/default-avatar.png";

          return (
            <div
              key={r._id}
              className={clsx(
                "rounded-xl border p-4 sm:p-5 shadow transition-colors",
                darkMode
                  ? "bg-gray-900 border-gray-700 shadow-md"
                  : "bg-white border-gray-200 shadow-sm"
              )}
            >
              <div className="flex justify-between items-start flex-wrap gap-3">
                {/* User Info */}
                <div className="flex items-start gap-3">
                  <Link to={`/profile/${r.user?._id}`} title="View profile">
                    <img
                      src={avatar}
                      alt={r.user?.username || "user"}
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                    />
                  </Link>

                  <div>
                    <p className="font-semibold mb-0.5">
                      <Link
                        to={`/profile/${r.user?._id}`}
                        className="hover:underline"
                      >
                        {r.user?.firstName} {r.user?.lastName}
                      </Link>{" "}
                      <Link
                        to={`/profile/${r.user?._id}`}
                        className={clsx(
                          "hover:underline text-sm",
                          darkMode ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        @{r.user?.username}
                      </Link>
                      {r.isHidden && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded">
                          Hidden
                        </span>
                      )}
                      {r.draft && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-700 dark:bg-gray-800/70 dark:text-gray-300 px-2 py-0.5 rounded">
                          Draft
                        </span>
                      )}
                    </p>

                    <p
                      className={clsx(
                        "text-sm mb-2",
                        darkMode ? "text-gray-300" : "text-gray-700"
                      )}
                    >
                      <Link
                        to={`/reels/${r._id}`}
                        className="hover:underline"
                      >
                        {r.caption || "(no caption)"}
                      </Link>
                    </p>

                    <p
                      className={clsx(
                        "text-xs",
                        darkMode ? "text-gray-500" : "text-gray-500"
                      )}
                    >
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleString()
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  {!r.isHidden ? (
                    <button
                      onClick={() => hideReel(r._id)}
                      className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm transition-colors"
                      title="Hide reel"
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => unhideReel(r._id)}
                      className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors"
                      title="Unhide reel"
                    >
                      Unhide
                    </button>
                  )}
                  <button
                    onClick={() => deleteReel(r._id)}
                    className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-sm transition-colors"
                    title="Delete reel"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Reel Video */}
              <div className="mt-3">
                <video
                  src={buildFileUrl(r.url)}
                  className={clsx(
                    "rounded-lg w-full max-h-64 shadow-sm",
                    darkMode ? "bg-gray-800" : "bg-black"
                  )}
                  controls
                  preload="metadata"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-6">
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className={clsx(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            darkMode
              ? "bg-gray-800 hover:bg-gray-700 disabled:opacity-40"
              : "bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          )}
        >
          Previous
        </button>

        <span
          className={clsx(
            "px-4 py-1.5 rounded-md text-sm font-semibold",
            darkMode
              ? "bg-gray-800 text-gray-200"
              : "bg-gray-100 text-gray-700"
          )}
        >
          {page} / {totalPages}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className={clsx(
            "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
            darkMode
              ? "bg-gray-800 hover:bg-gray-700 disabled:opacity-40"
              : "bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          )}
        >
          Next
        </button>
      </div>
    </div>
  );
}