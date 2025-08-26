// src/api/anilist.js
const ANILIST_URL = "https://graphql.anilist.co";

async function gql(query, variables = {}) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join("; "));
  return json.data;
}

// --- Safety: simple adult content filter (tweak as needed) ---
const BANNED_GENRES = new Set(["Hentai", "Erotica"]);
function isSafeAni(m) {
  if (m?.isAdult) return false;
  if ((m?.genres || []).some(g => BANNED_GENRES.has(g))) return false;
  return true;
}

// ================= Media Page Query =================
const MEDIA_Q = `
query MediaPage($type:MediaType!, $sort:[MediaSort!], $page:Int=1, $perPage:Int=50){
  Page(page:$page, perPage:$perPage){
    pageInfo{ hasNextPage currentPage }
    media(type: $type, sort: $sort){
      id
      isAdult
      seasonYear
      startDate{ year }
      title{ romaji english native }
      genres
      coverImage{ large }
      description(asHtml:false)
      nextAiringEpisode { episode airingAt }
    }
  }
}
`;

/** Fetch one page for a given media type */
export async function fetchMediaPage({ type, sort = "POPULARITY_DESC", page = 1, perPage = 50 }) {
  const { Page } = await gql(MEDIA_Q, { type, sort: [sort], page, perPage });
  const raw = Page.media || [];
  const safe = raw.filter(isSafeAni);
  const items = safe.map(m => normalizeAni(m, type));
  const hasNext = !!Page.pageInfo?.hasNextPage;
  const currentPage = Page.pageInfo?.currentPage ?? page;
  return { items, hasNext, currentPage };
}

/** Fetch multiple pages for both ANIME and MANGA */
export async function fetchBatch({
  pagesPerType = 5,
  perPage = 50,
  sort = "POPULARITY_DESC",
  startPages = { ANIME: 1, MANGA: 1 },
}) {
  let nextAnime = startPages.ANIME ?? 1;
  let nextManga = startPages.MANGA ?? 1;

  const out = [];
  let fetchedAnime = 0;
  let fetchedManga = 0;

  // Fetch ANIME
  for (let i = 0; i < pagesPerType; i++) {
    const { items, hasNext, currentPage } = await fetchMediaPage({
      type: "ANIME",
      sort,
      page: nextAnime,
      perPage,
    });
    out.push(...items);
    fetchedAnime += items.length;
    nextAnime = (currentPage ?? nextAnime) + 1;
    if (!hasNext) break;
  }

  // Fetch MANGA
  for (let i = 0; i < pagesPerType; i++) {
    const { items, hasNext, currentPage } = await fetchMediaPage({
      type: "MANGA",
      sort,
      page: nextManga,
      perPage,
    });
    out.push(...items);
    fetchedManga += items.length;
    nextManga = (currentPage ?? nextManga) + 1;
    if (!hasNext) break;
  }

  return {
    items: out,
    nextPages: { ANIME: nextAnime, MANGA: nextManga },
    counts: { anime: fetchedAnime, manga: fetchedManga },
  };
}

// ================= Trending Query =================
const TRENDING_Q = `
query Trending($page:Int=1,$perPage:Int=50){
  anime: Page(page:$page, perPage:$perPage){
    pageInfo{ hasNextPage currentPage }
    media(type: ANIME, sort: TRENDING_DESC){
      id isAdult seasonYear
      title{ romaji english native }
      genres
      coverImage{ large }
      description(asHtml:false)
      nextAiringEpisode { episode airingAt }
    }
  }
  manga: Page(page:$page, perPage:$perPage){
    pageInfo{ hasNextPage currentPage }
    media(type: MANGA, sort: TRENDING_DESC){
      id isAdult startDate{ year }
      title{ romaji english native }
      genres
      coverImage{ large }
      description(asHtml:false)
    }
  }
}
`;

export async function fetchTrending({ pages = 3 } = {}) {
  const all = [];
  for (let p = 1; p <= pages; p++) {
    const data = await gql(TRENDING_Q, { page: p, perPage: 50 });
    const a = (data.anime.media || []).filter(isSafeAni).map(m => normalizeAni(m, "ANIME"));
    const m = (data.manga.media || []).filter(isSafeAni).map(m => normalizeAni(m, "MANGA"));
    all.push(...a, ...m);
    const nextA = data.anime.pageInfo?.hasNextPage;
    const nextM = data.manga.pageInfo?.hasNextPage;
    if (!nextA && !nextM) break;
  }
  return all;
}

// ================= Airing Schedule Query =================
const AIRING_Q = `
query Airing($page:Int=1,$perPage:Int=50,$from:Int!,$to:Int!){
  Page(page:$page, perPage:$perPage){
    pageInfo{ currentPage hasNextPage }
    airingSchedules(airingAt_greater:$from, airingAt_lesser:$to){
      id
      airingAt
      episode
      media{
        id isAdult seasonYear
        title{ romaji english native }
        coverImage{ large }
        genres
        description(asHtml:false)
      }
    }
  }
}
`;

export async function fetchAiringWindow({ from, to, perPage = 50, maxPages = 3 }) {
  const out = [];
  let page = 1;
  for (let i = 0; i < maxPages; i++) {
    const data = await gql(AIRING_Q, { page, perPage, from, to });
    const rows = data?.Page?.airingSchedules ?? [];
    for (const a of rows) {
      const m = a.media;
      if (!m) continue;
      if (!isSafeAni(m)) continue;
      out.push({
        id: `airing:${a.id}`,
        episode: a.episode,
        airingAt: a.airingAt,
        media: {
          id: `anilist:${m.id}`,
          sourceId: m.id, // numeric id (handy for lookups)
          title: (m.title.english || m.title.romaji || m.title.native || "Untitled"),
          image: m.coverImage?.large || "",
          genres: m.genres || [],
          year: m.seasonYear ?? null,
          synopsis: m.description || "",
        }
      });
    }
    if (!data?.Page?.pageInfo?.hasNextPage) break;
    page++;
  }
  out.sort((a,b) => a.airingAt - b.airingAt);
  return out;
}

// ================= Recent Manga Activity =================
export async function fetchRecentManga({ page = 1, perPage = 50, sort = "TRENDING_DESC" } = {}) {
  const { Page } = await gql(MEDIA_Q, { type: "MANGA", sort: [sort], page, perPage });
  const raws = (Page.media || []);
  const safe = raws.filter(isSafeAni);
  return safe.map(m => normalizeAni(m, "MANGA"));
}

// ================= Fetch-by-ID (for guaranteed full details) =================
const MEDIA_BY_ID_Q = `
query MediaById($id:Int!){
  Media(id:$id){
    id
    isAdult
    seasonYear
    type
    title{ romaji english native }
    genres
    coverImage{ large }
    description(asHtml:false)
  }
}`;

export async function fetchMediaById(anilistId){
  const { Media } = await gql(MEDIA_BY_ID_Q, { id: anilistId });
  if (!Media) throw new Error("Not found");
  if (!isSafeAni(Media)) throw new Error("Filtered");
  const type = Media.type === "MANGA" ? "Manga" : "Anime";
  return {
    id: `anilist:${Media.id}`,
    source: "anilist",
    sourceId: Media.id,
    title: Media.title.english || Media.title.romaji || Media.title.native || "Untitled",
    type,
    year: Media.seasonYear ?? null,
    genres: Media.genres || [],
    image: Media.coverImage?.large || "",
    synopsis: Media.description || "",
  };
}

// ================= Normalizer =================
function firstTitle(t) {
  return t.english || t.romaji || t.native || "Untitled";
}
function normalizeAni(m, typeFromArg) {
  const type = typeFromArg === "MANGA" ? "Manga" : "Anime";
  const year = m.seasonYear ?? m.startDate?.year ?? null;
  return {
    id: `anilist:${m.id}`,
    source: "anilist",
    sourceId: m.id,
    title: firstTitle(m.title),
    type,
    year,
    genres: m.genres || [],
    image: m.coverImage?.large || "",
    synopsis: m.description || "",
    nextAiring: m.nextAiringEpisode
      ? { episode: m.nextAiringEpisode.episode, airingAt: m.nextAiringEpisode.airingAt }
      : null,
  };
}
