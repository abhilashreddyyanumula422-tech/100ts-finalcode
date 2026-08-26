import React from "react";
import { Activity, History } from "lucide-react";
import { Section, EmptyState } from "../ui";
import { timeAgo } from "../../utils/format";

const dotFor = (status = "") => {
  if (status.includes("REJECT")) return "bg-rose-500";
  if (["COMPLETED", "DELIVERED", "APPROVED"].includes(status)) return "bg-emerald-500";
  return "bg-blue-500";
};

export default function RecentActivity({ activity = [] }) {
  return (
    <Section title="Recent Activity" icon={<Activity size={15} />}>
      {activity.length ? (
        <ol className="relative">
          {activity.map((a, i) => (
            <li key={a.id} className="flex gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
              <div className="flex flex-col items-center pt-1">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotFor(a.status)}`} />
                {i < activity.length - 1 && <span className="w-px flex-1 bg-slate-100 mt-1.5" />}
              </div>
              <div className="min-w-0 flex-1 pb-0.5">
                <p className="text-[13px] font-medium text-slate-800">{a.status_label}</p>
                {a.description && <p className="text-[12px] text-slate-500 mt-0.5">{a.description}</p>}
                <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                  {a.application_display_id || `#${a.application_id}`}
                  <span className="mx-1.5 text-slate-300">·</span>
                  {timeAgo(a.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState icon={<History size={28} />} title="No activity recorded yet" />
      )}
    </Section>
  );
}
