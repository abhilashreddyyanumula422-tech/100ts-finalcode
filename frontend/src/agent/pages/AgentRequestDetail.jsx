import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAssignmentDetail, acceptAssignment, rejectAssignment, updateAssignmentStatus
} from "../../services/api";
import {
  ArrowLeft, Phone, Mail, Building2, User, CheckCircle2, XCircle,
  Loader2, ChevronRight, Send, AlertTriangle, FileText
} from "lucide-react";

const STATUS_ORDER = [
  "ASSIGNED_TO_AGENT", "ACCEPTED", "IN_PROGRESS",
  "DOCUMENTS_COLLECTED", "SUBMITTED_TO_UNIVERSITY", "COMPLETED"
];

const STATUS_LABELS = {
  ASSIGNED_TO_AGENT: "Assigned",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  DOCUMENTS_COLLECTED: "Documents Collected",
  SUBMITTED_TO_UNIVERSITY: "Submitted to University",
  COMPLETED: "Completed",
  REJECTED_BY_AGENT: "Rejected",
};

const NEXT_STATUS = {
  ACCEPTED: "IN_PROGRESS",
  IN_PROGRESS: "DOCUMENTS_COLLECTED",
  DOCUMENTS_COLLECTED: "SUBMITTED_TO_UNIVERSITY",
  SUBMITTED_TO_UNIVERSITY: "COMPLETED",
};

const NEXT_BUTTON_LABEL = {
  ACCEPTED: "🚶 Start: Mark In Progress",
  IN_PROGRESS: "📂 Collected Documents",
  DOCUMENTS_COLLECTED: "🏛️ Submitted to University",
  SUBMITTED_TO_UNIVERSITY: "✅ Mark as Completed",
};

function StepTracker({ currentStatus }) {
  const curr = STATUS_ORDER.indexOf(currentStatus);
  return (
    <div className="space-y-0">
      {STATUS_ORDER.map((step, i) => {
        const done = i < curr;
        const active = i === curr;
        const upcoming = i > curr;
        return (
          <div key={step} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 z-10 ${
                done ? "bg-blue-600 border-blue-600 text-white" :
                active ? "bg-white border-blue-500 text-blue-600 shadow-md" :
                "bg-white border-slate-200 text-slate-300"
              }`}>
                {done ? "✓" : i + 1}
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div className={`w-0.5 h-8 ${done ? "bg-blue-600" : "bg-slate-200"}`} />
              )}
            </div>
            <div className="pt-1.5 pb-4">
              <p className={`text-sm font-semibold ${
                active ? "text-blue-600" :
                done ? "text-slate-700" : "text-slate-300"
              }`}>
                {STATUS_LABELS[step]}
              </p>
              {active && currentStatus !== "COMPLETED" && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">Current</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AgentRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const agentStr = localStorage.getItem("agent");
  let agent = null;
  try { agent = agentStr ? JSON.parse(agentStr) : null; } catch {}
  const agentId = agent?.id;

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Progress update
  const [progressNote, setProgressNote] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAssignmentDetail(agentId, id);
      if (res.ok) {
        setAssignment(res.data);
      } else {
        setError("Assignment not found or access denied.");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [agentId, id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showMsg = (msg, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const res = await acceptAssignment(agentId, id);
      if (res.ok) {
        showMsg("✅ Assignment accepted successfully!");
        fetchData();
      } else {
        showMsg(res.data?.error || "Failed to accept", true);
      }
    } catch {
      showMsg("Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      setError("Rejection reason is mandatory.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await rejectAssignment(agentId, id, rejectReason);
      if (res.ok) {
        setShowRejectModal(false);
        showMsg("Assignment rejected. Admin has been notified.");
        fetchData();
      } else {
        showMsg(res.data?.error || "Failed to reject", true);
      }
    } catch {
      showMsg("Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!assignment) return;
    const nextStatus = NEXT_STATUS[assignment.status];
    if (!nextStatus) return;
    setActionLoading(true);
    try {
      const res = await updateAssignmentStatus(agentId, id, nextStatus, progressNote);
      if (res.ok) {
        showMsg(`✅ Status updated to ${STATUS_LABELS[nextStatus]}`);
        setProgressNote("");
        fetchData();
      } else {
        showMsg(res.data?.error || "Failed to update status", true);
      }
    } catch {
      showMsg("Network error", true);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="p-6 text-center text-red-500">
        <AlertTriangle size={36} className="mx-auto mb-2" />
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 hover:underline">← Go Back</button>
      </div>
    );
  }

  const a = assignment;
  const nextStatus = NEXT_STATUS[a?.status];
  const isCompleted = a?.status === "COMPLETED";
  const isRejected = a?.status === "REJECTED_BY_AGENT";

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      {/* Back */}
      <button
        onClick={() => navigate("/agent/dashboard")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase">Application</p>
            <p className="text-2xl font-black text-slate-800">{a.application_display_id}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
            isCompleted ? "bg-green-100 text-green-700" :
            isRejected ? "bg-red-100 text-red-700" :
            a.status === "ASSIGNED_TO_AGENT" ? "bg-yellow-100 text-yellow-700" :
            "bg-blue-100 text-blue-700"
          }`}>
            {STATUS_LABELS[a.status] || a.status}
          </span>
        </div>
      </div>

      {/* Applicant Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Applicant Details</h3>
        <div className="grid grid-cols-1 gap-2.5">
          <div className="flex items-center gap-3">
            <User size={16} className="text-blue-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Full Name</p>
              <p className="text-sm font-semibold text-slate-800">{a.applicant_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Phone</p>
              <p className="text-sm font-semibold text-slate-800">{a.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-purple-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm font-semibold text-slate-800">{a.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 size={16} className="text-orange-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">University / College</p>
              <p className="text-sm font-semibold text-slate-800">{a.university || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FileText size={16} className="text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Certificate Type</p>
              <p className="text-sm font-semibold text-slate-800 capitalize">{a.requirement}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Progress */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide mb-4">Progress</h3>
        {isRejected ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-bold text-red-700">You rejected this assignment</p>
            {a.agent_rejection_reason && (
              <p className="text-sm text-red-600 mt-1">Reason: {a.agent_rejection_reason}</p>
            )}
          </div>
        ) : (
          <StepTracker currentStatus={a.status} />
        )}
      </div>

      {/* Notes */}
      {a.progress_note && !isRejected && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <p className="text-xs text-slate-400 font-bold uppercase">Latest Note</p>
          <p className="text-sm text-slate-700 mt-1">{a.progress_note}</p>
        </div>
      )}

      {/* ACTIONS */}
      {!isCompleted && !isRejected && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Actions</h3>

          {/* Accept / Reject (only for newly assigned) */}
          {a.status === "ASSIGNED_TO_AGENT" && (
            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition disabled:opacity-60 shadow"
              >
                <CheckCircle2 size={18} /> Accept
              </button>
              <button
                onClick={() => { setShowRejectModal(true); setError(""); }}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 border border-red-200 transition disabled:opacity-60"
              >
                <XCircle size={18} /> Reject
              </button>
            </div>
          )}

          {/* Progress Update */}
          {nextStatus && a.status !== "ASSIGNED_TO_AGENT" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Progress Note (optional)</label>
                <textarea
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  placeholder="Add a progress note..."
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                />
              </div>
              <button
                onClick={handleUpdateStatus}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-60 shadow"
              >
                <Send size={16} />
                {NEXT_BUTTON_LABEL[a.status] || `Move to ${STATUS_LABELS[nextStatus]}`}
              </button>
            </div>
          )}
        </div>
      )}

      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <CheckCircle2 className="mx-auto text-green-500 mb-2" size={36} />
          <p className="font-bold text-green-700 text-lg">Assignment Completed!</p>
          {a.completed_at && (
            <p className="text-sm text-green-600 mt-1">{new Date(a.completed_at).toLocaleString()}</p>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
              <XCircle size={22} /> Reject Assignment
            </h2>
            <p className="text-sm text-slate-600">
              You are about to reject the assignment for <strong>{a.applicant_name}</strong>.
              The admin will be notified and can reassign the request.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                className="w-full border rounded-xl p-3 mt-1 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none"
                placeholder="Enter your reason for rejecting this assignment..."
                value={rejectReason}
                onChange={(e) => { setRejectReason(e.target.value); setError(""); }}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectReason(""); }}
                className="flex-1 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
                className="flex-1 py-2.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {actionLoading ? "Submitting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
