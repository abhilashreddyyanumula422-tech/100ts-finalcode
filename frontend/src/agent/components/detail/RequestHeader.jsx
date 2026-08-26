import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { StatusPill } from "../ui";
import { displayId } from "../../utils/format";

export default function RequestHeader({ assignment: a }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate("/agent/dashboard")}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft size={14} /> Back to dashboard
      </button>

      <div className="bg-white rounded-xl ring-1 ring-slate-200/80 shadow-sm shadow-slate-200/40 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-medium text-slate-400">Request</p>
            <p className="text-[26px] leading-tight font-semibold text-slate-900 tabular-nums">
              {displayId(a)}
            </p>
            <p className="text-[13px] text-slate-500 mt-0.5">{a.applicant_name}</p>
          </div>
          <StatusPill status={a.status} label={a.status_label} size="lg" />
        </div>
      </div>
    </div>
  );
}
