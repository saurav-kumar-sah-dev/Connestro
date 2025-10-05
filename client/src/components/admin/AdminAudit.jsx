// src/components/admin/AdminAudit.jsx
import React, { useEffect, useState } from "react";
import { adminListAudit, adminExportAudit } from "../../api/audit";
import { Link } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import clsx from "clsx";

const ACTIONS = [
  "suspend_user",
  "unsuspend_user",
  "hide_post",
  "unhide_post",
  "delete_post",
  "delete_user",
  "report_update",
  "automod_hide_post",
];
const TARGETS = ["user", "post", "report", "reel"];

export default function AdminAudit() {
  const { darkMode } = useTheme();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [q, setQ] = useState("");
  const [adminQ, setAdminQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async (p = 1) => {
    try {
      setLoading(true);
      const params = {
        page: p,
        limit: 10,
        action,
        targetType,
        q,
        adminQ,
        dateFrom,
        dateTo,
      };
      const { data } = await adminListAudit(params);
      setLogs(data.logs || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error(e);
      alert("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action, targetType, q, adminQ, dateFrom, dateTo]);

  const exportCSV = async () => {
    try {
      const params = { action, targetType, q, adminQ, dateFrom, dateTo };
      const res = await adminExportAudit(params);
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "admin-audit.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export CSV");
    }
  };

  const MetaView = ({ meta }) => {
    if (!meta || typeof meta !== "object") return null;
    const entries = Object.entries(meta);
    if (!entries.length) return null;
    return (
      <div
        className={clsx(
          "text-xs mt-1 space-y-0.5",
          darkMode ? "text-gray-400" : "text-gray-600"
        )}
      >
        {entries.map(([k, v]) => (
          <div key={k}>
            <span className="font-medium">{k}:</span>{" "}
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </div>
        ))}
      </div>
    );
  };

  if (loading)
    return (
      <p
        className={clsx(
          "text-center mt-6 font-medium",
          darkMode ? "text-gray-300" : "text-gray-600"
        )}
      >
        Loading audit logs...
      </p>
    );

  const Field = ({ label, children }) => (
    <label
      className={clsx(
        "text-sm font-medium flex flex-col gap-1",
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
          Audit Logs ({logs.length})
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
          "grid md:grid-cols-5 gap-3 mb-5 p-4 rounded-lg border transition-colors",
          darkMode
            ? "bg-gray-900 border-gray-800"
            : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <Field label="Action:">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
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
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Target:">
          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
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
            {TARGETS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Search:">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="action/meta..."
            className={clsx(
              "rounded-md px-2 py-1 w-full text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-blue-400"
            )}
          />
        </Field>

        <Field label="Admin:">
          <input
            value={adminQ}
            onChange={(e) => {
              setAdminQ(e.target.value);
              setPage(1);
            }}
            placeholder="username/name..."
            className={clsx(
              "rounded-md px-2 py-1 w-full text-sm border focus:ring-2 focus:outline-none transition",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-blue-400"
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

      {/* Table/List */}
      <div className="space-y-4">
        {logs.map((log) => (
          <div
            key={log._id}
            className={clsx(
              "rounded-xl border p-4 shadow-sm transition-colors",
              darkMode
                ? "bg-gray-900 border-gray-800 shadow-black/30"
                : "bg-white border-gray-200 shadow-gray-200"
            )}
          >
            <div className="text-sm leading-relaxed">
              <div
                className={clsx(
                  "mb-1",
                  darkMode ? "text-gray-400" : "text-gray-500"
                )}
              >
                {new Date(log.createdAt).toLocaleString()}
              </div>

              <div>
                <span className="font-semibold">
                  <Link
                    to={`/profile/${log.admin?._id || ""}`}
                    className={clsx(
                      "hover:underline",
                      darkMode ? "text-blue-400" : "text-blue-700"
                    )}
                    title="View admin profile"
                  >
                    @{log.admin?.username}
                  </Link>
                </span>{" "}
                performed{" "}
                <span
                  className={clsx(
                    "font-semibold",
                    darkMode ? "text-amber-400" : "text-amber-600"
                  )}
                >
                  {log.action}
                </span>{" "}
                on{" "}
                {log.targetType === "user" ? (
                  <Link
                    to={`/profile/${log.targetId}`}
                    className={clsx(
                      "font-semibold underline",
                      darkMode ? "text-blue-400" : "text-blue-600"
                    )}
                  >
                    user
                  </Link>
                ) : log.targetType === "post" ? (
                  <Link
                    to={`/post/${log.targetId}`}
                    className={clsx(
                      "font-semibold underline",
                      darkMode ? "text-blue-400" : "text-blue-600"
                    )}
                  >
                    post
                  </Link>
                ) : log.targetType === "reel" ? (
                  <Link
                    to={`/reels/${log.targetId}`}
                    className={clsx(
                      "font-semibold underline",
                      darkMode ? "text-blue-400" : "text-blue-600"
                    )}
                  >
                    reel
                  </Link>
                ) : (
                  <Link
                    to={`/admin?tab=reports`}
                    className={clsx(
                      "font-semibold underline",
                      darkMode ? "text-blue-400" : "text-blue-600"
                    )}
                  >
                    report
                  </Link>
                )}{" "}
                <span
                  className={clsx(
                    "text-xs",
                    darkMode ? "text-gray-400" : "text-gray-600"
                  )}
                >
                  ({log.targetType} id: {log.targetId})
                </span>
              </div>
              <MetaView meta={log.meta} />
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