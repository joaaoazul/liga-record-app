// src/components/players/PlayerProfile.js - VERSÃO ATUALIZADA
import React, { useState } from 'react';
import { 
  X, 
  Euro, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  History,
  Trash2,
  Edit
} from 'lucide-react';
import { firestoreService } from '../../services/firebase';

const PlayerProfile = ({ player, transactions = [], onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [transactionType, setTransactionType] = useState('payment');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(player.name);

  // Calcular estatísticas
  const playerTransactions = transactions.filter(t => t.playerId === player.id);
  const totalReceived = playerTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = playerTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const currentBalance = player.balance || 0;
  const isDebtor = currentBalance < 0;
  const isCreditor = currentBalance > 0;

  // ========== FUNÇÕES DE GESTÃO DE DÍVIDAS ==========
  
  // Adicionar dívida
  const handleAddDebt = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Por favor, insere um valor válido');
      return;
    }

    setProcessing(true);
    try {
      const result = await firestoreService.addDebt(
        player.id,
        parseFloat(amount),
        description || 'Taxa/Multa adicionada'
      );

      if (result.success) {
        alert(`✅ Dívida adicionada! Novo saldo: ${result.newBalance.toFixed(2)}€`);
        
        // Atualizar estado local
        const updatedPlayer = {
          ...player,
          balance: result.newBalance
        };
        onUpdate(updatedPlayer);
        
        // Limpar formulário
        setAmount('');
        setDescription('');
        setShowAddTransaction(false);
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Registar pagamento
  const handlePayDebt = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Por favor, insere um valor válido');
      return;
    }

    setProcessing(true);
    try {
      const result = await firestoreService.payDebt(
        player.id,
        parseFloat(amount),
        description || 'Pagamento de dívida'
      );

      if (result.success) {
        alert(`✅ Pagamento registado! Novo saldo: ${result.newBalance.toFixed(2)}€`);
        
        // Atualizar estado local
        const updatedPlayer = {
          ...player,
          balance: result.newBalance
        };
        onUpdate(updatedPlayer);
        
        // Limpar formulário
        setAmount('');
        setDescription('');
        setShowAddTransaction(false);
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Quitar dívida completa
  const handleSettleDebt = async () => {
    if (!isDebtor) {
      alert('Este jogador não tem dívidas!');
      return;
    }

    const confirmSettle = window.confirm(
      `Quitar dívida completa de ${Math.abs(currentBalance).toFixed(2)}€?`
    );
    
    if (!confirmSettle) return;

    setProcessing(true);
    try {
      const result = await firestoreService.settleDebt(
        player.id,
        'Quitação completa da dívida'
      );

      if (result.success) {
        if (result.settledAmount) {
          alert(`✅ Dívida quitada! Total pago: ${result.settledAmount.toFixed(2)}€`);
        } else {
          alert('✅ Não havia dívidas para quitar');
        }
        
        // Atualizar jogador com saldo zero
        const updatedPlayer = {
          ...player,
          balance: result.newBalance
        };
        onUpdate(updatedPlayer);
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Processar transação (dívida ou pagamento)
  const handleProcessTransaction = async () => {
    if (transactionType === 'payment') {
      await handlePayDebt();
    } else {
      await handleAddDebt();
    }
  };

  // Atualizar nome do jogador
  const handleUpdateName = async () => {
    if (!newName || newName.trim() === player.name) {
      setEditingName(false);
      return;
    }

    setProcessing(true);
    try {
      const result = await firestoreService.updatePlayer(player.id, {
        name: newName.trim()
      });

      if (result.success) {
        const updatedPlayer = { ...player, name: newName.trim() };
        onUpdate(updatedPlayer);
        setEditingName(false);
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Eliminar jogador
  const handleDeletePlayer = async () => {
    const confirmDelete = window.confirm(
      `⚠️ Eliminar ${player.name}? Esta ação não pode ser desfeita!`
    );
    
    if (!confirmDelete) return;

    setProcessing(true);
    try {
      const result = await firestoreService.deletePlayer(player.id);

      if (result.success) {
        alert('✅ Jogador eliminado');
        onClose();
        window.location.reload();
      } else {
        alert(`❌ Erro: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`p-6 border-b ${isDebtor ? 'bg-red-50' : isCreditor ? 'bg-green-50' : 'bg-gray-50'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                isDebtor ? 'bg-red-200 text-red-700' : 
                isCreditor ? 'bg-green-200 text-green-700' : 
                'bg-gray-200 text-gray-700'
              }`}>
                {player.name.substring(0, 2).toUpperCase()}
              </div>
              
              <div>
                {editingName ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="px-2 py-1 border rounded"
                      autoFocus
                    />
                    <button
                      onClick={handleUpdateName}
                      className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                      disabled={processing}
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => {
                        setNewName(player.name);
                        setEditingName(false);
                      }}
                      className="px-2 py-1 bg-gray-600 text-white rounded text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h2 className="text-2xl font-bold">{player.name}</h2>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <p className={`text-lg font-medium mt-1 ${
                  isDebtor ? 'text-red-600' : 
                  isCreditor ? 'text-green-600' : 
                  'text-gray-600'
                }`}>
                  Saldo: {currentBalance >= 0 ? '+' : ''}{currentBalance.toFixed(2)}€
                </p>
              </div>
            </div>
            
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            {isDebtor && (
              <button
                onClick={handleSettleDebt}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                disabled={processing}
              >
                <CheckCircle className="h-4 w-4" />
                <span>Quitar Dívida ({Math.abs(currentBalance).toFixed(2)}€)</span>
              </button>
            )}
            
            <button
              onClick={() => setShowAddTransaction(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              disabled={processing}
            >
              <Plus className="h-4 w-4" />
              <span>Nova Transação</span>
            </button>
            
            <button
              onClick={handleDeletePlayer}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
              disabled={processing}
            >
              <Trash2 className="h-4 w-4" />
              <span>Eliminar</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'overview' 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Resumo
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'transactions' 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Transações ({playerTransactions.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[400px]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Total Recebido</p>
                  <p className="text-xl font-bold text-green-600">
                    {totalReceived.toFixed(2)}€
                  </p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Total Pago</p>
                  <p className="text-xl font-bold text-red-600">
                    {totalPaid.toFixed(2)}€
                  </p>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <Euro className={`h-8 w-8 mx-auto mb-2 ${
                    isDebtor ? 'text-red-600' : 
                    isCreditor ? 'text-green-600' : 
                    'text-gray-600'
                  }`} />
                  <p className="text-sm text-gray-500">Saldo Atual</p>
                  <p className={`text-xl font-bold ${
                    isDebtor ? 'text-red-600' : 
                    isCreditor ? 'text-green-600' : 
                    'text-gray-600'
                  }`}>
                    {currentBalance >= 0 ? '+' : ''}{currentBalance.toFixed(2)}€
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className={`p-4 rounded-lg flex items-center space-x-3 ${
                isDebtor ? 'bg-red-50 border border-red-200' : 
                isCreditor ? 'bg-green-50 border border-green-200' : 
                'bg-gray-50 border border-gray-200'
              }`}>
                {isDebtor ? (
                  <>
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <div>
                      <p className="font-medium text-red-900">Jogador com Dívida</p>
                      <p className="text-sm text-red-700">
                        Deve pagar {Math.abs(currentBalance).toFixed(2)}€ para regularizar
                      </p>
                    </div>
                  </>
                ) : isCreditor ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Jogador com Crédito</p>
                      <p className="text-sm text-green-700">
                        Tem {currentBalance.toFixed(2)}€ a receber
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-6 w-6 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">Situação Regularizada</p>
                      <p className="text-sm text-gray-700">Sem dívidas ou créditos</p>
                    </div>
                  </>
                )}
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="font-medium mb-3">Atividade Recente</h3>
                <div className="space-y-2">
                  {playerTransactions.slice(0, 3).map((transaction, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center space-x-3">
                        {transaction.amount > 0 ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{transaction.description}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.date).toLocaleDateString('pt-PT')}
                          </p>
                        </div>
                      </div>
                      <p className={`font-medium ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)}€
                      </p>
                    </div>
                  ))}
                  
                  {playerTransactions.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Sem transações</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {playerTransactions.map((transaction, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex items-center space-x-3">
                    {transaction.amount > 0 ? (
                      <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{transaction.description || transaction.type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)}€
                  </p>
                </div>
              ))}
              
              {playerTransactions.length === 0 && (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Sem transações registadas</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Transaction Modal */}
        {showAddTransaction && (
          <div className="absolute inset-0 bg-white z-50">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Nova Transação</h3>
                <button 
                  onClick={() => setShowAddTransaction(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Transaction Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Transação</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTransactionType('payment')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      transactionType === 'payment'
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Plus className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Pagamento</span>
                    <p className="text-xs mt-1 text-gray-600">Reduz a dívida</p>
                  </button>
                  
                  <button
                    onClick={() => setTransactionType('debt')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      transactionType === 'debt'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Minus className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Adicionar Dívida</span>
                    <p className="text-xs mt-1 text-gray-600">Aumenta a dívida</p>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium mb-2">Valor (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Descrição (opcional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={transactionType === 'payment' ? 'Pagamento de dívida' : 'Taxa semanal'}
                />
              </div>

              {/* Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Saldo atual:</strong> {currentBalance.toFixed(2)}€<br/>
                    <strong>Transação:</strong> {transactionType === 'payment' ? '+' : '-'}{parseFloat(amount).toFixed(2)}€<br/>
                    <strong>Novo saldo:</strong> {
                      transactionType === 'payment' 
                        ? (currentBalance + parseFloat(amount)).toFixed(2)
                        : (currentBalance - parseFloat(amount)).toFixed(2)
                    }€
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowAddTransaction(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  disabled={processing}
                >
                  Cancelar
                </button>
                
                <button
                  onClick={handleProcessTransaction}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:bg-gray-400 ${
                    transactionType === 'payment'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={processing || !amount || parseFloat(amount) <= 0}
                >
                  {processing ? 'Processando...' : 
                   transactionType === 'payment' ? 'Registar Pagamento' : 'Adicionar Dívida'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;