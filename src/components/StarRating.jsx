import React, { useState } from "react";

export default function StarRating({ value = 0, onChange }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="flex items-center gap-1 select-none" role="radiogroup" aria-label="Rating">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          role="radio"
          aria-checked={active >= n}
          className={`text-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded ${ active >= n ? 'text-yellow-400' : 'text-slate-300' }`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(n)}
          onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); onChange?.(n); } }}
          aria-label={`${n} star${n>1?'s':''}`}
          title={`${n} star${n>1?'s':''}`}
        >★</button>
      ))}
      <span className="ml-2 text-sm text-slate-500">{value ? `${value}/5` : 'Unrated'}</span>
    </div>
  );
}
