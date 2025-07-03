// src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    setError(null);
    
    const result = await authService.signIn(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const signUp = async (email, password, displayName) => {
    setLoading(true);
    setError(null);
    
    const result = await authService.signUp(email, password, displayName);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    const result = await authService.signOut();
    setLoading(false);
    return result;
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};