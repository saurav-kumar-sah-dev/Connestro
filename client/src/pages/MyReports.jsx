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
      ? "bg-amber-900/30 text-amber-400"
      : "bg-amber-100 text-amber-700",
    reviewing: darkMode
      ? "bg-blue-900/30 text-blue-400"
      : "bg-blue-100 text-blue-700",
    resolved: darkMode
      ? "bg-green-900/30 text-green-400"
      : "bg-green-100 text-green-700",
    rejected: darkMode
      ? "bg-red-900/30 text-red-400"
      : "bg-red-100 text-red-700",
  };
  return (
    <span
      className={clsx(
        "text-xs px-2 py-0.5 rounded font-medium select-none",
        map[status] ||
          (darkMode
            ? "bg-gray-800 text-gray-300"
            : "bg-gray-100 text-gray-700")
      )}
    >
      {status}
    </span>
  );
};

const TypeBadge = ({ type, darkMode }) => (
  <span
    className={clsx(
      "text-xs px-2 py-0.5 rounded font-medium select-none",
      darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"
    )}
  >
    {type}
  </span>
);

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
      <p
        className={clsx(
          "text-center mt-6 font-medium",
          darkMode ? "text-gray-300" : "text-gray-600"
        )}
      >
        Loading your reports...
      </p>
    );

  return (
    <div
      className={clsx(
        // ✅ Adjusted spacing: now matches home page (no content hidden under navbar)
        "container mx-auto px-4 py-6 mt-16 rounded-xl transition-colors duration-500",
        darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900"
      )}
    >
      <h1
        className={clsx(
          "text-2xl font-bold mb-5 tracking-tight",
          darkMode ? "text-blue-300" : "text-blue-700"
        )}
      >
        My Reports
      </h1>

      {/* Filters */}
      <div
        className={clsx(
          "grid md:grid-cols-4 gap-3 mb-6 p-4 rounded-lg border transition-colors",
          darkMode
            ? "bg-gray-900 border-gray-800"
            : "bg-white border-gray-200 shadow-sm"
        )}
      >
        <label
          className={clsx(
            "text-sm font-medium flex flex-col gap-1",
            darkMode ? "text-gray-300" : "text-gray-700"
          )}
        >
          Status:
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={clsx(
              "rounded-md px-2 py-1 text-sm border focus:ring-2 focus:outline-none",
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
        </label>

        <label
          className={clsx(
            "text-sm font-medium flex flex-col gap-1",
            darkMode ? "text-gray-300" : "text-gray-700"
          )}
        >
          Type:
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={clsx(
              "rounded-md px-2 py-1 text-sm border focus:ring-2 focus:outline-none",
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
        </label>

        <label
          className={clsx(
            "text-sm font-medium flex flex-col gap-1 md:col-span-2",
            darkMode ? "text-gray-300" : "text-gray-700"
          )}
        >
          Search:
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Reason, details, resolution, user, content..."
            className={clsx(
              "rounded-md px-2 py-1 text-sm border focus:ring-2 focus:outline-none",
              darkMode
                ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400 focus:ring-blue-600"
                : "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-blue-400"
            )}
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div
          className={clsx(
            "rounded-xl text-center py-10 font-medium",
            darkMode
              ? "bg-gray-900 border border-gray-800 text-gray-400"
              : "bg-white border border-gray-200 text-gray-500 shadow-sm"
          )}
        >
          No reports found.
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
                  "rounded-xl border p-4 shadow-sm transition-colors",
                  darkMode
                    ? "bg-gray-900 border-gray-800 shadow-black/30"
                    : "bg-white border-gray-200 shadow-gray-100"
                )}
              >
                <div className="flex justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <TypeBadge type={r.targetType} darkMode={darkMode} />
                      <StatusBadge status={r.status} darkMode={darkMode} />
                      <span
                        className={clsx(
                          "text-xs",
                          darkMode ? "text-gray-400" : "text-gray-500"
                        )}
                      >
                        {created}
                      </span>
                    </div>

                    <div
                      className={clsx(
                        "text-sm",
                        darkMode ? "text-gray-200" : "text-gray-800"
                      )}
                    >
                      <span className="font-semibold">Reason:</span> {r.reason}
                    </div>

                    {r.details && (
                      <div
                        className={clsx(
                          "text-sm mt-1",
                          darkMode ? "text-gray-400" : "text-gray-700"
                        )}
                      >
                        “{r.details}”
                      </div>
                    )}

                    {/* Target preview */}
                    <div
                      className={clsx(
                        "text-xs mt-2",
                        darkMode ? "text-gray-400" : "text-gray-600"
                      )}
                    >
                      {r.targetType === "post" && r.post ? (
                        <>
                          Post: {r.post.content?.slice(0, 140) || "(no content)"}{" "}
                          <button
                            onClick={() => openPostSafe(r.post._id)}
                            className={clsx(
                              "underline font-medium",
                              darkMode ? "text-blue-400" : "text-blue-600"
                            )}
                          >
                            View post
                          </button>
                          {unavailablePost[r.post._id] && (
                            <div className="text-red-400 mt-1">
                              This content is unavailable or restricted.
                            </div>
                          )}
                        </>
                      ) : r.targetType === "user" && r.targetUser ? (
                        <>
                          User: @{r.targetUser.username}{" "}
                          <Link
                            to={`/profile/${r.targetUser._id}`}
                            className={clsx(
                              "underline font-medium",
                              darkMode ? "text-blue-400" : "text-blue-600"
                            )}
                          >
                            View profile
                          </Link>
                        </>
                      ) : r.targetType === "reel" && r.reel ? (
                        <>
                          Reel: {r.reel.caption?.slice(0, 140) || "(no caption)"}{" "}
                          <button
                            onClick={() => openReelSafe(r.reel._id)}
                            className={clsx(
                              "underline font-medium",
                              darkMode ? "text-blue-400" : "text-blue-600"
                            )}
                          >
                            View reel
                          </button>
                          {unavailableReel[r.reel._id] && (
                            <div className="text-red-400 mt-1">
                              This content is unavailable or restricted.
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>

                    {(r.status === "resolved" || r.status === "rejected") && (
                      <div
                        className={clsx(
                          "text-xs mt-2",
                          darkMode ? "text-gray-400" : "text-gray-600"
                        )}
                      >
                        <div>
                          <span className="font-semibold">Resolution:</span>{" "}
                          {r.resolution || "(none)"}
                        </div>
                        {resolved && <div>Resolved at: {resolved}</div>}
                      </div>
                    )}

                    {attachments.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
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
                                "border rounded p-1 transition-colors",
                                darkMode
                                  ? "border-gray-700 hover:bg-gray-800"
                                  : "border-gray-300 hover:bg-gray-50"
                              )}
                              title={a.name || "attachment"}
                            >
                              {isImg ? (
                                <img
                                  src={url}
                                  alt={a.name || "attachment"}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              ) : (
                                <span
                                  className={clsx(
                                    "text-xs underline",
                                    darkMode
                                      ? "text-blue-400"
                                      : "text-blue-600"
                                  )}
                                >
                                  {a.name || "Attachment"}
                                </span>
                              )}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}