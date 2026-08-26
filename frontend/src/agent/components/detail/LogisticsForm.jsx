import React, { useState } from "react";
import { Truck } from "lucide-react";
import { ActionButton, Banner } from "../ui";
import { COURIERS } from "../../constants/workflow";
import { addLogistics, updateAssignmentStatus } from "../../../services/api";

export default function LogisticsForm({ agentId, assignmentId, assignment: a, onSaved }) {
  const [courier, setCourier] = useState(a.courier_partner || "Delhivery");
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!tracking.trim()) { setError("Tracking ID is required."); return; }
    setBusy(true); setError("");
    try {
      const res = await addLogistics(agentId, assignmentId, courier, tracking.trim());
      if (res.ok) { 
        const advanceRes = await updateAssignmentStatus(agentId, assignmentId, "PICKED_UP", "");
        if (!advanceRes.ok) {
           setError("Tracking details saved, but failed to advance status.");
        }
        setTracking(""); 
        onSaved?.(); 
      }
      else setError(res.data?.error || "Could not save logistics.");
    } catch { setError("Network error."); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Banner tone="success">University approved — add delivery details to dispatch.</Banner>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-slate-500">Courier partner</label>
          <select
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            className="w-full mt-1 rounded-lg ring-1 ring-inset ring-slate-200 px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-blue-400"
          >
            {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500">
            Tracking ID <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={tracking}
            onChange={(e) => { setTracking(e.target.value); setError(""); }}
            placeholder="e.g. DL1234567890"
            className="w-full mt-1 rounded-lg ring-1 ring-inset ring-slate-200 px-3 py-2.5 text-[13px] font-mono outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {error && <p className="text-[12px] text-rose-600">{error}</p>}

      <ActionButton variant="success" full loading={busy} onClick={save} icon={<Truck size={14} />}>
        Confirm & mark out for delivery
      </ActionButton>
    </div>
  );
}
