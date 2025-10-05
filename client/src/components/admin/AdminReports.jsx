// src/components/admin/AdminReports.jsx
import React, { useEffect, useState } from "react";
import API from "../../api/axios";
import { adminListReports, adminUpdateReport, adminExportReports } from "../../api/reports";
import { useTheme } from "../../context/ThemeContext";
import clsx from "clsx";

export default function AdminReports() {
  const { darkMode } = useTheme();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [reason, setReason] = useState("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async (p = 1) => {
    try {
      setLoading(true);
      const params = { page: p, limit: 10, status, type, reason, q, dateFrom, dateTo };
      const { data } = await adminListReports(params);
      setReports(data.reports || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error(e);
      alert("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, type, reason, q, dateFrom, dateTo]);

  const setReportStatus = async (r, newStatus) => {
    const notes =
      newStatus === "resolved" || newStatus === "rejected"
        ? window.prompt("Resolution notes (optional):", r.resolution || "")
        : undefined;
    try {
      const { data } = await adminUpdateReport(r._id, { status: newStatus, resolution: notes });
      setReports((prev) => prev.map((x) => (x._id === r._id ? data.report : x)));
    } catch (e) {
      console.error(e);
      alert("Failed to update report");
    }
  };

  const exportCSV = async () => {
    try {
      const params = { status, type, reason, q, dateFrom, dateTo };
      const res = await adminExportReports(params);
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "reports.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export CSV");
    }
  };

  // --- Quick actions ---
  const confirmAndExec = async (msg, fn) => {
    if (!window.confirm(msg)) return;
    await fn().then(() => load(page));
  };

  const hidePost = (id) => confirmAndExec("Hide this post?", () => API.put(`/admin/posts/${id}/hide`));
  const unhidePost = (id) => confirmAndExec("Unhide this post?", () => API.put(`/admin/posts/${id}/unhide`));
  const hideReel = (id) => confirmAndExec("Hide this reel?", () => API.put(`/admin/reels/${id}/hide`));
  const unhideReel = (id) => confirmAndExec("Unhide this reel?", () => API.put(`/admin/reels/${id}/unhide`));

  const suspendUser = async (id) => {
    const reason = window.prompt("Suspension reason (optional):", "");
    await API.put(`/admin/users/${id}/suspend`, { reason });
    await load(page);
  };
  const unsuspendUser = (id) =>
    confirmAndExec("Unsuspend this user?", () => API.put(`/admin/users/${id}/unsuspend`));

  if (loading)
    return (
      <p
        className={clsx(
          "text-center mt-6 font-medium",
          darkMode ? "text-gray-300" : "text-gray-600"
        )}
      >
        Loading reports...
      </p>
    );

  const Field = ({ label, children }) => (
    <label
      className={clsx(
        "text-sm font-medium flex items-center gap-2",
        darkMode ? "text-gray-300" : "text-gray-700"
      )}
    >
      {label}
      {children}
    </label>
  );

  return (
    <div
      className={clsx(
        "p-6 rounded-xl transition-colors duration-500",
        darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className={clsx(
            "text-2xl font-bold tracking-tight",
            darkMode ? "text-blue-300" : "text-blue-700"
          )}
        >
          Reports ({reports.length})
        </h2>
        <button
          onClick={exportCSV}
          className={clsx(
            "px-4 py-1.5 rounded-lg font-medium transition-colors",
            darkMode
              ? "bg-gray-800 hover:bg-gray-700 text-gray-200"
              : "bg-gray-200 hover:bg-gray-300 text-gray-800"
          )}
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div
        className={clsx(
          "grid md:grid-cols-5 gap-3 mb-5 p-4 rounded-lg border",
          darkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <Field label="Status:">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className={clsx(
              "rounded-md px-2 py-1 w-full text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 focus:ring-blue-400"
            )}
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </Field>
        <Field label="Type:">
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className={clsx(
              "rounded-md px-2 py-1 w-full text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 focus:ring-blue-400"
            )}
          >
            <option value="">All</option>
            <option value="post">Post</option>
            <option value="user">User</option>
            <option value="reel">Reel</option>
          </select>
        </Field>
        <Field label="Reason:">
          <select
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setPage(1);
            }}
            className={clsx(
              "rounded-md px-2 py-1 w-full text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 focus:ring-blue-400"
            )}
          >
            <option value="">All</option>
            <option value="spam">Spam</option>
            <option value="abuse">Abuse</option>
            <option value="nudity">Nudity</option>
            <option value="violence">Violence</option>
            <option value="harassment">Harassment</option>
            <option value="hate">Hate</option>
            <option value="misinformation">Misinformation</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Search:">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="user/post content..."
            className={clsx(
              "rounded-md px-2 py-1 w-full text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 placeholder-gray-400 text-gray-100 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 placeholder-gray-500 text-gray-800 focus:ring-blue-400"
            )}
          />
        </Field>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className={clsx(
              "rounded-md px-2 py-1 w-full text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 focus:ring-blue-400"
            )}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className={clsx(
              "rounded-md px-2 py-1 w-full text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 focus:ring-blue-400"
            )}
          />
        </div>
      </div>

      {/* Report cards */}
      <div className="space-y-5">
        {reports.map((r) => (
          <div
            key={r._id}
            className={clsx(
              "rounded-xl border p-4 shadow-sm transition-colors",
              darkMode
                ? "bg-gray-900 border-gray-800 shadow-black/30"
                : "bg-white border-gray-200 shadow-gray-200"
            )}
          >
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <div className="text-sm leading-relaxed">
                  <span className="font-semibold">@{r.reporter?.username}</span> reported a{" "}
                  <span className="font-semibold">{r.targetType}</span> for{" "}
                  <em>{r.reason}</em>
                  <span
                    className={clsx(
                      "ml-2 text-xs",
                      darkMode ? "text-gray-400" : "text-gray-500"
                    )}
                  >
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </div>
                {r.details && (
                  <div
                    className={clsx(
                      "text-sm mt-1",
                      darkMode ? "text-gray-200" : "text-gray-700"
                    )}
                  >
                    “{r.details}”
                  </div>
                )}

                {/* Target previews */}
                {r.targetType === "post" && r.post && (
                  <div className="text-xs mt-2">
                    <span
                      className={clsx(
                        darkMode ? "text-gray-400" : "text-gray-600"
                      )}
                    >
                      Post: {r.post.content?.slice(0, 120) || "(no content)"}
                    </span>{" "}
                    <a
                      className={clsx(
                        "underline",
                        darkMode ? "text-blue-400" : "text-blue-600"
                      )}
                      href={`/post/${r.post._id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                  </div>
                )}
                {r.targetType === "user" && r.targetUser && (
                  <div className="text-xs mt-2">
                    <span
                      className={clsx(
                        darkMode ? "text-gray-400" : "text-gray-600"
                      )}
                    >
                      User: @{r.targetUser.username}
                    </span>{" "}
                    <a
                      className={clsx(
                        "underline",
                        darkMode ? "text-blue-400" : "text-blue-600"
                      )}
                      href={`/profile/${r.targetUser._id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                  </div>
                )}
                {r.targetType === "reel" && r.reel && (
                  <div className="text-xs mt-2">
                    <span
                      className={clsx(
                        darkMode ? "text-gray-400" : "text-gray-600"
                      )}
                    >
                      Reel: {r.reel.caption?.slice(0, 120) || "(no caption)"}
                    </span>{" "}
                    <a
                      className={clsx(
                        "underline",
                        darkMode ? "text-blue-400" : "text-blue-600"
                      )}
                      href={`/reels/${r.reel._id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                  </div>
                )}

                {r.resolution && (
                  <div
                    className={clsx(
                      "text-xs mt-1",
                      darkMode ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    Resolution: {r.resolution}{" "}
                    {r.assignedTo ? `(by ${r.assignedTo.username})` : ""}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <div
                  className={clsx(
                    "text-xs px-2 py-1 rounded-md font-semibold",
                    darkMode
                      ? "bg-gray-800 text-gray-300"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  Status: {r.status}
                </div>

                <div className="flex flex-wrap gap-2">
                  {["open", "reviewing", "resolved", "rejected"]
                    .filter((s) => s !== r.status)
                    .map((s) => (
                      <button
                        key={s}
                        onClick={() => setReportStatus(r, s)}
                        className={clsx(
                          "px-2 py-1 rounded text-sm border transition-colors",
                          darkMode
                            ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
                            : "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200"
                        )}
                      >
                        {s === "resolved"
                          ? "Resolve"
                          : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {r.targetType === "post" && r.post && (
                    <>
                      <button
                        onClick={() => hidePost(r.post._id)}
                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm transition-colors"
                      >
                        Hide Post
                      </button>
                      <button
                        onClick={() => unhidePost(r.post._id)}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors"
                      >
                        Unhide Post
                      </button>
                    </>
                  )}
                  {r.targetType === "user" && r.targetUser && (
                    <>
                      <button
                        onClick={() => suspendUser(r.targetUser._id)}
                        className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-sm transition-colors"
                      >
                        Suspend
                      </button>
                      <button
                        onClick={() => unsuspendUser(r.targetUser._id)}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors"
                      >
                        Unsuspend
                      </button>
                    </>
                  )}
                  {r.targetType === "reel" && r.reel && (
                    <>
                      <button
                        onClick={() => hideReel(r.reel._id)}
                        className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-sm transition-colors"
                      >
                        Hide Reel
                      </button>
                      <button
                        onClick={() => unhideReel(r.reel._id)}
                        className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm transition-colors"
                      >
                        Unhide Reel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2 mt-8">
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