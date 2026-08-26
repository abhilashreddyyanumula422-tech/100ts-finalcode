import React, { useState, useEffect, useCallback } from "react";
import {
  UserCheck, Zap, MapPin, Briefcase, BarChart2, RefreshCw, CheckCircle, XCircle, X
} from "lucide-react";
import {
  getEligibleAgents, assignAgent, autoAssignAgent, getApplicationAssignment
} from "../../services/api";

const STATUS_LABELS = {
  ASSIGNED_TO_AGENT: { label: "Assigned to Agent", color: "bg-yellow-100 text-yellow-700" },
  ACCEPTED: { label: "Accepted", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "In Progress", color: "bg-indigo-100 text-indigo-700" },
  DOCUMENTS_COLLECTED: { label: "Documents Collected", color: "bg-cyan-100 text-cyan-700" },
  SUBMITTED_TO_UNIVERSITY: { label: "Submitted to University", color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700" },
  REJECTED_BY_AGENT: { label: "Rejected by Agent", color: "bg-red-100 text-red-700" },
};

/**
 * AgentAssignmentPanel — shown inside the Student Requests detail panel
 * Only visible when application is approved AND payment is Paid.
 */
export default function AgentAssignmentPanel({ application }) {
  const [agents, setAgents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success"); // or "error"
  const [selectedManualAgent, setSelectedManualAgent] = useState("");
  const [showAssignmentOptions, setShowAssignmentOptions] = useState(false);

  const appId = application?.raw_id;

  const fetchData = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    try {
      const [agentsRes, assignmentRes] = await Promise.all([
        getEligibleAgents(appId),
        getApplicationAssignment(appId),
      ]);
      if (agentsRes.ok) setAgents(agentsRes.data);
      if (assignmentRes.ok) setAssignments(assignmentRes.data?.assignments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const showMsg = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleAssign = async (agentId, agentName) => {
    if (!window.confirm(`Assign "${agentName}" to this application?`)) return;
    setAssigning(true);
    try {
      const res = await assignAgent(appId, agentId);
      if (res.ok) {
        showMsg(`✅ ${agentName} assigned successfully`);
        fetchData();
      } else {
        showMsg(res.data?.error || "Failed to assign agent", "error");
      }
    } catch {
      showMsg("Network error", "error");
    } finally {
      setAssigning(false);
    }
  };

  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      const res = await autoAssignAgent(appId);
      if (res.ok) {
        showMsg(`✅ ${res.data.message}`);
        fetchData();
      } else {
        showMsg(res.data?.error || "Auto-assign failed", "error");
      }
    } catch {
      showMsg("Network error", "error");
    } finally {
      setAutoAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 pt-6 border-t border-slate-100">
        <p className="text-sm text-slate-400 text-center py-4">Loading agent data...</p>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
      <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
        <UserCheck size={18} className="text-blue-600" /> Agent Assignment
      </h3>

      {/* Message */}
      {message && (
        <div className={`rounded-xl px-4 py-2 text-sm font-medium ${
          messageType === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message}
        </div>
      )}

      {/* Current Assignments */}
      {assignments.length > 0 && (
        <div className="space-y-4">
          {assignments.map((assignment, idx) => {
            const assignmentStatus = assignment.status;
            const assignedAgent = assignment.agent;
            const statusInfo = assignmentStatus ? STATUS_LABELS[assignmentStatus] : null;
            
            return (
              <div key={assignment.id || idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Assigned Agent</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">{assignedAgent?.name || "—"}</p>
                    <p className="text-sm text-slate-500">{assignedAgent?.location || "—"} • {assignedAgent?.experience} yrs exp</p>
                  </div>
                  {statusInfo && (
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  )}
                </div>
                {assignment.progress_note && (
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-xs text-slate-400 font-semibold">Latest Update</p>
                    <p className="text-sm text-slate-700 mt-0.5">{assignment.progress_note}</p>
                  </div>
                )}
                {assignment.accepted_at && (
                  <p className="text-xs text-slate-400">
                    Accepted: {new Date(assignment.accepted_at).toLocaleString()}
                  </p>
                )}
                {assignmentStatus === "REJECTED_BY_AGENT" && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-2">
                    <p className="text-sm font-bold text-red-700">⚠️ Agent Rejected this Assignment</p>
                    <p className="text-sm text-red-600 mt-1">Reason: {assignment.agent_rejection_reason || "—"}</p>
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={fetchData}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} /> Refresh Status
            </button>
            <button
              onClick={() => setShowAssignmentOptions(!showAssignmentOptions)}
              className="text-xs text-purple-600 font-bold hover:underline"
            >
              {showAssignmentOptions ? "Cancel" : "Assign Another Agent"}
            </button>
          </div>
        </div>
      )}

      {(assignments.length === 0 || showAssignmentOptions) && (
        <>

          {/* Auto Assign */}
          <button
            onClick={handleAutoAssign}
            disabled={autoAssigning}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2.5 rounded-xl font-bold text-sm shadow hover:opacity-90 transition disabled:opacity-60"
          >
            <Zap size={16} /> {autoAssigning ? "Auto-assigning..." : "⚡ Auto-Assign Best Agent"}
          </button>

          <p className="text-xs text-slate-400 text-center">— or select manually —</p>

          {/* Manual Select Box */}
          <div className="flex flex-col gap-2 mt-2">
            {agents.length === 0 ? (
              <select
                disabled
                className="w-full border border-slate-200 rounded-xl p-3 outline-none bg-slate-50 text-slate-400 text-sm cursor-not-allowed"
              >
                <option>No active agents available</option>
              </select>
            ) : (
              <select
                className="w-full border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                value={selectedManualAgent}
                onChange={(e) => setSelectedManualAgent(e.target.value)}
              >
                <option value="">-- Select an Agent --</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.location || "N/A"}) - {a.current_workload} active tasks
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => {
                const agent = agents.find(a => a.id.toString() === selectedManualAgent.toString());
                if (agent) {
                  handleAssign(agent.id, agent.name);
                }
              }}
              disabled={!selectedManualAgent || assigning || agents.length === 0}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-900 transition disabled:opacity-50"
            >
              Assign Selected Agent
            </button>
          </div>
        </>
      )}
    </div>
  );
}
