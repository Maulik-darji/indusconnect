import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (user && !userData?.isOnboarded && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />;
  }
  
  return children;
};

export default ProtectedRoute;
