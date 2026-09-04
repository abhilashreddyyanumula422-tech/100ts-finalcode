import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Phone, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { register } from "../../services/api";
import { 
  validateName, 
  validatePhone, 
  validateEmail, 
  validatePassword, 
  restrictNameInput, 
  restrictPhoneInput 
} from "../../utils/validation";

const Register = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;

  const validateForm = () => {
    const newErrors = {};

    const nameErr = validateName(form.name);
    if (nameErr) newErrors.name = nameErr;

    const emailErr = validateEmail(form.email);
    if (emailErr) newErrors.email = emailErr;

    const phoneErr = validatePhone(form.phone);
    if (phoneErr) newErrors.phone = phoneErr;

    const passErr = validatePassword(form.password);
    if (passErr) newErrors.password = passErr;

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Real-time validation
    let errorMsg = "";
    if (name === "name") errorMsg = validateName(value);
    else if (name === "email") errorMsg = validateEmail(value);
    else if (name === "phone") errorMsg = validatePhone(value);
    else if (name === "password") {
      errorMsg = validatePassword(value);
      if (form.confirmPassword && value !== form.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
      } else if (form.confirmPassword) {
        setErrors(prev => ({ ...prev, confirmPassword: "" }));
      }
    }
    else if (name === "confirmPassword") {
      if (!value) errorMsg = "Please confirm your password";
      else if (value !== form.password) errorMsg = "Passwords do not match";
    }

    setErrors(prev => ({ ...prev, [name]: errorMsg }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!form.email.endsWith("@gmail.com")) {
      alert("Only students can register");
      return;
    }

    setLoading(true);

    try {
      const { ok, data } = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password
      });

      if (ok) {
        alert("Registered successfully ✅");
        navigate("/login", { state: { email: form.email.trim() } });
      } else {
        alert(data.error || "Registration Failed");
      }
    } catch {
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] font-sans px-4 py-12">
      {/* Abstract Background Elements (Subtle) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none" />

      <div className="w-full max-w-xl bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative z-10">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 tracking-tight pb-1">
              Create Account
            </h2>
            <p className="text-slate-500 mt-2 font-medium">Please fill in your details to get started.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              {/* NAME */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={handleChange}
                    onKeyPress={restrictNameInput}
                    required
                    className={`block w-full pl-11 pr-4 py-3.5 border bg-white rounded-xl text-sm font-medium text-slate-900 outline-none transition-all focus:ring-4 ${
                      errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-300'
                    }`}
                  />
                </div>
                {errors.name && <p className="text-xs text-red-500 font-semibold mt-1">{errors.name}</p>}
              </div>

              {/* PHONE */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Phone Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={handleChange}
                    onKeyPress={restrictPhoneInput}
                    maxLength={10}
                    required
                    className={`block w-full pl-11 pr-4 py-3.5 border bg-white rounded-xl text-sm font-medium text-slate-900 outline-none transition-all focus:ring-4 ${
                      errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-300'
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 font-semibold mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* EMAIL */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={`block w-full pl-11 pr-4 py-3.5 border bg-white rounded-xl text-sm font-medium text-slate-900 outline-none transition-all focus:ring-4 ${
                    errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-300'
                  }`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 font-semibold mt-1">{errors.email}</p>}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* PASSWORD */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className={`block w-full pl-11 pr-11 py-3.5 border bg-white rounded-xl text-sm font-medium text-slate-900 outline-none transition-all focus:ring-4 ${
                      errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 font-semibold mt-1">{errors.password}</p>}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    required
                    className={`block w-full pl-11 pr-11 py-3.5 border bg-white rounded-xl text-sm font-medium text-slate-900 outline-none transition-all focus:ring-4 ${
                      errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-slate-300'
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors outline-none"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500 font-semibold mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex items-center justify-center py-3 px-4 border border-transparent rounded-full text-base font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group mt-6"
            >
              {loading ? (
                "Creating Account..."
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* FOOTER */}
          <p className="text-center text-sm font-medium text-slate-500 mt-8">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;