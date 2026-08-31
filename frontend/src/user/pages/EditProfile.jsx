import React, { useState } from "react";
import { motion } from "framer-motion";
import { FiUser, FiMail, FiSave, FiArrowLeft } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";

const EditProfile = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  
  const [formData, setFormData] = useState({
    name: user?.data?.name || user?.name || user?.data?.username || user?.username || "",
    email: user?.data?.email || user?.email || "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call to update profile
    setTimeout(() => {
      // Update local storage for immediate UI reflection
      const updatedUser = { ...user };
      if (updatedUser.data) {
        updatedUser.data.name = formData.name;
        updatedUser.data.email = formData.email;
      } else {
        updatedUser.name = formData.name;
        updatedUser.email = formData.email;
      }
      
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      setLoading(false);
      setSuccess(true);
      
      setTimeout(() => {
        navigate("/");
      }, 1500);
    }, 1000);
  };

  return (
    <div className="bg-[#f8fafc] min-h-screen pt-28 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-semibold mb-6"
        >
          <FiArrowLeft /> Back to Home
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-slate-100"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-800">Edit Profile</h1>
            <p className="text-slate-500 mt-2 font-medium">Update your personal information</p>
          </div>

          {success && (
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl mb-6 font-bold text-center border border-emerald-200">
              Profile updated successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 px-1">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 px-1">Email Address</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold text-slate-700"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? (
                  <span>Saving Changes...</span>
                ) : (
                  <>
                    <FiSave className="text-lg" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default EditProfile;
