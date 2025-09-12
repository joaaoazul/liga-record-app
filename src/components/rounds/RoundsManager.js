// src/components/rounds/RoundsManager.js 
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Trophy, Users, Euro, Plus, Edit, Eye, Target, 
  TrendingDown, Award, CheckCircle, CreditCard, AlertTriangle,
  RefreshCw, Trash2, Shield, Clock
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';

// Helper para calcular semana do ano
const getWeekNumber = (date = new Date()) => {
  const onejan = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

const RoundsManager = ({ players = [], onUpdatePlayers, settings }) => {
  // Estados principais
  const [allRounds, setAllRounds] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Estados dos modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  
  const { user } = useAuth();
  const safePlayers = Array.isArray(players) ? players : [];

  // Função centralizada para carregar dados
  const loadAllRounds = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Carregando todas as rondas...');
      
      const rounds = await firestoreService.getRounds();
      console.log(`📊 ${rounds.length} rondas carregadas`);
      
      // Filtrar rondas válidas (não duplicadas)
      const validRounds = rounds.filter(r => !r.isDuplicate && !r.deleted);
      
      // Ordenar por data de criação (mais recente primeiro)
      const sortedRounds = validRounds.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      
      setAllRounds(sortedRounds);
      
      // Encontrar ronda ativa (deve haver apenas uma)
      const activeRounds = sortedRounds.filter(r => r.status === 'active');
      
      if (activeRounds.length > 1) {
        console.warn('⚠️ Múltiplas rondas ativas detectadas! Corrigindo...');
        // Manter apenas a mais recente como ativa
        const mostRecent = activeRounds[0];
        setActiveRound(mostRecent);
        
        // Marcar as outras como completas
        for (let i = 1; i < activeRounds.length; i++) {
          await firestoreService.updateRound(activeRounds[i].id, {
            status: 'completed',
            autoFixed: true,
            fixedAt: new Date().toISOString(),
            note: 'Corrigido automaticamente - múltiplas rondas ativas'
          });
        }
      } else if (activeRounds.length === 1) {
        setActiveRound(activeRounds[0]);
      } else {
        setActiveRound(null);
      }
      
      return sortedRounds;
      
    } catch (error) {
      console.error('❌ Erro ao carregar rondas:', error);
      setActiveRound(null);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar dados ao montar e quando refreshKey mudar
  useEffect(() => {
    loadAllRounds();
  }, [loadAllRounds, refreshKey]);

  // Função para forçar refresh
  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Helpers para obter dados
  const getCompletedRounds = () => allRounds.filter(r => r.status === 'completed');
  const getCurrentMonthRounds = () => {
    const now = new Date();
    return getCompletedRounds().filter(r => {
      const roundDate = new Date(r.createdAt);
      return roundDate.getMonth() === now.getMonth() && 
             roundDate.getFullYear() === now.getFullYear();
    });
  };

  // Detectar próximo número de ronda
  const getNextRoundNumber = useCallback(() => {
    if (!allRounds || allRounds.length === 0) return 1;
    
    const roundNumbers = allRounds
      .map(r => {
        const match = r.name?.match(/Ronda (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    
    return roundNumbers.length > 0 ? Math.max(...roundNumbers) + 1 : 1;
  }, [allRounds]);

  // CRIAR NOVA RONDA
  const handleCreateRound = async (formData) => {
    try {
      setIsProcessing(true);
      
      // Verificar se já existe ronda ativa
      if (activeRound) {
        alert('❌ Já existe uma ronda ativa! Finalize-a primeiro.');
        return false;
      }
      
      // Verificar duplicados
      const existingRound = allRounds.find(r => 
        r.name?.toLowerCase() === formData.name?.toLowerCase()
      );
      
      if (existingRound) {
        const nextNumber = getNextRoundNumber();
        alert(`❌ Já existe uma ronda com o nome "${formData.name}"!\n\nSugestão: Use "Ronda ${nextNumber}"`);
        return false;
      }
      
      // Validar jogadores
      if (safePlayers.length === 0) {
        alert('❌ Não há jogadores na liga!');
        return false;
      }
      
      // Criar nova ronda com ID único
      const newRound = {
        name: formData.name,
        week: formData.week || getWeekNumber(),
        month: formData.month || (new Date().getMonth() + 1),
        year: new Date().getFullYear(),
        status: 'active',
        participants: safePlayers.map(p => ({
          playerId: p.id,
          playerName: p.name,
          points: 0,
          position: null,
          weeklyPayment: 0
        })),
        paymentStructure: formData.paymentStructure || getDefaultPaymentStructure(safePlayers.length),
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous',
        userId: user?.uid || null
      };
      
      console.log('📝 Criando nova ronda:', newRound.name);
      
      const result = await firestoreService.addRound(newRound);
      
      if (result.success) {
        console.log('✅ Ronda criada com sucesso:', result.id);
        setShowCreateModal(false);
        
        // Forçar recarregamento completo
        await loadAllRounds();
        
        alert('🎉 Ronda criada com sucesso!');
        return true;
      } else {
        throw new Error(result.error || 'Erro ao criar ronda');
      }
      
    } catch (error) {
      console.error('❌ Erro ao criar ronda:', error);
      alert(`Erro ao criar ronda: ${error.message}`);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // FINALIZAR RONDA
  const handleFinishRound = async (roundId, results) => {
    try {
      setIsProcessing(true);
      console.log('🏁 Finalizando ronda:', roundId);
      
      // Buscar dados atualizados da ronda
      const round = await firestoreService.getRoundById(roundId);
      
      if (!round) {
        throw new Error('Ronda não encontrada');
      }
      
      if (round.status !== 'active') {
        alert('⚠️ Esta ronda já foi finalizada!');
        await loadAllRounds();
        return false;
      }
      
      // Validar resultados
      if (!results || results.length === 0) {
        alert('❌ Nenhum resultado fornecido!');
        return false;
      }
      
      // Calcular classificação e pagamentos
      const sortedResults = [...results].sort((a, b) => b.points - a.points);
      const finalParticipants = sortedResults.map((participant, index) => ({
        ...participant,
        position: index + 1,
        weeklyPayment: round.paymentStructure?.[index] || 0
      }));
      
      // Atualizar ronda no Firebase PRIMEIRO
      console.log('📝 Atualizando status da ronda...');
      const updateResult = await firestoreService.updateRound(roundId, {
        status: 'completed',
        participants: finalParticipants,
        completedAt: new Date().toISOString(),
        completedBy: user?.uid || 'anonymous'
      });
      
      if (!updateResult.success) {
        throw new Error('Falha ao atualizar ronda');
      }
      
      // Processar atualizações dos jogadores
      console.log('👥 Atualizando jogadores...');
      const updatedPlayers = [];
      const autoPaymentCandidates = [];
      
      for (const player of safePlayers) {
        const result = finalParticipants.find(p => p.playerId === player.id);
        
        if (result && result.points > 0) {
          // Verificar duplicação
          const playerRounds = player.rounds || [];
          const roundExists = playerRounds.some(r => r.roundId === roundId);
          
          if (roundExists) {
            console.warn(`⚠️ Ronda ${roundId} já processada para ${player.name}`);
            updatedPlayers.push(player);
            continue;
          }
          
          // Calcular novo saldo
          const newBalance = (player.balance || 0) - (result.weeklyPayment || 0);
          
          // Adicionar ronda ao histórico
          const newRoundEntry = {
            roundId: roundId,
            roundName: round.name,
            points: result.points,
            position: result.position,
            payment: result.weeklyPayment || 0,
            date: new Date().toISOString(),
            autoPaid: false
          };
          
          const updatedRounds = [...playerRounds, newRoundEntry];
          
          // Verificar pagamento automático (a cada 5 rondas)
          const unpaidRounds = updatedRounds.filter(r => !r.autoPaid && r.payment > 0);
          
          if (unpaidRounds.length >= 5) {
            const roundsToPay = unpaidRounds.slice(0, 5);
            const totalDebt = roundsToPay.reduce((sum, r) => sum + r.payment, 0);
            
            autoPaymentCandidates.push({
              player: player,
              roundsToPay: roundsToPay,
              totalAmount: totalDebt,
              newBalance: newBalance + totalDebt,
              updatedRounds: updatedRounds.map(r => 
                roundsToPay.some(rtp => rtp.roundId === r.roundId) 
                  ? { ...r, autoPaid: true }
                  : r
              )
            });
          }
          
          // Atualizar jogador
          const updatedPlayer = {
            ...player,
            balance: newBalance,
            rounds: updatedRounds,
            totalPoints: (player.totalPoints || 0) + result.points,
            totalRounds: (player.totalRounds || 0) + 1
          };
          
          // Salvar no Firebase
          await firestoreService.savePlayer(updatedPlayer);
          updatedPlayers.push(updatedPlayer);
          
          // Adicionar transação se houver pagamento
          if (result.weeklyPayment > 0) {
            await firestoreService.addTransaction({
              playerId: player.id,
              playerName: player.name,
              type: 'debt',
              amount: result.weeklyPayment,
              note: `${result.position}º lugar na ${round.name}`,
              balanceAfter: newBalance,
              roundId: roundId,
              date: new Date().toISOString()
            });
          }
        } else {
          updatedPlayers.push(player);
        }
      }
      
      // Limpar estado local
      setActiveRound(null);
      setShowFinishModal(false);
      
      // Atualizar componente pai
      if (onUpdatePlayers) {
        onUpdatePlayers(updatedPlayers);
      }
      
      // Processar pagamentos automáticos se houver
      if (autoPaymentCandidates.length > 0) {
        console.log('💳 Pagamentos automáticos disponíveis:', autoPaymentCandidates.length);
        setShowPaymentModal(autoPaymentCandidates);
      } else {
        await loadAllRounds();
        alert('🎉 Ronda finalizada com sucesso!');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao finalizar ronda:', error);
      alert(`Erro ao finalizar ronda: ${error.message}`);
      await loadAllRounds();
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  // PROCESSAR PAGAMENTOS AUTOMÁTICOS
  const handleAutoPayments = async (candidates) => {
    try {
      setIsProcessing(true);
      console.log('💳 Processando pagamentos automáticos...');
      
      for (const candidate of candidates) {
        const { player, roundsToPay, totalAmount, newBalance, updatedRounds } = candidate;
        
        // Atualizar jogador
        const updatedPlayer = {
          ...player,
          balance: newBalance,
          rounds: updatedRounds
        };
        
        await firestoreService.savePlayer(updatedPlayer);
        
        // Adicionar transação
        await firestoreService.addTransaction({
          playerId: player.id,
          playerName: player.name,
          type: 'payment',
          amount: totalAmount,
          note: `Pagamento automático - ${roundsToPay.length} rondas`,
          balanceAfter: newBalance,
          date: new Date().toISOString()
        });
        
        console.log(`✅ Pagamento processado: ${player.name} +${totalAmount.toFixed(2)}€`);
      }
      
      setShowPaymentModal(null);
      
      // Recarregar dados
      await loadAllRounds();
      
      // Atualizar jogadores no componente pai
      if (onUpdatePlayers) {
        const updatedPlayers = await firestoreService.getPlayers();
        onUpdatePlayers(updatedPlayers);
      }
      
      alert('💳 Pagamentos automáticos processados com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao processar pagamentos:', error);
      alert(`Erro ao processar pagamentos: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // LIMPAR DUPLICADOS
  const cleanDuplicateRounds = async () => {
    try {
      console.log('🧹 Verificando rondas duplicadas...');
      
      const roundsByName = {};
      allRounds.forEach(round => {
        const key = round.name?.toLowerCase();
        if (!roundsByName[key]) {
          roundsByName[key] = [];
        }
        roundsByName[key].push(round);
      });
      
      const duplicateGroups = Object.entries(roundsByName)
        .filter(([name, rounds]) => rounds.length > 1);
      
      if (duplicateGroups.length === 0) {
        console.log('✅ Nenhuma ronda duplicada encontrada');
        return false;
      }
      
      console.warn('⚠️ Rondas duplicadas encontradas:', duplicateGroups.length);
      
      for (const [name, rounds] of duplicateGroups) {
        console.log(`🔍 Processando duplicados de: ${name}`);
        
        // Ordenar por data (mais recente primeiro)
        const sortedRounds = rounds.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        
        // Manter a mais recente ou a completa
        const roundToKeep = sortedRounds.find(r => r.status === 'completed') || sortedRounds[0];
        
        for (const round of sortedRounds) {
          if (round.id !== roundToKeep.id) {
            console.log(`🗑️ Removendo duplicado: ${round.name} (${round.id})`);
            
            if (round.status === 'completed' && round.participants?.length > 0) {
              // Marcar como duplicada em vez de deletar se tiver dados
              await firestoreService.updateRound(round.id, {
                isDuplicate: true,
                duplicateOf: roundToKeep.id,
                markedAt: new Date().toISOString()
              });
            } else {
              // Deletar se não tiver dados importantes
              await firestoreService.deleteRound(round.id);
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar duplicados:', error);
      return false;
    }
  };

  

  // Helper para estrutura de pagamentos - VERSÃO ATUALIZADA
const getDefaultPaymentStructure = (playerCount) => {
  if (!playerCount || playerCount <= 0) return [0];
  
  // Configuração baseada na tabela da imagem
  const priceRanges = [
    { min: 1, max: 5, value: 0 },      // 1-5: 0€
    { min: 6, max: 10, value: 0.50 },  // 6-10: 0.50€
    { min: 11, max: 15, value: 1.00 }, // 11-15: 1.00€
    { min: 16, max: 20, value: 1.50 }, // 16-20: 1.50€
    { min: 21, max: 25, value: 2.00 }, // 21-25: 2.00€
    { min: 26, max: 33, value: 2.50 }  // 26-33: 2.50€
  ];
  
  // Função auxiliar para obter o valor baseado na posição
  const getValueForPosition = (position) => {
    for (const range of priceRanges) {
      if (position >= range.min && position <= range.max) {
        return range.value;
      }
    }
    // Se ultrapassar 33, continua com 2.50€
    return 2.50;
  };
  
  // Gerar array de pagamentos para o número de jogadores
  const structure = [];
  for (let i = 1; i <= playerCount; i++) {
    structure.push(getValueForPosition(i));
  }
  
  return structure;
};

  // Obter dados para renderização
  const completedRounds = getCompletedRounds();
  const monthlyRounds = getCurrentMonthRounds();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Gestão de Rondas</h2>
              <p className="text-gray-600">Sistema semanal da Liga Record</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Botão de Refresh */}
            <button
              onClick={forceRefresh}
              disabled={isLoading || isProcessing}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm disabled:opacity-50"
              title="Recarregar dados"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            
            {/* Botão de Verificar Duplicados */}
            {allRounds.length > 0 && (
              <button
                onClick={async () => {
                  const roundsByName = {};
                  allRounds.forEach(round => {
                    const key = round.name?.toLowerCase();
                    if (!roundsByName[key]) {
                      roundsByName[key] = [];
                    }
                    roundsByName[key].push(round);
                  });
                  
                  const duplicates = Object.entries(roundsByName)
                    .filter(([name, rounds]) => rounds.length > 1);
                  
                  if (duplicates.length === 0) {
                    alert('✅ Não há rondas duplicadas!');
                    return;
                  }
                  
                  const duplicatesList = duplicates
                    .map(([name, rounds]) => `• ${rounds[0].name}: ${rounds.length} cópias`)
                    .join('\n');
                  
                  if (window.confirm(
                    `🧹 Rondas duplicadas encontradas:\n\n${duplicatesList}\n\n` +
                    `Limpar duplicados?\n\n` +
                    `Isto irá manter apenas a versão mais recente ou completa de cada ronda.`
                  )) {
                    const cleaned = await cleanDuplicateRounds();
                    if (cleaned) {
                      await loadAllRounds();
                      alert('✅ Rondas duplicadas limpas com sucesso!');
                    }
                  }
                }}
                className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-1 text-sm"
              >
                <Shield className="h-4 w-4" />
                <span>Verificar</span>
              </button>
            )}

            {/* Botão temporário para corrigir ronda */}
<button
  onClick={async () => {
    console.log('Corrigindo ronda sem participantes...');
    
    // Buscar rondas
    const rounds = await firestoreService.getRounds();
    const problemRound = rounds.find(r => 
      r.status === 'active' && (!r.participants || r.participants.length === 0)
    );
    
    if (problemRound) {
      // Buscar jogadores
      const players = await firestoreService.getPlayers();
      console.log(`Encontrados ${players.length} jogadores`);
      
      // Criar participantes
      const participants = players.map(p => ({
        playerId: p.id,
        playerName: p.name,
        points: 0,
        position: null,
        weeklyPayment: 0
      }));
      
      // Atualizar ronda
      await firestoreService.updateRound(problemRound.id, {
        participants: participants,
        updatedAt: new Date().toISOString()
      });
      
      alert(`✅ Ronda corrigida! Agora tem ${participants.length} participantes.`);
      
      // Recarregar dados
      await loadAllRounds();
    } else {
      alert('Nenhuma ronda problemática encontrada');
    }
  }}
  className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1 text-sm"
>
  🔧 Corrigir Ronda
</button>
            
            {/* Botão de Nova Ronda */}
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={isLoading || isProcessing || !!activeRound || safePlayers.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Ronda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Estado da Ronda Atual */}
      {activeRound ? (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Target className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Ronda Ativa</h3>
            </div>
            <div className="flex space-x-2">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Em Curso
              </span>
              <button
                onClick={() => setShowFinishModal(true)}
                disabled={isLoading || isProcessing}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium shadow-md"
              >
                {isProcessing ? 'A processar...' : 'Finalizar Ronda'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Ronda</p>
              <p className="text-xl font-bold text-blue-600">{activeRound.name}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Participantes</p>
              <p className="text-xl font-bold text-green-600">
                {activeRound.participants?.length || 0}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Valor Máximo</p>
              <p className="text-xl font-bold text-red-600">
                {Math.max(...(activeRound.paymentStructure || [0])).toFixed(2)}€
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">Estrutura de Pagamentos:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {(activeRound.paymentStructure || []).map((amount, index) => (
                <div key={index} className="text-center p-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">{index + 1}º lugar</div>
                  <div className={`font-bold ${
                    amount === 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
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
          <h3 className="text-lg font-semibold text-orange-800 mb-2">
            Nenhuma ronda ativa
          </h3>
          <p className="text-orange-600 mb-4">
            Cria uma nova ronda para começar a semana
          </p>
          {safePlayers.length === 0 ? (
            <p className="text-sm text-orange-600">
              Adiciona jogadores primeiro no Dashboard
            </p>
          ) : isLoading ? (
            <p className="text-sm text-orange-600">A carregar...</p>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={isProcessing}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'A processar...' : 'Criar Nova Ronda'}
            </button>
          )}
        </div>
      )}

      {/* Resumo Mensal */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Resumo Mensal</h3>
          <div className="text-sm text-gray-600">
            {new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <Trophy className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-800">{monthlyRounds.length}</p>
            <p className="text-sm text-blue-600">Rondas Completas</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-800">{safePlayers.length}</p>
            <p className="text-sm text-green-600">Jogadores Ativos</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-800">
              {activeRound ? 1 : 0}
            </p>
            <p className="text-sm text-purple-600">Rondas Ativas</p>
          </div>
        </div>
      </div>

      {/* Histórico de Rondas */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Rondas Recentes</h3>
          <span className="text-sm text-gray-500">
            Total: {allRounds.length} rondas
          </span>
        </div>
        
        {allRounds.length > 0 ? (
          <div className="space-y-3">
            {allRounds.slice(0, 5).map(round => (
              <div 
                key={round.id} 
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-800">{round.name}</h4>
                    <p className="text-sm text-gray-600">
                      Semana {round.week} • {round.participants?.length || 0} jogadores
                    </p>
                    {round.completedAt && (
                      <p className="text-xs text-gray-500">
                        Finalizada: {new Date(round.completedAt).toLocaleDateString('pt-PT')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      round.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {round.status === 'active' ? 'Ativa' : 'Concluída'}
                    </span>
                    {round.status === 'completed' && (
                      <button
                        onClick={() => setShowResultsModal(round)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Ver resultados"
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
      {showCreateModal && (
        <CreateRoundModal
          players={safePlayers}
          allRounds={allRounds}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRound}
          getDefaultPaymentStructure={getDefaultPaymentStructure}
          getNextRoundNumber={getNextRoundNumber}
          loading={isProcessing}
        />
      )}

      {showFinishModal && activeRound && (
        <FinishRoundModal
          round={activeRound}
          onClose={() => setShowFinishModal(false)}
          onSubmit={(results) => handleFinishRound(activeRound.id, results)}
          loading={isProcessing}
        />
      )}

      {showResultsModal && (
        <RoundResultsModal
          round={showResultsModal}
          onClose={() => setShowResultsModal(null)}
        />
      )}

      {showPaymentModal && (
        <AutoPaymentModal
          candidates={showPaymentModal}
          onConfirm={() => handleAutoPayments(showPaymentModal)}
          onCancel={() => {
            setShowPaymentModal(null);
            loadAllRounds();
            alert('Ronda finalizada!\n\nPagamentos automáticos podem ser processados mais tarde.');
          }}
          loading={isProcessing}
        />
      )}
    </div>
  );
};

// Modal para criar nova ronda
const CreateRoundModal = ({ 
  players, 
  allRounds = [], 
  onClose, 
  onSubmit, 
  getDefaultPaymentStructure,
  getNextRoundNumber,
  loading 
}) => {
  const currentWeek = getWeekNumber();
  const currentMonth = new Date().getMonth() + 1;
  const nextRoundNumber = getNextRoundNumber();
  
  const safePlayers = Array.isArray(players) ? players : [];
  
  const [formData, setFormData] = useState({
    name: `Ronda ${nextRoundNumber}`,
    week: currentWeek,
    month: currentMonth,
    paymentStructure: getDefaultPaymentStructure(safePlayers.length)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (safePlayers.length === 0) {
      alert('Não há jogadores disponíveis!');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Criar Nova Ronda</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {safePlayers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Não há jogadores na liga!</p>
            <p className="text-sm text-gray-500">
              Adiciona jogadores primeiro no Dashboard.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {nextRoundNumber > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <strong>Numeração automática:</strong> Detectadas {nextRoundNumber - 1} rondas anteriores. 
                Sugerindo "Ronda {nextRoundNumber}".
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Ronda
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use numeração sequencial para evitar duplicados
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Semana
                </label>
                <input
                  type="number"
                  min="1"
                  max="53"
                  value={formData.week}
                  onChange={(e) => setFormData({...formData, week: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mês
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.month}
                  onChange={(e) => setFormData({...formData, month: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estrutura de Pagamentos
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {formData.paymentStructure.map((amount, index) => (
                  <div key={index} className="flex flex-col">
                    <label className="text-xs text-gray-500 mb-1">
                      {index + 1}º lugar
                    </label>
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
                      disabled={loading}
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
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
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
    round.participants.map(p => ({
      ...p,
      points: 0
    }))
  );

  const handlePointsChange = (playerId, points) => {
    setResults(prevResults =>
      prevResults.map(r =>
        r.playerId === playerId 
          ? { ...r, points: parseInt(points) || 0 } 
          : r
      )
    );
  };

  const sortedResults = [...results].sort((a, b) => b.points - a.points);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const hasZeroPoints = results.some(r => r.points === 0);
    if (hasZeroPoints) {
      const confirmZero = window.confirm(
        'Alguns jogadores têm 0 pontos. Continuar mesmo assim?'
      );
      if (!confirmZero) return;
    }
    
    onSubmit(sortedResults);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">
              Finalizar Ronda: {round.name}
            </h3>
            <button 
              onClick={onClose} 
              disabled={loading}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50 text-2xl"
            >
              ×
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Insere os pontos de cada jogador. A classificação é calculada automaticamente.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 flex">
            <div className="w-1/2 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                <h4 className="font-semibold text-gray-800">Inserir Pontos</h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {results.map(participant => (
                    <div 
                      key={participant.playerId} 
                      className="flex items-center justify-between p-2 bg-gray-50 rounded"
                    >
                      <span className="font-medium text-sm">
                        {participant.playerName}
                      </span>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          value={participant.points}
                          onChange={(e) => handlePointsChange(
                            participant.playerId, 
                            e.target.value
                          )}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                          disabled={loading}
                        />
                        <span className="text-xs text-gray-600">pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                <h4 className="font-semibold text-gray-800">Classificação</h4>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {sortedResults.map((participant, index) => (
                    <div 
                      key={participant.playerId} 
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500' : 
                          index === 1 ? 'bg-gray-400' : 
                          index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium">
                          {participant.playerName}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">
                          {participant.points} pts
                        </div>
                        <div className={`text-xs ${
                          (round.paymentStructure?.[index] || 0) === 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {round.paymentStructure?.[index] !== undefined ? (
                            round.paymentStructure[index] === 0 
                              ? 'Grátis' 
                              : `-${round.paymentStructure[index].toFixed(2)}€`
                          ) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50 flex-shrink-0">
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'A processar...' : 'Confirmar e Finalizar'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Cancelar
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
  const totalCollected = round.participants?.reduce(
    (sum, p) => sum + (p.weeklyPayment || 0), 
    0
  ) || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Classificação Final</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-2"
          >
            ×
          </button>
        </div>

        <h4 className="font-semibold text-gray-800 mb-3 mt-6">
          Informações da Ronda:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-600">Nome da Ronda</p>
            <p className="text-lg font-bold text-blue-800">{round.name}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-sm text-green-600">Participantes</p>
            <p className="text-lg font-bold text-green-800">
              {round.participants?.length || 0}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-sm text-purple-600">Total Arrecadado</p>
            <p className="text-lg font-bold text-purple-800">
              {totalCollected.toFixed(2)}€
            </p>
          </div>
        </div>

        <h4 className="font-semibold text-gray-800 mb-3">
          Classificação dos Jogadores:
        </h4>
        <div className="space-y-2">
          {round.participants?.sort((a, b) => a.position - b.position).map((participant, index) => (
            <div 
              key={participant.playerId} 
              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  index === 0 ? 'bg-yellow-500' : 
                  index === 1 ? 'bg-gray-400' : 
                  index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  {participant.position}
                </span>
                <div>
                  <p className="font-medium">{participant.playerName}</p>
                  <p className="text-sm text-gray-600">{participant.points} pontos</p>
                </div>
              </div>
              <div className={`font-bold ${
                participant.weeklyPayment === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {participant.weeklyPayment === 0 
                  ? 'Grátis' 
                  : `-${participant.weeklyPayment.toFixed(2)}€`}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal de pagamento automático
const AutoPaymentModal = ({ candidates, onConfirm, onCancel, loading }) => {
  const totalAmount = candidates.reduce((sum, c) => sum + c.totalAmount, 0);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Pagamento Automático de Dívidas
          </h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Sistema de Pagamento Automático:</strong> A cada 5 rondas completas, 
            as dívidas acumuladas são automaticamente pagas.
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <h4 className="font-semibold text-gray-700">
            Jogadores com pagamentos pendentes:
          </h4>
          {candidates.map(({ player, roundsToPay, totalAmount }) => (
            <div key={player.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{player.name}</p>
                  <p className="text-sm text-gray-600">
                    {roundsToPay.length} rondas para pagar
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    +{totalAmount.toFixed(2)}€
                  </p>
                  <p className="text-xs text-gray-500">
                    Novo saldo: {((player.balance || 0) + totalAmount).toFixed(2)}€
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-4 mb-4">
          <div className="flex justify-between items-center text-lg font-bold">
            <span>Total a processar:</span>
            <span className="text-green-600">{totalAmount.toFixed(2)}€</span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'A processar...' : 'Confirmar Pagamentos'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
          >
            Processar Mais Tarde
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoundsManager;