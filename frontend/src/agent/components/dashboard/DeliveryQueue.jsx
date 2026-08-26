import React from "react";
import { Link } from "react-router-dom";
import { Package, Truck, ExternalLink } from "lucide-react";
import { Section, EmptyState, StatusPill, ActionButton } from "../ui";

function DeliveryRow({ item: d }) {
  return (
    <article className="p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px]">
          <span className="font-semibold text-slate-900 tabular-nums">{d.application_display_id || "—"}</span>
          <span className="mx-2 text-slate-300">·</span>
          <span className="text-slate-600">{d.student}</span>
        </p>
        <StatusPill status={d.status} label={d.status_label} />
      </div>

      <dl className="grid sm:grid-cols-3 gap-x-5 gap-y-1.5 text-[12px]">
        <div className="flex gap-1.5">
          <dt className="text-slate-400">Documents</dt>
          <dd>
            {d.collected_document_url ? (
              <a href={d.collected_document_url} target="_blank" rel="noopener noreferrer"
                 className="font-semibold text-emerald-600 hover:underline">Collected</a>
            ) : (
              <span className="font-medium text-slate-400">Not uploaded</span>
            )}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-slate-400">Courier</dt>
          <dd className="font-medium text-slate-700">{d.courier_partner || "Not assigned"}</dd>
        </div>
        <div className="flex gap-1.5 min-w-0">
          <dt className="text-slate-400">Tracking</dt>
          <dd className="font-mono font-medium text-slate-700 truncate">{d.tracking_id || "—"}</dd>
        </div>
      </dl>

      <div className="flex gap-2">
        <ActionButton as={Link} to={`/agent/requests/${d.assignment_id}`} variant="subtle" size="sm">
          {d.tracking_id ? "Open request" : "Add courier details"}
        </ActionButton>
        {d.tracking_url && (
          <ActionButton href={d.tracking_url} size="sm" icon={<ExternalLink size={12} />}>
            Track shipment
          </ActionButton>
        )}
      </div>
    </article>
  );
}

export default function DeliveryQueue({ deliveries = [] }) {
  return (
    <Section
      title="Delivery / Courier"
      subtitle="Dispatch and tracking"
      icon={<Package size={15} />}
      count={deliveries.length}
    >
      {deliveries.length ? (
        <div className="divide-y divide-slate-100">
          {deliveries.map((d) => <DeliveryRow key={d.assignment_id} item={d} />)}
        </div>
      ) : (
        <EmptyState icon={<Truck size={28} />} title="Nothing out for delivery yet" />
      )}
    </Section>
  );
}
