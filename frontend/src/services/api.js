// ===============================
// API Configuration - Centralized
// ===============================

// Change this IP address to your backend server
// For development: use your local IP or localhost
// For production: use your domain name
const API_BASE_URL = "http://localhost:8000";

// ===============================
// API Helper Functions
// ===============================

// Generic GET request
export const apiGet = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("API GET Error:", error);
    throw error;
  }
};

// Generic POST request
export const apiPost = async (endpoint, body = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("API POST Error:", error);
    throw error;
  }
};

// Generic PUT request
export const apiPut = async (endpoint, body = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("API PUT Error:", error);
    throw error;
  }
};

// Generic DELETE request
export const apiDelete = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("API DELETE Error:", error);
    throw error;
  }
};

// ===============================
// Specific API Functions
// ===============================

// Auth API
export const forgotPassword = async (email) => {
  return apiPost("/api/forgot-password/", { email });
};

export const verifyResetToken = async (token) => {
  return apiPost("/api/verify-reset-token/", { token });
};

export const resetPassword = async (token, password, confirmPassword) => {
  return apiPost("/api/reset-password/", {
    token,
    password,
    confirm_password: confirmPassword
  });
};

export const login = async (email, password) => {
  return apiPost("/api/verify/", { email, password });
};

export const register = async (userData) => {
  return apiPost("/api/register/", userData);
};

// Applications API
export const getApplications = () => {
  return apiGet("/api/applications/");
};

export const submitApplication = async (formData) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    const token = user?.token;
    
    console.log("Submitting application. User:", user);
    console.log("Token to be sent:", token);

    const headers = token ? { "Authorization": `Token ${token}` } : {};
    console.log("Headers being sent:", headers);

    const response = await fetch(`${API_BASE_URL}/api/submit/`, {
      method: "POST",
      headers: headers,
      body: formData
    });

    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("Submit Application Error:", error);
    throw error;
  }
};

export const getApplicationStatus = async (trackingId, email) => {
  const params = new URLSearchParams();
  if (trackingId) params.append("tracking_id", trackingId);
  if (email) params.append("email", email);
  return apiGet(`/api/application-status/?${params.toString()}`);
};

export const acknowledgeDelivery = async (applicationId) => {
  return apiPost(`/api/application/${applicationId}/acknowledge/`);
};


// Payment API
export const createOrder = async (amount, applicationId) => {
  return apiPost("/api/create-order/", { amount, application_id: applicationId });
};

export const verifyPayment = async (orderId) => {
  return apiGet(`/api/verify-payment/${orderId}/`);
};

export const refundPayment = async (applicationId) => {
  return apiPost("/api/refund/", { application_id: applicationId });
};

// Colleges API
export const getAllColleges = () => {
  return apiGet("/api/allcolleges/");
};

export const addCollege = async (collegeData) => {
  return apiPost("/api/add_college/", collegeData);
};

// Certificate API
export const getCollegeCertificates = (collegeId) => {
  return apiGet(`/api/colleges/${collegeId}/certificates/`);
};

// Document API
export const downloadDocument = (documentId) => {
  return `${API_BASE_URL}/api/download/${documentId}/`;
};

// Notifications
export const sendNotification = async (email, subject, message) => {
  return apiPost("/api/send-notification/", { email, subject, message });
};

export const updateApplicationStatus = async (id, status, adminMessage, agent, rejectionReason, serviceFee) => {
  return apiPost(`/api/application/${id}/update-status/`, {
    status,
    admin_message: adminMessage,
    agent,
    rejection_reason: rejectionReason || null,
    service_fee: serviceFee || null
  });
};

// Certificate API
export const addCertificate = async (collegeId, certificateName, price) => {
  return apiPost("/api/add_certificate/", {
    college: collegeId,
    name: certificateName,
    price: price
  });
};

export const updateCertificate = async (certId, collegeId, certificateName, price) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/certificates/${certId}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        college: collegeId,
        name: certificateName,
        price: price
      })
    });

    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("Update Certificate Error:", error);
    throw error;
  }
};

export const deleteCertificate = async (certId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/certificates/${certId}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("Delete Certificate Error:", error);
    throw error;
  }
};

// Reviews API
export const getReviews = () => {
  return apiGet("/api/reviews/");
};

export const submitReview = (reviewData) => {
  return apiPost("/api/reviews/", reviewData);
};

// Verifications API
export const getVerifications = () => {
  return apiGet("/api/verifications/");
};

// Delivery API
export const getDeliveryRequests = () => {
  return apiGet("/api/delivery-requests/");
};

export const sendCourierEmailAPI = (email, trackingId, courierPartner) => {
  return apiPost("/api/send-courier-email/", {
    email,
    tracking_id: trackingId,
    courier_partner: courierPartner
  });
};

// Contact API
export const submitContact = (contactData) => {
  return apiPost("/api/contact/", contactData);
};

// ===============================
// AGENT PROCESSING MODULE APIs
// ===============================
//
// Every /api/agent/<id>/... endpoint is protected server-side: the
// signed token issued at login is checked against the agent id in the
// URL, so an agent can only ever reach their own assignments.
// Everything below therefore sends the token.

const AGENT_TOKEN_KEY = "agent_token";

export const setAgentToken = (token) => {
  if (token) localStorage.setItem(AGENT_TOKEN_KEY, token);
};

export const getAgentToken = () => localStorage.getItem(AGENT_TOKEN_KEY) || "";

export const clearAgentSession = () => {
  localStorage.removeItem(AGENT_TOKEN_KEY);
  localStorage.removeItem("agent");
  localStorage.removeItem("user");
};

const agentHeaders = (extra = {}) => {
  const token = getAgentToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
};

// A 401 means the token is missing/expired -> the session is over.
const redirectToAgentLogin = () => {
  clearAgentSession();
  if (!window.location.pathname.startsWith("/agent/login")) {
    window.location.replace("/agent/login");
  }
};

// Django returns an HTML debug page for 404/500, which blows up response.json().
// Turn that into a message that actually says what went wrong.
const describeNonJson = (status, endpoint) => {
  if (status === 404)
    return `Endpoint not found (404): ${endpoint}. If you just pulled these changes, restart the Django dev server so the new agent routes are registered.`;
  if (status >= 500)
    return `Server error (${status}) on ${endpoint}. Check the Django console for the traceback.`;
  return `Unexpected response (${status}) from ${endpoint}.`;
};

const agentRequest = async (endpoint, { method = "GET", body, isForm = false } = {}) => {
  try {
    const options = { method, headers: agentHeaders(isForm ? {} : { "Content-Type": "application/json" }) };
    if (body !== undefined) options.body = isForm ? body : JSON.stringify(body);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    let data;
    const raw = await response.text();
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: describeNonJson(response.status, endpoint) };
    }

    if (response.status === 401) {
      redirectToAgentLogin();
      return { ok: false, data, status: 401 };
    }
    if (response.status === 403) {
      return { ok: false, data, status: 403 };
    }
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("Agent API Error:", endpoint, error);
    return {
      ok: false,
      status: 0,
      data: { error: `Cannot reach the backend at ${API_BASE_URL}. Is the Django server running?` },
    };
  }
};

const agentGet = (endpoint) => agentRequest(endpoint);
const agentPost = (endpoint, body = {}) => agentRequest(endpoint, { method: "POST", body });
const agentUpload = (endpoint, formData) =>
  agentRequest(endpoint, { method: "POST", body: formData, isForm: true });

// ── Auth ──
export const agentLogin = async (email, password) => {
  const res = await apiPost("/api/agent/login/", { email, password });
  if (res.ok && res.data?.token) setAgentToken(res.data.token);
  return res;
};

// ── Admin — Agent CRUD (admin endpoints, not agent-scoped) ──
export const getAgents = () => apiGet("/api/admin/agents/");
export const createAgent = (data) => apiPost("/api/admin/agents/", data);
export const updateAgent = (id, data) => apiPut(`/api/admin/agents/${id}/`, data);
export const deleteAgent = (id) => apiDelete(`/api/admin/agents/${id}/`);
export const toggleAgent = (id) => apiPost(`/api/admin/agents/${id}/toggle/`, {});

// ── Admin — Assignment ──
export const getEligibleAgents = (appId) =>
  apiGet(`/api/admin/applications/${appId}/eligible-agents/`);
export const assignAgent = (appId, agentId) =>
  apiPost(`/api/admin/applications/${appId}/assign-agent/`, { agent_id: agentId });
export const autoAssignAgent = (appId) =>
  apiPost(`/api/admin/applications/${appId}/auto-assign/`, {});
export const getApplicationAssignment = (appId) =>
  apiGet(`/api/admin/applications/${appId}/assignment/`);
export const getAllAssignments = () => apiGet("/api/admin/agent-assignments/");


// ─────────────────────────────────────────────────────────────
// Dashboard fallback
//
// The rich /dashboard/ endpoint is new. If the running backend
// doesn't have it yet (404), we build the exact same payload
// shape in the browser from /assignments/, which every version
// of the backend has. The UI never has to care which one it got.
// ─────────────────────────────────────────────────────────────

const FALLBACK_STATUS_LABELS = {
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

const FALLBACK_NEXT_ACTION = {
  ACCEPTED:                ["IN_PROGRESS",             "Start Visit / Mark In Progress"],
  IN_PROGRESS:             ["DOCUMENTS_COLLECTED",     "Mark Documents Collected"],
  DOCUMENTS_COLLECTED:     ["SUBMITTED_TO_UNIVERSITY", "Submit to University"],
  APPROVED:                ["DELIVERY_ASSIGNED",       "Arrange Delivery"],
  DELIVERY_ASSIGNED:       ["PICKED_UP",               "Mark Picked Up"],
  PICKED_UP:               ["OUT_FOR_DELIVERY",        "Mark Out for Delivery"],
  OUT_FOR_DELIVERY:        ["DELIVERED",               "Mark Delivered"],
  DELIVERED:               ["COMPLETED",               "Close & Mark Completed"],
  ADDITIONAL_DOC_REQUIRED: ["SUBMITTED_TO_UNIVERSITY", "Re-submit to University"],
  REJECTED_BY_UNIVERSITY:  ["IN_PROGRESS",             "Retry - Back to In Progress"],
};

const ASSIGNED_STATES = ["ASSIGNED_TO_AGENT", "ACCEPTED"];
const DELIVERY_STATES = ["DELIVERY_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED"];
const TERMINAL_STATES = ["COMPLETED", "REJECTED_BY_AGENT"];

const buildDashboardFromAssignments = (list, agent) => {
  const today = new Date().toISOString().slice(0, 10);

  // Normalise each row so it carries the same fields the backend adds.
  const rows = (Array.isArray(list) ? list : []).map((r) => {
    const na = FALLBACK_NEXT_ACTION[r.status];
    return {
      ...r,
      status_label: FALLBACK_STATUS_LABELS[r.status] || r.status,
      next_action: na ? { status: na[0], label: na[1] } : null,
      route_from: r.route_from || agent?.location || "",
      route_to: r.route_to || r.college || r.university || "",
      is_terminal: TERMINAL_STATES.includes(r.status),
    };
  });

  const count = (...states) => rows.filter((r) => states.includes(r.status)).length;

  const stats = {
    assigned: count(...ASSIGNED_STATES),
    in_progress: count("IN_PROGRESS"),
    collected: count("DOCUMENTS_COLLECTED"),
    completed: count("COMPLETED", "DELIVERED"),
    pending_acceptance: count("ASSIGNED_TO_AGENT"),
    at_university: count("SUBMITTED_TO_UNIVERSITY"),
    out_for_delivery: count("OUT_FOR_DELIVERY"),
    rejected: count("REJECTED_BY_AGENT"),
    total: rows.length,
  };

  const active = rows.filter((r) => !TERMINAL_STATES.includes(r.status));
  const visitDateOf = (r) => r.visit_record?.visit_date || null;

  const urgency = (r) => {
    if (r.status === "ASSIGNED_TO_AGENT") return 0;
    const vd = visitDateOf(r);
    if (vd && vd <= today) return 1;
    if (["IN_PROGRESS", "DOCUMENTS_COLLECTED"].includes(r.status)) return 2;
    if (r.status === "APPROVED" || DELIVERY_STATES.includes(r.status)) return 3;
    return 4;
  };

  const today_tasks = [...active]
    .sort((a, b) => urgency(a) - urgency(b) || a.id - b.id)
    .slice(0, 6)
    .map((r) => {
      const vd = visitDateOf(r);
      return {
        ...r,
        urgency: urgency(r),
        is_overdue: !!(vd && vd < today && r.status !== "APPROVED" && !DELIVERY_STATES.includes(r.status)),
      };
    });

  const visits = rows
    .filter((r) => r.visit_record || ["ACCEPTED", "IN_PROGRESS"].includes(r.status))
    .map((r) => ({
      assignment_id: r.id,
      application_display_id: r.application_display_id,
      student: r.applicant_name,
      student_phone: r.phone,
      university: r.university,
      college: r.college,
      address: r.route_to,
      documents: r.requirement,
      visit_date: r.visit_record?.visit_date || null,
      visit_time: r.visit_record?.visit_time || null,
      department: r.visit_record?.department || null,
      officer_name: r.visit_record?.officer_name || null,
      reference_number: r.visit_record?.university_reference_number || null,
      scheduled: !!r.visit_record?.visit_date,
      status: r.status,
      status_label: r.status_label,
    }))
    .sort((a, b) => (a.visit_date || "9999-12-31").localeCompare(b.visit_date || "9999-12-31"));

  const deliveries = rows
    .filter((r) => r.status === "APPROVED" || DELIVERY_STATES.includes(r.status) || r.courier_partner || r.tracking_id)
    .map((r) => ({
      assignment_id: r.id,
      application_display_id: r.application_display_id,
      student: r.applicant_name,
      student_phone: r.phone,
      documents_collected: !!r.collected_document_url,
      collected_document_url: r.collected_document_url,
      courier_partner: r.courier_partner,
      tracking_id: r.tracking_id,
      tracking_url: r.tracking_url,
      status: r.status,
      status_label: r.status_label,
    }));

  // No TrackingHistory on the old endpoint - derive a timeline from timestamps.
  const recent_activity = [];
  rows.forEach((r) => {
    const push = (status, when, description) => {
      if (when) recent_activity.push({
        id: `${r.id}-${status}`,
        application_id: r.application_id,
        application_display_id: r.application_display_id,
        status,
        status_label: FALLBACK_STATUS_LABELS[status] || status,
        description,
        created_at: when,
      });
    };
    push("ASSIGNED_TO_AGENT", r.assigned_at, `Assigned to you - ${r.applicant_name}`);
    push("ACCEPTED", r.accepted_at, `You accepted ${r.applicant_name}'s request`);
    push("COMPLETED", r.completed_at, `Closed - ${r.applicant_name}`);
  });
  recent_activity.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    agent: agent || null,
    today,
    stats,
    today_tasks,
    active_requests: active,
    visits,
    deliveries,
    recent_activity: recent_activity.slice(0, 12),
    _fallback: true,
  };
};

// ── Agent — Work dashboard (stats, today's tasks, visits, delivery, activity) ──
export const getAgentDashboard = async (agentId) => {
  const res = await agentGet(`/api/agent/${agentId}/dashboard/`);
  if (res.ok) return res;

  // Backend predates the dashboard endpoint -> rebuild it from /assignments/.
  if (res.status === 404) {
    let agent = null;
    try { agent = JSON.parse(localStorage.getItem("agent") || "null"); } catch { agent = null; }

    const fallback = await agentGet(`/api/agent/${agentId}/assignments/`);
    if (fallback.ok) {
      console.warn(
        "[100TS] /dashboard/ not available on this backend - built the dashboard " +
        "client-side from /assignments/. Restart the Django server to use the server-side one."
      );
      return { ok: true, status: 200, data: buildDashboardFromAssignments(fallback.data, agent) };
    }
    return fallback;
  }

  return res;
};

// ── Agent — Their assignments ──
export const getMyAssignments = (agentId) =>
  agentGet(`/api/agent/${agentId}/assignments/`);
export const getAssignmentDetail = (agentId, assignmentId) =>
  agentGet(`/api/agent/${agentId}/assignments/${assignmentId}/`);
export const acceptAssignment = (agentId, assignmentId) =>
  agentPost(`/api/agent/${agentId}/assignments/${assignmentId}/accept/`, {});
export const rejectAssignment = (agentId, assignmentId, reason) =>
  agentPost(`/api/agent/${agentId}/assignments/${assignmentId}/reject/`, { reason });
export const updateAssignmentStatus = (agentId, assignmentId, status, note, required_documents) =>
  agentPost(`/api/agent/${agentId}/assignments/${assignmentId}/update-status/`, { status, note, required_documents });

export const respondToIssue = async (applicationId, formData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/application/${applicationId}/issue/respond/`, {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    return { ok: response.ok, data, status: response.status };
  } catch (error) {
    console.error("Respond to Issue Error:", error);
    throw error;
  }
};

export const resolveIssue = (agentId, assignmentId) =>
  agentPost(`/api/agent/${agentId}/assignments/${assignmentId}/issue/resolve/`, {});


export const uploadCollectedDocument = (agentId, assignmentId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return agentUpload(`/api/agent/${agentId}/assignments/${assignmentId}/upload-document/`, formData);
};

export const addLogistics = (agentId, assignmentId, courier_partner, tracking_id) =>
  agentPost(`/api/agent/${agentId}/assignments/${assignmentId}/add-logistics/`, { courier_partner, tracking_id });

export const saveVisitDetails = (agentId, assignmentId, data) =>
  agentPost(`/api/agent/${agentId}/assignments/${assignmentId}/visit/`, data);

export const getVisitDetails = (agentId, assignmentId) =>
  agentGet(`/api/agent/${agentId}/assignments/${assignmentId}/visit/get/`);

export const uploadVisitPhoto = (agentId, assignmentId, photoFile) => {
  const formData = new FormData();
  formData.append("photo", photoFile);
  return agentUpload(`/api/agent/${agentId}/assignments/${assignmentId}/visit/photos/`, formData);
};

export const submitUniversityDecision = (agentId, assignmentId, formData) =>
  agentUpload(`/api/agent/${agentId}/assignments/${assignmentId}/decision/`, formData);

// ===============================
// Export Base URL for direct use
// ===============================
export { API_BASE_URL };

export default {
  API_BASE_URL,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  login,
  register,
  getApplications,
  submitApplication,
  getApplicationStatus,
  acknowledgeDelivery,
  createOrder,
  verifyPayment,
  refundPayment,
  getAllColleges,
  addCollege,
  getCollegeCertificates,
  downloadDocument,
  sendNotification,
  updateApplicationStatus,
  addCertificate,
  deleteCertificate,
  getReviews,
  submitReview,
  getVerifications,
  getDeliveryRequests,
  sendCourierEmailAPI,
  submitContact,
  // Agent Module
  agentLogin,
  setAgentToken,
  getAgentToken,
  clearAgentSession,
  getAgentDashboard,
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  toggleAgent,
  getEligibleAgents,
  assignAgent,
  autoAssignAgent,
  getApplicationAssignment,
  getAllAssignments,
  getMyAssignments,
  getAssignmentDetail,
  acceptAssignment,
  rejectAssignment,
  updateAssignmentStatus,
  respondToIssue,
  resolveIssue,
  uploadCollectedDocument,
  addLogistics,
  saveVisitDetails,
  getVisitDetails,
  uploadVisitPhoto,
  submitUniversityDecision,
};
