// src/components/admin/AdminUsers.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import API from "../../api/axios";
import { buildFileUrl } from "../../utils/url";
import clsx from "clsx";

export default function AdminUsers({ filterSuspended = null }) {
  const { darkMode } = useTheme();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // ---------- Load Data ----------
  const loadUsers = async (pageNum = 1, searchTerm = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum,
        limit: 10,
        search: searchTerm.trim(),
      });
      if (filterSuspended === "true") params.set("suspended", "true");
      if (filterSuspended === "false") params.set("suspended", "false");

      const res = await API.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.users || []);
      setPage(res.data.page || 1);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  // ---------- Reactivity ----------
  useEffect(() => {
    setPage(1);
  }, [filterSuspended]);

  useEffect(() => {
    loadUsers(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, filterSuspended]);

  // ---------- Actions ----------
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user? This will remove all their data."))
      return;
    try {
      await API.delete(`/admin/users/${id}`);
      loadUsers(page, search);
      alert("User deleted");
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    }
  };

  const suspend = async (user) => {
    const reason = window.prompt(
      "Suspension reason (optional):",
      user.suspendReason || ""
    );
    try {
      const res = await API.put(`/admin/users/${user._id}/suspend`, { reason });
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? res.data.user : u))
      );
    } catch (e) {
      console.error(e);
      alert("Failed to suspend user");
    }
  };

  const unsuspend = async (user) => {
    try {
      const res = await API.put(`/admin/users/${user._id}/unsuspend`);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? res.data.user : u))
      );
    } catch (e) {
      console.error(e);
      alert("Failed to unsuspend user");
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
        Loading users...
      </p>
    );

  return (
    <div
      className={clsx(
        "rounded-xl transition-colors duration-500",
        darkMode ? "text-gray-100" : "text-gray-900"
      )}
    >
      {/* Heading */}
      <h2
        className={clsx(
          "text-2xl font-bold mb-4 tracking-tight",
          darkMode ? "text-blue-300" : "text-blue-700"
        )}
      >
        Users
      </h2>

      {/* Search */}
      <div className="flex mb-6">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={clsx(
            "w-full px-4 py-2 rounded-lg border focus:ring-2 focus:outline-none transition-all",
            darkMode
              ? "bg-gray-900 border-gray-700 placeholder-gray-400 text-gray-100 focus:ring-blue-500"
              : "bg-white border-gray-300 placeholder-gray-500 text-gray-800 focus:ring-blue-500"
          )}
        />
      </div>

      {/* Users list */}
      <div className="space-y-5">
        {users.map((u) => {
          const avatar = u.profileImage
            ? buildFileUrl(u.profileImage)
            : "/default-avatar.png";

          return (
            <div
              key={u._id}
              className={clsx(
                "rounded-xl border p-4 sm:p-5 flex items-start justify-between flex-wrap gap-3 shadow transition-colors",
                darkMode
                  ? "bg-gray-900 border-gray-700 shadow-md"
                  : "bg-white border-gray-200 shadow-sm"
              )}
            >
              {/* Info block */}
              <div className="flex items-center gap-3">
                <Link to={`/profile/${u._id}`} title="View profile">
                  <img
                    src={avatar}
                    alt={u.username}
                    className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600"
                  />
                </Link>

                <div>
                  <p className="font-semibold mb-0.5">
                    <Link
                      to={`/profile/${u._id}`}
                      className="hover:underline"
                    >
                      {u.firstName} {u.lastName}
                    </Link>{" "}
                    <Link
                      to={`/profile/${u._id}`}
                      className={clsx(
                        "text-sm hover:underline",
                        darkMode ? "text-gray-400" : "text-gray-600"
                      )}
                    >
                      @{u.username}
                    </Link>
                    {u.isSuspended && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded">
                        Suspended
                      </span>
                    )}
                  </p>

                  <p
                    className={clsx(
                      "text-sm mb-0.5",
                      darkMode ? "text-gray-300" : "text-gray-700"
                    )}
                  >
                    {u.email} • Role:{" "}
                    <span
                      className={clsx(
                        "font-medium",
                        darkMode ? "text-blue-400" : "text-blue-600"
                      )}
                    >
                      {u.role}
                    </span>
                  </p>

                  {u.isSuspended && u.suspendReason && (
                    <p
                      className={clsx(
                        "text-xs font-medium",
                        darkMode ? "text-red-400" : "text-red-600"
                      )}
                    >
                      Reason: {u.suspendReason}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!u.isSuspended ? (
                  <button
                    onClick={() => suspend(u)}
                    className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm transition-colors"
                    title="Suspend user"
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => unsuspend(u)}
                    className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors"
                    title="Unsuspend user"
                  >
                    Unsuspend
                  </button>
                )}

                <button
                  onClick={() => handleDelete(u._id)}
                  className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-sm transition-colors"
                  title="Delete user"
                >
                  Delete
                </button>
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