import React from "react";
import { Truck, ExternalLink } from "lucide-react";
import { Section, Field, ActionButton } from "../ui";

export default function DeliveryPanel({ assignment: a }) {
  if (!a.courier_partner && !a.tracking_id) return null;
  return (
    <Section title="Delivery" icon={<Truck size={15} />} padded>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Courier partner" value={a.courier_partner} />
        <Field label="Tracking ID" value={a.tracking_id} mono />
      </div>
      {a.tracking_url && (
        <ActionButton href={a.tracking_url} variant="subtle" size="sm"
                      icon={<ExternalLink size={12} />} className="mt-4">
          Track shipment
        </ActionButton>
      )}
    </Section>
  );
}
