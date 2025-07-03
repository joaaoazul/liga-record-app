// src/hooks/useAuth.js
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
      
      // Log user info for debugging (remove in production)
      if (user) {
        console.log('User authenticated:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        });
      } else {
        console.log('User signed out');
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.signIn(email, password);
      
      if (!result.success) {
        setError(getErrorMessage(result.error));
        return { success: false, error: result.error };
      }
      
      setLoading(false);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Sign in error:', error);
      setError('Erro inesperado ao fazer login');
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signUp = async (email, password, displayName) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await authService.signUp(email, password, displayName);
      
      if (!result.success) {
        setError(getErrorMessage(result.error));
        return { success: false, error: result.error };
      }
      
      setLoading(false);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Sign up error:', error);
      setError('Erro inesperado ao criar conta');
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const result = await authService.signOut();
      
      if (result.success) {
        setUser(null);
        setError(null);
      }
      
      setLoading(false);
      return result;
    } catch (error) {
      console.error('Sign out error:', error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const clearError = () => {
    setError(null);
  };

  // Helper function to translate Firebase errors to Portuguese
  const getErrorMessage = (errorCode) => {
    const errorMessages = {
      'auth/user-not-found': 'Utilizador não encontrado',
      'auth/wrong-password': 'Password incorreta',
      'auth/email-already-in-use': 'Este email já está em uso',
      'auth/weak-password': 'Password muito fraca (mínimo 6 caracteres)',
      'auth/invalid-email': 'Email inválido',
      'auth/user-disabled': 'Conta desativada',
      'auth/too-many-requests': 'Muitas tentativas. Tenta mais tarde',
      'auth/network-request-failed': 'Erro de conexão à internet',
      'auth/invalid-credential': 'Credenciais inválidas',
      'auth/missing-password': 'Password é obrigatória',
      'auth/missing-email': 'Email é obrigatório',
      'auth/requires-recent-login': 'É necessário fazer login novamente',
      'auth/credential-already-in-use': 'Credenciais já em uso',
      'auth/invalid-verification-code': 'Código de verificação inválido',
      'auth/invalid-verification-id': 'ID de verificação inválido'
    };

    return errorMessages[errorCode] || 'Erro desconhecido. Tenta novamente.';
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return user !== null;
  };

  // Check if user email is verified
  const isEmailVerified = () => {
    return user?.emailVerified || false;
  };

  // Get user display name
  const getUserDisplayName = () => {
    return user?.displayName || user?.email?.split('@')[0] || 'Utilizador';
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const value = {
    // State
    user,
    loading,
    error,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    clearError,
    
    // Helper methods
    isAuthenticated,
    isEmailVerified,
    getUserDisplayName,
    getUserInitials
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// Higher-order component for protecting routes
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth();
    
    if (loading) {
      return <div>Loading...</div>;
    }
    
    if (!user) {
      return <div>Access denied. Please log in.</div>;
    }
    
    return <Component {...props} />;
  };
};

export default AuthProvider;