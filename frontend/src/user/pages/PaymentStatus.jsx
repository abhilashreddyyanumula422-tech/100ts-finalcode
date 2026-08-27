import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyPayment } from "../../services/api";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentStatus() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const navigate = useNavigate();
  
  const [status, setStatus] = useState("loading"); // loading, success, failed, error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!orderId) {
      setStatus("error");
      setErrorMsg("Order ID is missing.");
      return;
    }

    const checkPayment = async () => {
      try {
        const res = await verifyPayment(orderId);
        if (res.ok && res.data?.status === "PAID") {
          setStatus("success");
          if (res.data?.application) {
            localStorage.setItem("applicationId", res.data.application);
          }
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            navigate("/apply");
          }, 3000);
        } else {
          setStatus("failed");
          setErrorMsg(res.data?.error || "Payment verification failed.");
        }
      } catch (err) {
        setStatus("error");
        setErrorMsg("Failed to connect to verification server.");
      }
    };

    checkPayment();
  }, [orderId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center border border-slate-100"
      >
        {status === "loading" && (
          <div className="space-y-6">
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto" />
            <h2 className="text-2xl font-black text-slate-800 animate-pulse">Verifying Payment...</h2>
            <p className="text-slate-500 font-medium">Please do not close this window or refresh the page.</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800">Payment Successful!</h2>
            <p className="text-emerald-700 font-medium">Verification completed successfully. Redirecting you to your dashboard...</p>
          </div>
        )}

        {status === "failed" && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800">Payment Failed</h2>
            <p className="text-red-700 font-medium">{errorMsg}</p>
            <button
              onClick={() => navigate("/apply")}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Back to Application
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-800">Error</h2>
            <p className="text-red-700 font-medium">{errorMsg}</p>
            <button
              onClick={() => navigate("/apply")}
              className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Back to Application
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
