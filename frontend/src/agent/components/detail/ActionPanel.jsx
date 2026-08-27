import React, { useState } from "react";
import { Zap, CheckCircle2, XCircle, ArrowRight, Upload, AlertCircle } from "lucide-react";
import { Section, ActionButton, Banner } from "../ui";
import { statusLabel } from "../../constants/workflow";
import { acceptAssignment, rejectAssignment, updateAssignmentStatus, submitUniversityDecision, addLogistics, resolveIssue, API_BASE_URL } from "../../../services/api";

export default function ActionPanel({ assignment: a, agentId, assignmentId, onChanged, onNotify }) {
  const [busy, setBusy] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  const [showIssue, setShowIssue] = useState(false);
  const [issueText, setIssueText] = useState("");
  const [requiredDocs, setRequiredDocs] = useState("");
  
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

  const handleResolveIssue = async () => {
    setBusy(true);
    try {
      const res = await resolveIssue(agentId, assignmentId);
      if (res.ok) {
        onNotify?.("Issue marked as resolved");
        onChanged?.();
      } else {
        onNotify?.(res.data?.error || "Failed to resolve issue", true);
      }
    } catch {
      onNotify?.("Network error", true);
    } finally {
      setBusy(false);
    }
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
        {a.status === "ADDITIONAL_DOC_REQUIRED" && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-[13px] text-slate-700">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold mb-2 text-[14px]">
              <AlertCircle size={16} className="text-amber-600" />
              <span>Active Issue / Action Required</span>
            </div>
            <div className="space-y-2">
              {a.active_issue ? (
                <>
                  <p><strong>Problem Raised:</strong> "{a.active_issue.message}"</p>
                  {a.active_issue.required_documents && a.active_issue.required_documents.length > 0 && (
                    <p><strong>Requested documents:</strong> {a.active_issue.required_documents.join(", ")}</p>
                  )}
                  
                  {a.active_issue.status === 'USER_RESPONDED' ? (
                    <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 mt-2 space-y-2">
                      <p className="text-emerald-950 font-bold">🟢 User Response Received:</p>
                      <p className="text-slate-800 italic">"{a.active_issue.user_response || 'No message provided.'}"</p>
                      
                      {a.active_issue.documents && a.active_issue.documents.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold text-slate-700 mb-1">Submitted Documents:</p>
                          <div className="flex flex-wrap gap-2">
                            {a.active_issue.documents.map((doc, idx) => (
                              <a
                                key={idx}
                                href={doc.url.startsWith("http") ? doc.url : `${API_BASE_URL}${doc.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200 hover:bg-blue-100 px-2 py-1 rounded-md transition"
                              >
                                📄 {doc.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <ActionButton variant="success" full loading={busy} onClick={handleResolveIssue}>
                          Received & Continue Next Process
                        </ActionButton>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-amber-200/50 space-y-3">
                      <p className="text-amber-700 font-medium italic flex items-center gap-1">
                        ⏳ Waiting for student response...
                      </p>
                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <p className="text-[12px] text-slate-500 mb-2">If you received the corrected details directly via WhatsApp or Email, click below to proceed:</p>
                        <ActionButton variant="success" full loading={busy} onClick={handleResolveIssue}>
                          Received & Continue Next Process
                        </ActionButton>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="pt-2 space-y-2">
                  <p className="text-amber-700 font-medium italic flex items-center gap-1">
                    ⏳ Waiting for student response...
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-[12px] text-slate-500 mb-2">Click below to resolve the issue manually and continue processing:</p>
                    <ActionButton variant="success" full loading={busy} onClick={handleResolveIssue}>
                      Received & Continue Next Process
                    </ActionButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
            <textarea value={issueText} onChange={e => setIssueText(e.target.value)} placeholder="Describe the issue (e.g. passport copy is blur)..." className="w-full rounded-lg ring-1 ring-amber-200 px-3 py-2 text-[13px] mb-2 resize-none" rows={2} />
            <input type="text" value={requiredDocs} onChange={e => setRequiredDocs(e.target.value)} placeholder="Required documents (comma separated, e.g. Passport, CMM)" className="w-full rounded-lg ring-1 ring-amber-200 px-3 py-2 text-[13px] mb-3" />
            <div className="flex gap-2">
              <ActionButton variant="accent" full loading={busy} onClick={() => run(() => updateAssignmentStatus(agentId, assignmentId, "ADDITIONAL_DOC_REQUIRED", issueText, requiredDocs), "Issue reported").then(() => { setShowIssue(false); setIssueText(""); setRequiredDocs(""); })}>Submit Issue</ActionButton>
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
