// src/components/dashboard/Dashboard.js - Versão Limpa e Bonita
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';
import Header from '../common/Header';
import Loading from '../common/Loading';
import StatsCards from './StatsCards';
import PlayerList from '../players/PlayerList';
import PlayerProfile from '../players/PlayerProfile';
import RoundsManager from '../rounds/RoundsManager';

const Dashboard = () => {
  const [players, setPlayers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({ entryFee: 20, ligaName: 'Liga Record' });
  const [loading, setLoading] = useState(true);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [error, setError] = useState(null);

  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [playersData, settingsData, transactionsData] = await Promise.all([
        firestoreService.getPlayers(),
        firestoreService.getSettings(),
        firestoreService.getTransactions()
      ]);

      setPlayers(playersData);
      setSettings(settingsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError('Erro ao carregar dados. Verifica a tua conexão.');
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (playerName) => {
    try {
      const newPlayer = {
        id: Date.now(),
        name: playerName,
        balance: -settings.entryFee,
        paid: false,
        totalPoints: 0,
        totalRounds: 0,
        rounds: [],
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      };

      const saveResult = await firestoreService.savePlayer(newPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save player');
      }

      await firestoreService.addTransaction({
        playerId: newPlayer.id,
        playerName: newPlayer.name,
        type: 'debt',
        amount: settings.entryFee,
        note: 'Quota de entrada da liga',
        balanceAfter: -settings.entryFee
      });

      await loadData();
      
    } catch (error) {
      console.error('❌ Error adding player:', error);
      setError('Erro ao adicionar jogador: ' + error.message);
    }
  };

  const updatePlayer = async (updatedPlayer) => {
    try {
      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to update player');
      }

      await loadData();
      
    } catch (error) {
      console.error('❌ Error updating player:', error);
      setError('Erro ao atualizar jogador: ' + error.message);
    }
  };

  const removePlayer = async (playerId) => {
    try {
      const player = players.find(p => p.id === playerId);
      if (!player) {
        console.warn('Player not found:', playerId);
        return;
      }

      const deleteResult = await firestoreService.deletePlayer(playerId);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete player');
      }

      await firestoreService.addTransaction({
        playerId: player.id,
        playerName: player.name,
        type: 'removal',
        amount: 0,
        note: 'Jogador removido da liga',
        balanceAfter: 0
      });

      await loadData();
      
    } catch (error) {
      console.error('❌ Error removing player:', error);
      setError('Erro ao remover jogador: ' + error.message);
    }
  };

  const togglePaidStatus = async (playerId) => {
    try {
      const player = players.find(p => p.id === playerId);
      if (!player) {
        console.warn('Player not found:', playerId);
        return;
      }

      const updatedPlayer = { ...player, paid: !player.paid };
      
      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to update player status');
      }

      await firestoreService.addTransaction({
        playerId: player.id,
        playerName: player.name,
        type: 'status_change',
        amount: 0,
        note: `Status alterado para: ${!player.paid ? 'Pago' : 'Pendente'}`,
        balanceAfter: player.balance
      });

      await loadData();
      
    } catch (error) {
      console.error('❌ Error toggling paid status:', error);
      setError('Erro ao alterar status: ' + error.message);
    }
  };

  const handleSettingsChange = async (newSettings) => {
    try {
      const saveResult = await firestoreService.saveSettings(newSettings);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save settings');
      }

      setSettings(newSettings);
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      setError('Erro ao guardar configurações: ' + error.message);
    }
  };

  const getTotalPot = () => {
    return players.reduce((total, player) => {
      return total + (player.balance > 0 ? player.balance : 0);
    }, 0);
  };

  if (loading) {
    return <Loading message="A carregar dados da liga..." />;
  }

  if (viewingProfile) {
    return (
      <PlayerProfile
        player={viewingProfile}
        onBack={() => setViewingProfile(null)}
        onUpdatePlayer={updatePlayer}
        transactions={transactions}
        totalPot={getTotalPot()}
        settings={settings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="pt-8 pb-6">
          <Header settings={settings} onSettingsChange={handleSettingsChange} />
        </div>
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 ${
                currentView === 'dashboard'
                  ? 'text-green-600 bg-green-50 border-b-3 border-green-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">📊</span>
                <span>Dashboard Geral</span>
              </div>
            </button>
            <button
              onClick={() => setCurrentView('rounds')}
              className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 ${
                currentView === 'rounds'
                  ? 'text-green-600 bg-green-50 border-b-3 border-green-600'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xl">⚽</span>
                <span>Rondas Semanais</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-8 shadow-md">
            <div className="flex justify-between items-start">
              <div className="flex items-start">
                <div className="text-red-500 mr-3">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-red-800 font-semibold">Erro</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="pb-8">
          {currentView === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCards players={players} settings={settings} />
              </div>
              
              {/* Players List - Simplificado */}
              <PlayerList
                players={players}
                onViewProfile={setViewingProfile}
                onTogglePaidStatus={togglePaidStatus}
                onRemovePlayer={removePlayer}
                onAddPlayer={addPlayer}
              />
            </div>
          )}

          {currentView === 'rounds' && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <span className="mr-3">⚽</span>
                  Gestão de Rondas Semanais
                </h2>
              </div>
              <div className="p-6">
                <RoundsManager
                  players={players}
                  onUpdatePlayers={(updatedPlayers) => {
                    loadData(); // Sempre recarregar para garantir consistência
                  }}
                  settings={settings}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;