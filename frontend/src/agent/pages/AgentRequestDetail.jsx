import React from "react";
import { useParams } from "react-router-dom";
import { useAgentSession, useAssignment } from "../hooks";
import { useAgentData } from "../context/AgentDataContext";
import { PageLoading, PageError } from "../components/PageState";
import { Banner } from "../components/ui";
import {
  RequestHeader, StudentPanel, UniversityPanel,
  WorkflowTracker, DecisionPanel, DeliveryPanel, ActionPanel,
} from "../components/detail";

export default function AgentRequestDetail() {
  const { id } = useParams();
  const { agentId } = useAgentSession();
  const { reload: reloadDashboard } = useAgentData();
  const { assignment, loading, error, toast, notify, reload } = useAssignment(agentId, id);

  if (loading) return <PageLoading label="Loading request…" />;
  if (error && !assignment) return <PageError message={error} />;
  if (!assignment) return null;

  // Any change here also invalidates the counts in the sidebar.
  const refresh = () => { reload(); reloadDashboard(true); };

  return (
    <div className="space-y-5">
      <RequestHeader assignment={assignment} />

      {toast && (
        <Banner tone={toast.isError ? "danger" : "success"}>{toast.message}</Banner>
      )}

      <ActionPanel
        assignment={assignment}
        agentId={agentId}
        assignmentId={id}
        onChanged={refresh}
        onNotify={notify}
      />

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-5">
          <StudentPanel assignment={assignment} />
          <UniversityPanel assignment={assignment} />
        </div>
        <div className="space-y-5">
          <WorkflowTracker status={assignment.status} />
          <DecisionPanel
            assignment={assignment}
            agentId={agentId}
            assignmentId={id}
            onSaved={refresh}
          />
          <DeliveryPanel assignment={assignment} />
        </div>
      </div>

      {assignment.progress_note && (
        <div className="bg-white rounded-xl ring-1 ring-slate-200/80 p-5">
          <p className="text-[11px] font-medium text-slate-400">Latest note</p>
          <p className="text-[13px] text-slate-700 mt-1">{assignment.progress_note}</p>
        </div>
      )}
    </div>
  );
}
