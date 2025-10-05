// src/components/admin/AdminPosts.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import API from "../../api/axios";
import { buildFileUrl } from "../../utils/url";
import clsx from "clsx";

export default function AdminPosts({
  filterHidden = null,
  filterDraft = null,
  filterVisibility = null,
}) {
  const { darkMode } = useTheme();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // ---------- Fetch Posts ----------
  const loadPosts = async (pageNum = 1, searchTerm = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum,
        limit: 10,
        search: searchTerm.trim(),
      });
      if (filterHidden === "true") params.set("isHidden", "true");
      if (filterHidden === "false") params.set("isHidden", "false");
      if (filterDraft === "true") params.set("draft", "true");
      if (filterDraft === "false") params.set("draft", "false");
      if (["public", "followers", "private"].includes(String(filterVisibility))) {
        params.set("visibility", String(filterVisibility));
      }

      const res = await API.get(`/admin/posts?${params.toString()}`);
      setPosts(res.data.posts || []);
      setPage(res.data.page || 1);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filterHidden, filterDraft, filterVisibility]);

  useEffect(() => {
    loadPosts(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterHidden, filterDraft, filterVisibility]);

  // ---------- Actions ----------
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await API.delete(`/admin/posts/${id}`);
      loadPosts(page, search);
      alert("Post deleted");
    } catch (err) {
      console.error(err);
      alert("Failed to delete post");
    }
  };

  const hidePost = async (p) => {
    try {
      await API.put(`/admin/posts/${p._id}/hide`);
      loadPosts(page, search);
    } catch (e) {
      console.error(e);
      alert("Failed to hide post");
    }
  };

  const unhidePost = async (p) => {
    try {
      await API.put(`/admin/posts/${p._id}/unhide`);
      loadPosts(page, search);
    } catch (e) {
      console.error(e);
      alert("Failed to unhide post");
    }
  };

  // ---------- Rendering ----------
  if (loading)
    return (
      <p className={clsx("text-center mt-8", darkMode ? "text-gray-300" : "text-gray-600")}>
        Loading posts...
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
        Posts
      </h2>

      {/* Search */}
      <input
        type="text"
        placeholder="Search posts..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className={clsx(
          "w-full mb-6 px-4 py-2 rounded-lg focus:ring-2 focus:outline-none transition-all",
          darkMode
            ? "bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-blue-500"
            : "bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-blue-500"
        )}
      />

      {/* Posts List */}
      <div className="space-y-5">
        {posts.map((p) => {
          const avatar = p.user?.profileImage
            ? buildFileUrl(p.user.profileImage)
            : "/default-avatar.png";

          return (
            <div
              key={p._id}
              className={clsx(
                "rounded-xl border p-4 sm:p-5 transition-colors",
                darkMode
                  ? "bg-gray-900 border-gray-700 shadow-md"
                  : "bg-white border-gray-200 shadow-sm"
              )}
            >
              <div className="flex justify-between items-start flex-wrap gap-3">
                {/* User Info */}
                <div className="flex items-start gap-3">
                  <Link to={`/profile/${p.user?._id}`} title="View profile">
                    <img
                      src={avatar}
                      alt={p.user?.username || "user"}
                      className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                    />
                  </Link>

                  <div>
                    <p className="font-semibold mb-0.5">
                      <Link
                        to={`/profile/${p.user?._id}`}
                        className="hover:underline"
                      >
                        {p.user?.firstName} {p.user?.lastName}
                      </Link>{" "}
                      <Link
                        to={`/profile/${p.user?._id}`}
                        className={clsx(
                          "hover:underline text-sm",
                          darkMode ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        @{p.user?.username}
                      </Link>
                      {p.isHidden && (
                        <span className="ml-2 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded">
                          Hidden
                        </span>
                      )}
                      {p.draft && (
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
                        to={`/post/${p._id}`}
                        className="hover:underline"
                      >
                        {p.content}
                      </Link>
                    </p>

                    <p
                      className={clsx(
                        "text-xs",
                        darkMode ? "text-gray-500" : "text-gray-500"
                      )}
                    >
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleString()
                        : ""}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!p.isHidden ? (
                    <button
                      onClick={() => hidePost(p)}
                      className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm transition-colors"
                      title="Hide post"
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      onClick={() => unhidePost(p)}
                      className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors"
                      title="Unhide post"
                    >
                      Unhide
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(p._id)}
                    className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-sm transition-colors"
                    title="Delete post"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Media */}
              {Array.isArray(p.media) && p.media.length > 0 && (
                <div
                  className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3"
                >
                  {p.media.map((m, idx) => (
                    <div key={m._id || idx} className="overflow-hidden rounded-lg">
                      {m.type === "image" && (
                        <img
                          src={buildFileUrl(m.url)}
                          alt="post media"
                          className="max-h-52 object-contain w-full rounded-lg shadow-sm"
                        />
                      )}
                      {m.type === "video" && (
                        <video
                          controls
                          className="max-h-52 rounded-lg shadow-sm w-full"
                        >
                          <source src={buildFileUrl(m.url)} />
                        </video>
                      )}
                      {m.type === "document" && (
                        <a
                          href={buildFileUrl(m.url)}
                          target="_blank"
                          rel="noreferrer"
                          className={clsx(
                            "underline text-sm",
                            darkMode ? "text-blue-400" : "text-blue-600"
                          )}
                        >
                          View document
                        </a>
                      )}
                      {m.type === "link" && (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className={clsx(
                            "underline text-sm",
                            darkMode ? "text-blue-400" : "text-blue-600"
                          )}
                        >
                          Open link
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
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