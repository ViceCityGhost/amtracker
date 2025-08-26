// src/data/remoteCatalog.js
const REMOTE_KEY = "amtracker_remote_v1";
const CURSOR_KEY = "amtracker_cursor_v1";
const MODE_KEY = "amtracker_mode_v1"; // which sort mode is being used

export function loadRemote() {
  try { return JSON.parse(localStorage.getItem(REMOTE_KEY)) ?? []; }
  catch { return []; }
}

export function saveRemote(list) {
  localStorage.setItem(REMOTE_KEY, JSON.stringify(list));
}

export function mergeCatalog(seedCatalog, remoteList) {
  const seen = new Set();
  const out = [];

  // Prefer remote first (usually fresher)
  for (const r of remoteList) {
    const key = `${r.source}:${r.sourceId}`;
    if (!seen.has(key)) { seen.add(key); out.push(r); }
  }

  // Add seed items (avoid duping against remote if ids collide)
  for (const s of seedCatalog) {
    const key = s.id || `${s.title?.toLowerCase() ?? ""}-${s.year ?? ""}`;
    if (!seen.has(key)) { seen.add(key); out.push(s); }
  }

  return out;
}

export function dedupeBySourceId(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const key = `${x.source}:${x.sourceId}`;
    if (!seen.has(key)) { seen.add(key); out.push(x); }
  }
  return out;
}

// ---- Cursor management ----
export function loadCursor() {
  try {
    return JSON.parse(localStorage.getItem(CURSOR_KEY)) ?? { ANIME: 1, MANGA: 1 };
  } catch {
    return { ANIME: 1, MANGA: 1 };
  }
}
export function saveCursor(cursor) {
  localStorage.setItem(CURSOR_KEY, JSON.stringify(cursor));
}

export function loadMode() {
  try { return localStorage.getItem(MODE_KEY) || "POPULARITY_DESC"; }
  catch { return "POPULARITY_DESC"; }
}
export function saveMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
}
