import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiFileText, FiClock, FiShield, FiTruck, FiCheckCircle,
  FiSearch, FiExternalLink, FiDownload, FiAlertTriangle, FiX,
  FiPackage, FiInfo, FiMessageCircle, FiMail, FiChevronRight,
  FiFile
} from "react-icons/fi";
import { getApplicationStatus, acknowledgeDelivery } from "../../services/api";
import { useNavigate, useLocation } from "react-router-dom";

const STATUS_STEP_MAP = {
  pending_approval: 0,
  pending: 1,
  approved: 2,
  document_review: 2,
  university_review: 3,
  changes_requested: 3,
  processing: 3,
  out_for_delivery: 4,
  completed: 5,
  rejected: -1,
};

const STATUS_LABEL_MAP = {
  pending_approval: "Pending Approval",
  pending: "Pending Payment",
  approved: "Application Approved",
  document_review: "Document Review",
  university_review: "University Verification",
  changes_requested: "Changes Requested",
  processing: "Processing",
  out_for_delivery: "Out for Delivery",
  completed: "Delivered",
  rejected: "Rejected",
};

const FileStatus = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [fileId, setFileId] = useState(location.state?.trackingId || "");
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showAckModal, setShowAckModal] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);

  const steps = [
    { id: 0, label: "Application" },
    { id: 1, label: "Payment" },
    { id: 2, label: "Approved" },
    { id: 3, label: "Verification" },
    { id: 4, label: "Dispatched" },
    { id: 5, label: "Delivered" },
  ];

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!fileId.trim()) return;
    setLoading(true);
    setNotFound(false);
    setStatusData(null);
    try {
      const res = await getApplicationStatus(fileId.trim(), null);
      if (res.ok && res.data && !res.data.error) {
        setStatusData(res.data);
        if ((String(res.data.status || "").toLowerCase() === "completed" || ["DELIVERED", "COMPLETED"].includes(res.data.agent_status)) && !res.data.user_acknowledged) {
          setShowAckModal(true);
        }
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (location.state?.trackingId && !statusData) {
      handleSearch();
    }
  }, [location.state]);

  const currentStep = statusData ? (STATUS_STEP_MAP[statusData.status] ?? 0) : 0;
  const isDelivered = statusData?.agent_status === "DELIVERED" || statusData?.status === "completed";
  const isOutForDelivery = statusData?.agent_status === "OUT_FOR_DELIVERY";
  const courierPartner = statusData?.courier_partner;
  const trackingId = statusData?.agent_tracking_id;
  const trackingUrl = statusData?.tracking_url;
  const isRejected = statusData?.status === "rejected";

  const handleAcknowledge = async () => {
    if (!statusData?.application_id) return;
    setAckLoading(true);
    try {
      await acknowledgeDelivery(statusData.application_id);
      setShowAckModal(false);
      navigate("/apply");
    } catch (err) {
      console.error(err);
    } finally {
      setAckLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />
      <div className="min-h-screen bg-gradient-to-b from-[#f0f9ff] to-white text-slate-800 font-jakarta selection:bg-blue-100 pt-28 pb-32">
        
        <div className="max-w-4xl mx-auto px-6">
          {/* HEADER SECTION */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Track Your <span className="text-blue-600">Appli</span><span className="text-cyan-500">cation</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium max-w-lg mx-auto">
              Enter your tracking ID below to check the current status of your documents.
            </p>
          </div>

          {/* SEARCH BOX */}
          <div className="max-w-2xl mx-auto mb-16">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <FiSearch className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="e.g. TRK123456"
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl outline-none text-slate-800 font-semibold transition-all focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-70 shadow-lg shadow-cyan-500/20 whitespace-nowrap"
              >
                {loading ? "Searching..." : "Track Status"}
              </button>
            </form>

            <AnimatePresence>
              {notFound && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
                    <FiAlertTriangle className="flex-shrink-0" /> Application not found. Please check your tracking ID.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* STATUS RESULTS */}
          {statusData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              
              {/* ACTION REQUIRED BANNER */}
              {statusData.active_issue && (
                <div className={`p-6 rounded-2xl border ${
                  statusData.active_issue.status === 'WAITING_FOR_USER' || statusData.active_issue.status === 'OPEN'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <FiAlertTriangle className={`w-6 h-6 ${
                        statusData.active_issue.status === 'WAITING_FOR_USER' || statusData.active_issue.status === 'OPEN' ? 'text-red-600' : 'text-amber-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">
                        {statusData.active_issue.status === 'WAITING_FOR_USER' || statusData.active_issue.status === 'OPEN' ? 'Action Required' : 'Waiting for Review'}
                      </h3>
                      <p className="text-sm opacity-90 mb-4">{statusData.active_issue.message}</p>
                      
                      {(statusData.active_issue.status === 'WAITING_FOR_USER' || statusData.active_issue.status === 'OPEN') && (
                        <button
                          onClick={() => navigate("/apply", { state: { editApplication: true, appData: statusData } })}
                          className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                        >
                          Resolve Issue
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MAIN STATUS CARD */}
              <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${
                        isRejected ? "bg-red-100 text-red-700" :
                        isDelivered ? "bg-emerald-100 text-emerald-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>
                        {isRejected ? "Rejected" : isDelivered ? "Delivered" : "Processing"}
                      </span>
                      <span className="text-slate-400 text-sm font-medium">#{statusData.application_id || trackingId || "—"}</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900">
                      {STATUS_LABEL_MAP[statusData.status] || statusData.status}
                    </h2>
                  </div>
                  
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Applicant</p>
                    <p className="font-bold text-slate-900">{statusData.fullName || "—"}</p>
                    {statusData.university && (
                      <p className="text-sm text-slate-500 font-medium mt-1">{statusData.university}</p>
                    )}
                  </div>
                </div>

                {/* PROGRESS TIMELINE */}
                {!isRejected && (
                  <div className="mt-12 mb-4">
                    <div className="relative flex justify-between">
                      <div className="absolute top-4 left-4 right-4 h-[2px] bg-slate-100"></div>
                      <div 
                        className="absolute top-4 left-4 h-[2px] bg-blue-600 transition-all duration-700 ease-out"
                        style={{ width: `calc(${Math.min(((currentStep) / (steps.length - 1)) * 100, 100)}% - 2rem)` }}
                      ></div>

                      {steps.map((step, i) => {
                        const isDone = i < currentStep;
                        const isCurrent = i === currentStep;
                        return (
                          <div key={i} className="relative z-10 flex flex-col items-center group w-16">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 bg-white transition-all duration-300 ${
                              isDone ? 'border-blue-600 text-blue-600' :
                              isCurrent ? 'border-blue-600 text-blue-600 ring-4 ring-blue-50' :
                              'border-slate-200 text-slate-400'
                            }`}>
                              {isDone ? <FiCheckCircle className="w-4 h-4" /> : (i + 1)}
                            </div>
                            <span className={`mt-3 text-xs font-semibold text-center transition-colors ${
                              isCurrent || isDone ? 'text-slate-800' : 'text-slate-400'
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* DELIVERY DETAILS */}
                {(isOutForDelivery || isDelivered) && (
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <FiTruck className="text-slate-400" /> Delivery Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold">Courier</p>
                        <p className="font-medium text-slate-900">{courierPartner || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold">Tracking ID</p>
                        <p className="font-mono text-sm bg-slate-50 border border-slate-100 px-2 py-1 rounded inline-block mt-1 text-slate-800">
                          {trackingId || "—"}
                        </p>
                      </div>
                      {trackingUrl && (
                        <a
                          href={trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Track on Courier Website <FiExternalLink />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* DIGITAL COPIES */}
                {(isDelivered || (statusData.documents && statusData.documents.length > 0)) && (
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm md:col-span-1">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <FiFile className="text-slate-400" /> Digital Documents
                    </h3>
                    <div className="flex flex-col gap-2">
                      {statusData.documents?.map((doc, idx) => (
                        <a
                          key={doc.id || idx}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-colors group"
                        >
                          <span className="flex items-center gap-3 text-sm font-medium text-slate-700">
                            <FiFileText className="text-slate-400" />
                            <span className="truncate max-w-[200px]">{doc.name || `Document ${idx + 1}`}</span>
                          </span>
                          <FiDownload className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </a>
                      ))}
                      {(!statusData.documents || statusData.documents.length === 0) && (
                        <p className="text-sm text-slate-500 italic">No documents available yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </motion.div>
          )}
        </div>

        {/* ACKNOWLEDGEMENT MODAL */}
        <AnimatePresence>
          {showAckModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl relative text-center"
              >
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FiCheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Delivery Complete</h2>
                <p className="text-slate-500 mb-8 text-sm">Please confirm you have received your documents to finalize this process.</p>
                <button
                  onClick={handleAcknowledge}
                  disabled={ackLoading}
                  className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-70"
                >
                  {ackLoading ? "Confirming..." : "Acknowledge Delivery"}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default FileStatus;