// src/components/dashboard/Dashboard.js - VERSÃO CORRIGIDA E OTIMIZADA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';
import Header from '../common/Header';
import StatsCards from './StatsCards';
import PlayerList from '../players/PlayerList';
import PlayerProfile from '../players/PlayerProfile';
import RoundsManager from '../rounds/RoundsManager';
import FinancialReport from '../financial/FinancialReport';

const Dashboard = () => {
  const [players, setPlayers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [settings, setSettings] = useState({
    entryFee: 20,
    weeklyPayment: 5,
    distributionPercentages: [40, 30, 20, 10]
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      loadData();
    }
  }, [user, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading all data...');
      
      const [playersData, transactionsData, settingsData, roundsData] = await Promise.all([
        firestoreService.getPlayers(),
        firestoreService.getTransactions(),
        firestoreService.getSettings(),
        firestoreService.getRounds()
      ]);

      console.log('📊 Data loaded:', {
        players: playersData.length,
        transactions: transactionsData.length,
        rounds: roundsData.length
      });

      setPlayers(playersData || []);
      setTransactions(transactionsData || []);
      setRounds(roundsData || []);
      
      if (settingsData) {
        setSettings(settingsData);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError('Erro ao carregar dados. Verifica a tua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // FUNÇÃO CORRIGIDA: Adicionar Jogador
  const addPlayer = async (playerName) => {
    // Prevenir múltiplas execuções simultâneas
    if (isAddingPlayer) {
      console.warn('⚠️ Already adding a player, ignoring duplicate request');
      return { success: false, error: 'Já está a adicionar um jogador' };
    }

    try {
      setIsAddingPlayer(true);
      console.log('➕ Adding player:', playerName);
      
      // Validação de nome vazio
      if (!playerName || playerName.trim().length === 0) {
        alert('❌ O nome do jogador não pode estar vazio!');
        return { success: false, error: 'Nome vazio' };
      }

      // Validação de comprimento do nome
      if (playerName.trim().length < 2) {
        alert('❌ O nome do jogador deve ter pelo menos 2 caracteres!');
        return { success: false, error: 'Nome muito curto' };
      }

      // Validação de duplicados (case-insensitive e com trim)
      const normalizedName = playerName.trim().toLowerCase();
      const existingPlayer = players.find(p => 
        p.name.toLowerCase().trim() === normalizedName
      );
      
      if (existingPlayer) {
        alert(`❌ Jogador "${playerName.trim()}" já existe na liga!`);
        return { success: false, error: 'Jogador duplicado' };
      }

      // Gerar ID único mais robusto
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 9);
      const uniqueId = `player_${timestamp}_${randomStr}`;
      
      // Criar novo jogador
      const newPlayer = {
        id: uniqueId,
        name: playerName.trim(),
        balance: -settings.entryFee,  // Começa com dívida da quota de entrada
        paid: false,
        totalPoints: 0,
        totalRounds: 0,
        rounds: [],
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous',
        lastUpdated: new Date().toISOString()
      };

      console.log('💾 Saving new player:', newPlayer);
      
      // Salvar no Firebase
      const saveResult = await firestoreService.savePlayer(newPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save player');
      }

      console.log('💸 Adding entry fee transaction...');
      
      // Adicionar transação de quota de entrada
      const transactionResult = await firestoreService.addTransaction({
        playerId: uniqueId,
        playerName: newPlayer.name,
        type: 'debt',
        amount: settings.entryFee,
        note: `Quota de entrada da liga (${settings.entryFee}€)`,
        balanceAfter: -settings.entryFee,
        timestamp: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous'
      });

      if (!transactionResult.success) {
        console.error('⚠️ Failed to create transaction:', transactionResult.error);
      }

      console.log('🔄 Reloading data after player addition...');
      await loadData();
      
      // Notificação de sucesso
      alert(`✅ ${newPlayer.name} foi adicionado à liga com sucesso!\n💰 Quota de entrada: ${settings.entryFee}€`);
      
      console.log('✅ Player added successfully');
      return { success: true, player: newPlayer };
      
    } catch (error) {
      console.error('❌ Error adding player:', error);
      setError('Erro ao adicionar jogador: ' + error.message);
      alert(`❌ Erro ao adicionar jogador: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // FUNÇÃO CORRIGIDA: Atualizar Jogador
  const updatePlayer = async (updatedPlayer) => {
    try {
      console.log('🔄 Updating player:', updatedPlayer);
      
      // Validação básica
      if (!updatedPlayer || !updatedPlayer.id) {
        throw new Error('Dados do jogador inválidos');
      }

      // Adicionar timestamp de última atualização
      updatedPlayer.lastUpdated = new Date().toISOString();
      
      // Salvar no Firebase
      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to update player');
      }

      console.log('✅ Player saved to database');

      // Atualizar estado local
      setPlayers(prevPlayers => 
        prevPlayers.map(p => 
          p.id === updatedPlayer.id ? updatedPlayer : p
        )
      );
      
      // Fechar perfil se estava aberto
      if (viewingProfile && viewingProfile.id === updatedPlayer.id) {
        setViewingProfile(null);
      }
      
      console.log('✅ UI updated successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error updating player:', error);
      setError('Erro ao atualizar jogador: ' + error.message);
      await loadData(); // Recarregar dados em caso de erro
      return { success: false, error: error.message };
    }
  };

  // FUNÇÃO CORRIGIDA: Remover Jogador
  const removePlayer = async (playerId) => {
    try {
      console.log('🗑️ Removing player with ID:', playerId);
      
      // Converter ID para string e procurar jogador
      const playerIdString = String(playerId);
      const player = players.find(p => String(p.id) === playerIdString);
      
      if (!player) {
        console.error('Player not found with ID:', playerId);
        alert('❌ Jogador não encontrado!');
        return { success: false, error: 'Jogador não encontrado' };
      }

      // Confirmação com detalhes
      const confirmDelete = window.confirm(
        `⚠️ ATENÇÃO: Vais eliminar ${player.name}\n\n` +
        `Dados do jogador:\n` +
        `• Saldo atual: ${player.balance.toFixed(2)}€\n` +
        `• Total de pontos: ${player.totalPoints || 0}\n` +
        `• Rondas jogadas: ${player.totalRounds || 0}\n\n` +
        `Esta ação irá:\n` +
        `• Eliminar permanentemente o jogador\n` +
        `• Remover todos os seus dados\n` +
        `• Manter o histórico de transações\n\n` +
        `⚠️ Esta ação NÃO pode ser desfeita!\n\n` +
        `Confirmar eliminação?`
      );
      
      if (!confirmDelete) {
        return { success: false, error: 'Cancelado pelo utilizador' };
      }

      console.log('🗑️ Deleting player from database...');
      
      // Registrar a remoção no histórico
      await firestoreService.addTransaction({
        playerId: playerIdString,
        playerName: player.name,
        type: 'removal',
        amount: 0,
        note: `Jogador removido da liga (Saldo final: ${player.balance.toFixed(2)}€)`,
        balanceAfter: 0,
        timestamp: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous'
      });

      // Eliminar jogador do Firebase
      const deleteResult = await firestoreService.deletePlayer(playerIdString);
      
      if (!deleteResult.success) {
        throw new Error(deleteResult.error || 'Failed to delete player');
      }

      console.log('✅ Player removed successfully');
      
      // Recarregar dados
      await loadData();
      
      // Notificação de sucesso
      alert(`✅ ${player.name} foi removido da liga com sucesso!`);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error removing player:', error);
      alert(`❌ Erro ao remover jogador: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  // FUNÇÃO: Remover Todos os Jogadores
  const removeAllPlayers = async () => {
    try {
      if (players.length === 0) {
        alert('❌ Não há jogadores para eliminar!');
        return;
      }

      // Primeira confirmação
      const confirmDelete = window.confirm(
        `⚠️ ATENÇÃO: Vais eliminar TODOS os ${players.length} jogadores!\n\n` +
        `Esta ação irá:\n` +
        `• Eliminar todos os jogadores da liga\n` +
        `• Apagar todos os dados de jogadores\n` +
        `• Manter apenas o histórico de transações\n\n` +
        `⚠️ Esta ação NÃO pode ser desfeita!\n\n` +
        `Tens a certeza que queres continuar?`
      );
      
      if (!confirmDelete) {
        return;
      }

      // Segunda confirmação
      const doubleConfirm = window.confirm(
        `🚨 ÚLTIMA CONFIRMAÇÃO\n\n` +
        `Vais eliminar ${players.length} jogadores permanentemente.\n\n` +
        `Esta é a tua última oportunidade de cancelar.\n\n` +
        `Confirmar eliminação de TODOS os jogadores?`
      );

      if (!doubleConfirm) {
        return;
      }

      // Terceira confirmação com input
      const userInput = prompt(
        `Para confirmar a eliminação de ${players.length} jogadores,\n` +
        `escreve "ELIMINAR TODOS" (sem aspas):`
      );
      
      if (userInput !== 'ELIMINAR TODOS') {
        alert('❌ Operação cancelada. Texto não corresponde.');
        return;
      }

      console.log('🗑️ Removing all players...');

      // Registrar remoção em massa no histórico
      await firestoreService.addTransaction({
        playerId: 'bulk_removal',
        playerName: 'Todos os Jogadores',
        type: 'removal',
        amount: 0,
        note: `Remoção em massa de ${players.length} jogadores`,
        timestamp: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous'
      });

      // Eliminar cada jogador
      for (const player of players) {
        await firestoreService.deletePlayer(player.id);
      }

      console.log('✅ All players removed successfully');
      
      // Limpar estado e recarregar
      setPlayers([]);
      await loadData();
      
      alert(`✅ ${players.length} jogadores foram removidos com sucesso!`);
      
    } catch (error) {
      console.error('❌ Error removing all players:', error);
      alert(`❌ Erro ao remover jogadores: ${error.message}`);
    }
  };

  // FUNÇÃO: Limpar Jogadores Duplicados
  const cleanDuplicatePlayers = async () => {
    try {
      console.log('🧹 Checking for duplicate players...');
      
      const uniquePlayers = {};
      const duplicates = [];
      
      // Identificar duplicados
      players.forEach(player => {
        const normalizedName = player.name.toLowerCase().trim();
        if (uniquePlayers[normalizedName]) {
          // Manter o jogador mais antigo
          const existing = uniquePlayers[normalizedName];
          if (new Date(player.createdAt) < new Date(existing.createdAt)) {
            duplicates.push(existing);
            uniquePlayers[normalizedName] = player;
          } else {
            duplicates.push(player);
          }
        } else {
          uniquePlayers[normalizedName] = player;
        }
      });
      
      if (duplicates.length === 0) {
        alert('✅ Não foram encontrados jogadores duplicados!');
        return;
      }
      
      const confirmClean = window.confirm(
        `🔍 Encontrados ${duplicates.length} jogadores duplicados:\n\n` +
        duplicates.map(p => `• ${p.name} (Saldo: ${p.balance.toFixed(2)}€)`).join('\n') +
        `\n\nRemover duplicados? (Será mantido o mais antigo de cada)`
      );
      
      if (!confirmClean) {
        return;
      }
      
      // Remover duplicados
      for (const duplicate of duplicates) {
        await firestoreService.deletePlayer(duplicate.id);
      }
      
      await loadData();
      alert(`✅ ${duplicates.length} jogadores duplicados foram removidos!`);
      
    } catch (error) {
      console.error('❌ Error cleaning duplicates:', error);
      alert(`❌ Erro ao limpar duplicados: ${error.message}`);
    }
  };

  // FUNÇÃO: Toggle Status de Pagamento
  const togglePaidStatus = async (playerId) => {
    try {
      const player = players.find(p => p.id === playerId);
      if (!player) return;
      
      const updatedPlayer = {
        ...player,
        paid: !player.paid,
        lastUpdated: new Date().toISOString()
      };
      
      await updatePlayer(updatedPlayer);
      
    } catch (error) {
      console.error('❌ Error toggling paid status:', error);
    }
  };

  // Verificar estado de carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">A carregar dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={logout} user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(null)}
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
            >
              <span className="text-red-500">×</span>
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setCurrentView('rounds')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'rounds'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ⚽ Rondas
            </button>
            <button
              onClick={() => setCurrentView('financial')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentView === 'financial'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💰 Finanças
            </button>
          </nav>
        </div>

        {/* Profile View */}
        {viewingProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold">Perfil do Jogador</h2>
                <button
                  onClick={() => setViewingProfile(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <PlayerProfile
                  player={viewingProfile}
                  onBack={() => setViewingProfile(null)}
                  onUpdatePlayer={updatePlayer}
                  transactions={transactions}
                  totalPot={players.reduce((sum, p) => sum + Math.max(0, -p.balance), 0)}
                  settings={settings}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="pb-8">
          {currentView === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCards players={players} settings={settings} />
              </div>
              
              {/* Players List */}
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
                <h2 className="text-xl font-bold text-white">
                  ⚽ Gestão de Rondas Semanais
                </h2>
              </div>
              <div className="p-6">
                <RoundsManager
                  players={players}
                  onUpdatePlayers={() => loadData()}
                  settings={settings}
                />
              </div>
            </div>
          )}

          {currentView === 'financial' && (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white">
                  💰 Relatórios Financeiros e Gestão de Pagamentos
                </h2>
              </div>
              <div className="p-6">
                <FinancialReport 
                  onBack={() => setCurrentView('dashboard')}
                  players={players}
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