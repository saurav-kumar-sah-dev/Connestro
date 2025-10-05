// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import AdminUsers from "../components/admin/AdminUsers";
import AdminPosts from "../components/admin/AdminPosts";
import AdminOverview from "../components/admin/AdminOverview";
import AdminReports from "../components/admin/AdminReports";
import AdminAudit from "../components/admin/AdminAudit";
import AdminReels from "../components/admin/AdminReels";
import clsx from "clsx";

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const tabParam = params.get("tab") || "overview";
  const [tab, setTab] = useState(tabParam);

  // Filters
  const suspended = params.get("suspended");
  const isHidden = params.get("isHidden");
  const draft = params.get("draft");
  const visibility = params.get("visibility");

  useEffect(() => {
    setTab(tabParam);
  }, [tabParam]);

  const setTabAndClear = (next) => {
    const sp = new URLSearchParams({ tab: next });
    navigate({ search: `?${sp.toString()}` });
  };

  return (
    <div
      className={clsx(
        "min-h-screen px-5 sm:px-8 py-8 transition-colors duration-500",
        darkMode
          ? "bg-gray-950 text-gray-100"
          : "bg-gradient-to-tr from-blue-50 via-white to-blue-100 text-gray-900"
      )}
    >
      {/* Header */}
      <header className="mb-10 text-center sm:text-left">
        <h1
          className={clsx(
            "text-4xl sm:text-5xl font-extrabold tracking-tight drop-shadow-sm mb-2 transition-colors",
            darkMode ? "text-blue-300" : "text-blue-900"
          )}
        >
          Admin Dashboard
        </h1>
        <p
          className={clsx(
            "text-base sm:text-lg font-medium opacity-90 transition-colors",
            darkMode ? "text-gray-400" : "text-gray-600"
          )}
        >
          Manage users, posts, and reports — all in one streamlined workspace.
        </p>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 mb-10">
        {[
          { key: "overview", label: "Overview" },
          { key: "users", label: "Users" },
          { key: "posts", label: "Posts" },
          { key: "reels", label: "Reels" },
          { key: "reports", label: "Reports" },
          { key: "audit", label: "Audit Log" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTabAndClear(key)}
            className={clsx(
              "px-4 sm:px-5 py-2 rounded-full font-semibold text-sm shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              tab === key
                ? "bg-blue-600 text-white ring-1 ring-blue-500 shadow-md scale-105"
                : darkMode
                ? "bg-gray-800 text-gray-100 hover:bg-gray-700"
                : "bg-white text-gray-700 hover:bg-blue-50"
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Main Panel */}
      <main
        className={clsx(
          "rounded-2xl p-5 sm:p-6 shadow-lg border transition-all duration-300 backdrop-blur-sm",
          darkMode
            ? "bg-gray-900 border-gray-700"
            : "bg-white border-gray-200"
        )}
      >
        {tab === "overview" ? (
          <AdminOverview />
        ) : tab === "users" ? (
          <AdminUsers filterSuspended={suspended} />
        ) : tab === "posts" ? (
          <AdminPosts
            filterHidden={isHidden}
            filterDraft={draft}
            filterVisibility={visibility}
          />
        ) : tab === "reels" ? (
          <AdminReels
            filterHidden={isHidden}
            filterDraft={draft}
            filterVisibility={visibility}
          />
        ) : tab === "reports" ? (
          <AdminReports />
        ) : (
          <AdminAudit />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-14 text-center">
        <p
          className={clsx(
            "text-sm sm:text-base md:text-lg leading-relaxed transition-colors italic",
            darkMode ? "text-gray-400" : "text-gray-600"
          )}
        >
          ✨ Empowering{" "}
          <span
            className={clsx(
              "font-semibold not-italic",
              darkMode ? "text-blue-400" : "text-blue-600"
            )}
          >
            connection and clarity
          </span>{" "}
          — your data, your insight, your control.
        </p>
      </footer>
    </div>
  );
}