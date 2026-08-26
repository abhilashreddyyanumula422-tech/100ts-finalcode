import React from "react";
import { Loader2 } from "lucide-react";

const VARIANT = {
  primary:   "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
  accent:    "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
  success:   "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  danger:    "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  quiet:     "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50",
  subtle:    "bg-slate-100 text-slate-700 hover:bg-slate-200",
  dangerSubtle: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100",
};

const SIZE = {
  sm: "text-[12px] px-3 py-1.5 gap-1.5 rounded-lg",
  md: "text-[13px] px-4 py-2.5 gap-2 rounded-lg",
  lg: "text-sm px-5 py-3 gap-2 rounded-xl",
};

/** Renders as <a> when href is given, otherwise <button>. */
export default function ActionButton({
  as, href, variant = "quiet", size = "md", icon, loading, disabled,
  full, children, ...rest
}) {
  const cls = [
    "inline-flex items-center justify-center font-semibold transition",
    "disabled:opacity-50 disabled:pointer-events-none",
    VARIANT[variant] || VARIANT.quiet,
    SIZE[size] || SIZE.md,
    full ? "w-full" : "",
  ].join(" ");

  const body = (
    <>
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </>
  );

  const Tag = as || (href ? "a" : "button");
  const extra = href ? { href, target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <Tag className={cls} disabled={disabled || loading} {...extra} {...rest}>
      {body}
    </Tag>
  );
}
