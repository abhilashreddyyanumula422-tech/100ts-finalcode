import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Layers, ChevronRight, FileSearch } from "lucide-react";
import { Section, EmptyState, StatusPill } from "../ui";
import { displayId } from "../../utils/format";
import { ASSIGNED_STATES, FIELD_STATES, DELIVERY_STATES } from "../../constants/workflow";

const TABS = [
  { key: "all",      label: "All",      match: null },
  { key: "assigned", label: "Assigned", match: ASSIGNED_STATES },
  { key: "field",    label: "Field",    match: FIELD_STATES },
  { key: "delivery", label: "Delivery", match: ["APPROVED", ...DELIVERY_STATES] },
];

export default function ActiveRequests({ requests = [] }) {
  const [tab, setTab] = useState("all");

  const rows = useMemo(() => {
    const t = TABS.find((x) => x.key === tab);
    return t?.match ? requests.filter((r) => t.match.includes(r.status)) : requests;
  }, [requests, tab]);

  const tabs = (
    <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
            tab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <Section title="Active Requests" icon={<Layers size={15} />} count={rows.length} actions={tabs}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] font-medium text-slate-400 border-b border-slate-100">
                <th className="px-5 py-2.5">Request</th>
                <th className="px-3 py-2.5">Student</th>
                <th className="px-3 py-2.5">University</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition">
                  <td className="px-5 py-3 font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {displayId(r)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{r.applicant_name}</td>
                  <td className="px-3 py-3 text-slate-500 max-w-[220px] truncate" title={r.university}>
                    {r.university || "—"}
                  </td>
                  <td className="px-3 py-3"><StatusPill status={r.status} label={r.status_label} /></td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to={`/agent/requests/${r.id}`}
                      className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      View <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<FileSearch size={28} />} title="No requests in this view" />
      )}
    </Section>
  );
}
