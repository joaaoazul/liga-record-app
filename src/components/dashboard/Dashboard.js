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
      
      console.log('🔄 Loading data...');
      
      const [playersData, settingsData, transactionsData] = await Promise.all([
        firestoreService.getPlayers(),
        firestoreService.getSettings(),
        firestoreService.getTransactions()
      ]);

      console.log('📊 Data loaded:', {
        players: playersData.length,
        transactions: transactionsData.length,
        settings: settingsData
      });

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
      console.log('➕ Adding player:', playerName);
      
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

      console.log('💾 Saving player to Firebase:', newPlayer);
      
      // Save player to database
      const saveResult = await firestoreService.savePlayer(newPlayer);
      console.log('💾 Save result:', saveResult);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save player');
      }

      // Add entry fee transaction
      console.log('💸 Adding entry fee transaction...');
      await firestoreService.addTransaction({
        playerId: newPlayer.id,
        playerName: newPlayer.name,
        type: 'debt',
        amount: settings.entryFee,
        note: 'Quota de entrada da liga',
        balanceAfter: -settings.entryFee
      });

      // CRITICAL FIX: Only reload data, don't mix local state updates
      console.log('🔄 Reloading data to reflect changes...');
      await loadData();
      
      console.log('✅ Player added successfully!');
      
    } catch (error) {
      console.error('❌ Error adding player:', error);
      setError('Erro ao adicionar jogador: ' + error.message);
    }
  };

  const updatePlayer = async (updatedPlayer) => {
    try {
      console.log('🔄 Updating player:', updatedPlayer);
      
      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to update player');
      }

      // Reload all data to ensure consistency
      await loadData();
      
      console.log('✅ Player updated successfully!');
    } catch (error) {
      console.error('❌ Error updating player:', error);
      setError('Erro ao atualizar jogador: ' + error.message);
    }
  };

  const removePlayer = async (playerId) => {
    try {
      console.log('🗑️ Removing player:', playerId);
      
      const player = players.find(p => p.id === playerId);
      if (!player) {
        console.warn('Player not found:', playerId);
        return;
      }

      // Delete from database
      const deleteResult = await firestoreService.deletePlayer(playerId);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete player');
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

      // Reload all data
      await loadData();
      
      console.log('✅ Player removed successfully!');
    } catch (error) {
      console.error('❌ Error removing player:', error);
      setError('Erro ao remover jogador: ' + error.message);
    }
  };

  const togglePaidStatus = async (playerId) => {
    try {
      console.log('💰 Toggling paid status for player:', playerId);
      
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

      // Add status change transaction
      await firestoreService.addTransaction({
        playerId: player.id,
        playerName: player.name,
        type: 'status_change',
        amount: 0,
        note: `Status alterado para: ${!player.paid ? 'Pago' : 'Pendente'}`,
        balanceAfter: player.balance
      });

      // Reload all data
      await loadData();
      
      console.log('✅ Player status updated successfully!');
    } catch (error) {
      console.error('❌ Error toggling paid status:', error);
      setError('Erro ao alterar status: ' + error.message);
    }
  };

  const handleSettingsChange = async (newSettings) => {
    try {
      console.log('⚙️ Updating settings:', newSettings);
      
      const saveResult = await firestoreService.saveSettings(newSettings);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save settings');
      }

      setSettings(newSettings);
      console.log('✅ Settings updated successfully!');
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

  // Force refresh function for debugging
  const forceRefresh = async () => {
    console.log('🔄 Force refresh triggered...');
    await loadData();
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
            {/* Debug button - remove in production */}
            <button
              onClick={forceRefresh}
              className="px-4 py-3 text-sm text-blue-600 hover:text-blue-800 ml-auto"
              title="Force refresh for debugging"
            >
              🔄 Refresh
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

        {/* Debug info - remove in production */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">🔍 Debug Info</h3>
          <div className="text-sm text-blue-700">
            <p>Jogadores carregados: {players.length}</p>
            <p>Transações carregadas: {transactions.length}</p>
            <p>Última atualização: {new Date().toLocaleTimeString()}</p>
            <details className="mt-2">
              <summary className="cursor-pointer">Ver jogadores</summary>
              <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(players.map(p => ({ id: p.id, name: p.name, balance: p.balance })), null, 2)}
              </pre>
            </details>
          </div>
        </div>

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
              console.log('🔄 RoundsManager updating players, reloading data...');
              // Don't set players directly, reload from database
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