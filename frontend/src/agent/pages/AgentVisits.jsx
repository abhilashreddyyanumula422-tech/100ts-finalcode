import React from "react";
import { useAgentData } from "../context/AgentDataContext";
import { PageLoading, PageError, PageHeader } from "../components/PageState";
import { UniversityVisits } from "../components/dashboard";

export default function AgentVisits() {
  const { data, loading, error, reload } = useAgentData();
  if (loading) return <PageLoading label="Loading university visits…" />;
  if (error && !data) return <PageError message={error} onRetry={() => reload()} />;

  const visits = data?.visits || [];
  const scheduled = visits.filter((v) => v.scheduled).length;
  return (
    <>
      <PageHeader
        title="University Visits"
        subtitle={`${scheduled} scheduled · ${visits.length - scheduled} awaiting a date`}
      />
      <UniversityVisits visits={visits} />
    </>
  );
}
