import React, { createContext, useContext } from "react";
import { useAgentSession, useAgentDashboard } from "../hooks";

const AgentDataContext = createContext(null);

/**
 * Fetches the agent's work data once and shares it across every portal page,
 * so switching tabs is instant instead of refetching each time.
 */
export function AgentDataProvider({ children }) {
  const { agent, agentId } = useAgentSession();
  const dashboard = useAgentDashboard(agentId);
  return (
    <AgentDataContext.Provider value={{ agent, agentId, ...dashboard }}>
      {children}
    </AgentDataContext.Provider>
  );
}

export function useAgentData() {
  const ctx = useContext(AgentDataContext);
  if (!ctx) throw new Error("useAgentData must be used inside <AgentDataProvider>");
  return ctx;
}
