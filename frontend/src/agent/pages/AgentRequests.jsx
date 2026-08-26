import React from "react";
import { useAgentData } from "../context/AgentDataContext";
import { PageLoading, PageError, PageHeader } from "../components/PageState";
import { ActiveRequests } from "../components/dashboard";

export default function AgentRequests() {
  const { data, loading, error, reload } = useAgentData();
  if (loading) return <PageLoading label="Loading your requests…" />;
  if (error && !data) return <PageError message={error} onRetry={() => reload()} />;

  const rows = data?.active_requests || [];
  return (
    <>
      <PageHeader
        title="Requests"
        subtitle={`${rows.length} active assignment${rows.length === 1 ? "" : "s"}`}
      />
      <ActiveRequests requests={rows} />
    </>
  );
}
