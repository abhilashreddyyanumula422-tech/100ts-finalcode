import React from "react";

/** A label/value pair. Used everywhere on the detail page. */
export default function Field({ label, value, icon, mono = false, children }) {
  if (!children && (value === null || value === undefined || value === "")) return null;
  return (
    <div className="flex items-start gap-2.5">
      {icon && <span className="text-slate-300 mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
        <div className={`text-[13px] text-slate-800 font-medium mt-0.5 break-words ${mono ? "font-mono" : ""}`}>
          {children || value}
        </div>
      </div>
    </div>
  );
}
