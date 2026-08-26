import React from "react";

const ACCENT = {
  slate:   { bar: "bg-slate-400",   chip: "bg-slate-100 text-slate-600" },
  amber:   { bar: "bg-amber-400",   chip: "bg-amber-50 text-amber-600" },
  blue:    { bar: "bg-blue-500",    chip: "bg-blue-50 text-blue-600" },
  violet:  { bar: "bg-violet-500",  chip: "bg-violet-50 text-violet-600" },
  emerald: { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-600" },
};

/** A single metric. Restrained on purpose: white card, one thin accent rule. */
export default function StatCard({ label, value, icon, accent = "slate", note }) {
  const a = ACCENT[accent] || ACCENT.slate;
  return (
    <div className="relative bg-white rounded-xl ring-1 ring-slate-200/80 shadow-sm shadow-slate-200/40 p-4 overflow-hidden">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${a.bar}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[26px] leading-none font-semibold text-slate-900 tabular-nums">{value ?? 0}</p>
        {icon && (
          <span className={`w-7 h-7 rounded-lg grid place-items-center ${a.chip}`}>{icon}</span>
        )}
      </div>
      <p className="text-[11px] font-medium text-slate-500 mt-2.5 leading-tight">{label}</p>
      {note && <p className="text-[10px] font-semibold text-amber-600 mt-1">{note}</p>}
    </div>
  );
}
