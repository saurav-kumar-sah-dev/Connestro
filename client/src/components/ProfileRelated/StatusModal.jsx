// src/components/ProfileRelated/StatusModal.jsx
import { useState } from "react";
import API from "../../api/axios";

export default function StatusModal({ initial, onClose, onSaved, onCleared }) {
  const [text, setText] = useState(initial?.text || "");
  const [emoji, setEmoji] = useState(initial?.emoji || "");
  const [expiresIn, setExpiresIn] = useState(""); // minutes (string)
  const [visibility, setVisibility] = useState(initial?.visibility || "public");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (text.length > 140) {
      alert("Status must be 140 characters or less.");
      return;
    }
    try {
      setSaving(true);
      const payload = { text, emoji, visibility };
      const mins = Number(expiresIn);
      if (Number.isFinite(mins) && mins > 0) payload.expiresInMinutes = mins;

      const res = await API.put("/users/me/status", payload);
      if (res.data?.success) {
        onSaved?.(res.data.status || null);
        onClose?.();
      } else {
        alert(res.data?.msg || "Failed to update status");
      }
    } catch (e) {
      alert(e.response?.data?.msg || "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    if (!window.confirm("Clear your status?")) return;
    try {
      setSaving(true);
      await API.delete("/users/me/status");
      onCleared?.();
      onClose?.();
    } catch (e) {
      alert(e.response?.data?.msg || "Failed to clear status");
    } finally {
      setSaving(false);
    }
  };

  const remaining = 140 - text.length;
  const preview = [emoji, text].filter(Boolean).join(" ");
  const expiryLabel = (() => {
    const m = Number(expiresIn);
    if (!Number.isFinite(m) || m <= 0) return "No expiry";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const min = m % 60;
    return min ? `${h}h ${min}m` : `${h}h`;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        {/* Accent bar */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />

        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Set status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Share a short mood or note. Max 140 characters.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Emoji + Text */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Status
            </label>
            <div className="flex items-center gap-2">
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="🙂"
                maxLength={4}
                className="w-16 h-11 text-2xl text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg"
              />
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's up?"
                maxLength={140}
                className="flex-1 h-11 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3"
                autoFocus
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span
                className={`${
                  remaining < 0
                    ? "text-rose-600"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {Math.max(0, remaining)} characters left
              </span>
              {preview && (
                <span className="truncate text-slate-500 dark:text-slate-400">
                  Preview: {preview}
                </span>
              )}
            </div>
          </div>

          {/* Expiry */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600 dark:text-slate-400 w-36">
              Expires (minutes)
            </label>
            <input
              type="number"
              min="0"
              placeholder="0 = no expiry"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-40 h-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3"
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {expiryLabel}
            </span>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600 dark:text-slate-400 w-36">
              Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="h-10 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3"
            >
              <option value="public">Public</option>
              <option value="private">Private (only me)</option>
            </select>
            <span
              className={`ml-1 inline-flex items-center rounded-full px-2 py-1 text-[11px] border ${
                visibility === "private"
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
              }`}
            >
              {visibility === "private" ? "Private" : "Public"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            {!!(initial?.text || initial?.emoji) && (
              <button
                onClick={clear}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  saving
                    ? "opacity-60 cursor-not-allowed bg-rose-100 text-rose-700"
                    : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                }`}
                type="button"
              >
                Clear
              </button>
            )}
            <button
              onClick={save}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                saving
                  ? "bg-blue-600/70 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              type="button"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}