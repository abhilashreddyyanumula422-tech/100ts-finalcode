import React from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

const TONE = {
  info:    { cls: "bg-blue-50 text-blue-800 ring-blue-200", Icon: Info },
  success: { cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", Icon: CheckCircle2 },
  warning: { cls: "bg-amber-50 text-amber-800 ring-amber-200", Icon: AlertTriangle },
  danger:  { cls: "bg-rose-50 text-rose-800 ring-rose-200", Icon: AlertTriangle },
};

export default function Banner({ tone = "info", children, action }) {
  const { cls, Icon } = TONE[tone] || TONE.info;
  return (
    <div className={`flex items-center gap-3 rounded-xl ring-1 ring-inset px-4 py-3 ${cls}`}>
      <Icon size={16} className="shrink-0" />
      <div className="text-[13px] font-medium flex-1">{children}</div>
      {action}
    </div>
  );
}
