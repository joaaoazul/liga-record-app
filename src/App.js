// src/App.js - VERSÃO CORRIGIDA COM ROUTER
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './components/dashboard/Dashboard';
import './index.css';
import ResponsiveDashboard from './components/dashboard/ResponsiveDashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoute>
          <ResponsiveDashboard />
        </ProtectedRoute>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;