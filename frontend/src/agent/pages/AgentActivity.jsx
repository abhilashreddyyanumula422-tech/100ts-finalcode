import React from "react";
import { useAgentData } from "../context/AgentDataContext";
import { PageLoading, PageError, PageHeader } from "../components/PageState";
import { RecentActivity } from "../components/dashboard";

export default function AgentActivity() {
  const { data, loading, error, reload } = useAgentData();
  if (loading) return <PageLoading label="Loading activity…" />;
  if (error && !data) return <PageError message={error} onRetry={() => reload()} />;

  return (
    <>
      <PageHeader title="Activity" subtitle="Everything logged against your assignments" />
      <RecentActivity activity={data?.recent_activity} />
    </>
  );
}
