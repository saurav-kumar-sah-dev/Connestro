import { Eye, EyeOff } from "lucide-react";

export default function VisibilityToggle({ field, visible, onToggle }) {
  const label = visible ? "Public" : "Private";
  const prettyField = String(field || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <button
      type="button"
      aria-pressed={visible}
      aria-label={`Toggle visibility for ${prettyField}`}
      title={`${prettyField}: ${label}`}
      onClick={() => onToggle(field)}
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900
        ${visible
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : "bg-rose-600 text-white hover:bg-rose-700"
        }`}
    >
      {visible ? (
        <Eye className="w-4 h-4" aria-hidden="true" />
      ) : (
        <EyeOff className="w-4 h-4" aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  );
}