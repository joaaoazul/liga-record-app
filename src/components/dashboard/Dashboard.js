// src/components/dashboard/Dashboard.js - Versão Completa Corrigida
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
  const [isAddingPlayer, setIsAddingPlayer] = useState(false); // Prevent multiple adds

  const { user } = useAuth();

  useEffect(() => {
    console.log('🔄 Dashboard useEffect triggered');
    loadData();
  }, []); // Empty dependency array - only run once!

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading data... Timestamp:', new Date().toISOString());
      
      const [playersData, settingsData, transactionsData] = await Promise.all([
        firestoreService.getPlayers(),
        firestoreService.getSettings(),
        firestoreService.getTransactions()
      ]);

      console.log('📊 Data loaded:', {
        players: playersData.length,
        transactions: transactionsData.length,
        timestamp: new Date().toISOString()
      });

      // DEDUPLICATE PLAYERS by name (in case of duplicates in DB)
      const uniquePlayers = [];
      const seenNames = new Set();
      
      for (const player of playersData) {
        const normalizedName = player.name.toLowerCase().trim();
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName);
          uniquePlayers.push(player);
        } else {
          console.warn('🚨 Duplicate player found and skipped:', player.name, player.id);
        }
      }

      if (uniquePlayers.length !== playersData.length) {
        console.warn(`⚠️ Removed ${playersData.length - uniquePlayers.length} duplicate players from display`);
      }

      setPlayers(uniquePlayers);
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
    // PREVENT MULTIPLE SIMULTANEOUS ADDITIONS
    if (isAddingPlayer) {
      console.warn('⚠️ Already adding a player, ignoring duplicate request');
      return;
    }

    try {
      setIsAddingPlayer(true);
      console.log('➕ Adding player:', playerName);
      
      // CHECK IF PLAYER ALREADY EXISTS
      const existingPlayer = players.find(p => 
        p.name.toLowerCase().trim() === playerName.toLowerCase().trim()
      );
      
      if (existingPlayer) {
        alert(`❌ Jogador "${playerName}" já existe na liga!`);
        return;
      }

      // CREATE UNIQUE ID with timestamp + random
      const uniqueId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newPlayer = {
        id: uniqueId,
        name: playerName.trim(),
        balance: -settings.entryFee,
        paid: false,
        totalPoints: 0,
        totalRounds: 0,
        rounds: [],
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      };

      console.log('💾 Saving new player with unique ID:', uniqueId);
      const saveResult = await firestoreService.savePlayer(newPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save player');
      }

      console.log('💸 Adding entry fee transaction...');
      await firestoreService.addTransaction({
        playerId: uniqueId,
        playerName: newPlayer.name,
        type: 'debt',
        amount: settings.entryFee,
        note: 'Quota de entrada da liga',
        balanceAfter: -settings.entryFee
      });

      console.log('🔄 Reloading data after player addition...');
      await loadData();
      
      console.log('✅ Player added successfully');
      
    } catch (error) {
      console.error('❌ Error adding player:', error);
      setError('Erro ao adicionar jogador: ' + error.message);
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const updatePlayer = async (updatedPlayer) => {
    try {
      console.log('🔄 Updating player:', updatedPlayer);
      
      // Salvar no Firebase
      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to update player');
      }

      console.log('✅ Player saved to database');

      // Opção 1: Atualizar localmente para resposta imediata
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.id === updatedPlayer.id ? updatedPlayer : p
        )
      );

      // Opção 2: Recarregar todos os dados para garantir consistência
      // Descomentar se preferir esta abordagem:
      // await loadData();
      
      // Se estamos a ver o perfil, fechar e voltar à lista
      if (viewingProfile && viewingProfile.id === updatedPlayer.id) {
        setViewingProfile(null);
      }
      
      console.log('✅ UI updated successfully');
      
    } catch (error) {
      console.error('❌ Error updating player:', error);
      setError('Erro ao atualizar jogador: ' + error.message);
      // Recarregar dados em caso de erro para garantir consistência
      await loadData();
    }
  };

  const removePlayer = async (playerId) => {
    try {
      console.log('🗑️ Removing player with ID:', playerId, 'Type:', typeof playerId);
      
      // Garantir que o ID é uma string
      const playerIdString = String(playerId);
      
      // Encontrar o jogador
      const player = players.find(p => String(p.id) === playerIdString);
      if (!player) {
        console.error('Player not found with ID:', playerId);
        console.log('Available players:', players.map(p => ({ id: p.id, name: p.name })));
        alert('Jogador não encontrado!');
        return;
      }

      const confirmDelete = window.confirm(
        `Tens a certeza que queres eliminar ${player.name}?\n\n` +
        `Esta ação irá:\n` +
        `• Eliminar permanentemente o jogador\n` +
        `• Remover todos os seus dados\n` +
        `• Esta ação NÃO pode ser desfeita\n\n` +
        `Confirmar eliminação?`
      );
      
      if (!confirmDelete) {
        return;
      }

      console.log('🗑️ Deleting player from database...');
      
      // Primeiro adicionar transação de remoção
      await firestoreService.addTransaction({
        playerId: playerIdString,
        playerName: player.name,
        type: 'removal',
        amount: 0,
        note: 'Jogador removido da liga',
        balanceAfter: 0,
        timestamp: new Date().toISOString()
      });

      // Depois eliminar o jogador
      const deleteResult = await firestoreService.deletePlayer(playerIdString);
      
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete player');
      }

      console.log('✅ Player removed successfully');
      
      // Recarregar dados imediatamente
      await loadData();
      
      // Notificar sucesso
      alert(`✅ ${player.name} foi removido da liga com sucesso!`);
      
    } catch (error) {
      console.error('❌ Error removing player:', error);
      alert('Erro ao remover jogador: ' + error.message);
    }
  };

  const removeAllPlayers = async () => {
    try {
      if (players.length === 0) {
        alert('Não há jogadores para eliminar!');
        return;
      }

      const confirmDelete = window.confirm(
        `⚠️ ATENÇÃO: Vais eliminar TODOS os ${players.length} jogadores!\n\n` +
        `Esta ação irá:\n` +
        `• Eliminar todos os jogadores da liga\n` +
        `• Manter o histórico de transações\n` +
        `• Esta ação NÃO pode ser desfeita\n\n` +
        `Tens a certeza que queres continuar?`
      );
      
      if (!confirmDelete) {
        return;
      }

      const doubleConfirm = window.confirm(
        `🚨 ÚLTIMA CONFIRMAÇÃO\n\n` +
        `Vais eliminar ${players.length} jogadores permanentemente.\n\n` +
        `Escreve "ELIMINAR TODOS" para confirmar (sem aspas)`
      );

      if (!doubleConfirm) {
        return;
      }

      const userInput = prompt('Escreve "ELIMINAR TODOS" para confirmar:');
      if (userInput !== 'ELIMINAR TODOS') {
        alert('Operação cancelada. Texto não corresponde.');
        return;
      }

      console.log('🗑️ Starting bulk player deletion...');
      setError(null);

      let deletedCount = 0;
      const totalPlayers = players.length;

      for (const player of players) {
        try {
          console.log(`🗑️ Deleting player ${deletedCount + 1}/${totalPlayers}: ${player.name}`);
          
          const deleteResult = await firestoreService.deletePlayer(String(player.id));
          if (deleteResult.success) {
            // Add removal transaction
            await firestoreService.addTransaction({
              playerId: String(player.id),
              playerName: player.name,
              type: 'bulk_removal',
              amount: 0,
              note: 'Jogador removido - limpeza em massa',
              balanceAfter: 0
            });
            
            deletedCount++;
          } else {
            console.error(`Failed to delete ${player.name}:`, deleteResult.error);
          }
        } catch (playerError) {
          console.error(`Error deleting ${player.name}:`, playerError);
        }
      }

      console.log(`✅ Bulk deletion completed: ${deletedCount}/${totalPlayers} deleted`);
      
      // Reload data
      await loadData();
      
      alert(`🎉 Eliminação concluída!\n\n${deletedCount} de ${totalPlayers} jogadores foram eliminados com sucesso.`);
      
    } catch (error) {
      console.error('❌ Error in bulk deletion:', error);
      setError('Erro na eliminação em massa: ' + error.message);
    }
  };

  const cleanDuplicatePlayers = async () => {
    try {
      console.log('🧹 Starting duplicate cleanup...');
      
      // Get all players from database
      const allPlayers = await firestoreService.getPlayers();
      console.log('📊 Total players in DB:', allPlayers.length);
      
      // Find duplicates by name
      const duplicateGroups = {};
      allPlayers.forEach(player => {
        const normalizedName = player.name.toLowerCase().trim();
        if (!duplicateGroups[normalizedName]) {
          duplicateGroups[normalizedName] = [];
        }
        duplicateGroups[normalizedName].push(player);
      });
      
      // Find groups with more than 1 player
      const duplicates = Object.values(duplicateGroups).filter(group => group.length > 1);
      
      if (duplicates.length === 0) {
        alert('✅ Não foram encontrados jogadores duplicados!');
        return;
      }
      
      let totalDuplicates = 0;
      duplicates.forEach(group => totalDuplicates += group.length - 1);
      
      const confirmClean = window.confirm(
        `🧹 Encontrados jogadores duplicados!\n\n` +
        `Grupos duplicados: ${duplicates.length}\n` +
        `Jogadores a eliminar: ${totalDuplicates}\n\n` +
        `Para cada nome, será mantido o jogador mais recente.\n\n` +
        `Queres continuar?`
      );
      
      if (!confirmClean) return;
      
      let cleanedCount = 0;
      
      for (const group of duplicates) {
        // Sort by creation date, keep the newest
        group.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        
        const keepPlayer = group[0]; // Most recent
        const deleteList = group.slice(1); // All others
        
        console.log(`🧹 Keeping: ${keepPlayer.name} (${keepPlayer.id})`);
        console.log(`🗑️ Deleting ${deleteList.length} duplicates...`);
        
        for (const duplicatePlayer of deleteList) {
          try {
            const deleteResult = await firestoreService.deletePlayer(String(duplicatePlayer.id));
            if (deleteResult.success) {
              await firestoreService.addTransaction({
                playerId: String(duplicatePlayer.id),
                playerName: duplicatePlayer.name,
                type: 'duplicate_cleanup',
                amount: 0,
                note: 'Jogador duplicado removido - limpeza automática',
                balanceAfter: 0
              });
              cleanedCount++;
              console.log(`✅ Deleted duplicate: ${duplicatePlayer.name} (${duplicatePlayer.id})`);
            }
          } catch (cleanError) {
            console.error(`❌ Failed to delete duplicate ${duplicatePlayer.name}:`, cleanError);
          }
        }
      }
      
      await loadData();
      
      alert(`🎉 Limpeza concluída!\n\n${cleanedCount} jogadores duplicados foram removidos.`);
      
    } catch (error) {
      console.error('❌ Error cleaning duplicates:', error);
      setError('Erro na limpeza de duplicados: ' + error.message);
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
                onRemoveAllPlayers={removeAllPlayers}
                onCleanDuplicates={cleanDuplicatePlayers}
                onAddPlayer={addPlayer}
                isAddingPlayer={isAddingPlayer}
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