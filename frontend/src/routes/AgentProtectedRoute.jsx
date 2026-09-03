import React from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * AgentProtectedRoute — guards all /agent/... routes
 * Redirects to /agent/login if not authenticated as an agent.
 */
const AgentProtectedRoute = () => {
  let isAgent = false;

  const agentStr = localStorage.getItem("agent");
  const agentUserStr = localStorage.getItem("agentUser");
  const agentToken = localStorage.getItem("agent_token");
  const userStr = localStorage.getItem("user");

  if (agentStr) {
    try {
      const agent = JSON.parse(agentStr);
      if (agent && (agent.id || agent.email)) {
        isAgent = true;
      }
    } catch (e) {
      console.error("Failed to parse agent data", e);
    }
  }

  if (!isAgent && agentUserStr) {
    try {
      const agentUser = JSON.parse(agentUserStr);
      if (agentUser && (agentUser.id || agentUser.email)) {
        isAgent = true;
      }
    } catch (e) {
      console.error("Failed to parse agentUser data", e);
    }
  }

  if (!isAgent && agentToken) {
    isAgent = true;
  }

  if (!isAgent && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user?.type === "agent") {
        isAgent = true;
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
    }
  }

  return isAgent ? <Outlet /> : <Navigate to="/agent/login" replace />;
};

export default AgentProtectedRoute;
