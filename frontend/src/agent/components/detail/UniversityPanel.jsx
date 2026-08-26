import React from "react";
import { Building2, MapPin, GraduationCap, Navigation } from "lucide-react";
import { Section, Field, ActionButton } from "../ui";
import { mapsUrl } from "../../utils/format";

export default function UniversityPanel({ assignment: a }) {
  const destination = a.route_to || a.college || a.university;
  return (
    <Section title="University" icon={<Building2 size={15} />} padded>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="University" value={a.university} icon={<Building2 size={14} />} />
        <Field label="College" value={a.college} icon={<GraduationCap size={14} />} />
        <Field label="Address" icon={<MapPin size={14} />} value={destination || "Not on file"} />
        {a.course && <Field label="Course" value={a.course} icon={<GraduationCap size={14} />} />}
      </div>

      {a.route_from && (
        <p className="text-[12px] text-slate-400 mt-3">
          Route · {a.route_from} → {destination || a.university}
        </p>
      )}

      <ActionButton href={mapsUrl(destination)} full size="md" icon={<Navigation size={14} />} className="mt-4">
        Navigate to campus
      </ActionButton>
    </Section>
  );
}
