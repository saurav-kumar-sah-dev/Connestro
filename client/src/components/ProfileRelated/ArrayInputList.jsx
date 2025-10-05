import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function ArrayInputList({ label, data, fields, onChange, onAdd, onRemove }) {
  const pretty = (name = "") =>
    name.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {label}
        </h3>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium
                     bg-blue-600 text-white hover:bg-blue-700 transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          title={`Add ${label}`}
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {data.length === 0 && (
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
          No items yet. Click Add to create one.
        </p>
      )}

      <div className="space-y-4">
        {data.map((item, index) => (
          <div
            key={item?.id ?? index}
            className="relative rounded-2xl border border-slate-200 dark:border-slate-800
                       bg-white dark:bg-slate-900 shadow-sm p-5"
          >
            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute right-3 top-3 inline-flex items-center justify-center rounded-full p-2
                         text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
              title="Remove"
              aria-label="Remove item"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(({ name, type = "text", placeholder }) => (
                <div key={name} className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                    {pretty(name)}
                  </label>
                  <input
                    type={type}
                    placeholder={placeholder || `Enter ${pretty(name).toLowerCase()}`}
                    value={item[name] ?? ""}
                    onChange={(e) => onChange(index, name, e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                               placeholder-slate-400 dark:placeholder-slate-500
                               px-3 py-2.5 text-sm md:text-base
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}