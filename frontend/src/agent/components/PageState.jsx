import React from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { ActionButton } from "./ui";

export function PageLoading({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
      <Loader2 size={26} className="animate-spin mb-3" />
      <p className="text-[13px]">{label}</p>
    </div>
  );
}

export function PageError({ message, onRetry }) {
  return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <AlertTriangle size={30} className="mx-auto text-rose-400 mb-3" />
      <p className="text-[15px] font-semibold text-slate-900">Something went wrong</p>
      <p className="text-[13px] text-slate-500 leading-relaxed mt-1.5">{message}</p>
      <div className="flex gap-2 justify-center mt-5">
        {onRetry && <ActionButton variant="accent" onClick={onRetry}>Try again</ActionButton>}
        <ActionButton as={Link} to="/agent/login" variant="subtle">Sign in again</ActionButton>
      </div>
    </div>
  );
}

/** Consistent page title row used by every portal page. */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="flex items-end justify-between gap-3 flex-wrap mb-5">
      <div>
        <h1 className="text-[20px] font-semibold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
