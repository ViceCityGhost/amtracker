import React from "react";

export default function ExportImport({ data, onImport }) {
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'amtracker-data.json'; a.click();
    URL.revokeObjectURL(url);
  };
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { onImport(JSON.parse(reader.result)); }
      catch { alert('Invalid file.'); }
    };
    reader.readAsText(file);
  };
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExport}
        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        Export
      </button>
      <label className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500">
        Import
        <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
      </label>
    </div>
  );
}
