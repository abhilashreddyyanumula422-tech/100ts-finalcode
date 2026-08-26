import React, { useState } from "react";
import { Zap, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Section, ActionButton, Banner } from "../ui";
import { nextActionFor, statusLabel } from "../../constants/workflow";
import { acceptAssignment, rejectAssignment, updateAssignmentStatus } from "../../../services/api";
import UniversityVisitSection from "../UniversityVisitSection";
import UniversityDecisionSection from "../UniversityDecisionSection";
import DocumentUpload from "./DocumentUpload";
import LogisticsForm from "./LogisticsForm";
import RejectDialog from "./RejectDialog";

/** Everything the agent can DO right now — and nothing they can't. */
export default function ActionPanel({ assignment: a, agentId, assignmentId, onChanged, onNotify }) {
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [note, setNote] = useState("");

  const next = nextActionFor(a);
  const form = a.action_form;

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res.ok) { onNotify?.(successMsg); setNote(""); onChanged?.(); }
      else onNotify?.(res.data?.error || "That didn't work.", true);
    } catch { onNotify?.("Network error.", true); }
    finally { setBusy(false); }
  };

  if (a.status === "COMPLETED") {
    return (
      <Section padded>
        <div className="text-center py-4">
          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
          <p className="text-[15px] font-semibold text-slate-900">Assignment completed</p>
          {a.completed_at && (
            <p className="text-[12px] text-slate-500 mt-1">
              {new Date(a.completed_at).toLocaleString()}
            </p>
          )}
        </div>
      </Section>
    );
  }

  if (a.status === "REJECTED_BY_AGENT") {
    return (
      <Section padded>
        <Banner tone="danger">
          You rejected this assignment.
          {a.agent_rejection_reason ? ` Reason: ${a.agent_rejection_reason}` : ""}
        </Banner>
      </Section>
    );
  }

  const NoteField = (
    <div>
      <label className="text-[11px] font-semibold text-slate-500">Progress note (optional)</label>
      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything worth recording…"
        className="w-full mt-1 rounded-lg ring-1 ring-inset ring-slate-200 px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-400 resize-none"
      />
    </div>
  );

  const AdvanceButton = next && (
    <ActionButton
      variant="accent" full loading={busy} icon={<ArrowRight size={14} />}
      onClick={() => run(
        () => updateAssignmentStatus(agentId, assignmentId, next.status, note),
        `Moved to ${statusLabel(next.status)}`,
      )}
    >
      {next.label}
    </ActionButton>
  );

  return (
    <>
      <Section title="Next Action" icon={<Zap size={15} />} padded>
        <div className="space-y-4">
          {form === "ACCEPT_REJECT" && (
            <>
              <Banner tone="warning">Accept this assignment to start work, or reject it for the admin to reassign.</Banner>
              <div className="flex gap-2">
                <ActionButton variant="success" full loading={busy} icon={<CheckCircle2 size={15} />}
                  onClick={() => run(() => acceptAssignment(agentId, assignmentId), "Assignment accepted")}>
                  Accept
                </ActionButton>
                <ActionButton variant="dangerSubtle" full disabled={busy} icon={<XCircle size={15} />}
                  onClick={() => setShowReject(true)}>
                  Reject
                </ActionButton>
              </div>
            </>
          )}

          {form === "VISIT" && (
            <>
              <UniversityVisitSection agentId={agentId} assignmentId={assignmentId} onVisitSaved={onChanged} />
              {NoteField}
              {AdvanceButton}
            </>
          )}

          {form === "UPLOAD" && (
            <>
              <DocumentUpload agentId={agentId} assignmentId={assignmentId}
                              existingUrl={a.collected_document_url} onUploaded={onChanged} />
              {NoteField}
              {AdvanceButton}
            </>
          )}

          {form === "DECISION" && !a.decision_record && (
            <UniversityDecisionSection agentId={agentId} assignmentId={assignmentId} onDecisionSaved={onChanged} />
          )}

          {form === "LOGISTICS" && (
            <LogisticsForm agentId={agentId} assignmentId={assignmentId} assignment={a} onSaved={onChanged} />
          )}

          {!form && next && (<>{NoteField}{AdvanceButton}</>)}

          {!form && !next && (
            <p className="text-[13px] text-slate-500">Nothing to do at this stage.</p>
          )}
        </div>
      </Section>

      {showReject && (
        <RejectDialog
          studentName={a.applicant_name}
          busy={busy}
          onCancel={() => setShowReject(false)}
          onConfirm={(reason) =>
            run(() => rejectAssignment(agentId, assignmentId, reason), "Assignment rejected — admin notified")
              .then(() => setShowReject(false))
          }
        />
      )}
    </>
  );
}
