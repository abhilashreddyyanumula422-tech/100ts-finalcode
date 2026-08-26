import React, { useState } from "react";
import { Landmark } from "lucide-react";
import { Section, Field, ActionButton } from "../ui";
import UniversityDecisionSection from "../UniversityDecisionSection";
import { DECISION_AMENDABLE } from "../../constants/workflow";

const TONE = {
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  ADDITIONAL_DOCS: "bg-amber-50 text-amber-700 ring-amber-200",
};

const LABEL = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ADDITIONAL_DOCS: "Additional documents",
};

export default function DecisionPanel({ assignment: a, agentId, assignmentId, onSaved }) {
  const [editing, setEditing] = useState(false);
  const d = a.decision_record;
  if (!d) return null;

  const canAmend = DECISION_AMENDABLE.includes(a.status);

  return (
    <Section
      title="University Decision"
      icon={<Landmark size={15} />}
      padded
      actions={
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ring-1 ring-inset ${TONE[d.decision] || "bg-slate-50 text-slate-600 ring-slate-200"}`}>
          {LABEL[d.decision] || d.decision}
        </span>
      }
    >
      {editing ? (
        <UniversityDecisionSection
          agentId={agentId}
          assignmentId={assignmentId}
          existing={d}
          onCancel={() => setEditing(false)}
          onDecisionSaved={() => { setEditing(false); onSaved?.(); }}
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Officer" value={d.officer_name} />
            <Field label="Reference number" value={d.university_reference_number} mono />
            <Field label="Accepted on" value={d.acceptance_date} />
            <Field label="Rejection reason" value={d.rejection_reason} />
            <Field label="Documents needed" value={d.required_documents} />
            <Field label="Deadline" value={d.deadline} />
          </div>

          {d.remarks && (
            <p className="mt-4 text-[13px] text-slate-600 bg-slate-50 ring-1 ring-inset ring-slate-200/70 rounded-lg px-3.5 py-3">
              {d.remarks}
            </p>
          )}

          {d.rejection_letter_url && (
            <a href={d.rejection_letter_url} target="_blank" rel="noopener noreferrer"
               className="inline-block mt-3 text-[12px] font-medium text-blue-600 hover:underline">
              View rejection letter
            </a>
          )}

          <div className="mt-4">
            {canAmend ? (
              <ActionButton variant="subtle" size="sm" onClick={() => setEditing(true)}>
                Correct this decision
              </ActionButton>
            ) : (
              <p className="text-[12px] text-slate-400">
                This request has moved past the university stage — the decision is locked.
              </p>
            )}
          </div>
        </>
      )}
    </Section>
  );
}
