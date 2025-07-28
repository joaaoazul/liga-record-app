// src/components/common/Header.js
import React, { useState } from 'react';
import { Trophy, Cloud, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Header = ({ settings, onSettingsChange }) => {
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSettingsChange = (field, value) => {
    const newSettings = { ...settings, [field]: value };
    onSettingsChange(newSettings);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Trophy className="h-8 w-8 text-green-600" />
          <h1 className="text-3xl font-bold text-gray-800">⚽ Liga Record dos Cuícos</h1>
          <div className="flex items-center space-x-1">
            <Cloud className="h-5 w-5 text-green-600" />
            <span className="text-sm text-green-600">✅ Conectado</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span className="text-sm">Configurações</span>
            </button>
            
            {showSettings && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-64 z-10">
                <h3 className="font-semibold text-gray-800 mb-3">Configurações da Liga</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Liga
                    </label>
                    <input
                      type="text"
                      value={settings.ligaName || 'Liga Record'}
                      onChange={(e) => handleSettingsChange('ligaName', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      💰 Quota de Entrada (€)
                    </label>
                    <input
                      type="number"
                      value={settings.entryFee}
                      onChange={(e) => handleSettingsChange('entryFee', Number(e.target.value))}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🍽️ Objetivo do Pote
                    </label>
                    <input
                      type="text"
                      value={settings.dinnerGoal || 'Jantar de fim de liga'}
                      onChange={(e) => handleSettingsChange('dinnerGoal', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Ex: Jantar no restaurante X"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📅 Data Prevista (opcional)
                    </label>
                    <input
                      type="date"
                      value={settings.dinnerDate || ''}
                      onChange={(e) => handleSettingsChange('dinnerDate', e.target.value)}
                      className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => setShowSettings(false)}
                  className="mt-3 w-full bg-green-600 text-white py-1 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
            >
              <User className="h-5 w-5 text-gray-600" />
              <span className="text-sm text-gray-700">
                {user?.displayName || user?.email?.split('@')[0] || 'Utilizador'}
              </span>
            </button>
            
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-48 z-10">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-800">
                    {user?.displayName || 'Utilizador'}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                  {user?.emailVerified && (
                    <span className="inline-block text-xs bg-green-100 text-green-800 px-2 py-1 rounded mt-1">
                      ✅ Verificado
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Terminar Sessão</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;