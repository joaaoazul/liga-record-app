// src/components/players/PlayerProfile.js - VERSÃO CORRIGIDA E OTIMIZADA
import React, { useState } from 'react';
import { ArrowLeft, User, TrendingUp, TrendingDown, DollarSign, Calendar, Calculator, Trophy, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';

const PlayerProfile = ({ player, onBack, onUpdatePlayer, transactions, totalPot, settings }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [operationType, setOperationType] = useState('add');
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  
  // Filtrar transações do jogador
  const playerTransactions = transactions.filter(t => t.playerId === player.id);
  
  // Calcular estatísticas
  const contributionToTotal = Math.max(0, -player.balance);
  const totalPayments = playerTransactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebts = playerTransactions
    .filter(t => t.type === 'debt')
    .reduce((sum, t) => sum + t.amount, 0);

  // FUNÇÃO CORRIGIDA: Ações Rápidas (incluindo Quitar Dívidas)
  const handleQuickAction = async (type, value, description) => {
    setLoading(true);
    try {
      let newBalance;
      let transactionType;
      let transactionAmount;
      
      // Processar diferentes tipos de ação
      if (type === 'pay_entry') {
        // Pagar quota de entrada
        newBalance = player.balance + settings.entryFee;
        transactionType = 'payment';
        transactionAmount = settings.entryFee;
        description = description || `Pagamento da quota de entrada (${settings.entryFee}€)`;
        
      } else if (type === 'add_penalty') {
        // Adicionar penalização
        newBalance = player.balance - value;
        transactionType = 'debt';
        transactionAmount = value;
        description = description || `Penalização aplicada (${value}€)`;
        
      } else if (type === 'clear_debt') {
        // CORREÇÃO PRINCIPAL: Quitar todas as dívidas
        if (player.balance >= 0) {
          alert('✅ O jogador não tem dívidas para quitar!');
          setLoading(false);
          return;
        }
        
        // Confirmação antes de quitar
        const debtAmount = Math.abs(player.balance);
        const confirm = window.confirm(
          `💰 Confirma o pagamento de ${debtAmount.toFixed(2)}€?\n\n` +
          `Esta ação irá:\n` +
          `• Quitar todas as dívidas do jogador\n` +
          `• Definir o saldo para 0.00€\n` +
          `• Registrar a transação no histórico\n\n` +
          `Confirmar pagamento?`
        );
        
        if (!confirm) {
          setLoading(false);
          return;
        }
        
        // Calcular valores corretos
        transactionAmount = debtAmount;
        newBalance = 0;
        transactionType = 'payment';
        description = `Quitação total de dívidas - Valor pago: ${transactionAmount.toFixed(2)}€`;
      }

      console.log('💰 Quick action:', { 
        type, 
        oldBalance: player.balance, 
        newBalance, 
        transactionAmount,
        description 
      });

      // IMPORTANTE: Criar a transação PRIMEIRO (para manter histórico)
      const transactionResult = await firestoreService.addTransaction({
        playerId: player.id,
        playerName: player.name,
        type: transactionType,
        amount: transactionAmount,
        note: description,
        balanceAfter: newBalance,
        timestamp: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous'
      });

      console.log('📝 Transaction created:', transactionResult);

      if (!transactionResult.success) {
        throw new Error('Falha ao criar transação');
      }

      // Atualizar o jogador
      const updatedPlayer = {
        ...player,
        balance: newBalance,
        paid: newBalance >= 0,  // Marcar como pago se saldo >= 0
        lastUpdated: new Date().toISOString()
      };

      console.log('💾 Updating player:', updatedPlayer);

      // Salvar no Firebase
      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Falha ao atualizar jogador');
      }

      console.log('✅ Player updated successfully');

      // Atualizar estado no componente pai
      await onUpdatePlayer(updatedPlayer);
      
      // Notificação de sucesso com detalhes
      alert(
        `✅ Operação concluída com sucesso!\n\n` +
        `📝 ${description}\n` +
        `💰 Saldo anterior: ${player.balance.toFixed(2)}€\n` +
        `💵 Novo saldo: ${newBalance.toFixed(2)}€\n` +
        `${newBalance >= 0 ? '✅ Jogador em dia!' : '⚠️ Jogador com dívida'}`
      );
      
    } catch (error) {
      console.error('❌ Error in quick action:', error);
      alert(`❌ Erro ao executar ação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // FUNÇÃO CORRIGIDA: Transação Personalizada
  const handleCustomTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('❌ Por favor insere um valor válido (maior que 0)');
      return;
    }

    setLoading(true);
    try {
      const value = parseFloat(amount);
      const newBalance = operationType === 'add' 
        ? player.balance + value 
        : player.balance - value;

      // Confirmação para valores altos
      if (value > 100) {
        const confirm = window.confirm(
          `⚠️ Valor elevado: ${value.toFixed(2)}€\n\n` +
          `Confirma a ${operationType === 'add' ? 'adição' : 'subtração'} deste valor?`
        );
        if (!confirm) {
          setLoading(false);
          return;
        }
      }

      console.log('💳 Custom transaction:', { 
        operationType, 
        value, 
        oldBalance: player.balance, 
        newBalance 
      });

      // Criar a transação
      const transactionResult = await firestoreService.addTransaction({
        playerId: player.id,
        playerName: player.name,
        type: operationType === 'add' ? 'payment' : 'debt',
        amount: value,
        note: note || (operationType === 'add' 
          ? `Pagamento personalizado de ${value.toFixed(2)}€` 
          : `Dívida adicionada de ${value.toFixed(2)}€`),
        balanceAfter: newBalance,
        timestamp: new Date().toISOString(),
        createdBy: user?.uid || 'anonymous'
      });

      console.log('📝 Transaction created:', transactionResult);

      if (!transactionResult.success) {
        throw new Error('Falha ao criar transação');
      }

      // Atualizar o jogador
      const updatedPlayer = {
        ...player,
        balance: newBalance,
        paid: newBalance >= 0,
        lastUpdated: new Date().toISOString()
      };

      console.log('💾 Updating player:', updatedPlayer);

      // Salvar no Firebase
      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Falha ao atualizar jogador');
      }

      console.log('✅ Player updated successfully');

      // Atualizar estado no componente pai
      await onUpdatePlayer(updatedPlayer);
      
      // Limpar formulário
      setAmount('');
      setNote('');
      
      // Notificar sucesso
      alert(
        `✅ Transação concluída!\n\n` +
        `${operationType === 'add' ? '💰 Pagamento' : '💸 Dívida'}: ${value.toFixed(2)}€\n` +
        `📝 ${note || 'Sem descrição'}\n` +
        `💵 Novo saldo: ${newBalance.toFixed(2)}€`
      );
      
    } catch (error) {
      console.error('❌ Error in custom transaction:', error);
      alert(`❌ Erro ao processar transação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'Data desconhecida';
    const date = new Date(dateString);
    return date.toLocaleString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Voltar
        </button>
        <div className="text-right">
          <p className="text-sm text-gray-500">Última atualização</p>
          <p className="text-xs text-gray-400">{formatDate(player.lastUpdated)}</p>
        </div>
      </div>

      {/* Player Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{player.name}</h1>
              <p className="text-sm text-gray-500">
                Membro desde {new Date(player.createdAt || Date.now()).toLocaleDateString('pt-PT')}
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full ${
            player.balance >= 0 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {player.balance >= 0 ? '✅ Em dia' : '⚠️ Com dívida'}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">Saldo Atual</p>
            <div className="flex items-center justify-center space-x-2">
              {player.balance >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <p className={`text-xl font-bold ${
                player.balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {player.balance >= 0 ? '+' : ''}{player.balance.toFixed(2)}€
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">Total de Pontos</p>
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              <p className="text-xl font-bold text-blue-600">
                {player.totalPoints || 0}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              {player.totalRounds || 0} rondas jogadas
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600">Contribuição p/ Pote</p>
            <div className="flex items-center justify-center space-x-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <p className="text-xl font-bold text-blue-600">
                {contributionToTotal.toFixed(2)}€
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Total do pote: {totalPot.toFixed(2)}€
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            🎯 Ações Rápidas
          </h2>

          <div className="space-y-3 mb-6">
            {/* Botão Pagar Quota - só aparece se tem dívida */}
            {player.balance < 0 && (
              <button
                onClick={() => handleQuickAction('pay_entry', settings.entryFee, 'Pagamento da quota de entrada')}
                disabled={loading}
                className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex justify-between items-center">
                  <span>💰 Pagar Quota de Entrada</span>
                  <span className="font-bold">+{settings.entryFee}€</span>
                </div>
                <p className="text-green-100 text-sm mt-1">
                  Saldo ficará: {(player.balance + settings.entryFee).toFixed(2)}€
                </p>
              </button>
            )}
            
            {/* Botão Adicionar Penalização */}
            <button
              onClick={() => handleQuickAction('add_penalty', 5, 'Penalização por atraso/falta')}
              disabled={loading}
              className="w-full bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex justify-between items-center">
                <span>⚠️ Adicionar Penalização</span>
                <span className="font-bold">-5€</span>
              </div>
              <p className="text-orange-100 text-sm mt-1">
                Saldo ficará: {(player.balance - 5).toFixed(2)}€
              </p>
            </button>
            
            {/* BOTÃO CORRIGIDO: Quitar Todas as Dívidas */}
            {player.balance < 0 && (
              <button
                onClick={() => handleQuickAction('clear_debt', 0, 'Todas as dívidas foram pagas')}
                disabled={loading}
                className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex justify-between items-center">
                  <span>✅ Quitar Todas as Dívidas</span>
                  <span className="font-bold">+{Math.abs(player.balance).toFixed(2)}€</span>
                </div>
                <p className="text-blue-100 text-sm mt-1">
                  Saldo ficará: 0.00€ (Em dia!)
                </p>
              </button>
            )}

            {/* Mensagem quando não há dívidas */}
            {player.balance >= 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-green-600" />
                  <p className="text-green-800">
                    ✅ Jogador em dia! Não há dívidas para quitar.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Custom Transaction */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-gray-800 mb-3">💳 Transação Personalizada</h3>
            
            <div className="space-y-3">
              <select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="add">➕ Adicionar Dinheiro (Pagamento)</option>
                <option value="subtract">➖ Subtrair Dinheiro (Dívida)</option>
              </select>
              
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Valor em euros (ex: 10.50)"
              />
              
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={loading}
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Descrição da transação (opcional)"
              />
              
              {/* Preview do resultado */}
              {amount && parseFloat(amount) > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <p className="font-semibold mb-2">📊 Previsão:</p>
                  <p>Saldo atual: 
                    <span className={`font-bold ml-2 ${
                      player.balance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {player.balance.toFixed(2)}€
                    </span>
                  </p>
                  <p>Operação: 
                    <span className={`font-bold ml-2 ${
                      operationType === 'add' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {operationType === 'add' ? '+' : '-'}{parseFloat(amount).toFixed(2)}€
                    </span>
                  </p>
                  <p className="border-t pt-2 mt-2">Saldo após operação: 
                    <span className={`font-bold ml-2 ${
                      (operationType === 'add' 
                        ? player.balance + parseFloat(amount) 
                        : player.balance - parseFloat(amount)) >= 0 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(operationType === 'add' 
                        ? player.balance + parseFloat(amount || 0) 
                        : player.balance - parseFloat(amount || 0)
                      ).toFixed(2)}€
                    </span>
                  </p>
                </div>
              )}
              
              <button
                onClick={handleCustomTransaction}
                disabled={!amount || parseFloat(amount) <= 0 || loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    A processar...
                  </>
                ) : (
                  '✅ Confirmar Transação'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            📋 Histórico de Transações
          </h2>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-600">Total Pago</p>
              <p className="text-lg font-bold text-green-600">
                +{totalPayments.toFixed(2)}€
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600">Total Devido</p>
              <p className="text-lg font-bold text-red-600">
                -{totalDebts.toFixed(2)}€
              </p>
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {playerTransactions.length > 0 ? (
              playerTransactions
                .slice()
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'payment' 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.type === 'debt' 
                                ? 'bg-red-100 text-red-800'
                                : transaction.type === 'removal'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.type === 'payment' ? '💰 Pagamento' : 
                             transaction.type === 'debt' ? '💸 Dívida' :
                             transaction.type === 'removal' ? '🗑️ Remoção' : 
                             '🔄 Alteração'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(transaction.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{transaction.note}</p>
                        {transaction.roundId && (
                          <p className="text-xs text-gray-500 mt-1">
                            🎯 Ronda: {transaction.roundId}
                          </p>
                        )}
                        {transaction.createdBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            👤 Por: {transaction.createdBy === user?.uid ? 'Você' : 'Admin'}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className={`font-bold text-lg ${
                          transaction.type === 'payment' ? 'text-green-600' : 
                          transaction.type === 'debt' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {transaction.type === 'payment' ? '+' : 
                           transaction.type === 'debt' ? '-' : ''}
                          {transaction.amount.toFixed(2)}€
                        </div>
                        <p className="text-xs text-gray-500">
                          Saldo: {(transaction.balanceAfter || 0).toFixed(2)}€
                        </p>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Ainda não há transações</p>
                <p className="text-xs text-gray-400 mt-1">
                  As transações aparecerão aqui quando forem realizadas
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;