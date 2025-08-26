import React from "react";

export default function GenrePills({ genres, onToggle, selected = new Set() }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Genres">
      {genres.map(g => (
        <button
          key={g}
          onClick={() => onToggle?.(g)}
          className={`px-3 py-1 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500
            ${selected.has(g)
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}
