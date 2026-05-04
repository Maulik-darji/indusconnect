import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  
  if (loading) return null;
  
  if (user) {
    if (userData?.isOnboarded) {
      return <Navigate to="/" />;
    } else {
      return <Navigate to="/onboarding" />;
    }
  }
  
  return children;
};

export default PublicRoute;
