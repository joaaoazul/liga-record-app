// src/components/settings/Settings.js
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Euro, 
  Target, 
  Percent,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { firestoreService } from '../../services/firebase';

const Settings = ({ onClose, onUpdate }) => {
  const [settings, setSettings] = useState({
    entryFee: 12,
    weeklyPayment: 5,
    dinnerPotGoal: 200,
    distributionPercentages: [40, 30, 20, 10]
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Carregar configurações ao montar
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const currentSettings = await firestoreService.getSettings();
      if (currentSettings) {
        setSettings(currentSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setMessage('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validações
    if (settings.entryFee < 0 || settings.entryFee > 100) {
      setMessage('Taxa de entrada deve estar entre 0€ e 100€');
      return;
    }
    
    if (settings.weeklyPayment < 0 || settings.weeklyPayment > 50) {
      setMessage('Taxa semanal deve estar entre 0€ e 50€');
      return;
    }
    
    if (settings.dinnerPotGoal < 50 || settings.dinnerPotGoal > 5000) {
      setMessage('Objetivo do pote deve estar entre 50€ e 5000€');
      return;
    }
    
    const totalPercentage = settings.distributionPercentages.reduce((a, b) => a + b, 0);
    if (totalPercentage !== 100) {
      setMessage(`A soma das percentagens deve ser 100% (atual: ${totalPercentage}%)`);
      return;
    }

    setSaving(true);
    try {
      const result = await firestoreService.updateSettings(settings);
      
      if (result.success) {
        setMessage('Configurações guardadas com sucesso!');
        
        // Atualizar componente pai se callback existir
        if (onUpdate) {
          onUpdate(settings);
        }
        
        // Fechar após 2 segundos
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      } else {
        setMessage('Erro ao guardar configurações');
      }
    } catch (error) {
      console.error('Erro ao guardar configurações:', error);
      setMessage('Erro ao guardar configurações');
    } finally {
      setSaving(false);
    }
  };

  const handlePercentageChange = (index, value) => {
    const newPercentages = [...settings.distributionPercentages];
    newPercentages[index] = parseFloat(value) || 0;
    setSettings({ ...settings, distributionPercentages: newPercentages });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>A carregar configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <SettingsIcon className="h-6 w-6 text-gray-700" />
              <h2 className="text-xl font-bold text-gray-800">Configurações da Liga</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={saving}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mensagem de feedback */}
          {message && (
            <div className={`p-3 rounded-lg flex items-center space-x-2 ${
              message.includes('sucesso') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {message.includes('sucesso') ? (
                <Check className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{message}</span>
            </div>
          )}

          {/* Taxa de Entrada */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taxa de Entrada (Entry Fee)
            </label>
            <div className="flex items-center space-x-2">
              <Euro className="h-5 w-5 text-gray-500" />
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={settings.entryFee}
                onChange={(e) => setSettings({ ...settings, entryFee: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-600">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Taxa paga uma vez ao entrar na liga
            </p>
          </div>

          {/* Taxa Semanal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taxa Semanal (Weekly Payment)
            </label>
            <div className="flex items-center space-x-2">
              <Euro className="h-5 w-5 text-gray-500" />
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={settings.weeklyPayment}
                onChange={(e) => setSettings({ ...settings, weeklyPayment: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-600">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Valor máximo cobrado semanalmente com base na classificação
            </p>
          </div>

          {/* Objetivo do Pote */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Objetivo do Pote de Jantar
            </label>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-gray-500" />
              <input
                type="number"
                min="50"
                max="5000"
                step="10"
                value={settings.dinnerPotGoal}
                onChange={(e) => setSettings({ ...settings, dinnerPotGoal: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-600">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Meta para o jantar de fim de temporada
            </p>
          </div>


          {/* Informação adicional */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Informação Importante:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• As alterações aplicam-se apenas a futuras rondas</li>
              <li>• Rondas em curso mantêm as configurações originais</li>
              <li>• A distribuição de prémios aplica-se no final da temporada</li>
              <li>• Recomenda-se não alterar valores durante a temporada</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Última atualização: {new Date().toLocaleDateString('pt-PT')}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'A guardar...' : 'Guardar Alterações'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;