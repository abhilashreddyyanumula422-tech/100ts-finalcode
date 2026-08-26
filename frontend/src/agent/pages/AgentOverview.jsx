import React from "react";
import { RefreshCw } from "lucide-react";
import { useAgentData } from "../context/AgentDataContext";
import { PageLoading, PageError, PageHeader } from "../components/PageState";
import { ActionButton, Banner } from "../components/ui";
import { SummaryCards, TodayTasks } from "../components/dashboard";
import { firstName, weekdayLong } from "../utils/format";

export default function AgentOverview() {
  const { agent, data, loading, refreshing, error, reload } = useAgentData();

  if (loading) return <PageLoading label="Loading your work dashboard…" />;
  if (error && !data) return <PageError message={error} onRetry={() => reload()} />;

  return (
    <>
      <PageHeader
        title={`Good day, ${firstName(agent?.name)}`}
        subtitle={weekdayLong()}
        actions={
          <ActionButton size="sm" loading={refreshing} onClick={() => reload(true)}
                        icon={!refreshing && <RefreshCw size={13} />}>
            Refresh
          </ActionButton>
        }
      />

      <div className="space-y-5">
        <SummaryCards stats={data?.stats} />

        {data?.stats?.pending_acceptance > 0 && (
          <Banner tone="warning">
            {data.stats.pending_acceptance} assignment
            {data.stats.pending_acceptance > 1 ? "s" : ""} waiting for you to accept or reject.
          </Banner>
        )}

        <TodayTasks tasks={data?.today_tasks} />
      </div>
    </>
  );
}
