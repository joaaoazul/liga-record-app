// src/components/players/PlayerProfile.js - Versão Completa Corrigida
import React, { useState } from 'react';
import { ArrowLeft, User, TrendingUp, TrendingDown, DollarSign, Calendar, Calculator, Trophy } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';
import Header from '../common/Header';

const PlayerProfile = ({ player, onBack, onUpdatePlayer, transactions, totalPot, settings }) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [operationType, setOperationType] = useState('add');
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const playerTransactions = transactions.filter(t => t.playerId === player.id);

  const handleQuickAction = async (type, value, description) => {
    setLoading(true);
    try {
      let newBalance;
      let transactionType;
      let transactionAmount;
      
      if (type === 'pay_entry') {
        // Pagar quota de entrada
        newBalance = player.balance + settings.entryFee;
        transactionType = 'payment';
        transactionAmount = settings.entryFee;
      } else if (type === 'add_penalty') {
        // Adicionar penalização
        newBalance = player.balance - value;
        transactionType = 'debt';
        transactionAmount = value;
      } else if (type === 'clear_debt') {
        // Quitar todas as dívidas
        transactionAmount = Math.abs(player.balance);
        newBalance = 0;
        transactionType = 'payment';
      }

      console.log('💰 Quick action:', { type, oldBalance: player.balance, newBalance, transactionAmount });

      // Criar a transação PRIMEIRO
      const transactionResult = await firestoreService.addTransaction({
        playerId: player.id,
        playerName: player.name,
        type: transactionType,
        amount: transactionAmount,
        note: description,
        balanceAfter: newBalance,
        timestamp: new Date().toISOString(),
        createdBy: user?.uid
      });

      console.log('📝 Transaction created:', transactionResult);

      if (!transactionResult.success) {
        throw new Error('Failed to create transaction');
      }

      // Atualizar o jogador
      const updatedPlayer = {
        ...player,
        balance: newBalance,
        paid: newBalance >= 0 // Marcar como pago se saldo >= 0
      };

      console.log('💾 Updating player:', updatedPlayer);

      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to update player');
      }

      console.log('✅ Player updated successfully');

      // Chamar onUpdatePlayer para atualizar o estado no componente pai
      await onUpdatePlayer(updatedPlayer);
      
      // Mostrar notificação de sucesso
      alert(`✅ ${description} - Novo saldo: ${newBalance.toFixed(2)}€`);
      
    } catch (error) {
      console.error('❌ Error in quick action:', error);
      alert('Erro ao executar ação: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTransaction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Por favor insere um valor válido');
      return;
    }

    setLoading(true);
    try {
      const value = parseFloat(amount);
      const newBalance = operationType === 'add' ? player.balance + value : player.balance - value;

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
        note: note || (operationType === 'add' ? 'Pagamento personalizado' : 'Dívida adicionada'),
        balanceAfter: newBalance,
        timestamp: new Date().toISOString(),
        createdBy: user?.uid
      });

      console.log('📝 Transaction created:', transactionResult);

      if (!transactionResult.success) {
        throw new Error('Failed to create transaction');
      }

      // Atualizar o jogador
      const updatedPlayer = {
        ...player,
        balance: newBalance,
        paid: newBalance >= 0
      };

      console.log('💾 Updating player:', updatedPlayer);

      const saveResult = await firestoreService.savePlayer(updatedPlayer);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to update player');
      }

      console.log('✅ Player updated successfully');

      // Chamar onUpdatePlayer para atualizar o estado
      await onUpdatePlayer(updatedPlayer);
      
      // Limpar formulário
      setAmount('');
      setNote('');
      
      // Notificar sucesso
      alert(`✅ Transação concluída - Novo saldo: ${newBalance.toFixed(2)}€`);
      
    } catch (error) {
      console.error('❌ Error in custom transaction:', error);
      alert('Erro ao processar transação: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const contributionToTotal = Math.max(0, player.balance);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <Header settings={settings} onSettingsChange={() => {}} />
        
        {/* Player Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Voltar à Lista</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                {player.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{player.name}</h1>
                <p className="text-sm text-gray-500">
                  Membro desde {new Date(player.createdAt || Date.now()).toLocaleDateString('pt-PT')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Status</p>
              <p className={`text-lg font-bold px-3 py-1 rounded-full inline-block ${
                player.paid ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
              }`}>
                {player.paid ? '✅ Em Dia' : '⏳ Pendente'}
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">Saldo Individual</p>
              <div className="flex items-center justify-center space-x-2">
                {player.balance >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <p className={`text-xl font-bold ${player.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
              {player.balance < 0 && (
                <button
                  onClick={() => handleQuickAction('pay_entry', settings.entryFee, 'Pagamento da quota de entrada')}
                  disabled={loading}
                  className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex justify-between items-center">
                    <span>💰 Pagar Quota de Entrada</span>
                    <span className="font-bold">+{settings.entryFee}€</span>
                  </div>
                  <p className="text-green-100 text-sm">Saldo ficaria: {(player.balance + settings.entryFee).toFixed(2)}€</p>
                </button>
              )}
              
              <button
                onClick={() => handleQuickAction('add_penalty', 5, 'Penalização por atraso/falta')}
                disabled={loading}
                className="w-full bg-orange-600 text-white p-3 rounded-lg hover:bg-orange-700 transition-colors text-left disabled:opacity-50"
              >
                <div className="flex justify-between items-center">
                  <span>⚠️ Adicionar Penalização</span>
                  <span className="font-bold">-5€</span>
                </div>
                <p className="text-orange-100 text-sm">Saldo ficaria: {(player.balance - 5).toFixed(2)}€</p>
              </button>
              
              {player.balance < 0 && (
                <button
                  onClick={() => handleQuickAction('clear_debt', 0, 'Todas as dívidas foram pagas')}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex justify-between items-center">
                    <span>✅ Quitar Todas as Dívidas</span>
                    <span className="font-bold">+{Math.abs(player.balance).toFixed(2)}€</span>
                  </div>
                  <p className="text-blue-100 text-sm">Saldo ficaria: 0.00€</p>
                </button>
              )}
            </div>

            {/* Custom Transaction */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-800 mb-3">💳 Transação Personalizada</h3>
              
              <div className="space-y-3">
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="add">➕ Adicionar Dinheiro (Pagamento)</option>
                  <option value="subtract">➖ Subtrair Dinheiro (Dívida)</option>
                </select>
                
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Valor em euros"
                />
                
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Motivo da transação (opcional)"
                />
                
                {amount && (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p>Saldo atual: <span className={`font-bold ${player.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {player.balance.toFixed(2)}€
                    </span></p>
                    <p>Após operação: <span className={`font-bold ${
                      (operationType === 'add' ? player.balance + parseFloat(amount || 0) : player.balance - parseFloat(amount || 0)) >= 0 
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(operationType === 'add' 
                        ? player.balance + parseFloat(amount || 0) 
                        : player.balance - parseFloat(amount || 0)
                      ).toFixed(2)}€
                    </span></p>
                  </div>
                )}
                
                <button
                  onClick={handleCustomTransaction}
                  disabled={!amount || parseFloat(amount) <= 0 || loading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? 'A processar...' : 'Confirmar Transação'}
                </button>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">📋 Histórico de Movimentos</h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {playerTransactions.length > 0 ? (
                playerTransactions.slice().reverse().map((transaction) => (
                  <div key={transaction.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            transaction.type === 'payment' 
                              ? 'bg-green-100 text-green-800' 
                              : transaction.type === 'debt' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {transaction.type === 'payment' ? '💰 Pagamento' : 
                             transaction.type === 'debt' ? '💸 Dívida' : 
                             '🔄 Alteração'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(transaction.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{transaction.note}</p>
                        {transaction.createdBy && (
                          <p className="text-xs text-gray-500 mt-1">
                            Por: {transaction.createdBy === user?.uid ? 'Você' : 'Admin'}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className={`font-bold ${
                          transaction.type === 'payment' ? 'text-green-600' : 
                          transaction.type === 'debt' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {transaction.type === 'payment' ? '+' : transaction.type === 'debt' ? '-' : ''}
                          {transaction.amount > 0 ? transaction.amount.toFixed(2) + '€' : ''}
                        </div>
                        <div className="text-xs text-gray-500">
                          Saldo: {transaction.balanceAfter.toFixed(2)}€
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">📝 Nenhum movimento registado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rounds History for Player */}
        {player.rounds && player.rounds.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              ⚽ Histórico de Rondas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-600 font-medium">Total de Pontos</p>
                <p className="text-2xl font-bold text-blue-800">{player.totalPoints || 0}</p>
                <p className="text-xs text-blue-600">Acumulados</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-sm text-green-600 font-medium">Rondas Jogadas</p>
                <p className="text-2xl font-bold text-green-800">{player.totalRounds || 0}</p>
                <p className="text-xs text-green-600">Participações</p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-sm text-purple-600 font-medium">Média de Pontos</p>
                <p className="text-2xl font-bold text-purple-800">
                  {player.totalRounds > 0 ? ((player.totalPoints || 0) / player.totalRounds).toFixed(1) : '0.0'}
                </p>
                <p className="text-xs text-purple-600">Por ronda</p>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {player.rounds.slice().reverse().map((round, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          round.position === 1 ? 'bg-yellow-100 text-yellow-800' :
                          round.position === 2 ? 'bg-gray-100 text-gray-800' :
                          round.position === 3 ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {round.position === 1 ? '🥇' : round.position === 2 ? '🥈' : round.position === 3 ? '🥉' : '🏃‍♂️'} {round.position}º lugar
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(round.date)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{round.roundName}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-bold text-blue-600">
                        {round.points} pts
                      </div>
                      <div className={`text-sm ${round.payment === 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {round.payment === 0 ? 'Grátis' : `-${round.payment.toFixed(2)}€`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Impact on Dinner Fund */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🍽️ Contribuição para o Jantar</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-600 font-medium">Contribuição Individual</p>
              <p className="text-2xl font-bold text-blue-800">{contributionToTotal.toFixed(2)}€</p>
              <p className="text-xs text-blue-600">
                {totalPot > 0 ? `${((contributionToTotal / totalPot) * 100).toFixed(1)}% do pote` : '0% do pote'}
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-green-600 font-medium">Pote Total Atual</p>
              <p className="text-2xl font-bold text-green-800">{totalPot.toFixed(2)}€</p>
              <p className="text-xs text-green-600">Orçamento para o jantar</p>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-sm text-orange-600 font-medium">Orçamento por Pessoa</p>
              <p className="text-2xl font-bold text-orange-800">
                {totalPot > 0 ? (totalPot / Math.max(1, Math.ceil(totalPot / (settings.entryFee || 20)))).toFixed(2) : '0.00'}€
              </p>
              <p className="text-xs text-orange-600">Estimativa para o jantar</p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>🍽️ Nota:</strong> O pote destina-se ao jantar de fim de liga. 
              Apenas saldos positivos contribuem para o orçamento total do jantar.
            </p>
            {settings.dinnerGoal && (
              <p className="text-sm text-gray-600 mt-1">
                <strong>🎯 Objetivo:</strong> {settings.dinnerGoal}
              </p>
            )}
            {settings.dinnerDate && (
              <p className="text-sm text-gray-600 mt-1">
                <strong>📅 Data prevista:</strong> {new Date(settings.dinnerDate).toLocaleDateString('pt-PT')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;