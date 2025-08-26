import React from "react";

export default function ItemCard({
  item,
  watched,
  rating,
  progress,
  favorite,
  onToggleFavorite,
  onOpen,
  onIncrementEpisode,
  onIncrementChapter,
}) {
  // ----- normalize numbers -----
  const ep = Number(progress?.episode ?? 0);
  const ch = Number(progress?.chapter ?? 0);
  const totalEp = progress?.totalEpisodes;
  const totalCh = progress?.totalChapters;

  const hasEpData = (totalEp !== undefined && totalEp !== null) || ep > 0;
  const hasChData = (totalCh !== undefined && totalCh !== null) || ch > 0;

  let current = 0, total = null, label = "";
  if (hasEpData && !hasChData) {
    current = ep; total = totalEp; label = "Episode";
  } else if (!hasEpData && hasChData) {
    current = ch; total = totalCh; label = "Chapter";
  } else if (hasEpData && hasChData) {
    if (item.type === "Manga") {
      current = ch; total = totalCh; label = "Chapter";
    } else {
      current = ep; total = totalEp; label = "Episode";
    }
  } else {
    // nothing yet → fall back to type so text makes sense
    if (item.type === "Manga") { current = ch; total = totalCh; label = "Chapter"; }
    else { current = ep; total = totalEp; label = "Episode"; }
  }

  const totalNum = Number(total ?? 0);
  const currentNum = Math.max(0, Number(current ?? 0));
  const hasPositiveTotal = Number.isFinite(totalNum) && totalNum > 0;
  const pct = hasPositiveTotal ? Math.round(Math.min(100, (currentNum / totalNum) * 100)) : 0;

  return (
    <div className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition">
      <div className="relative">
        <img
          loading="lazy"
          src={item.image}
          alt={`${item.title} poster`}
          className="w-full aspect-[3/4] object-cover cursor-pointer"
          onClick={() => onOpen(item)}
          onError={(e) => { e.currentTarget.src = "https://placehold.co/300x420?text=No+Image"; }}
        />
        <div className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-900/80 text-white">
          {item.type}
        </div>

        {favorite && (
          <div className="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500 text-white shadow">
            ⭐ Favorite
          </div>
        )}

        {watched && (
          <div className={`absolute ${favorite ? "top-8" : "top-2"} right-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-600 text-white`}>
            Watched
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3
            onClick={() => onOpen(item)}
            className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100 line-clamp-3 hover:underline"
            title={item.title}
          >
            {item.title}
          </h3>

          <button
            onClick={onToggleFavorite}
            aria-pressed={favorite}
            className={`shrink-0 rounded-full px-2 py-1 text-sm border transition ${
              favorite
                ? "border-amber-500 bg-amber-500 text-white hover:bg-amber-600"
                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={favorite ? "Remove from Favorites" : "Add to Favorites"}
            aria-label={favorite ? "Remove from Favorites" : "Add to Favorites"}
          >
            {favorite ? "⭐" : "☆"}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {item.year} • {item.genres.join(", ")}
        </p>

        {/* Progress text + always-visible bar */}
        <div className="mt-2 space-y-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {label
              ? hasPositiveTotal
                ? `${label}: ${currentNum} / ${totalNum} (${pct}%)`
                : `${label}: ${currentNum}`
              : " "}
          </p>

          <div
            className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={hasPositiveTotal ? totalNum : undefined}
            aria-valuenow={currentNum}
            aria-label={`${label} progress`}
            title={hasPositiveTotal ? `${pct}%` : "Set a total to track %"}
          >
            <div
              className={`h-full transition-all ${hasPositiveTotal ? "bg-indigo-600 dark:bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            {rating ? `Your rating: ${"★".repeat(rating)}${"☆".repeat(5 - rating)}` : "Not rated"}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onIncrementEpisode(item)}
              className="px-2 py-1 rounded-lg bg-emerald-500 text-white text-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              aria-label="Add one episode"
              title="+1 Episode"
            >
              +1 Ep
            </button>
            <button
              onClick={() => onIncrementChapter(item)}
              className="px-2 py-1 rounded-lg bg-fuchsia-500 text-white text-sm hover:bg-fuchsia-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
              aria-label="Add one chapter"
              title="+1 Chapter"
            >
              +1 Ch
            </button>
            <button
              onClick={() => onOpen(item)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
