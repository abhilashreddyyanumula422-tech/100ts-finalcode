import React from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, Building2, FileText, Navigation, MessageCircle, CheckCircle2 } from "lucide-react";
import { Section, EmptyState, StatusPill, ActionButton } from "../ui";
import { mapsUrl, whatsappUrl, greetingFor, displayId } from "../../utils/format";
import { nextActionFor } from "../../constants/workflow";

function TaskRow({ task }) {
  const next = nextActionFor(task);
  const route = [task.route_from, task.route_to].filter(Boolean).join(" → ");
  const ref = displayId(task);

  return (
    <article className="p-5 space-y-3.5">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-semibold text-slate-900 tabular-nums">{ref}</span>
            <StatusPill status={task.status} label={task.status_label} />
            {task.status === "ASSIGNED_TO_AGENT" && (
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200 px-2 py-0.5 rounded-full">
                Needs response
              </span>
            )}
            {task.is_overdue && (
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 px-2 py-0.5 rounded-full">
                Overdue
              </span>
            )}
          </div>

          <p className="text-[15px] font-semibold text-slate-900 mt-2">{task.applicant_name}</p>

          <div className="mt-1.5 space-y-1 text-[12px] text-slate-500">
            <p className="flex items-center gap-1.5">
              <Building2 size={12} className="shrink-0 text-slate-300" />
              {task.university || task.college || "University not set"}
            </p>
            {route && (
              <p className="flex items-center gap-1.5">
                <MapPin size={12} className="shrink-0 text-slate-300" />{route}
              </p>
            )}
            {task.requirement && (
              <p className="flex items-center gap-1.5 capitalize">
                <FileText size={12} className="shrink-0 text-slate-300" />{task.requirement}
              </p>
            )}
          </div>
        </div>
      </div>

      {next && (
        <p className="text-[12px] text-slate-600 bg-slate-50 ring-1 ring-inset ring-slate-200/70 rounded-lg px-3 py-2">
          <span className="text-slate-400 font-medium">Next step</span>
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="font-semibold text-slate-800">{next.label}</span>
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <ActionButton as={Link} to={`/agent/requests/${task.id}`} variant="primary" size="sm">
          View request
        </ActionButton>
        <ActionButton href={mapsUrl(task.route_to || task.university)} size="sm" icon={<Navigation size={13} />}>
          Navigate
        </ActionButton>
        <ActionButton
          href={whatsappUrl(task.phone, greetingFor(task.applicant_name, ref))}
          size="sm"
          icon={<MessageCircle size={13} />}
        >
          Contact
        </ActionButton>
      </div>
    </article>
  );
}

export default function TodayTasks({ tasks = [] }) {
  return (
    <Section
      title="Today's Tasks"
      subtitle="What needs your hands first"
      icon={<Clock size={15} />}
      count={tasks.length}
    >
      {tasks.length ? (
        <div className="divide-y divide-slate-100">
          {tasks.map((t) => <TaskRow key={t.id} task={t} />)}
        </div>
      ) : (
        <EmptyState icon={<CheckCircle2 size={28} />} title="Nothing needs your hands today"
                    hint="New assignments will appear here as soon as they arrive." />
      )}
    </Section>
  );
}
