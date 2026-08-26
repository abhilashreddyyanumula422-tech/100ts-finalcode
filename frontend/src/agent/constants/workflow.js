/**
 * The agent workflow, in one place.
 * The backend owns the real state machine; these maps only describe how each
 * state is *presented*. Keep them in sync with App/views_agent.py.
 */

export const STATUS_LABELS = {
  ASSIGNED_TO_AGENT: "Assigned",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "In Progress",
  DOCUMENTS_COLLECTED: "Documents Collected",
  SUBMITTED_TO_UNIVERSITY: "Submitted to University",
  APPROVED: "University Approved",
  REJECTED_BY_UNIVERSITY: "University Rejected",
  ADDITIONAL_DOC_REQUIRED: "Additional Documents Required",
  COMPLETED: "Completed",
  REJECTED_BY_AGENT: "Rejected by Agent",
  DELIVERY_ASSIGNED: "Delivery Assigned",
  PICKED_UP: "Picked Up",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

/** Tone drives the pill colour. Semantic colour is used *only* for status. */
export const STATUS_TONE = {
  ASSIGNED_TO_AGENT: "warning",
  ACCEPTED: "info",
  IN_PROGRESS: "info",
  DOCUMENTS_COLLECTED: "info",
  SUBMITTED_TO_UNIVERSITY: "accent",
  APPROVED: "success",
  REJECTED_BY_UNIVERSITY: "danger",
  ADDITIONAL_DOC_REQUIRED: "warning",
  COMPLETED: "success",
  REJECTED_BY_AGENT: "danger",
  DELIVERY_ASSIGNED: "accent",
  PICKED_UP: "accent",
  OUT_FOR_DELIVERY: "warning",
  DELIVERED: "success",
};

/** The single legal next step, used when the API doesn't supply one. */
export const NEXT_ACTION = {
  ACCEPTED: { status: "IN_PROGRESS", label: "Start Visit / Mark In Progress" },
  IN_PROGRESS: { status: "DOCUMENTS_COLLECTED", label: "Mark Documents Collected" },
  DOCUMENTS_COLLECTED: { status: "SUBMITTED_TO_UNIVERSITY", label: "Submit to University" },
  APPROVED: { status: "DELIVERY_ASSIGNED", label: "Arrange Delivery" },
  DELIVERY_ASSIGNED: { status: "PICKED_UP", label: "Mark Picked Up" },
  PICKED_UP: { status: "OUT_FOR_DELIVERY", label: "Mark Out for Delivery" },
  OUT_FOR_DELIVERY: { status: "DELIVERED", label: "Mark Delivered" },
  DELIVERED: { status: "COMPLETED", label: "Close & Mark Completed" },
  ADDITIONAL_DOC_REQUIRED: { status: "SUBMITTED_TO_UNIVERSITY", label: "Re-submit to University" },
  REJECTED_BY_UNIVERSITY: { status: "IN_PROGRESS", label: "Retry — Back to In Progress" },
};

/** The happy path, for the vertical tracker. */
export const WORKFLOW_STEPS = [
  "ASSIGNED_TO_AGENT",
  "ACCEPTED",
  "IN_PROGRESS",
  "DOCUMENTS_COLLECTED",
  "SUBMITTED_TO_UNIVERSITY",
  "APPROVED",
  "DELIVERY_ASSIGNED",
  "PICKED_UP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
];

export const ASSIGNED_STATES = ["ASSIGNED_TO_AGENT", "ACCEPTED"];
export const FIELD_STATES = ["IN_PROGRESS", "DOCUMENTS_COLLECTED", "SUBMITTED_TO_UNIVERSITY"];
export const DELIVERY_STATES = ["DELIVERY_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];
export const TERMINAL_STATES = ["COMPLETED", "REJECTED_BY_AGENT"];
export const DECISION_AMENDABLE = ["APPROVED", "REJECTED_BY_UNIVERSITY", "ADDITIONAL_DOC_REQUIRED"];

export const COURIERS = ["Shiprocket", "Delhivery", "BlueDart", "Other"];

export const REJECT_REASONS = [
  "Too Busy", "On Leave", "Distance Too Far",
  "Medical Reason", "Vehicle Issue", "Other",
];

export const statusLabel = (s) => STATUS_LABELS[s] || s;
export const nextActionFor = (a) => a?.next_action || NEXT_ACTION[a?.status] || null;
