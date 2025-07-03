// src/components/auth/ProtectedRoute.js
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoginForm from './LoginForm';
import Loading from '../common/Loading';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <LoginForm />;
  }

  return children;
};

export default ProtectedRoute;