import React from "react";
import { Link } from "react-router-dom";
import { CalendarClock, MapPin, Navigation, Building2 } from "lucide-react";
import { Section, EmptyState, ActionButton } from "../ui";
import { mapsUrl, shortDate } from "../../utils/format";

function VisitRow({ visit: v }) {
  return (
    <article className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-slate-900">
            {v.university || v.college || "University"}
          </p>
          <p className="text-[12px] text-slate-500 mt-0.5">
            {v.student}
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="tabular-nums">{v.application_display_id || "—"}</span>
          </p>
          {v.address && (
            <p className="text-[12px] text-slate-400 flex items-center gap-1.5 mt-1">
              <MapPin size={12} className="shrink-0" />{v.address}
            </p>
          )}
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset whitespace-nowrap ${
          v.scheduled ? "bg-violet-50 text-violet-700 ring-violet-200"
                      : "bg-slate-50 text-slate-500 ring-slate-200"
        }`}>
          {v.scheduled ? shortDate(v.visit_date) : "Not scheduled"}
          {v.visit_time ? ` · ${v.visit_time}` : ""}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-[12px]">
        {[
          ["Documents", v.documents],
          ["Officer", v.officer_name],
          ["Department", v.department],
          ["Reference", v.reference_number],
        ].filter(([, val]) => val).map(([k, val]) => (
          <div key={k} className="flex gap-1.5 min-w-0">
            <dt className="text-slate-400 shrink-0">{k}</dt>
            <dd className="font-medium text-slate-700 truncate capitalize">{val}</dd>
          </div>
        ))}
      </dl>

      <div className="flex gap-2">
        <ActionButton as={Link} to={`/agent/requests/${v.assignment_id}`} variant="subtle" size="sm">
          View details
        </ActionButton>
        <ActionButton href={mapsUrl(v.address || v.university)} size="sm" icon={<Navigation size={12} />}>
          Navigate
        </ActionButton>
      </div>
    </article>
  );
}

export default function UniversityVisits({ visits = [] }) {
  return (
    <Section
      title="University Visits"
      subtitle="Campus work, scheduled and pending"
      icon={<CalendarClock size={15} />}
      count={visits.length}
    >
      {visits.length ? (
        <div className="divide-y divide-slate-100">
          {visits.map((v) => <VisitRow key={v.assignment_id} visit={v} />)}
        </div>
      ) : (
        <EmptyState icon={<Building2 size={28} />} title="No university visits scheduled" />
      )}
    </Section>
  );
}
