import React, { useState } from "react";
import { Zap, CheckCircle2, XCircle, ArrowRight, Upload, AlertCircle } from "lucide-react";
import { Section, ActionButton, Banner } from "../ui";
import { statusLabel } from "../../constants/workflow";
import { acceptAssignment, rejectAssignment, updateAssignmentStatus, submitUniversityDecision, addLogistics } from "../../../services/api";

export default function ActionPanel({ assignment: a, agentId, assignmentId, onChanged, onNotify }) {
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  const [showIssue, setShowIssue] = useState(false);
  const [issueText, setIssueText] = useState("");
  
  const [showDocs, setShowDocs] = useState(false);
  const [refNum, setRefNum] = useState("");
  
  const [showLogistics, setShowLogistics] = useState(false);
  const [tracking, setTracking] = useState("");

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res.ok) { onNotify?.(successMsg); onChanged?.(); }
      else onNotify?.(res.data?.error || "That didn't work.", true);
    } catch { onNotify?.("Network error.", true); }
    finally { setBusy(false); }
  };

  const advance = (newStatus, msg) => run(
    () => updateAssignmentStatus(agentId, assignmentId, newStatus, ""),
    msg || `Moved to ${statusLabel(newStatus)}`
  );
  
  // Fast-forward through intermediate states if needed
  const fastForward = async (sequence, msg) => {
    setBusy(true);
    try {
      for (const st of sequence) {
        const res = await updateAssignmentStatus(agentId, assignmentId, st, "");
        if (!res.ok) throw new Error(res.data?.error || "Failed");
      }
      onNotify?.(msg);
      onChanged?.();
    } catch (e) {
      onNotify?.(e.message || "Network error.", true);
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!refNum) return onNotify?.("Reference number required", true);
    setBusy(true);
    const fd = new FormData();
    fd.append("decision", "APPROVED");
    fd.append("university_reference_number", refNum);
    fd.append("officer_name", "Agent");
    fd.append("remarks", "Approved automatically via minimal UI");
    try {
      const res = await submitUniversityDecision(agentId, assignmentId, fd);
      if (res.ok) { onNotify?.("University Approved"); setShowDocs(false); onChanged?.(); }
      else onNotify?.(res.data?.error || "Failed", true);
    } catch { onNotify?.("Network error", true); }
    finally { setBusy(false); }
  };

  const handleStartDelivery = async () => {
    if (!tracking) return onNotify?.("Tracking ID required", true);
    setBusy(true);
    try {
      const res = await addLogistics(agentId, assignmentId, "Delhivery", tracking);
      if (res.ok) {
        // Fast forward to PICKED_UP
        await updateAssignmentStatus(agentId, assignmentId, "PICKED_UP", "");
        onNotify?.("Delivery assigned & picked up"); 
        setShowLogistics(false); 
        onChanged?.();
      }
      else onNotify?.(res.data?.error || "Failed", true);
    } catch { onNotify?.("Network error", true); }
    finally { setBusy(false); }
  };

  if (a.status === "COMPLETED") {
    return (
      <Section padded>
        <div className="text-center py-6">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-[16px] font-bold text-slate-900">Assignment Completed!</p>
          <p className="text-[13px] text-slate-500 mt-1">Great job, you've finished all required tasks for this request.</p>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Next Action" icon={<Zap size={15} />} padded>
      <div className="space-y-4">
        
        {/* ASSIGNMENT STAGE */}
        {a.status === "ASSIGNED_TO_AGENT" && (
          <div className="flex gap-3">
            <ActionButton variant="success" full loading={busy} onClick={() => run(() => acceptAssignment(agentId, assignmentId), "Assignment accepted")}>
              Accept Assignment
            </ActionButton>
            <ActionButton variant="dangerSubtle" full disabled={busy} onClick={() => setShowReject(true)}>
              Reject
            </ActionButton>
          </div>
        )}

        {a.status === "ACCEPTED" && (
          <ActionButton variant="accent" full loading={busy} onClick={() => advance("IN_PROGRESS", "Started college visit")}>
            Start College Visit
          </ActionButton>
        )}

        {/* UNIVERSITY STAGE */}
        {a.status === "IN_PROGRESS" && (
          <ActionButton variant="accent" full loading={busy} onClick={() => fastForward(["DOCUMENTS_COLLECTED", "SUBMITTED_TO_UNIVERSITY"], "Documents verified & submitted")}>
            Documents Verified & Submitted to University
          </ActionButton>
        )}

        {a.status === "SUBMITTED_TO_UNIVERSITY" && !showDocs && (
          <div className="flex gap-3">
            <ActionButton variant="success" full disabled={busy} onClick={() => setShowDocs(true)}>
              Approve
            </ActionButton>
            <ActionButton variant="dangerSubtle" full disabled={busy} onClick={() => setShowReject(true)}>
              Reject
            </ActionButton>
            <ActionButton variant="dangerSubtle" full disabled={busy} onClick={() => setShowIssue(true)}>
              Report Issue
            </ActionButton>
          </div>
        )}

        {/* DELIVERY STAGE */}
        {a.status === "APPROVED" && !showLogistics && (
          <ActionButton variant="accent" full disabled={busy} onClick={() => setShowLogistics(true)}>
            Start Delivery Process
          </ActionButton>
        )}

        {(a.status === "PICKED_UP" || a.status === "OUT_FOR_DELIVERY") && (
          <ActionButton variant="accent" full loading={busy} onClick={() => advance("DELIVERED", "Marked as delivered")}>
            Mark Delivered
          </ActionButton>
        )}

        {a.status === "DELIVERED" && (
          <ActionButton variant="success" full loading={busy} onClick={() => advance("COMPLETED", "Assignment finished")}>
            Complete Assignment
          </ActionButton>
        )}

        {/* MINIMAL INLINE FORMS */}
        {showDocs && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
            <p className="text-[13px] font-bold mb-2">University Reference Number</p>
            <input type="text" value={refNum} onChange={e => setRefNum(e.target.value)} placeholder="e.g. REF-123" className="w-full rounded-lg ring-1 ring-slate-200 px-3 py-2 text-[13px] mb-3" />
            <div className="flex gap-2">
              <ActionButton variant="success" full loading={busy} onClick={handleApprove}>Confirm Approval</ActionButton>
              <ActionButton variant="dangerSubtle" full disabled={busy} onClick={() => setShowDocs(false)}>Cancel</ActionButton>
            </div>
          </div>
        )}

        {showLogistics && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2">
            <p className="text-[13px] font-bold mb-2">Tracking ID (Delhivery)</p>
            <input type="text" value={tracking} onChange={e => setTracking(e.target.value)} placeholder="e.g. DL1234567890" className="w-full rounded-lg ring-1 ring-slate-200 px-3 py-2 text-[13px] mb-3" />
            <div className="flex gap-2">
              <ActionButton variant="accent" full loading={busy} onClick={handleStartDelivery}>Save & Mark Picked Up</ActionButton>
              <ActionButton variant="dangerSubtle" full disabled={busy} onClick={() => setShowLogistics(false)}>Cancel</ActionButton>
            </div>
          </div>
        )}

        {showReject && (
          <div className="bg-red-50 p-4 rounded-xl border border-red-200 mt-2">
            <p className="text-[13px] font-bold text-red-800 mb-2">Reason for Rejection</p>
            <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Brief reason..." className="w-full rounded-lg ring-1 ring-red-200 px-3 py-2 text-[13px] mb-3" />
            <div className="flex gap-2">
              <ActionButton variant="danger" full loading={busy} onClick={() => run(() => rejectAssignment(agentId, assignmentId, rejectReason), "Assignment rejected").then(() => setShowReject(false))}>Confirm Reject</ActionButton>
              <ActionButton variant="dangerSubtle" full disabled={busy} onClick={() => setShowReject(false)}>Cancel</ActionButton>
            </div>
          </div>
        )}

        {showIssue && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mt-2">
            <p className="text-[13px] font-bold text-amber-800 mb-2">Report Issue</p>
            <textarea value={issueText} onChange={e => setIssueText(e.target.value)} placeholder="Describe the issue..." className="w-full rounded-lg ring-1 ring-amber-200 px-3 py-2 text-[13px] mb-3 resize-none" rows={2} />
            <div className="flex gap-2">
              <ActionButton variant="accent" full loading={busy} onClick={() => run(() => updateAssignmentStatus(agentId, assignmentId, "ADDITIONAL_DOC_REQUIRED", issueText), "Issue reported").then(() => setShowIssue(false))}>Submit Issue</ActionButton>
              <ActionButton variant="dangerSubtle" full disabled={busy} onClick={() => setShowIssue(false)}>Cancel</ActionButton>
            </div>
          </div>
        )}
        
        {/* FALLBACK FOR UNHANDLED STATES */}
        {!["ASSIGNED_TO_AGENT", "ACCEPTED", "IN_PROGRESS", "SUBMITTED_TO_UNIVERSITY", "APPROVED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"].includes(a.status) && !showDocs && !showLogistics && !showReject && !showIssue && (
          <p className="text-[13px] text-slate-500 text-center py-2">Waiting for next steps or updates...</p>
        )}
      </div>
    </Section>
  );
}
