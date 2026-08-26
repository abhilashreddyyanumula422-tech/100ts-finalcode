import React from "react";

export default function EmptyState({ icon, title, hint }) {
  return (
    <div className="px-5 py-12 text-center">
      {icon && <div className="flex justify-center mb-3 text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
