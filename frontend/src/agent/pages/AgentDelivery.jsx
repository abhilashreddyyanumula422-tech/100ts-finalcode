import React from "react";
import { useAgentData } from "../context/AgentDataContext";
import { PageLoading, PageError, PageHeader } from "../components/PageState";
import { DeliveryQueue } from "../components/dashboard";

export default function AgentDelivery() {
  const { data, loading, error, reload } = useAgentData();
  if (loading) return <PageLoading label="Loading deliveries…" />;
  if (error && !data) return <PageError message={error} onRetry={() => reload()} />;

  const rows = data?.deliveries || [];
  const dispatched = rows.filter((d) => d.tracking_id).length;
  return (
    <>
      <PageHeader
        title="Delivery"
        subtitle={`${dispatched} dispatched · ${rows.length - dispatched} awaiting courier details`}
      />
      <DeliveryQueue deliveries={rows} />
    </>
  );
}
