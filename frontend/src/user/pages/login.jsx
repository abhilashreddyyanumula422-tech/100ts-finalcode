import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { login } from "../../services/api";
import { validateEmail, validatePassword } from "../../utils/validation";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: location.state?.email || "",
    password: ""
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateForm = () => {
    const newErrors = {};

    const emailErr = validateEmail(form.email);
    if (emailErr) newErrors.email = emailErr;

    // We only need to check if password is empty for login
    if (!form.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Real-time validation
    let errorMsg = "";
    if (name === "email") {
      errorMsg = validateEmail(value);
    } else if (name === "password") {
      if (!value) errorMsg = "Password is required";
    }

    setErrors(prev => ({ ...prev, [name]: errorMsg }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { ok, data } = await login(form.email, form.password);

      if (ok) {
        alert("Login Successful ✅");
        localStorage.setItem("user", JSON.stringify(data));

       if (data.type === "admin") {
  navigate("/admin");
} else {
  navigate("/");
}

        setForm({
          email: "",
          password: ""
        });
      } else {
        alert(data.error || "Login Failed");
      }
    } catch {
      alert("Server Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] font-sans px-4 py-12">
      {/* Abstract Background Elements (Subtle) */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] -ml-20 -mb-20 pointer-events-none" />

      <div className="w-full max-w-md bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative z-10">
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 tracking-tight pb-1">
              Welcome Back
            </h2>
            <p className="text-slate-500 mt-2 font-medium">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative flex items-center justify-center py-3 px-4 border border-transparent rounded-full text-base font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-400 hover:from-blue-700 hover:to-cyan-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
            >
              {loading ? (
                "Signing In..."
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* FOOTER */}
          <p className="text-center text-sm font-medium text-slate-500 mt-8">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;