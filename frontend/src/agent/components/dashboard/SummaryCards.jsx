import React from "react";
import { Inbox, Loader2, FolderCheck, CheckCircle2 } from "lucide-react";
import { StatCard } from "../ui";

const CARDS = [
  { key: "assigned",    label: "Assigned Requests",   accent: "amber",   icon: <Inbox size={14} /> },
  { key: "in_progress", label: "In Progress",         accent: "blue",    icon: <Loader2 size={14} /> },
  { key: "collected",   label: "Documents Collected", accent: "violet",  icon: <FolderCheck size={14} /> },
  { key: "completed",   label: "Completed",           accent: "emerald", icon: <CheckCircle2 size={14} /> },
];

export default function SummaryCards({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map((c) => (
        <StatCard
          key={c.key}
          label={c.label}
          value={stats?.[c.key]}
          accent={c.accent}
          icon={c.icon}
          note={
            c.key === "assigned" && stats?.pending_acceptance > 0
              ? `${stats.pending_acceptance} awaiting acceptance`
              : null
          }
        />
      ))}
    </div>
  );
}
