// src/components/rounds/RoundsManager.js - VERSÃO COMPLETA CORRIGIDA
import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Users, Euro, Plus, Edit, Eye, Target, TrendingDown, Award, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';

// Helper para calcular semana do ano
Date.prototype.getWeek = function() {
  const onejan = new Date(this.getFullYear(), 0, 1);
  return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

const RoundsManager = ({ players = [], onUpdatePlayers, settings }) => {
  const [rounds, setRounds] = useState([]);
  const [currentRound, setCurrentRound] = useState(null);
  const [showCreateRound, setShowCreateRound] = useState(false);
  const [showRoundResults, setShowRoundResults] = useState(null);
  const [showFinishRound, setShowFinishRound] = useState(null);
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();

  // Safety check for players - garantir que é sempre um array válido
  const safePlayers = Array.isArray(players) ? players : [];

  useEffect(() => {
    loadRounds();
  }, []);

  const loadRounds = async () => {
    try {
      console.log('📥 Loading rounds...');
      const roundsData = await firestoreService.getRounds();
      console.log('📊 Loaded rounds:', roundsData);
      
      const sortedRounds = roundsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRounds(sortedRounds);
      
      // Find current active round
      const activeRound = sortedRounds.find(r => r.status === 'active');
      console.log('🎯 Active round found:', activeRound);
      setCurrentRound(activeRound);
    } catch (error) {
      console.error('Error loading rounds:', error);
    }
  };

  const createNewRound = async (roundData) => {
    try {
      setLoading(true);
      console.log('🆕 Creating new round:', roundData);
      
      // Close any active round first
      if (currentRound) {
        console.log('🔄 Closing current round:', currentRound.id);
        const closeResult = await firestoreService.updateRound(currentRound.id, { 
          status: 'completed',
          completedAt: new Date().toISOString()
        });
        
        if (!closeResult.success) {
          console.warn('⚠️ Failed to close current round, but continuing...');
        }
      }

      // IMPORTANTE: Gerar o ID antes de criar
      const roundId = `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newRound = {
        id: roundId, // ID específico
        name: roundData.name,
        week: roundData.week,
        month: roundData.month,
        year: new Date().getFullYear(),
        status: 'active',
        participants: safePlayers.map(p => ({
          playerId: p.id,
          playerName: p.name,
          points: 0,
          position: null,
          weeklyPayment: 0,
          paid: false
        })),
        paymentStructure: roundData.paymentStructure,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous'
      };

      console.log('💾 Saving new round with ID:', roundId);
      const result = await firestoreService.addRound(newRound);
      console.log('💾 Save result:', result);

      if (result.success) {
        // Wait a bit before reloading to ensure DB consistency
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadRounds();
        setShowCreateRound(false);
        console.log('✅ Round created successfully!');
        alert('🎉 Nova ronda criada com sucesso!');
      } else {
        throw new Error('Failed to create round: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error creating round:', error);
      alert('Erro ao criar ronda: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const finishRound = async (roundId, results) => {
    try {
      setLoading(true);
      console.log('🏁 Starting round finish process...', { roundId, results });
      
      if (!currentRound) {
        throw new Error('No current round found');
      }

      // Calculate payments based on positions
      const updatedParticipants = results.map((participant, index) => ({
        ...participant,
        position: index + 1,
        weeklyPayment: currentRound.paymentStructure[index] || 0
      }));

      console.log('💰 Calculated participants with payments:', updatedParticipants);

      // Update round in database
      const actualRoundId = currentRound.id || roundId;
      console.log('📝 Updating round with ID:', actualRoundId);

      const roundUpdateResult = await firestoreService.updateRound(actualRoundId, {
        status: 'completed',
        participants: updatedParticipants,
        completedAt: new Date().toISOString()
      });

      if (!roundUpdateResult.success) {
        throw new Error('Failed to update round status: ' + roundUpdateResult.error);
      }

      // Update player balances and add round points to their history
      const updatedPlayers = [];
      
      for (const player of safePlayers) {
        const participant = updatedParticipants.find(p => p.playerId === player.id);
        if (participant) {
          const newBalance = participant.weeklyPayment > 0 ? 
            (player.balance || 0) - participant.weeklyPayment : 
            (player.balance || 0);
          
          // Add round to player's rounds history
          const playerRounds = player.rounds || [];
          const newRoundData = {
            roundId: actualRoundId,
            roundName: currentRound.name,
            points: participant.points,
            position: participant.position,
            payment: participant.weeklyPayment,
            date: new Date().toISOString()
          };
          
          const updatedPlayer = {
            ...player,
            balance: newBalance,
            rounds: [...playerRounds, newRoundData],
            totalPoints: (player.totalPoints || 0) + participant.points,
            totalRounds: (player.totalRounds || 0) + 1
          };
          
          console.log(`💾 Saving player ${player.name}: balance ${player.balance || 0} -> ${newBalance}, points +${participant.points}`);
          
          // Save updated player to database
          const saveResult = await firestoreService.savePlayer(updatedPlayer);
          console.log(`💾 Save result for ${player.name}:`, saveResult);
          
          if (saveResult.success) {
            updatedPlayers.push(updatedPlayer);
          } else {
            console.error(`Failed to save player ${player.name}:`, saveResult.error);
            updatedPlayers.push(player);
          }
        } else {
          updatedPlayers.push(player);
        }
      }

      // Add transactions for payments
      for (const participant of updatedParticipants) {
        if (participant.weeklyPayment > 0) {
          const playerBalance = updatedPlayers.find(p => p.id === participant.playerId)?.balance || 0;
          try {
            await firestoreService.addTransaction({
              playerId: participant.playerId,
              playerName: participant.playerName,
              type: 'debt',
              amount: participant.weeklyPayment,
              note: `Pagamento semanal - ${participant.position}º lugar na ${currentRound.name}`,
              balanceAfter: playerBalance,
              roundId: actualRoundId,
              date: new Date().toISOString()
            });
          } catch (transactionError) {
            console.error(`Failed to create transaction for ${participant.playerName}:`, transactionError);
          }
        }
      }

      // Update parent component with new players
      console.log('🔄 Updating parent with new players...');
      if (onUpdatePlayers && typeof onUpdatePlayers === 'function') {
        onUpdatePlayers(updatedPlayers);
      }
      
      // CRITICAL FIX: Clear current round BEFORE reloading
      setCurrentRound(null);
      setShowFinishRound(null);
      
      // Reload rounds to ensure UI consistency
      console.log('🔄 Reloading rounds...');
      await loadRounds();
      
      console.log('✅ Round finished successfully!');
      alert('🎉 Ronda finalizada com sucesso!');
      
    } catch (error) {
      console.error('❌ Error finishing round:', error);
      alert('Erro ao finalizar ronda: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPaymentStructure = (playerCount) => {
    if (!playerCount || playerCount <= 0) return [0];
    
    console.log('🏗️ Creating payment structure for', playerCount, 'players');
    
    if (playerCount <= 4) {
      return [0, 0.25, 0.5, 1].slice(0, playerCount);
    } else if (playerCount <= 6) {
      return [0, 0.25, 0.5, 1, 1.5, 2].slice(0, playerCount);
    } else if (playerCount <= 8) {
      return [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5].slice(0, playerCount);
    } else if (playerCount <= 10) {
      return [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5].slice(0, playerCount);
    } else if (playerCount <= 12) {
      return [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3].slice(0, playerCount);
    } else {
      // Para mais de 12 jogadores, criar estrutura dinâmica
      const structure = [0]; // 1º lugar sempre grátis
      const increment = 0.25;
      const maxPayment = 3;
      
      for (let i = 1; i < playerCount; i++) {
        const payment = Math.min(increment * i, maxPayment);
        structure.push(payment);
      }
      
      console.log('📊 Generated structure for', playerCount, 'players:', structure);
      return structure.slice(0, playerCount);
    }
  };

  const getCurrentMonthRounds = () => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthRounds = rounds.filter(r => r.month === currentMonth && r.year === currentYear);
    const completedRounds = monthRounds.filter(r => r.status === 'completed');
    
    console.log('📅 Month rounds calculation:', {
      currentMonth,
      currentYear,
      totalRounds: monthRounds.length,
      completedRounds: completedRounds.length,
      rounds: monthRounds
    });
    
    return completedRounds;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">⚽ Gestão de Rondas</h2>
              <p className="text-gray-600">Sistema semanal da Liga Record</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateRound(true)}
            disabled={safePlayers.length === 0 || loading || currentRound?.status === 'active'}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Ronda</span>
          </button>
        </div>
      </div>

      {/* Current Round Status */}
      {currentRound && currentRound.status === 'active' ? (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Target className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">🎯 Ronda Ativa</h3>
            </div>
            <div className="flex space-x-2">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Em Curso
              </span>
              <button
                onClick={() => {
                  if (currentRound && currentRound.status === 'active' && !loading) {
                    setShowFinishRound(currentRound);
                  }
                }}
                disabled={loading || currentRound.status !== 'active' || showFinishRound}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md"
              >
                {loading ? '⏳ A processar...' : '🏁 Finalizar Ronda'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Ronda</p>
              <p className="text-xl font-bold text-blue-600">{currentRound.name}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Participantes</p>
              <p className="text-xl font-bold text-green-600">{currentRound.participants?.length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Valor Máximo</p>
              <p className="text-xl font-bold text-red-600">
                {Math.max(...(currentRound.paymentStructure || [0])).toFixed(2)}€
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">💰 Estrutura de Pagamentos:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {(currentRound.paymentStructure || []).map((amount, index) => (
                <div key={index} className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">{index + 1}º lugar</div>
                  <div className={`font-bold ${amount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {amount === 0 ? 'Grátis' : `${amount.toFixed(2)}€`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
          <Calendar className="h-12 w-12 text-orange-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Nenhuma ronda ativa</h3>
          <p className="text-orange-600 mb-4">Cria uma nova ronda para começar a semana</p>
          {safePlayers.length === 0 ? (
            <p className="text-sm text-orange-600">⚠️ Adiciona jogadores primeiro no Dashboard Geral</p>
          ) : (
            <button
              onClick={() => setShowCreateRound(true)}
              disabled={loading}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'A processar...' : 'Criar Primeira Ronda'}
            </button>
          )}
        </div>
      )}

      {/* Monthly Progress */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 Progresso Mensal</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Rondas completadas este mês:</span>
          <span className="font-medium">{getCurrentMonthRounds().length}/5</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-green-600 h-3 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min((getCurrentMonthRounds().length / 5) * 100, 100)}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Meta: 5 rondas por mês • Restam {Math.max(5 - getCurrentMonthRounds().length, 0)} rondas
        </p>
      </div>

      {/* Rounds History */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Histórico de Rondas</h3>
        
        {rounds.length > 0 ? (
          <div className="space-y-3">
            {rounds.map(round => (
              <div key={round.id} className={`border rounded-lg p-4 ${round.status === 'active' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-800">{round.name}</h4>
                    <p className="text-sm text-gray-600">
                      Semana {round.week} • {round.participants?.length || 0} participantes
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(round.createdAt).toLocaleDateString('pt-PT')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      round.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {round.status === 'active' ? 'Ativa' : 'Concluída'}
                    </span>
                    {round.status === 'completed' && (
                      <button
                        onClick={() => setShowRoundResults(round)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">Ainda não há rondas criadas</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateRound && (
        <CreateRoundModal
          players={safePlayers}
          onClose={() => setShowCreateRound(false)}
          onSubmit={createNewRound}
          getDefaultPaymentStructure={getDefaultPaymentStructure}
          loading={loading}
        />
      )}

      {showFinishRound && (
        <FinishRoundModal
          round={showFinishRound}
          onClose={() => setShowFinishRound(null)}
          onSubmit={(results) => finishRound(showFinishRound.id, results)}
          loading={loading}
        />
      )}

      {showRoundResults && (
        <RoundResultsModal
          round={showRoundResults}
          onClose={() => setShowRoundResults(null)}
        />
      )}
    </div>
  );
};

// Modal para criar nova ronda
const CreateRoundModal = ({ players, onClose, onSubmit, getDefaultPaymentStructure, loading }) => {
  const currentWeek = new Date().getWeek();
  const currentMonth = new Date().getMonth() + 1;
  
  // Garantir que players é um array válido
  const safePlayers = Array.isArray(players) ? players : [];
  
  const [formData, setFormData] = useState({
    name: `Ronda ${currentWeek} - ${new Date().toLocaleDateString('pt-PT')}`,
    week: currentWeek,
    month: currentMonth,
    paymentStructure: getDefaultPaymentStructure(safePlayers.length)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (safePlayers.length === 0) {
      alert('Não há jogadores disponíveis para criar uma ronda!');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">🎯 Criar Nova Ronda</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {safePlayers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">⚠️ Não há jogadores disponíveis!</p>
            <p className="text-gray-600 mb-4">Adiciona jogadores primeiro no Dashboard Geral.</p>
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                📊 {safePlayers.length} jogadores encontrados: {safePlayers.map(p => p.name).join(', ')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Ronda</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Semana</label>
                <input
                  type="number"
                  min="1"
                  max="53"
                  value={formData.week}
                  onChange={(e) => setFormData({...formData, week: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">💰 Estrutura de Pagamentos</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {formData.paymentStructure.map((amount, index) => (
                  <div key={index} className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">{index + 1}º lugar</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => {
                        const newStructure = [...formData.paymentStructure];
                        newStructure[index] = parseFloat(e.target.value) || 0;
                        setFormData({...formData, paymentStructure: newStructure});
                      }}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'A criar...' : 'Criar Ronda'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// Modal para finalizar ronda
const FinishRoundModal = ({ round, onClose, onSubmit, loading }) => {
  const [results, setResults] = useState(
    (round.participants || []).map(p => ({ ...p, points: 0 }))
  );

  const handlePointsChange = (playerId, points) => {
    setResults(results.map(r => 
      r.playerId === playerId ? { ...r, points: parseInt(points) || 0 } : r
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const sortedResults = [...results].sort((a, b) => b.points - a.points);
    onSubmit(sortedResults);
  };

  const sortedResults = [...results].sort((a, b) => b.points - a.points);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header Compacto */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-blue-50 flex-shrink-0 rounded-t-2xl">
          <h3 className="text-lg font-semibold text-blue-800">🏁 Finalizar {round.name}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          
          {/* Info Compacta */}
          <div className="px-4 py-2 bg-blue-50 border-b flex-shrink-0">
            <p className="text-sm text-blue-800">
              📊 Insere os pontos de cada jogador. A classificação é calculada automaticamente.
            </p>
          </div>

          {/* Conteúdo Principal - COM SCROLL */}
          <div className="flex-1 min-h-0 flex">
            
            {/* Coluna Esquerda: Input de Pontos */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                <h4 className="font-semibold text-gray-800">✏️ Inserir Pontos</h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {results.map(participant => (
                    <div key={participant.playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium text-sm">{participant.playerName}</span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          value={participant.points}
                          onChange={(e) => handlePointsChange(participant.playerId, e.target.value)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-600">pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Classificação */}
            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                <h4 className="font-semibold text-gray-800">🏆 Classificação</h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {sortedResults.map((participant, index) => (
                    <div key={participant.playerId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">{participant.playerName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">{participant.points} pts</div>
                        <div className={`text-xs ${(round.paymentStructure && round.paymentStructure[index] === 0) ? 'text-green-600' : 'text-red-600'}`}>
                          {(round.paymentStructure && round.paymentStructure[index] === 0) ? 'Grátis' : `${((round.paymentStructure && round.paymentStructure[index]) || 0).toFixed(2)}€`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer com Botões */}
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 rounded-b-2xl">
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium shadow-md"
              >
                {loading ? '⏳ A finalizar...' : '✅ Confirmar e Finalizar'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal para ver resultados
const RoundResultsModal = ({ round, onClose }) => {
  if (!round || !round.participants) {
    return null;
  }

  const sortedParticipants = round.participants
    .filter(p => p.position)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-blue-50 rounded-t-2xl flex-shrink-0">
          <h3 className="text-xl font-semibold text-blue-800">📊 {round.name}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedParticipants.length > 0 ? (
            <div className="space-y-3">
              {sortedParticipants.map((participant, index) => (
                <div key={participant.playerId} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 
                      'bg-blue-500'
                    }`}>
                      {participant.position}
                    </div>
                    <div>
                      <span className="font-semibold text-lg text-gray-800">{participant.playerName}</span>
                      <div className="text-sm text-gray-600">{participant.points} pontos</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${participant.weeklyPayment === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {participant.weeklyPayment === 0 ? 'Grátis' : `${participant.weeklyPayment.toFixed(2)}€`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {participant.weeklyPayment === 0 ? '🏆 Vencedor!' : '💸 Pagamento'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum resultado disponível para esta ronda.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 bg-gray-50 p-6 rounded-b-2xl border-t">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
            <span>Ronda concluída em:</span>
            <span>{round.completedAt ? new Date(round.completedAt).toLocaleDateString('pt-PT') : 'N/A'}</span>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoundsManager;