// src/App.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import "./index.css";

import { CATALOG as SEED } from "./data/catalog";

import { fetchBatch, fetchAiringWindow, fetchRecentManga, fetchMediaById } from "./api/anilist";
import {
  loadRemote, saveRemote, mergeCatalog, dedupeBySourceId,
  loadCursor, saveCursor, loadMode, saveMode,
} from "./data/remoteCatalog";

import StarRating from "./components/StarRating";
import GenrePills from "./components/GenrePills";
import ItemCard from "./components/ItemCard";
import Modal from "./components/Modal";
import ExportImport from "./components/ExportImport";
import Recommender from "./components/Recommender";

/* ----------------- helpers ----------------- */
const STORAGE_KEY = "amtracker_v1";

function formatCountdown(secondsFromNow) {
  if (secondsFromNow <= 0) return "Now";
  const d = Math.floor(secondsFromNow / 86400);
  const h = Math.floor((secondsFromNow % 86400) / 3600);
  const m = Math.floor((secondsFromNow % 3600) / 60);
  return [d ? `${d}d` : null, h ? `${h}h` : null, m ? `${m}m` : null]
    .filter(Boolean).join(" ");
}

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return {
      watched: new Set(p.watched || []),
      ratings: p.ratings || {},
      progress: p.progress || {},
      favorites: new Set(p.favorites || []),
      watchlist: new Set(p.watchlist || []),
    };
  } catch { return null; }
};

const saveState = (state) => {
  const payload = {
    watched: Array.from(state.watched),
    ratings: state.ratings,
    progress: state.progress,
    favorites: Array.from(state.favorites),
    watchlist: Array.from(state.watchlist),
  };
  const write = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  if ("requestIdleCallback" in window) requestIdleCallback(write, { timeout: 300 });
  else setTimeout(write, 0);
};

/** commit helper for numeric strings -> int (>=0) or undefined */
function sanitizeInt(str) {
  if (str === "" || str == null) return undefined;
  const n = Number(str);
  if (Number.isNaN(n)) return undefined;
  return Math.max(0, Math.floor(n));
}

export default function App() {
  /* ----------------- app state ----------------- */
  const [state, setState] = useState(() =>
    loadState() ?? {
      watched: new Set(),
      ratings: {},
      progress: {},
      favorites: new Set(),
      watchlist: new Set(),
    }
  );

  // Remote catalog cache from AniList
  const [remote, setRemote] = useState(() => loadRemote());
  // Cursor per type + sort mode
  const [cursor, setCursor] = useState(() => loadCursor());
  const [mode, setMode] = useState(() => loadMode()); // "POPULARITY_DESC" or "ID_DESC"

  // --- SEARCH (fix: keep focus & caret while typing) ---
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  useEffect(() => {
    // Force focus back to the search input after every render change that might steal it.
    // Prevents the "have to click after every key" issue.
    if (document.activeElement !== searchRef.current) {
      searchRef.current?.focus({ preventScroll: true });
      // keep caret at end
      const len = searchRef.current?.value?.length ?? 0;
      try { searchRef.current?.setSelectionRange(len, len); } catch {}
    }
  }, [query]); // re-affirm focus as you type

  const [typeFilter, setTypeFilter] = useState("All");
  const [genreSet, setGenreSet] = useState(new Set());
  const [detailItem, setDetailItem] = useState(null);
  const [sortBy, setSortBy] = useState("title-asc");
  const [isSyncing, setIsSyncing] = useState(false);

  const navigate = useNavigate();

  // Dark mode
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // persist app data
  useEffect(() => { saveState(state); }, [state]);

  // Build full catalog = remote (fresh) + seed (offline)
  const FULL_CATALOG = useMemo(() => mergeCatalog(SEED, remote), [remote]);

  // Derive genres from the full catalog
  const ALL_GENRES = useMemo(
    () => Array.from(new Set(FULL_CATALOG.flatMap(x => x.genres))).sort(),
    [FULL_CATALOG]
  );

  /* ----------------- filters & sorting ----------------- */
  const toggleGenre = (g) => {
    const s = new Set(genreSet);
    s.has(g) ? s.delete(g) : s.add(g);
    setGenreSet(s);
  };

  const filtered = useMemo(() => {
    let list = FULL_CATALOG.filter((x) => {
      if (typeFilter !== "All" && x.type !== typeFilter) return false;
      if (genreSet.size && ![...genreSet].every((g) => x.genres.includes(g))) return false;
      if (query && !x.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    const [field, dir] = sortBy.split("-");
    list = [...list].sort((a, b) => {
      const mul = dir === "asc" ? 1 : -1;
      if (field === "title") return a.title.localeCompare(b.title) * mul;
      if (field === "year") return ((a.year ?? 0) - (b.year ?? 0)) * mul;
      return 0;
    });
    return list;
  }, [FULL_CATALOG, query, typeFilter, genreSet, sortBy]);

  /* ----------------- stats ----------------- */
  const watchedCount = state.watched.size;
  const ratedCount = Object.keys(state.ratings).length;

  /* ----------------- state updaters ----------------- */
  const setWatched = (item, val) => {
    setState((prev) => {
      const w = new Set(prev.watched);
      val ? w.add(item.id) : w.delete(item.id);
      return { ...prev, watched: w };
    });
  };

  const setRating = (item, val) => {
    setState((prev) => ({ ...prev, ratings: { ...prev.ratings, [item.id]: val } }));
  };

  const setProgress = (item, patch) => {
    setState((prev) => ({
      ...prev,
      progress: {
        ...prev.progress,
        [item.id]: { ...(prev.progress[item.id] || {}), ...patch },
      },
    }));
  };

  const toggleFavorite = (item) => {
    setState((prev) => {
      const f = new Set(prev.favorites);
      f.has(item.id) ? f.delete(item.id) : f.add(item.id);
      return { ...prev, favorites: f };
    });
  };

  const toggleWatchlist = (item) => {
    setState(prev => {
      const wl = new Set(prev.watchlist);
      wl.has(item.id) ? wl.delete(item.id) : wl.add(item.id);
      return { ...prev, watchlist: wl };
    });
  };

  // Quick +1 Ep
  const incrementEpisode = (item) => {
    setState((prev) => {
      const current = prev.progress[item.id]?.episode || 0;
      return {
        ...prev,
        progress: {
          ...prev.progress,
          [item.id]: { ...(prev.progress[item.id] || {}), episode: current + 1 },
        },
      };
    });
  };

  // Quick +1 Ch
  const incrementChapter = (item) => {
    setState((prev) => {
      const current = prev.progress[item.id]?.chapter || 0;
      return {
        ...prev,
        progress: {
          ...prev.progress,
          [item.id]: { ...(prev.progress[item.id] || {}), chapter: current + 1 },
        },
      };
    });
  };

  const clearAll = () => {
    if (!window.confirm("Clear your watched, ratings, progress, favorites & watchlist?")) return;
    setState({ watched: new Set(), ratings: {}, progress: {}, favorites: new Set(), watchlist: new Set() });
    localStorage.removeItem(STORAGE_KEY);
  };

  const importData = (payload) => {
    const watched = new Set(payload.watched || []);
    const ratings = payload.ratings || {};
    const progress = payload.progress || {};
    const favorites = new Set(payload.favorites || []);
    const watchlist = new Set(payload.watchlist || []);
    setState({ watched, ratings, progress, favorites, watchlist });
  };

  // ---- Sync MORE from AniList using cursor ----
  async function syncMore() {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const pagesPerType = 5;
      const perPage = 50;
      const { items, nextPages, counts } = await fetchBatch({
        pagesPerType,
        perPage,
        sort: mode,
        startPages: cursor,
      });

      const nextList = dedupeBySourceId([...items, ...remote]);
      setRemote(nextList);
      saveRemote(nextList);

      setCursor(nextPages);
      saveCursor(nextPages);

      alert(
        `Synced ${counts.anime} anime + ${counts.manga} manga (mode: ${mode}).\n` +
        `Next pages → ANIME: ${nextPages.ANIME}, MANGA: ${nextPages.MANGA}\n` +
        `Remote cache total: ${nextList.length}`
      );
    } catch (e) {
      console.error(e);
      alert("Sync failed. See console for details.");
    } finally {
      setIsSyncing(false);
    }
  }

  function resetCursor(newMode) {
    const reset = { ANIME: 1, MANGA: 1 };
    setCursor(reset);
    saveCursor(reset);
    if (newMode) { setMode(newMode); saveMode(newMode); }
  }

  function clearRemoteCatalog() {
    if (!window.confirm("Clear synced catalog (remote cache) and reset pages back to 1?")) return;
    setRemote([]);
    saveRemote([]);
    const reset = { ANIME: 1, MANGA: 1 };
    setCursor(reset);
    saveCursor(reset);
    alert("Cleared remote cache and reset pages. Seed catalog is still available.");
  }

  /* ----------------- pages ----------------- */

  const TrackerPage = () => (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Anime & Manga Tracker</h1>
            <p className="text-slate-600 dark:text-slate-300">
              Track titles, filter by genre, and manage your watchlist.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sync controls */}
            <div className="flex items-center gap-2">
              <select
                value={mode}
                onChange={(e) => { setMode(e.target.value); saveMode(e.target.value); }}
                className="px-2 py-1 rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-sm"
                title="Choose how to crawl the AniList catalog"
              >
                <option value="POPULARITY_DESC">Mode: Popular (broad)</option>
                <option value="ID_DESC">Mode: ID (exhaustive)</option>
              </select>
              <button type="button" onClick={syncMore} disabled={isSyncing}
                className="px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-sm disabled:opacity-60">
                {isSyncing ? "Syncing…" : "🔄 Sync more"}
              </button>
              <button type="button" onClick={() => resetCursor(mode)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm">
                Reset pages
              </button>
              <button type="button" onClick={clearRemoteCatalog}
                className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-sm">
                Clear catalog
              </button>
            </div>

            {/* Debug badge */}
            <span className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              seed: {SEED.length} • remote: {remote.length} • total: {FULL_CATALOG.length} • pages → A:{cursor.ANIME} M:{cursor.MANGA}
            </span>

            {/* Theme/export/reset */}
            <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm">
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
            <ExportImport
              data={{
                watched: Array.from(state.watched),
                ratings: state.ratings,
                progress: state.progress,
                favorites: Array.from(state.favorites),
                watchlist: Array.from(state.watchlist),
              }}
              onImport={importData}
            />
            <button type="button" onClick={clearAll}
              className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400">
              Reset
            </button>
          </div>
        </header>

        {/* Controls */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex-1">
                <label htmlFor="search" className="sr-only">Search titles</label>
                <input
                  id="search"
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles…"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2">
                {["All", "Anime", "Manga"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      typeFilter === t
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <GenrePills genres={ALL_GENRES} selected={genreSet} onToggle={toggleGenre} />
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-300 flex-wrap">
              <span>Use the quick buttons to update progress: +1 Ep or +1 Ch.</span>
              <div className="ml-auto flex items-center gap-2">
                <label className="text-slate-600 dark:text-slate-300">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="title-asc">Title (A→Z)</option>
                  <option value="title-desc">Title (Z→A)</option>
                  <option value="year-desc">Year (newest)</option>
                  <option value="year-asc">Year (oldest)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right card: Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="font-semibold">Your Stats</h3>
            <div className="mt-2 grid grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold">{watchedCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Watched</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold">{ratedCount}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Rated</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold">{state.favorites.size}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Favorites</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="text-2xl font-bold">{state.watchlist.size}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Watchlist</div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">(Local data & synced results are cached in your browser.)</p>
          </div>
        </section>

        {/* Recommendations */}
        <section className="mt-6">
          <Recommender catalog={FULL_CATALOG} state={state} />
        </section>

        {/* Catalog */}
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Catalog</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Showing {filtered.length} of {FULL_CATALOG.length}
              </span>
              <button type="button" onClick={() => navigate("/watchlist")}
                className="text-sm px-3 py-1.5 rounded-lg border border-sky-400/60 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/30">
                View Watchlist 📺
              </button>
              <button type="button" onClick={() => navigate("/watched")}
                className="text-sm px-3 py-1.5 rounded-lg border border-emerald-400/60 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                View Watched ✓
              </button>
              <button type="button" onClick={() => navigate("/news")}
                className="text-sm px-3 py-1.5 rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                News 🗞️
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                watched={state.watched.has(item.id)}
                rating={state.ratings[item.id] || 0}
                progress={state.progress[item.id]}
                favorite={state.favorites.has(item.id)}
                onToggleFavorite={() => toggleFavorite(item)}
                onIncrementEpisode={incrementEpisode}
                onIncrementChapter={incrementChapter}
                onOpen={setDetailItem}
              />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-6 text-slate-500 dark:text-slate-400 text-sm">
              No results. Try clearing some filters or search.
            </div>
          )}
        </section>

        {/* Detail Modal */}
        <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title={detailItem?.title}>
          {detailItem && <DetailBody
            detailItem={detailItem}
            state={state}
            setWatched={setWatched}
            toggleWatchlist={toggleWatchlist}
            toggleFavorite={toggleFavorite}
            setRating={setRating}
            setProgress={setProgress}
          />}
        </Modal>

        <footer className="mt-10 pb-10 text-center text-xs text-slate-500 dark:text-slate-400">
          Built as an MVP demo. You can expand the catalog, wire to a real database, and add accounts later.
        </footer>
      </div>
    </div>
  );

  // ----- Watched Page -----
  const WatchedPage = () => {
    const items = FULL_CATALOG.filter(x => state.watched.has(x.id));
    return (
      <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">✓ Watched</h1>
            <span className="text-sm text-slate-500 dark:text-slate-400">{items.length} titles</span>
          </div>
          {items.length === 0 ? (
            <div className="mt-8 text-slate-500 dark:text-slate-400">
              Nothing yet. Go to <Link to="/" className="underline">Home</Link> and mark titles as watched.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  watched={true}
                  rating={state.ratings[item.id] || 0}
                  progress={state.progress[item.id]}
                  favorite={state.favorites.has(item.id)}
                  onToggleFavorite={() => toggleFavorite(item)}
                  onIncrementEpisode={incrementEpisode}
                  onIncrementChapter={incrementChapter}
                  onOpen={setDetailItem}
                />
              ))}
            </div>
          )}
        </div>
        <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title={detailItem?.title}>
          {detailItem && <div className="text-sm text-slate-500 p-4">Use the same controls as Home.</div>}
        </Modal>
      </div>
    );
  };

  // ----- Watchlist Page -----
  const WatchlistPage = () => {
    const items = FULL_CATALOG.filter(x => state.watchlist.has(x.id));
    return (
      <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">📺 Watchlist</h1>
            <span className="text-sm text-slate-500 dark:text-slate-400">{items.length} titles</span>
          </div>
          {items.length === 0 ? (
            <div className="mt-8 text-slate-500 dark:text-slate-400">
              Empty. Open a title and click <b>“➕ Watchlist”</b> to add it.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  watched={state.watched.has(item.id)}
                  rating={state.ratings[item.id] || 0}
                  progress={state.progress[item.id]}
                  favorite={state.favorites.has(item.id)}
                  onToggleFavorite={() => toggleFavorite(item)}
                  onIncrementEpisode={incrementEpisode}
                  onIncrementChapter={incrementChapter}
                  onOpen={setDetailItem}
                />
              ))}
            </div>
          )}
        </div>
        <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title={detailItem?.title}>
          {detailItem && <div className="text-sm text-slate-500 p-4">Manage from the Home page controls.</div>}
        </Modal>
      </div>
    );
  };

  // ----- News Page (Real-time Anime + Recent Manga) -----
  const NewsPage = () => {
    const [airing, setAiring] = useState([]);
    const [manga, setManga] = useState([]);
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));

    // tick each minute for fresh countdowns
    useEffect(() => {
      const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 60 * 1000);
      return () => clearInterval(t);
    }, []);

    useEffect(() => {
      (async () => {
        try {
          const from = Math.floor(Date.now()/1000) - 30 * 60;       // 30m ago (capture "airing now")
          const to   = from + 48 * 3600 + 30 * 60;                  // next 48h + 30m
          const slots = await fetchAiringWindow({ from, to, perPage: 50, maxPages: 4 });
          setAiring(slots);
        } catch (e) { console.error("airing fetch failed", e); }
        try {
          const recents = await fetchRecentManga({ page: 1, perPage: 50, sort: "TRENDING_DESC" });
          setManga(recents.slice(0, 18));
        } catch (e) { console.error("manga fetch failed", e); }
      })();
    }, []);

    return (
      <div className="min-h-[calc(100vh-56px)] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">🗞️ News & Releases</h1>

          {/* Airing Soon / Now */}
          <section className="mt-6">
            <h2 className="text-xl font-semibold">📺 Anime — Airing Now & Next 48h</h2>
            {airing.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No upcoming episodes in the next 48 hours (or still loading).</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {airing.map(row => {
                  const secs = row.airingAt - now;
                  const soon = formatCountdown(Math.max(secs, 0));
                  return (
                    <div key={row.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
                      <div className="flex gap-3">
                        <img
                          src={row.media.image}
                          alt={row.media.title}
                          className="w-16 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                          onError={(e)=>{e.currentTarget.src="https://placehold.co/128x192?text=No+Image";}}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold line-clamp-2">{row.media.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Ep {row.episode} • {secs <= 0 ? "Airing now" : `in ${soon}`}
                          </div>
                          <button
                            type="button"
                            onClick={async ()=>{
                              // 1) Try full item from local catalog
                              const fromCatalog = FULL_CATALOG.find(x => x.id === row.media.id);
                              if (fromCatalog) { setDetailItem(fromCatalog); return; }
                              // 2) Else fetch by AniList numeric id
                              try {
                                const full = await fetchMediaById(row.media.sourceId);
                                setDetailItem(full);
                                return;
                              } catch (e) {
                                console.warn("fetchMediaById failed; using fallback", e);
                              }
                              // 3) Fallback stub (has synopsis from API)
                              setDetailItem({
                                id: row.media.id,
                                title: row.media.title,
                                image: row.media.image,
                                type: "Anime",
                                year: row.media.year,
                                genres: row.media.genres,
                                synopsis: row.media.synopsis || "",
                              });
                            }}
                            className="mt-2 text-xs px-2 py-1 rounded border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Manga recent activity */}
          <section className="mt-10">
            <h2 className="text-xl font-semibold">📚 Manga — Recent Activity</h2>
            {manga.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No recent manga list yet (or still loading).</p>
            ) : (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {manga.map(item => (
                  <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
                    <div className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                        onError={(e)=>{e.currentTarget.src="https://placehold.co/128x192?text=No+Image";}}
                      />
                      <div className="flex-1">
                        <div className="text-sm font-semibold line-clamp-2">{item.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Trending now</div>
                        <button
                          type="button"
                          onClick={()=>setDetailItem(item)}
                          className="mt-2 text-xs px-2 py-1 rounded border border-indigo-300 dark:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <Modal open={!!detailItem} onClose={() => setDetailItem(null)} title={detailItem?.title}>
          {detailItem && <div className="text-sm text-slate-500 p-4">Open the full title on Home to adjust progress, watchlist, etc.</div>}
        </Modal>
      </div>
    );
  };

  const NotFound = () => (
    <div className="min-h-[calc(100vh-56px)] grid place-items-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center text-slate-700 dark:text-slate-300">
        <h1 className="text-2xl font-bold mb-2">404</h1>
        <p>Page not found.</p>
      </div>
    </div>
  );

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-6">
          <Link to="/" className="font-semibold hover:underline">Anime & Manga Tracker</Link>
          <Link to="/watchlist" className="text-sm text-slate-600 dark:text-slate-300 hover:underline">📺 Watchlist</Link>
          <Link to="/watched" className="text-sm text-slate-600 dark:text-slate-300 hover:underline">✓ Watched</Link>
          <Link to="/news" className="text-sm text-slate-600 dark:text-slate-300 hover:underline">🗞️ News</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<TrackerPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/watched" element={<WatchedPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

/* ----------------- Detail modal body with stable inputs ----------------- */
function DetailBody({ detailItem, state, setWatched, toggleWatchlist, toggleFavorite, setRating, setProgress }) {
  // read current values
  const prog = state.progress[detailItem.id] || {};
  // Local draft strings (fix: let user type freely)
  const [epStr, setEpStr] = useState(
    prog.episode == null ? "" : String(prog.episode)
  );
  const [chStr, setChStr] = useState(
    prog.chapter == null ? "" : String(prog.chapter)
  );
  const [totalEpStr, setTotalEpStr] = useState(
    prog.totalEpisodes == null ? "" : String(prog.totalEpisodes)
  );
  const [totalChStr, setTotalChStr] = useState(
    prog.totalChapters == null ? "" : String(prog.totalChapters)
  );

  // keep drafts in sync when switching items
  useEffect(() => {
    const p = state.progress[detailItem.id] || {};
    setEpStr(p.episode == null ? "" : String(p.episode));
    setChStr(p.chapter == null ? "" : String(p.chapter));
    setTotalEpStr(p.totalEpisodes == null ? "" : String(p.totalEpisodes));
    setTotalChStr(p.totalChapters == null ? "" : String(p.totalChapters));
  }, [detailItem.id, state.progress]);

  // commit handlers (onBlur or Enter)
  const commitEpisode = () => setProgress(detailItem, { episode: sanitizeInt(epStr) ?? 0 });
  const commitChapter = () => setProgress(detailItem, { chapter: sanitizeInt(chStr) ?? 0 });
  const commitTotalEpisodes = () => setProgress(detailItem, { totalEpisodes: sanitizeInt(totalEpStr) });
  const commitTotalChapters = () => setProgress(detailItem, { totalChapters: sanitizeInt(totalChStr) });

  const onEnterCommit = (e, fn) => {
    if (e.key === "Enter") { fn(); e.currentTarget.blur(); }
  };

  return (
    <div className="grid gap-5 md:grid-cols-[160px,1fr]">
      <img
        loading="lazy"
        src={detailItem.image}
        alt={`${detailItem.title} poster`}
        className="w-40 h-56 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
        onError={(e) => { e.currentTarget.src = "https://placehold.co/160x224?text=No+Image"; }}
      />
      <div>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          {detailItem.type} • {detailItem.year} • {(detailItem.genres || []).join(", ")}
        </div>
        <p className="mt-2 text-slate-700 dark:text-slate-200">{detailItem.synopsis}</p>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setWatched(detailItem, !state.watched.has(detailItem.id))}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              state.watched.has(detailItem.id)
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-600"
            }`}
          >
            {state.watched.has(detailItem.id) ? "✓ Marked Watched" : "Mark as Watched"}
          </button>

          <button
            type="button"
            onClick={() => toggleWatchlist(detailItem)}
            className={`px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-sky-500 ${
              state.watchlist.has(detailItem.id)
                ? "bg-sky-500 text-white border-sky-500"
                : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-600"
            }`}
            title={state.watchlist.has(detailItem.id) ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            {state.watchlist.has(detailItem.id) ? "📺 In Watchlist" : "➕ Watchlist"}
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(detailItem)}
            className={`px-3 py-1.5 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              state.favorites.has(detailItem.id)
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-600"
            }`}
            title={state.favorites.has(detailItem.id) ? "Remove from Favorites" : "Add to Favorites"}
          >
            {state.favorites.has(detailItem.id) ? "⭐ Favorited" : "☆ Add Favorite"}
          </button>

          <StarRating
            value={state.ratings[detailItem.id] || 0}
            onChange={(v) => setRating(detailItem, v)}
          />
        </div>

        {/* Progress controls with totals */}
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {/* Episode box */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Episode</label>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Total:&nbsp;
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className="w-20 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  value={totalEpStr}
                  onChange={(e) => setTotalEpStr(e.target.value)}
                  onBlur={commitTotalEpisodes}
                  onKeyDown={(e) => onEnterCommit(e, commitTotalEpisodes)}
                  placeholder="e.g. 24"
                  aria-label="Total episodes"
                />
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                onClick={() => {
                  const next = Math.max(0, (sanitizeInt(epStr) ?? 0) - 1);
                  setEpStr(String(next));
                  setProgress(detailItem, { episode: next });
                }}
                aria-label="Decrement episode"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                value={epStr}
                onChange={(e) => setEpStr(e.target.value)}
                onBlur={commitEpisode}
                onKeyDown={(e) => onEnterCommit(e, commitEpisode)}
              />
              <button
                type="button"
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                onClick={() => {
                  const next = (sanitizeInt(epStr) ?? 0) + 1;
                  setEpStr(String(next));
                  setProgress(detailItem, { episode: next });
                }}
                aria-label="Increment episode"
              >
                +
              </button>
            </div>
          </div>

          {/* Chapter box */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Chapter</label>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Total:&nbsp;
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  className="w-20 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                  value={totalChStr}
                  onChange={(e) => setTotalChStr(e.target.value)}
                  onBlur={commitTotalChapters}
                  onKeyDown={(e) => onEnterCommit(e, commitTotalChapters)}
                  placeholder="e.g. 120"
                  aria-label="Total chapters"
                />
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                onClick={() => {
                  const next = Math.max(0, (sanitizeInt(chStr) ?? 0) - 1);
                  setChStr(String(next));
                  setProgress(detailItem, { chapter: next });
                }}
                aria-label="Decrement chapter"
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                className="w-24 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                value={chStr}
                onChange={(e) => setChStr(e.target.value)}
                onBlur={commitChapter}
                onKeyDown={(e) => onEnterCommit(e, commitChapter)}
              />
              <button
                type="button"
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                onClick={() => {
                  const next = (sanitizeInt(chStr) ?? 0) + 1;
                  setChStr(String(next));
                  setProgress(detailItem, { chapter: next });
                }}
                aria-label="Increment chapter"
              >
                +
              </button>
            </div>
          </div>
        </div>
        {/* /Progress controls */}
      </div>
    </div>
  );
}
