import React from "react";
import { GitBranch, Check } from "lucide-react";
import { Section } from "../ui";
import { WORKFLOW_STEPS, statusLabel } from "../../constants/workflow";

export default function WorkflowTracker({ status }) {
  const current = WORKFLOW_STEPS.indexOf(status);
  // Off-path states (university rejected, docs required) aren't in the happy path;
  // anchor them at the submission step so the tracker still reads sensibly.
  const anchor = current === -1 ? WORKFLOW_STEPS.indexOf("SUBMITTED_TO_UNIVERSITY") : current;

  return (
    <Section title="Progress" icon={<GitBranch size={15} />} padded>
      <ol>
        {WORKFLOW_STEPS.map((step, i) => {
          const done = i < anchor;
          const active = i === anchor && current !== -1;
          const last = i === WORKFLOW_STEPS.length - 1;
          return (
            <li key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] font-semibold ring-1 shrink-0 ${
                  done   ? "bg-slate-900 text-white ring-slate-900"
                  : active ? "bg-white text-blue-600 ring-2 ring-blue-500"
                           : "bg-white text-slate-300 ring-slate-200"
                }`}>
                  {done ? <Check size={11} strokeWidth={3} /> : i + 1}
                </span>
                {!last && <span className={`w-px flex-1 my-1 ${done ? "bg-slate-900" : "bg-slate-150 bg-slate-200"}`} />}
              </div>
              <div className={`pb-4 ${last ? "pb-0" : ""}`}>
                <p className={`text-[13px] leading-5 ${
                  active ? "font-semibold text-blue-600"
                  : done  ? "font-medium text-slate-700"
                          : "text-slate-400"
                }`}>
                  {statusLabel(step)}
                </p>
                {active && <p className="text-[11px] text-slate-400">Current stage</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {current === -1 && (
        <p className="mt-2 text-[12px] font-medium text-amber-700 bg-amber-50 ring-1 ring-inset ring-amber-200 rounded-lg px-3 py-2">
          Off the standard path — {statusLabel(status)}
        </p>
      )}
    </Section>
  );
}
