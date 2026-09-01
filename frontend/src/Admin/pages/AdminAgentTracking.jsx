import React, { useState, useEffect, useCallback } from "react";
import { Activity, RefreshCw, Search, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { getAllAssignments } from "../../services/api";

const STATUS_CONFIG = {
  ASSIGNED_TO_AGENT: { label: "Assigned", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
  ACCEPTED: { label: "Accepted", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  IN_PROGRESS: { label: "In Progress", color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  DOCUMENTS_COLLECTED: { label: "Docs Collected", color: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-500" },
  SUBMITTED_TO_UNIVERSITY: { label: "At University", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  APPROVED: { label: "Approved", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  REJECTED_BY_UNIVERSITY: { label: "Rejected (Univ)", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  ADDITIONAL_DOC_REQUIRED: { label: "More Docs Needed", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  COMPLETED: { label: "Completed", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  REJECTED_BY_AGENT: { label: "Rejected", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  DELIVERY_ASSIGNED: { label: "Delivery Assigned", color: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  PICKED_UP: { label: "Picked Up", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
};

const WORKFLOW_STEPS = [
  "ASSIGNED_TO_AGENT", "ACCEPTED", "IN_PROGRESS",
  "DOCUMENTS_COLLECTED", "SUBMITTED_TO_UNIVERSITY", 
  "APPROVED", "DELIVERY_ASSIGNED", "PICKED_UP", 
  "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"
];

function StatusBadge({ status }) {
  const normStatus = String(status).toUpperCase();
  const cfg = STATUS_CONFIG[normStatus] || { label: normStatus, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ status }) {
  const normStatus = String(status).toUpperCase();
  let pct = 0;
  let color = "bg-blue-500";
  
  if (normStatus === "REJECTED_BY_AGENT" || normStatus === "REJECTED_BY_UNIVERSITY" || normStatus === "REJECTED") {
    pct = 0;
    color = "bg-red-400";
  } else if (normStatus === "COMPLETED" || normStatus === "DELIVERED" || normStatus.includes("DELIVER")) {
    pct = 100;
    color = "bg-green-500";
  } else if (normStatus === "APPROVED") {
    pct = 90;
    color = "bg-emerald-500";
  } else if (normStatus === "SUBMITTED_TO_UNIVERSITY") {
    pct = 75;
  } else if (normStatus === "DOCUMENTS_COLLECTED" || normStatus === "ADDITIONAL_DOC_REQUIRED") {
    pct = 60;
    if (normStatus === "ADDITIONAL_DOC_REQUIRED") color = "bg-orange-400";
  } else if (normStatus === "IN_PROGRESS") {
    pct = 40;
  } else if (normStatus === "ACCEPTED") {
    pct = 25;
  } else if (normStatus === "ASSIGNED_TO_AGENT" || normStatus === "ASSIGNED") {
    pct = 10;
  }

  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function AssignmentRow({ assignment }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <td className="px-4 py-3">
          <p className="font-semibold text-slate-800 text-sm">{assignment.application_display_id}</p>
          <p className="text-xs text-slate-400">{assignment.requirement}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm text-slate-700 font-medium">{assignment.applicant_name}</p>
          <p className="text-xs text-slate-400">{assignment.phone}</p>
        </td>
        <td className="px-4 py-3">
          {assignment.agent ? (
            <div>
              <p className="text-sm font-semibold text-slate-800">{assignment.agent.name}</p>
              <p className="text-xs text-slate-400">{assignment.agent.location || "—"}</p>
            </div>
          ) : (
            <span className="text-xs text-red-500 font-semibold">Unassigned</span>
          )}
        </td>
        <td className="px-4 py-3">
          <p className="text-xs text-slate-500">{new Date(assignment.assigned_at).toLocaleDateString()}</p>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-1.5">
            <StatusBadge status={assignment.status} />
            <ProgressBar status={assignment.status} />
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-slate-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">University</p>
                <p className="text-sm text-slate-700">{assignment.university || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Latest Progress Note</p>
                <p className="text-sm text-slate-700">{assignment.progress_note || "No update yet"}</p>
              </div>
              {assignment.accepted_at && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Accepted At</p>
                  <p className="text-sm text-slate-700">{new Date(assignment.accepted_at).toLocaleString()}</p>
                </div>
              )}
              {assignment.completed_at && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Completed At</p>
                  <p className="text-sm text-slate-700">{new Date(assignment.completed_at).toLocaleString()}</p>
                </div>
              )}
              {assignment.agent && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Actions</p>
                  <a href={`/admin/agent-support/${assignment.application_id}`} className="inline-flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-3 rounded-lg transition-colors">
                    <MessageSquare size={14} /> Open Chat
                  </a>
                </div>
              )}
              {assignment.courier_partner && (
                <div className="col-span-1 sm:col-span-3 bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-blue-800 uppercase mb-2">Delivery / Courier Details</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Courier</p>
                      <p className="text-sm font-semibold text-slate-800">{assignment.courier_partner}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Tracking ID</p>
                      <p className="text-sm font-semibold text-slate-800">{assignment.tracking_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Dispatch Date</p>
                      <p className="text-sm font-semibold text-slate-800">{assignment.dispatch_date || "—"}</p>
                    </div>
                    <div>
                      {assignment.tracking_url && (
                        <a href={assignment.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-full sm:w-auto mt-2 sm:mt-0 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-4 rounded-lg transition-colors">
                          Track Parcel
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {assignment.agent_rejection_reason && (
                <div className="col-span-3">
                  <p className="text-xs font-bold text-red-500 uppercase mb-1">Agent Rejection Reason</p>
                  <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    {assignment.agent_rejection_reason}
                  </p>
                </div>
              )}
              {/* Workflow Stepper */}
              <div className="col-span-3">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Workflow Progress</p>
                <div className="flex items-center gap-0 overflow-x-auto">
                  {WORKFLOW_STEPS.map((step, i) => {
                    const curr = WORKFLOW_STEPS.indexOf(assignment.status);
                    const done = i <= curr && assignment.status !== "REJECTED_BY_AGENT";
                    const cfg = STATUS_CONFIG[step];
                    return (
                      <div key={step} className="flex items-center">
                        <div className={`flex flex-col items-center min-w-[80px]`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                            done ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-300"
                          }`}>
                            {done ? "✓" : i + 1}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 text-center leading-tight">{cfg.label}</p>
                        </div>
                        {i < WORKFLOW_STEPS.length - 1 && (
                          <div className={`h-0.5 w-8 flex-shrink-0 ${done && i < curr ? "bg-blue-600" : "bg-slate-200"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminAgentTracking() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllAssignments();
      if (res.ok) setAssignments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = assignments.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      (a.applicant_name || "").toLowerCase().includes(q) ||
      (a.application_display_id || "").toLowerCase().includes(q) ||
      (a.agent?.name || "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "All" || String(a.status).toUpperCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map((s) => [
      s, 
      assignments.filter((a) => String(a.status).toUpperCase() === s).length
    ])
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-blue-600" size={28} /> Agent Tracking
          </h1>
          <p className="text-slate-500 text-sm mt-1">Monitor all agent assignments and progress in real-time</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-slate-50 transition shadow-sm"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className={`rounded-2xl p-3 text-center border ${cfg.color.replace("text-", "border-").split(" ")[0]}/20 ${cfg.color}`}>
            <p className="text-2xl font-bold">{counts[key] || 0}</p>
            <p className="text-xs mt-0.5 font-semibold">{cfg.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Search by applicant, ID or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="All">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading assignments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Activity size={40} className="mx-auto mb-3 opacity-30" />
            <p>No assignments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Application", "Applicant", "Agent", "Assigned Date", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <AssignmentRow key={a.id} assignment={a} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
