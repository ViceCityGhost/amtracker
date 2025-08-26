import React, { useEffect, useMemo, useState } from "react";
import GenrePills from "./GenrePills";

const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
};

export default function Recommender({ catalog, state }) {
  // Derive genre list from current catalog (not from static seed)
  const allGenres = useMemo(
    () => Array.from(new Set(catalog.flatMap(x => x.genres))).sort(),
    [catalog]
  );

  const [selected, setSelected] = useState(new Set());
  const [topN, setTopN] = useState(() => {
    try { return Number(JSON.parse(localStorage.getItem("amtracker_topN"))) || 8; }
    catch { return 8; }
  });
  useEffect(() => {
    localStorage.setItem("amtracker_topN", JSON.stringify(topN));
  }, [topN]);

  const watchedRated = useMemo(
    () => catalog.filter(x => state.watched.has(x.id) && (state.ratings[x.id] || 0) > 0),
    [catalog, state]
  );

  const toggle = (g) => {
    const s = new Set(selected);
    s.has(g) ? s.delete(g) : s.add(g);
    setSelected(s);
  };

  const suggestions = useMemo(() => {
    const desiredGenres = [...selected];
    const candidates = catalog.filter(x => !state.watched.has(x.id));
    const scores = candidates.map(item => {
      const mood = desiredGenres.length ? jaccard(item.genres, desiredGenres) : 0;
      const pref = watchedRated.length
        ? Math.max(...watchedRated.map(w =>
            jaccard(item.genres, w.genres) * ((state.ratings[w.id] || 0) / 5)))
        : 0;
      const score =
        (desiredGenres.length ? 0.65 : 0.4) * mood +
        (desiredGenres.length ? 0.35 : 0.6) * pref;
      return { item, score };
    });
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(24, topN)));
  }, [catalog, state, selected, topN, watchedRated]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Generate Suggestions</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Pick genres. We blend your mood with your past ratings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Top
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="24"
              value={topN}
              onChange={(e) => {
                const v = e.target.value;
                const n = v === "" ? 8 : Math.max(1, Math.min(24, Number(v) || 8));
                setTopN(n);
              }}
              className="ml-2 w-16 px-2 py-1 rounded-lg
                         bg-white dark:bg-slate-900
                         text-slate-900 dark:text-slate-100
                         border border-slate-300 dark:border-slate-600
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 rounded-lg text-sm
                       bg-indigo-600 text-white border border-indigo-600
                       hover:bg-indigo-500 hover:border-indigo-500
                       focus:outline-none focus:ring-2 focus:ring-indigo-400
                       dark:bg-indigo-500 dark:text-white dark:border-indigo-500
                       dark:hover:bg-indigo-400 dark:hover:border-indigo-400
                       dark:focus:ring-indigo-300"
            title="Clear selected genres"
          >
            Clear genres
          </button>
        </div>
      </div>

      <div className="mt-3">
        <GenrePills genres={allGenres} selected={selected} onToggle={toggle} />
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {suggestions.map(({ item, score }) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 dark:border-slate-700 p-3
                       bg-slate-50 dark:bg-slate-900"
          >
            <div className="flex gap-3">
              <img
                loading="lazy"
                src={item.image}
                alt={`${item.title} poster`}
                className="w-16 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                onError={(e) => { e.currentTarget.src = "https://placehold.co/128x160?text=No+Image"; }}
              />
              <div className="min-w-0">
                <div className="font-medium text-slate-900 dark:text-slate-100 truncate" title={item.title}>
                  {item.title}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {item.type} • {item.genres.join(", ")}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Match: {(score * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          </div>
        ))}

        {suggestions.length === 0 && (
          <div className="text-sm text-slate-600 dark:text-slate-300">
            No suggestions yet. Mark some items as watched and rate them, or pick genres above.
          </div>
        )}
      </div>
    </div>
  );
}
