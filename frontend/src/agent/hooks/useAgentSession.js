import { useMemo } from "react";
import { readAgent } from "../utils/format";

/** The logged-in agent, straight from the session the login flow stored. */
export default function useAgentSession() {
  const agent = useMemo(() => readAgent(), []);
  return { agent, agentId: agent?.id ?? null };
}
