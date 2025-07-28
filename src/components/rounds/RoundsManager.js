// src/components/rounds/RoundsManager.js - LÓGICA COMPLETAMENTE RECONSTRUÍDA
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Trophy, Users, Euro, Plus, Edit, Eye, Target, TrendingDown, Award, CheckCircle, CreditCard, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';

// Helper para calcular semana do ano
Date.prototype.getWeek = function() {
  const onejan = new Date(this.getFullYear(), 0, 1);
  return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

const RoundsManager = ({ players = [], onUpdatePlayers, settings }) => {
  // Estados principais
  const [allRounds, setAllRounds] = useState([]); // TODAS as rondas
  const [activeRoundId, setActiveRoundId] = useState(null); // ID da ronda ativa
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estados dos modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  
  const { user } = useAuth();
  const safePlayers = Array.isArray(players) ? players : [];

  // Função para limpar rondas duplicadas
  const cleanDuplicateRounds = async () => {
    try {
      console.log('🧹 Verificando rondas duplicadas...');
      
      // Agrupar rondas por nome
      const roundsByName = {};
      allRounds.forEach(round => {
        const key = round.name;
        if (!roundsByName[key]) {
          roundsByName[key] = [];
        }
        roundsByName[key].push(round);
      });
      
      // Encontrar grupos com duplicados
      const duplicateGroups = Object.entries(roundsByName)
        .filter(([name, rounds]) => rounds.length > 1)
        .map(([name, rounds]) => ({
          name,
          rounds: rounds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        }));
      
      if (duplicateGroups.length === 0) {
        console.log('✅ Nenhuma ronda duplicada encontrada');
        return false;
      }
      
      console.warn('⚠️ Rondas duplicadas encontradas:', duplicateGroups);
      
      // Para cada grupo de duplicados
      for (const group of duplicateGroups) {
        console.log(`🔍 Processando duplicados de: ${group.name}`);
        
        // Manter a mais recente que esteja completa, ou a ativa se houver
        let roundToKeep = group.rounds.find(r => r.status === 'active') || group.rounds[0];
        
        for (const round of group.rounds) {
          if (round.id !== roundToKeep.id) {
            console.log(`🗑️ Removendo ronda duplicada: ${round.name} (${round.id})`);
            
            // Se for uma ronda completa, transferir dados se necessário
            if (round.status === 'completed' && round.participants) {
              console.log('📋 Ronda completa duplicada - mantendo registro');
              // Marcar como duplicada em vez de deletar
              await firestoreService.updateRound(round.id, {
                isDuplicate: true,
                duplicateOf: roundToKeep.id,
                markedAt: new Date().toISOString()
              });
            } else {
              // Se for ativa ou sem dados, pode deletar
              try {
                await firestoreService.deleteRound(round.id);
                console.log('✅ Ronda duplicada removida');
              } catch (error) {
                console.error('❌ Erro ao remover ronda:', error);
              }
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

  // Função centralizada para carregar dados
  const loadAllRounds = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading all rounds...');
      
      const rounds = await firestoreService.getRounds();
      console.log(`📊 Loaded ${rounds.length} rounds`);
      
      // Filtrar rondas marcadas como duplicadas
      const validRounds = rounds.filter(r => !r.isDuplicate);
      
      // Ordenar por data de criação (mais recente primeiro)
      const sortedRounds = validRounds.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      
      setAllRounds(sortedRounds);
      
      // Verificar duplicados
      const roundNames = sortedRounds.map(r => r.name);
      const duplicateNames = roundNames.filter((name, index) => roundNames.indexOf(name) !== index);
      
      if (duplicateNames.length > 0) {
        console.warn('⚠️ Rondas com nomes duplicados detectadas:', [...new Set(duplicateNames)]);
      }
      
      // Encontrar ronda ativa (deve haver apenas uma)
      const activeRounds = sortedRounds.filter(r => r.status === 'active');
      
      if (activeRounds.length > 1) {
        console.error('⚠️ PROBLEMA: Múltiplas rondas ativas detectadas!');
        // Em caso de múltiplas rondas ativas, usar a mais recente
        const mostRecent = activeRounds[0];
        setActiveRoundId(mostRecent.id);
        
        // Auto-corrigir as outras
        for (let i = 1; i < activeRounds.length; i++) {
          console.warn(`🔧 Auto-corrigindo ronda ativa duplicada: ${activeRounds[i].name}`);
          await firestoreService.updateRound(activeRounds[i].id, {
            status: 'completed',
            autoFixed: true,
            fixedAt: new Date().toISOString()
          });
        }
      } else if (activeRounds.length === 1) {
        setActiveRoundId(activeRounds[0].id);
      } else {
        setActiveRoundId(null);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar rondas:', error);
      setActiveRoundId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar dados ao montar
  useEffect(() => {
    loadAllRounds();
  }, [loadAllRounds]);

  // Helpers para obter dados
  const getActiveRound = () => allRounds.find(r => r.id === activeRoundId);
  const getCompletedRounds = () => allRounds.filter(r => r.status === 'completed');
  const getCurrentMonthRounds = () => {
    const now = new Date();
    return getCompletedRounds().filter(r => 
      r.month === (now.getMonth() + 1) && 
      r.year === now.getFullYear()
    );
  };

  // CRIAR NOVA RONDA - Com verificação de nome duplicado e numeração automática
  const handleCreateRound = async (formData) => {
    try {
      setIsProcessing(true);
      
      // Verificar se já existe ronda ativa
      if (activeRoundId) {
        alert('❌ Já existe uma ronda ativa! Finalize-a primeiro.');
        return;
      }
      
      // Verificar se já existe ronda com o mesmo nome
      const existingRound = allRounds.find(r => r.name === formData.name);
      if (existingRound) {
        // Sugerir próximo número disponível
        const roundNumbers = allRounds
          .map(r => {
            const match = r.name.match(/Ronda (\d+)/);
            return match ? parseInt(match[1]) : 0;
          })
          .filter(n => n > 0);
        
        const maxNumber = roundNumbers.length > 0 ? Math.max(...roundNumbers) : 0;
        const suggestedNumber = maxNumber + 1;
        
        alert(`❌ Já existe uma ronda com o nome "${formData.name}"!\n\nSugestão: Use "Ronda ${suggestedNumber}" em vez disso.`);
        return;
      }
      
      // Validar dados
      if (safePlayers.length === 0) {
        alert('❌ Não há jogadores na liga!');
        return;
      }
      
      // Criar nova ronda
      const newRound = {
        id: `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: formData.name,
        week: formData.week,
        month: formData.month,
        year: new Date().getFullYear(),
        status: 'active',
        participants: safePlayers.map(p => ({
          playerId: p.id,
          playerName: p.name,
          points: 0,
          position: null,
          weeklyPayment: 0
        })),
        paymentStructure: formData.paymentStructure,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous',
        userId: user?.uid || null
      };
      
      console.log('📝 Criando nova ronda:', newRound.name);
      
      const result = await firestoreService.addRound(newRound);
      
      if (result.success) {
        console.log('✅ Ronda criada com sucesso');
        setShowCreateModal(false);
        
        // Recarregar dados
        await loadAllRounds();
        
        alert('🎉 Ronda criada com sucesso!');
      } else {
        throw new Error(result.error || 'Erro ao criar ronda');
      }
      
    } catch (error) {
      console.error('❌ Erro ao criar ronda:', error);
      alert(`Erro ao criar ronda: ${error.message}`);
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
        return;
      }
      
      // Calcular classificação e pagamentos
      const sortedResults = [...results].sort((a, b) => b.points - a.points);
      const finalParticipants = sortedResults.map((participant, index) => ({
        ...participant,
        position: index + 1,
        weeklyPayment: round.paymentStructure[index] || 0
      }));
      
      // Atualizar ronda no Firebase
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
        
        if (result) {
          // Calcular novo saldo
          const newBalance = result.weeklyPayment > 0 
            ? (player.balance || 0) - result.weeklyPayment
            : (player.balance || 0);
          
          // Verificar se esta ronda já existe no histórico (evitar duplicados)
          const playerRounds = player.rounds || [];
          const roundExists = playerRounds.some(r => r.roundId === roundId);
          
          if (roundExists) {
            console.warn(`⚠️ Ronda ${roundId} já existe no histórico de ${player.name}`);
            updatedPlayers.push(player);
            continue;
          }
          
          // Adicionar ronda ao histórico
          const newRound = {
            roundId: roundId,
            roundName: round.name,
            points: result.points,
            position: result.position,
            payment: result.weeklyPayment,
            date: new Date().toISOString(),
            autoPaid: false
          };
          
          const updatedRounds = [...playerRounds, newRound];
          
          // Verificar pagamento automático (a cada 5 rondas)
          const unpaidRounds = updatedRounds.filter(r => !r.autoPaid);
          const roundsToPayCount = Math.floor(unpaidRounds.length / 5) * 5;
          
          if (roundsToPayCount > 0) {
            const roundsToPay = unpaidRounds.slice(0, roundsToPayCount);
            const totalDebt = roundsToPay.reduce((sum, r) => sum + (r.payment || 0), 0);
            
            if (totalDebt > 0) {
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
          
          // Adicionar transação de dívida se houver pagamento
          if (result.weeklyPayment > 0) {
            await firestoreService.addTransaction({
              playerId: player.id,
              playerName: player.name,
              type: 'debt',
              amount: result.weeklyPayment,
              note: `Pagamento semanal - ${result.position}º lugar na ${round.name}`,
              balanceAfter: newBalance,
              roundId: roundId,
              date: new Date().toISOString()
            });
          }
        } else {
          updatedPlayers.push(player);
        }
      }
      
      // Limpar estado local IMEDIATAMENTE
      setActiveRoundId(null);
      setShowFinishModal(false);
      
      // Atualizar componente pai
      if (onUpdatePlayers) {
        onUpdatePlayers(updatedPlayers);
      }
      
      // Processar pagamentos automáticos se houver
      if (autoPaymentCandidates.length > 0) {
        console.log('💳 Candidatos para pagamento automático:', autoPaymentCandidates.length);
        setShowPaymentModal(autoPaymentCandidates);
      } else {
        // Recarregar dados
        await loadAllRounds();
        alert('🎉 Ronda finalizada com sucesso!');
      }
      
    } catch (error) {
      console.error('❌ Erro ao finalizar ronda:', error);
      alert(`Erro ao finalizar ronda: ${error.message}`);
      await loadAllRounds();
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
        
        // Atualizar jogador com novo saldo e rondas marcadas como pagas
        const updatedPlayer = {
          ...player,
          balance: newBalance,
          rounds: updatedRounds
        };
        
        await firestoreService.savePlayer(updatedPlayer);
        
        // Adicionar transação de pagamento
        await firestoreService.addTransaction({
          playerId: player.id,
          playerName: player.name,
          type: 'payment',
          amount: totalAmount,
          note: `Pagamento automático - ${roundsToPay.length} rondas`,
          balanceAfter: newBalance,
          date: new Date().toISOString()
        });
        
        console.log(`✅ Pagamento processado para ${player.name}: +${totalAmount.toFixed(2)}€`);
      }
      
      setShowPaymentModal(null);
      
      // Recarregar dados
      await loadAllRounds();
      
      // Recarregar jogadores no componente pai
      if (onUpdatePlayers) {
        // Forçar recarregamento completo
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

  // Helper para estrutura de pagamentos
  const getDefaultPaymentStructure = (playerCount) => {
    if (!playerCount || playerCount <= 0) return [0];
    
    if (playerCount <= 4) {
      return [0, 0.25, 0.5, 1].slice(0, playerCount);
    } else if (playerCount <= 6) {
      return [0, 0.25, 0.5, 1, 1.5, 2].slice(0, playerCount);
    } else if (playerCount <= 8) {
      return [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5].slice(0, playerCount);
    } else if (playerCount <= 10) {
      return [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5].slice(0, playerCount);
    } else {
      const structure = [0];
      const increment = 0.25;
      const maxPayment = 3;
      
      for (let i = 1; i < playerCount; i++) {
        const payment = Math.min(increment * i, maxPayment);
        structure.push(payment);
      }
      
      return structure.slice(0, playerCount);
    }
  };

  // Obter dados para renderização
  const activeRound = getActiveRound();
  const completedRounds = getCompletedRounds();
  const monthlyRounds = getCurrentMonthRounds();

  return (
    <div className="space-y-6">
      {/* Header - Adicionado botão de limpeza */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">⚽ Gestão de Rondas</h2>
              <p className="text-gray-600">Sistema semanal da Liga Record</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Botão de limpeza de duplicados - SEMPRE VISÍVEL PARA TESTE */}
            <button
              onClick={async () => {
                // Verificar duplicados
                const roundsByName = {};
                allRounds.forEach(round => {
                  const key = round.name;
                  if (!roundsByName[key]) {
                    roundsByName[key] = [];
                  }
                  roundsByName[key].push(round);
                });
                
                const duplicates = Object.entries(roundsByName).filter(([name, rounds]) => rounds.length > 1);
                
                if (duplicates.length === 0) {
                  alert('✅ Não há rondas duplicadas!');
                  return;
                }
                
                const duplicatesList = duplicates.map(([name, rounds]) => 
                  `• ${name}: ${rounds.length} cópias`
                ).join('\n');
                
                if (window.confirm(`🧹 Rondas duplicadas encontradas:\n\n${duplicatesList}\n\nLimpar duplicados?\n\nIsto irá manter apenas a versão mais recente de cada ronda.`)) {
                  const cleaned = await cleanDuplicateRounds();
                  if (cleaned) {
                    await loadAllRounds();
                    alert('✅ Rondas duplicadas limpas com sucesso!');
                  }
                }
              }}
              className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-1 text-sm"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Verificar Duplicados</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={isLoading || isProcessing || !!activeRoundId || safePlayers.length === 0}
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
              <h3 className="text-lg font-semibold text-gray-800">🎯 Ronda Ativa</h3>
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
                {isProcessing ? '⏳ A processar...' : '🏁 Finalizar Ronda'}
              </button>
              {/* Botão de Forçar Conclusão */}
              <button
                onClick={async () => {
                  if (window.confirm(
                    `⚠️ ATENÇÃO: Forçar conclusão da ${activeRound.name}?\n\n` +
                    `Esta ação irá:\n` +
                    `• Marcar a ronda como concluída SEM processar pontos\n` +
                    `• Permitir criar uma nova ronda\n` +
                    `• NÃO aplicar pagamentos aos jogadores\n\n` +
                    `Usar apenas em caso de erro! Continuar?`
                  )) {
                    try {
                      setIsProcessing(true);
                      console.log('⚠️ Forçando conclusão da ronda:', activeRound.id);
                      
                      const result = await firestoreService.updateRound(activeRound.id, {
                        status: 'completed',
                        forcedCompletion: true,
                        completedAt: new Date().toISOString(),
                        completedBy: user?.uid || 'anonymous',
                        note: 'Ronda forçada a concluir sem processamento'
                      });
                      
                      if (result.success) {
                        setActiveRoundId(null);
                        await loadAllRounds();
                        alert('✅ Ronda marcada como concluída. Podes criar uma nova ronda agora.');
                      } else {
                        throw new Error(result.error);
                      }
                    } catch (error) {
                      console.error('❌ Erro ao forçar conclusão:', error);
                      alert('Erro ao forçar conclusão: ' + error.message);
                    } finally {
                      setIsProcessing(false);
                    }
                  }
                }}
                disabled={isLoading || isProcessing}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                title="Forçar conclusão sem processar pontos"
              >
                ⚠️ Forçar
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
              <p className="text-xl font-bold text-green-600">{activeRound.participants?.length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Valor Máximo</p>
              <p className="text-xl font-bold text-red-600">
                {Math.max(...(activeRound.paymentStructure || [0])).toFixed(2)}€
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">💰 Estrutura de Pagamentos:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {(activeRound.paymentStructure || []).map((amount, index) => (
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
          ) : isLoading ? (
            <p className="text-sm text-orange-600">⏳ A carregar...</p>
          ) : (
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={isProcessing}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {isProcessing ? '⏳ A processar...' : '➕ Criar Nova Ronda'}
            </button>
          )}
        </div>
      )}

      {/* Resumo Mensal */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">📊 Resumo Mensal</h3>
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
        <h3 className="text-lg font-semibold text-gray-800 mb-4">📅 Rondas Recentes</h3>
        {allRounds.length > 0 ? (
          <div className="space-y-3">
            {allRounds.slice(0, 5).map(round => (
              <div key={round.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
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
                      round.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {round.status === 'active' ? 'Ativa' : 'Concluída'}
                    </span>
                    {round.status === 'completed' && (
                      <button
                        onClick={() => setShowResultsModal(round)}
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
      {showCreateModal && (
        <CreateRoundModal
          players={safePlayers}
          allRounds={allRounds}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateRound}
          getDefaultPaymentStructure={getDefaultPaymentStructure}
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
            alert('🎉 Ronda finalizada com sucesso!\n\n💳 Pagamentos automáticos podem ser processados mais tarde.');
          }}
          loading={isProcessing}
        />
      )}
    </div>
  );
};

// Modal para criar nova ronda
const CreateRoundModal = ({ players, allRounds = [], onClose, onSubmit, getDefaultPaymentStructure, loading }) => {
  const currentWeek = new Date().getWeek();
  const currentMonth = new Date().getMonth() + 1;
  
  const safePlayers = Array.isArray(players) ? players : [];
  
  // Detectar próximo número de ronda
  const getNextRoundNumber = () => {
    if (!allRounds || allRounds.length === 0) return 1;
    
    // Procurar rondas com padrão "Ronda XX"
    const roundNumbers = allRounds
      .map(r => {
        const match = r.name.match(/Ronda (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => n > 0);
    
    const maxNumber = roundNumbers.length > 0 ? Math.max(...roundNumbers) : 0;
    return maxNumber + 1;
  };
  
  const nextRoundNumber = getNextRoundNumber();
  
  const [formData, setFormData] = useState({
    name: `Ronda ${nextRoundNumber} - ${new Date().toLocaleDateString('pt-PT')}`,
    week: currentWeek,
    month: currentMonth,
    paymentStructure: getDefaultPaymentStructure(safePlayers.length)
  });

  // Atualizar quando allRounds mudar
  React.useEffect(() => {
    const newNumber = getNextRoundNumber();
    setFormData(prev => ({
      ...prev,
      name: `Ronda ${newNumber} - ${new Date().toLocaleDateString('pt-PT')}`
    }));
  }, [allRounds]);

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
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">🎯 Criar Nova Ronda</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        {safePlayers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">Não há jogadores na liga!</p>
            <p className="text-sm text-gray-500">Adiciona jogadores primeiro no Dashboard Geral.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Aviso sobre numeração automática */}
            {nextRoundNumber > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                ℹ️ <strong>Numeração automática:</strong> Detectadas {nextRoundNumber - 1} rondas anteriores. 
                Sugerindo "Ronda {nextRoundNumber}" para evitar duplicados.
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Ronda</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Dica: Use numeração sequencial (ex: Ronda 28, Ronda 29) para evitar duplicados
              </p>
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
                {loading ? '⏳ A criar...' : '✅ Criar Ronda'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-colors"
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
        r.playerId === playerId ? { ...r, points: parseInt(points) || 0 } : r
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
        {/* Header fixo */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">🏁 Finalizar Ronda: {round.name}</h3>
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
              📝 Insere os pontos de cada jogador. 
              A classificação é calculada automaticamente.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
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
                          {round.paymentStructure && round.paymentStructure[index] !== undefined ? (
                            round.paymentStructure[index] === 0 ? 'Grátis' : `-${round.paymentStructure[index].toFixed(2)}€`
                          ) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer com botões - FIXO */}
          <div className="p-6 border-t bg-gray-50 flex-shrink-0">
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? '⏳ A processar...' : '✅ Confirmar e Finalizar'}
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

// Modal para ver resultados de uma ronda
const RoundResultsModal = ({ round, onClose }) => {
  const totalCollected = round.participants?.reduce((sum, p) => sum + (p.weeklyPayment || 0), 0) || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">🏆 Classificação Final:</h3>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold px-2"
          >
            ×
          </button>
        </div>

        <h4 className="font-semibold text-gray-800 mb-3 mt-6">📊 Informações da Ronda:</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-600">Nome da Ronda</p>
            <p className="text-lg font-bold text-blue-800">
              {round.name}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-sm text-green-600">Participantes</p>
            <p className="text-lg font-bold text-green-800">{round.participants?.length || 0}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <p className="text-sm text-purple-600">Total Arrecadado</p>
            <p className="text-lg font-bold text-purple-800">{totalCollected.toFixed(2)}€</p>
          </div>
        </div>

        <h4 className="font-semibold text-gray-800 mb-3">🏅 Classificação dos Jogadores:</h4>
        <div className="space-y-2">
          {round.participants?.sort((a, b) => a.position - b.position).map((participant, index) => (
            <div key={participant.playerId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  {participant.position}
                </span>
                <div>
                  <p className="font-medium">{participant.playerName}</p>
                  <p className="text-sm text-gray-600">{participant.points} pontos</p>
                </div>
              </div>
              <div className={`font-bold ${participant.weeklyPayment === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {participant.weeklyPayment === 0 ? 'Grátis' : `-${participant.weeklyPayment.toFixed(2)}€`}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            OK
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
            💳 Pagamento Automático de Dívidas
          </h3>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Sistema de Pagamento Automático:</strong> A cada 5 rondas completas, 
            as dívidas acumuladas são automaticamente pagas. Isto ajuda a manter as contas equilibradas.
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <h4 className="font-semibold text-gray-700">Jogadores com pagamentos pendentes:</h4>
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
                  <p className="font-bold text-green-600">+{totalAmount.toFixed(2)}€</p>
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
            {loading ? '⏳ A processar...' : '✅ Confirmar Pagamentos'}
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