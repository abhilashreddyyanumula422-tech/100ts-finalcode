import { useState, useEffect, useCallback } from "react";
import { getAgentDashboard } from "../../services/api";

/** Loads the agent work dashboard, with an explicit refreshing state. */
export default function useAgentDashboard(agentId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    if (!agentId) {
      setLoading(false);
      setError("No agent session found. Please sign in again.");
      return;
    }
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await getAgentDashboard(agentId);
      if (res.ok) { setData(res.data); setError(""); }
      else setError(res.data?.error || "Could not load your dashboard.");
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, refreshing, error, reload: load };
}
