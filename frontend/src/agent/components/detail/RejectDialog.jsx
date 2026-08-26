import React, { useState } from "react";
import { XCircle } from "lucide-react";
import { ActionButton } from "../ui";
import { REJECT_REASONS } from "../../constants/workflow";

export default function RejectDialog({ studentName, onCancel, onConfirm, busy }) {
  const [type, setType] = useState(REJECT_REASONS[0]);
  const [other, setOther] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const reason = type === "Other" ? other.trim() : type;
    if (!reason) { setError("Please give a reason."); return; }
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <XCircle size={20} className="text-rose-600" /> Reject assignment
        </h2>
        <p className="text-[13px] text-slate-600">
          You're rejecting the assignment for <strong className="text-slate-900">{studentName}</strong>.
          The admin is notified and can reassign it.
        </p>

        <div>
          <label className="text-[11px] font-semibold text-slate-500">Reason</label>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setError(""); }}
            className="w-full mt-1 rounded-lg ring-1 ring-inset ring-slate-200 px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-rose-400"
          >
            {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          {type === "Other" && (
            <textarea
              rows={3}
              value={other}
              onChange={(e) => { setOther(e.target.value); setError(""); }}
              placeholder="Describe the reason…"
              className="w-full mt-3 rounded-lg ring-1 ring-inset ring-slate-200 px-3 py-2.5 text-[13px] outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          )}
          {error && <p className="text-[12px] text-rose-600 mt-1.5">{error}</p>}
        </div>

        <div className="flex gap-2">
          <ActionButton variant="subtle" full onClick={onCancel}>Cancel</ActionButton>
          <ActionButton variant="danger" full loading={busy} onClick={submit}>Confirm reject</ActionButton>
        </div>
      </div>
    </div>
  );
}
