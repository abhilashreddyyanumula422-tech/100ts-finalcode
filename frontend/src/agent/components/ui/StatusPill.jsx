import React from "react";
import { STATUS_TONE, statusLabel } from "../../constants/workflow";

const TONE = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  info:    "bg-blue-50 text-blue-700 ring-blue-200",
  accent:  "bg-violet-50 text-violet-700 ring-violet-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger:  "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function StatusPill({ status, label, size = "sm" }) {
  const tone = TONE[STATUS_TONE[status]] || TONE.neutral;
  const dims = size === "lg" ? "text-xs px-3 py-1.5" : "text-[11px] px-2.5 py-1";
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ring-1 ring-inset whitespace-nowrap ${tone} ${dims}`}>
      {label || statusLabel(status)}
    </span>
  );
}
