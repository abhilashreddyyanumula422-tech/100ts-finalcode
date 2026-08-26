import React from "react";

/** A titled content card. The one container everything on these pages lives in. */
export default function Section({ title, subtitle, icon, count, actions, children, padded = false }) {
  return (
    <section className="bg-white rounded-xl ring-1 ring-slate-200/80 shadow-sm shadow-slate-200/40 overflow-hidden">
      {title && (
        <header className="flex items-center gap-2.5 px-5 py-3 border-b border-slate-100">
          {icon && <span className="text-slate-400">{icon}</span>}
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-slate-800 leading-tight">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {count > 0 && (
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {count}
            </span>
          )}
          {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}
