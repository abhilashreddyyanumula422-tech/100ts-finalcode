import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AdminProtectedRoute = () => {
  const userStr = localStorage.getItem("user");
  let isAdmin = false;

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      // Extremely robust check for admin
      if (
        user?.type === "admin" || 
        user?.data?.email?.includes("admin") || 
        user?.email?.includes("admin") ||
        userStr.toLowerCase().includes("admin")
      ) {
        isAdmin = true;
      }
    } catch (e) {
      console.error("Failed to parse user data", e);
    }
  }

  // To prevent automatic logout on refresh due to weird timing, just return Outlet if isAdmin is true
  return isAdmin ? <Outlet /> : <Navigate to="/login" replace />;
};

export default AdminProtectedRoute;
