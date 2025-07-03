// src/components/auth/LoginForm.js
import React, { useState } from 'react';
import { Mail, Lock, Trophy, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const LoginForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const { signIn, signUp, loading, error, clearError } = useAuth();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setLocalError('');
    clearError();
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setLocalError('Email e password são obrigatórios');
      return false;
    }

    if (!isLogin) {
      if (!formData.displayName) {
        setLocalError('Nome é obrigatório');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setLocalError('As passwords não coincidem');
        return false;
      }
      if (formData.password.length < 6) {
        setLocalError('A password deve ter pelo menos 6 caracteres');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!validateForm()) return;

    try {
      let result;
      if (isLogin) {
        result = await signIn(formData.email, formData.password);
      } else {
        result = await signUp(formData.email, formData.password, formData.displayName);
      }

      if (result.success) {
        // Reset form
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          displayName: ''
        });
      }
    } catch (err) {
      setLocalError('Erro inesperado. Tenta novamente.');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setLocalError('');
    clearError();
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: ''
    });
  };

  const currentError = localError || error;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Trophy className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Liga Record</h1>
          <p className="text-gray-600 mt-2">Gestor de Contas da Liga</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              isLogin 
                ? 'bg-white text-green-600 shadow-sm font-medium' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              !isLogin 
                ? 'bg-white text-green-600 shadow-sm font-medium' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Registar
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name (only for register) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <UserPlus className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="João Silva"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="exemplo@email.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only for register) */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Password
              </label>
              <div className="relative">
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="••••••••"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {currentError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{currentError}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isLogin ? <Mail className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                <span>{isLogin ? 'Entrar' : 'Criar Conta'}</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Account Info */}
        {isLogin && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">🎮 Conta de Demonstração:</p>
            <button
              type="button"
              onClick={() => setFormData({
                ...formData,
                email: 'demo@liga.com',
                password: 'demo123'
              })}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Usar credenciais de demo
            </button>
          </div>
        )}

        {/* Terms */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Ao continuar, aceitas os nossos termos de utilização
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;