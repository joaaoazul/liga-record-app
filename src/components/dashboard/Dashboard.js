// src/components/dashboard/Dashboard.js
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
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, rounds
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
      console.error('Error loading data:', error);
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
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      };

      // Save player to database
      const saveResult = await firestoreService.savePlayer(newPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      // Add entry fee transaction
      await firestoreService.addTransaction({
        playerId: newPlayer.id,
        playerName: newPlayer.name,
        type: 'debt',
        amount: settings.entryFee,
        note: 'Quota de entrada da liga',
        balanceAfter: -settings.entryFee
      });

      // Update local state
      setPlayers([...players, newPlayer]);
      await loadData(); // Refresh to get latest transactions
    } catch (error) {
      console.error('Error adding player:', error);
      setError('Erro ao adicionar jogador: ' + error.message);
    }
  };

  const updatePlayer = async (updatedPlayer) => {
    try {
      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      const updatedPlayers = players.map(player => 
        player.id === updatedPlayer.id ? updatedPlayer : player
      );
      setPlayers(updatedPlayers);
      await loadData(); // Refresh transactions
    } catch (error) {
      console.error('Error updating player:', error);
      setError('Erro ao atualizar jogador: ' + error.message);
    }
  };

  const removePlayer = async (playerId) => {
    try {
      const player = players.find(p => p.id === playerId);
      if (!player) return;

      // Delete from database
      const deleteResult = await firestoreService.deletePlayer(playerId);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error);
      }

      // Add removal transaction
      await firestoreService.addTransaction({
        playerId: player.id,
        playerName: player.name,
        type: 'removal',
        amount: 0,
        note: 'Jogador removido da liga',
        balanceAfter: 0
      });

      // Update local state
      const updatedPlayers = players.filter(player => player.id !== playerId);
      setPlayers(updatedPlayers);
      await loadData();
    } catch (error) {
      console.error('Error removing player:', error);
      setError('Erro ao remover jogador: ' + error.message);
    }
  };

  const togglePaidStatus = async (playerId) => {
    try {
      const player = players.find(p => p.id === playerId);
      if (!player) return;

      const updatedPlayer = { ...player, paid: !player.paid };
      
      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      // Add status change transaction
      await firestoreService.addTransaction({
        playerId: player.id,
        playerName: player.name,
        type: 'status_change',
        amount: 0,
        note: `Status alterado para: ${!player.paid ? 'Pago' : 'Pendente'}`,
        balanceAfter: player.balance
      });

      const updatedPlayers = players.map(p => 
        p.id === playerId ? updatedPlayer : p
      );
      setPlayers(updatedPlayers);
      await loadData();
    } catch (error) {
      console.error('Error toggling paid status:', error);
      setError('Erro ao alterar status: ' + error.message);
    }
  };

  const handleSettingsChange = async (newSettings) => {
    try {
      const saveResult = await firestoreService.saveSettings(newSettings);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }

      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header settings={settings} onSettingsChange={handleSettingsChange} />
        
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-6 py-3 font-medium transition-colors ${
                currentView === 'dashboard'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📊 Dashboard Geral
            </button>
            <button
              onClick={() => setCurrentView('rounds')}
              className={`px-6 py-3 font-medium transition-colors ${
                currentView === 'rounds'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              ⚽ Rondas Semanais
            </button>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
              <p className="text-red-600">❌ {error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Content based on current view */}
        {currentView === 'dashboard' && (
          <>
            <StatsCards players={players} settings={settings} />
            <PlayerList
              players={players}
              onViewProfile={setViewingProfile}
              onTogglePaidStatus={togglePaidStatus}
              onRemovePlayer={removePlayer}
              onAddPlayer={addPlayer}
            />
          </>
        )}

        {currentView === 'rounds' && (
          <RoundsManager
            players={players}
            onUpdatePlayers={(updatedPlayers) => {
              setPlayers(updatedPlayers);
              // Refresh all data to ensure consistency
              loadData();
            }}
            settings={settings}
          />
        )}
      </div>
    </div>
  );
                
};

export default Dashboard;