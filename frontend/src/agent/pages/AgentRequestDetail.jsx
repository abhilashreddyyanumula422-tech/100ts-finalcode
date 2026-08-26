import React from "react";
import { useParams } from "react-router-dom";
import { useAgentSession, useAssignment } from "../hooks";
import { useAgentData } from "../context/AgentDataContext";
import { PageLoading, PageError } from "../components/PageState";
import { Banner } from "../components/ui";
import {
  RequestHeader, StudentPanel, UniversityPanel,
  WorkflowTracker, ActionPanel,
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
    <div className="space-y-5 max-w-3xl mx-auto">
      <RequestHeader assignment={assignment} />

      {toast && (
        <Banner tone={toast.isError ? "danger" : "success"}>{toast.message}</Banner>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <StudentPanel assignment={assignment} />
        <UniversityPanel assignment={assignment} />
      </div>

      <WorkflowTracker status={assignment.status} />

      <ActionPanel
        assignment={assignment}
        agentId={agentId}
        assignmentId={id}
        onChanged={refresh}
        onNotify={notify}
      />
    </div>
  );
}
