// src/pages/MyReports.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyReports } from "../api/reports";
import API from "../api/axios";
import { buildFileUrl } from "../utils/url";
import { useTheme } from "../context/ThemeContext";
import clsx from "clsx";

const StatusBadge = ({ status, darkMode }) => {
  const map = {
    open: darkMode
      ? "bg-amber-900/30 text-amber-400 border-amber-800/30"
      : "bg-amber-50 text-amber-700 border-amber-200",
    reviewing: darkMode
      ? "bg-blue-900/30 text-blue-400 border-blue-800/30"
      : "bg-blue-50 text-blue-700 border-blue-200",
    resolved: darkMode
      ? "bg-green-900/30 text-green-400 border-green-800/30"
      : "bg-green-50 text-green-700 border-green-200",
    rejected: darkMode
      ? "bg-red-900/30 text-red-400 border-red-800/30"
      : "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={clsx(
        "text-xs px-2.5 py-1 rounded-full font-semibold select-none border",
        map[status] ||
          (darkMode
            ? "bg-gray-800 text-gray-300 border-gray-700"
            : "bg-gray-100 text-gray-700 border-gray-200")
      )}
    >
      {status}
    </span>
  );
};

const TypeBadge = ({ type, darkMode }) => {
  const typeIcons = {
    post: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    user: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    reel: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold select-none border",
        darkMode 
          ? "bg-slate-800 text-slate-300 border-slate-700" 
          : "bg-slate-100 text-slate-700 border-slate-200"
      )}
    >
      {typeIcons[type]}
      {type}
    </span>
  );
};

const escapeRx = (s = "") => s.replace(/[.*+?^${}()|[```\\/-]/g, "\\$&");

export default function MyReports() {
  const { darkMode } = useTheme();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");

  const navigate = useNavigate();
  const [unavailablePost, setUnavailablePost] = useState({});
  const [unavailableReel, setUnavailableReel] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const res = await getMyReports();
      const list = Array.isArray(res.data?.reports) ? res.data.reports : [];
      setReports(list);
    } catch (e) {
      console.error("Load my reports error:", e);
      alert("Failed to load your reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = reports.filter((r) => {
    if (status && r.status !== status) return false;
    if (type && r.targetType !== type) return false;
    if (q && q.trim()) {
      const rx = new RegExp(escapeRx(q.trim()), "i");
      const hay = [
        r.reason,
        r.details,
        r.resolution,
        r.post?.content,
        r.reel?.caption,
        r.targetUser?.username,
        r.targetUser?.firstName,
        r.targetUser?.lastName,
      ]
        .filter(Boolean)
        .join(" ");
      return rx.test(hay);
    }
    return true;
  });

  const openPostSafe = async (postId) => {
    try {
      await API.get(`/posts/${postId}`);
      navigate(`/post/${postId}`);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403 || status === 404)
        setUnavailablePost((p) => ({ ...p, [postId]: true }));
      else {
        console.error("Open post error:", err);
        alert("Failed to open post. Please try again.");
      }
    }
  };

  const openReelSafe = async (reelId) => {
    try {
      await API.get(`/reels/${reelId}`);
      navigate(`/reels/${reelId}`);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403 || status === 404)
        setUnavailableReel((p) => ({ ...p, [reelId]: true }));
      else {
        console.error("Open reel error:", err);
        alert("Failed to open reel. Please try again.");
      }
    }
  };

  if (loading)
    return (
      <div className={clsx(
        "min-h-screen flex items-center justify-center",
        darkMode ? "bg-slate-950" : "bg-gradient-to-br from-slate-50 via-white to-blue-50"
      )}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className={clsx(
            "text-center font-medium",
            darkMode ? "text-gray-300" : "text-gray-600"
          )}>
            Loading your reports...
          </p>
        </div>
      </div>
    );

  return (
    <div
      className={clsx(
        "relative min-h-screen transition-colors duration-300",
        darkMode 
          ? "bg-slate-950" 
          : "bg-gradient-to-br from-slate-50 via-white to-blue-50"
      )}
    >
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={clsx(
          "absolute -top-40 -right-40 h-80 w-80 rounded-full blur-[100px]",
          darkMode ? "bg-blue-500/10" : "bg-blue-400/20"
        )} />
        <div className={clsx(
          "absolute -bottom-40 -left-40 h-80 w-80 rounded-full blur-[100px]",
          darkMode ? "bg-purple-500/10" : "bg-purple-400/20"
        )} />
      </div>

      <div className="relative container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1
            className={clsx(
              "text-3xl sm:text-4xl font-bold tracking-tight",
              darkMode 
                ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400" 
                : "text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"
            )}
          >
            My Reports
          </h1>
          <p className={clsx(
            "mt-2 text-sm sm:text-base",
            darkMode ? "text-slate-400" : "text-slate-600"
          )}>
            Track and manage your submitted reports
          </p>
        </div>

        {/* Filters Card */}
        <div
          className={clsx(
            "rounded-2xl p-4 sm:p-6 mb-6 shadow-xl border backdrop-blur-sm",
            darkMode
              ? "bg-slate-900/90 border-slate-800 shadow-slate-900/50"
              : "bg-white/90 border-slate-200 shadow-slate-200/50"
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label
                className={clsx(
                  "text-xs font-semibold uppercase tracking-wider",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={clsx(
                  "w-full rounded-xl px-3 py-2.5 text-sm border-2 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all",
                  darkMode
                    ? "bg-slate-800/50 border-slate-700 text-slate-100 hover:border-slate-600 focus:border-blue-500"
                    : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 focus:border-blue-500"
                )}
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="reviewing">Reviewing</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                className={clsx(
                  "text-xs font-semibold uppercase tracking-wider",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={clsx(
                  "w-full rounded-xl px-3 py-2.5 text-sm border-2 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all",
                  darkMode
                    ? "bg-slate-800/50 border-slate-700 text-slate-100 hover:border-slate-600 focus:border-blue-500"
                    : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 focus:border-blue-500"
                )}
              >
                <option value="">All Types</option>
                <option value="post">Post</option>
                <option value="user">User</option>
                <option value="reel">Reel</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                className={clsx(
                  "text-xs font-semibold uppercase tracking-wider",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )}
              >
                Search
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search reports..."
                  className={clsx(
                    "w-full rounded-xl pl-10 pr-3 py-2.5 text-sm border-2 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all",
                    darkMode
                      ? "bg-slate-800/50 border-slate-700 text-slate-100 placeholder-slate-500 hover:border-slate-600 focus:border-blue-500"
                      : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500"
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div
            className={clsx(
              "rounded-2xl text-center py-16 px-6 shadow-xl border backdrop-blur-sm",
              darkMode
                ? "bg-slate-900/90 border-slate-800 shadow-slate-900/50"
                : "bg-white/90 border-slate-200 shadow-slate-200/50"
            )}
          >
            <div className={clsx(
              "inline-flex items-center justify-center w-20 h-20 rounded-full mb-4",
              darkMode ? "bg-slate-800" : "bg-slate-100"
            )}>
              <svg className={clsx("w-10 h-10", darkMode ? "text-slate-600" : "text-slate-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className={clsx(
              "text-lg font-semibold mb-2",
              darkMode ? "text-slate-300" : "text-slate-700"
            )}>
              No reports found
            </h3>
            <p className={clsx(
              "text-sm",
              darkMode ? "text-slate-500" : "text-slate-500"
            )}>
              {q || status || type 
                ? "Try adjusting your filters to see more results" 
                : "You haven't submitted any reports yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((r) => {
              const created = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
              const resolved = r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : "";
              const attachments = Array.isArray(r.attachments) ? r.attachments : [];

              return (
                <div
                  key={r._id}
                  className={clsx(
                    "rounded-2xl border p-4 sm:p-6 shadow-xl backdrop-blur-sm transition-all hover:shadow-2xl",
                    darkMode
                      ? "bg-slate-900/90 border-slate-800 shadow-slate-900/50 hover:border-slate-700"
                      : "bg-white/90 border-slate-200 shadow-slate-200/50 hover:border-slate-300"
                  )}
                >
                  <div className="space-y-3">
                    {/* Header with badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <TypeBadge type={r.targetType} darkMode={darkMode} />
                      <StatusBadge status={r.status} darkMode={darkMode} />
                      <span
                        className={clsx(
                          "text-xs ml-auto",
                          darkMode ? "text-slate-500" : "text-slate-500"
                        )}
                      >
                        {created}
                      </span>
                    </div>

                    {/* Reason */}
                    <div
                      className={clsx(
                        "text-sm font-medium",
                        darkMode ? "text-slate-200" : "text-slate-800"
                      )}
                    >
                      <span className={clsx(
                        "font-semibold text-xs uppercase tracking-wider",
                        darkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        Reason:
                      </span>{" "}
                      <span className="font-normal">{r.reason}</span>
                    </div>

                    {/* Details */}
                    {r.details && (
                      <div
                        className={clsx(
                          "text-sm p-3 rounded-xl border",
                          darkMode 
                            ? "bg-slate-800/50 border-slate-700 text-slate-300" 
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        )}
                      >
                        <svg className="inline w-4 h-4 mr-2 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        "{r.details}"
                      </div>
                    )}

                    {/* Target preview */}
                    <div
                      className={clsx(
                        "p-3 rounded-xl border",
                        darkMode 
                          ? "bg-slate-800/30 border-slate-700" 
                          : "bg-slate-50/50 border-slate-200"
                      )}
                    >
                      <div className={clsx(
                        "text-xs font-semibold uppercase tracking-wider mb-2",
                        darkMode ? "text-slate-400" : "text-slate-500"
                      )}>
                        Reported Content
                      </div>
                      <div className={clsx(
                        "text-sm",
                        darkMode ? "text-slate-300" : "text-slate-700"
                      )}>
                        {r.targetType === "post" && r.post ? (
                          <>
                            <p className="mb-2">
                              {r.post.content?.slice(0, 140) || "(no content)"}{r.post.content?.length > 140 && "..."}
                            </p>
                            <button
                              onClick={() => openPostSafe(r.post._id)}
                              className={clsx(
                                "inline-flex items-center gap-1 text-sm font-medium hover:underline",
                                darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                              )}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View post
                            </button>
                            {unavailablePost[r.post._id] && (
                              <div className="text-red-400 text-sm mt-2 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                This content is unavailable or restricted
                              </div>
                            )}
                          </>
                        ) : r.targetType === "user" && r.targetUser ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span>User: @{r.targetUser.username}</span>
                              <Link
                                to={`/profile/${r.targetUser._id}`}
                                className={clsx(
                                  "inline-flex items-center gap-1 text-sm font-medium hover:underline",
                                  darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                                )}
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View profile
                              </Link>
                            </div>
                          </>
                        ) : r.targetType === "reel" && r.reel ? (
                          <>
                            <p className="mb-2">
                              {r.reel.caption?.slice(0, 140) || "(no caption)"}{r.reel.caption?.length > 140 && "..."}
                            </p>
                            <button
                              onClick={() => openReelSafe(r.reel._id)}
                              className={clsx(
                                "inline-flex items-center gap-1 text-sm font-medium hover:underline",
                                darkMode ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                              )}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View reel
                            </button>
                            {unavailableReel[r.reel._id] && (
                              <div className="text-red-400 text-sm mt-2 flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                This content is unavailable or restricted
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Resolution */}
                    {(r.status === "resolved" || r.status === "rejected") && (
                      <div
                        className={clsx(
                          "p-3 rounded-xl border",
                          r.status === "resolved"
                            ? darkMode
                              ? "bg-green-900/20 border-green-800/30"
                              : "bg-green-50 border-green-200"
                            : darkMode
                              ? "bg-red-900/20 border-red-800/30"
                              : "bg-red-50 border-red-200"
                        )}
                      >
                        <div className={clsx(
                          "text-xs font-semibold uppercase tracking-wider mb-1",
                          r.status === "resolved"
                            ? darkMode ? "text-green-400" : "text-green-700"
                            : darkMode ? "text-red-400" : "text-red-700"
                        )}>
                          Resolution
                        </div>
                        <div className={clsx(
                          "text-sm",
                          darkMode ? "text-slate-300" : "text-slate-700"
                        )}>
                          {r.resolution || "(No resolution message provided)"}
                        </div>
                        {resolved && (
                          <div className={clsx(
                            "text-xs mt-2",
                            darkMode ? "text-slate-500" : "text-slate-500"
                          )}>
                            Resolved on: {resolved}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attachments */}
                    {attachments.length > 0 && (
                      <div>
                        <div className={clsx(
                          "text-xs font-semibold uppercase tracking-wider mb-2",
                          darkMode ? "text-slate-400" : "text-slate-500"
                        )}>
                          Attachments ({attachments.length})
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {attachments.map((a, i) => {
                            const url = buildFileUrl(a.url);
                            const isImg = (a.mime || "").startsWith("image/");
                            return (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className={clsx(
                                  "rounded-xl overflow-hidden transition-all hover:scale-105",
                                  darkMode
                                    ? "bg-slate-800 hover:bg-slate-700"
                                    : "bg-slate-100 hover:bg-slate-200"
                                )}
                                title={a.name || "attachment"}
                              >
                                {isImg ? (
                                  <img
                                    src={url}
                                    alt={a.name || "attachment"}
                                    className="w-20 h-20 object-cover"
                                  />
                                ) : (
                                  <div className="p-3 flex flex-col items-center gap-1">
                                    <svg className={clsx("w-8 h-8", darkMode ? "text-slate-400" : "text-slate-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                                    </svg>
                                    <span className={clsx(
                                      "text-xs text-center",
                                      darkMode ? "text-slate-400" : "text-slate-600"
                                    )}>
                                      {a.name || "File"}
                                    </span>
                                  </div>
                                )}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        {filtered.length > 0 && (
          <div className={clsx(
            "mt-8 pb-8 text-center text-sm",
            darkMode ? "text-slate-500" : "text-slate-500"
          )}>
            Showing {filtered.length} {filtered.length === 1 ? 'report' : 'reports'}
            {(status || type || q) && " (filtered)"}
          </div>
        )}
      </div>
    </div>
  );
}