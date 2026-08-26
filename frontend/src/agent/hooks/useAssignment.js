import { useState, useEffect, useCallback } from "react";
import { getAssignmentDetail } from "../../services/api";

/** Loads a single assignment and exposes a transient toast message. */
export default function useAssignment(agentId, assignmentId) {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    if (!agentId || !assignmentId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await getAssignmentDetail(agentId, assignmentId);
      if (res.ok) { setAssignment(res.data); setError(""); }
      else setError(res.data?.error || "Assignment not found, or you don't have access to it.");
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [agentId, assignmentId]);

  useEffect(() => { load(); }, [load]);

  const notify = useCallback((message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  }, []);

  return { assignment, loading, error, toast, notify, reload: load };
}
