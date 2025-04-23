import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Component to protect routes that require authentication
const ProtectedRoute = ({ children, requiredGroups = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    // Redirect to Authelia login page
    window.location.href = `https://auth.example.com/?rd=${window.location.href}`;
    return null;
  }

  // If groups are required, check if user has the required groups
  if (requiredGroups.length > 0) {
    const userGroups = user.groups || [];
    const hasRequiredGroup = requiredGroups.some(group => userGroups.includes(group));
    
    if (!hasRequiredGroup) {
      return <Navigate to="/unauthorized" />;
    }
  }

  // If authenticated and has required groups, render the protected component
  return children;
};

export default ProtectedRoute;
