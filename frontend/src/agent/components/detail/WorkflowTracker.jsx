import React from "react";
import { GitBranch, Check } from "lucide-react";
import { Section } from "../ui";
import { statusLabel } from "../../constants/workflow";

const MAJOR_STAGES = [
  { id: "ASSIGNMENT", label: "Assignment", statuses: ["ASSIGNED_TO_AGENT", "ACCEPTED", "IN_PROGRESS", "REJECTED_BY_AGENT"] },
  { id: "UNIVERSITY_WORK", label: "University Work", statuses: ["DOCUMENTS_COLLECTED", "SUBMITTED_TO_UNIVERSITY", "APPROVED", "ADDITIONAL_DOC_REQUIRED", "REJECTED_BY_UNIVERSITY"] },
  { id: "DELIVERY", label: "Delivery", statuses: ["DELIVERY_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"] },
  { id: "COMPLETED", label: "Completed", statuses: ["COMPLETED"] },
];

export default function WorkflowTracker({ status }) {
  let activeStageIndex = MAJOR_STAGES.findIndex(s => s.statuses.includes(status));
  
  if (activeStageIndex === -1) {
    activeStageIndex = 0;
  }

  return (
    <Section title="Progress" icon={<GitBranch size={15} />} padded>
      <ol>
        {MAJOR_STAGES.map((stage, i) => {
          const done = i < activeStageIndex || status === "COMPLETED";
          const active = i === activeStageIndex && status !== "COMPLETED";
          const last = i === MAJOR_STAGES.length - 1;
          
          return (
            <li key={stage.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`w-5 h-5 rounded-full grid place-items-center shrink-0 ${
                  done   ? "bg-emerald-500 text-white ring-1 ring-emerald-500"
                  : active ? "bg-white ring-2 ring-blue-500"
                           : "bg-white ring-1 ring-slate-200"
                }`}>
                  {done ? <Check size={12} strokeWidth={3} /> : active ? <div className="w-2 h-2 rounded-full bg-blue-600" /> : null}
                </span>
                {!last && <span className={`w-px flex-1 my-1 ${done ? "bg-emerald-500" : "bg-slate-200"}`} />}
              </div>
              <div className={`pb-5 ${last ? "pb-0" : ""}`}>
                <p className={`text-[13.5px] leading-5 ${
                  active ? "font-bold text-slate-900"
                  : done  ? "font-semibold text-slate-700"
                          : "font-medium text-slate-400"
                }`}>
                  {stage.label}
                </p>
                {active && (
                  <p className="text-[12px] font-semibold text-blue-600 mt-0.5 bg-blue-50/50 inline-block px-2 py-0.5 rounded border border-blue-100/50">
                    {statusLabel(status)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {status === "REJECTED_BY_AGENT" && (
        <p className="mt-4 text-[12px] font-medium text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 rounded-lg px-3 py-2">
          Off the standard path — {statusLabel(status)}
        </p>
      )}
      
      {["REJECTED_BY_UNIVERSITY", "ADDITIONAL_DOC_REQUIRED"].includes(status) && (
        <p className="mt-4 text-[12px] font-medium text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 rounded-lg px-3 py-2">
          Requires attention — {statusLabel(status)}
        </p>
      )}
    </Section>
  );
}
