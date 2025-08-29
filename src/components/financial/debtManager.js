// src/components/financial/DebtManager.js
import React, { useState } from 'react';
import { 
  Euro, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { firestoreService } from '../../services/firebase';

const DebtManager = ({ players, onReload }) => {
  const [processing, setProcessing] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState(null);

  // Calcular estatísticas
  const stats = {
    totalDebt: players.reduce((sum, p) => sum + Math.min(0, p.balance || 0), 0),
    totalCredit: players.reduce((sum, p) => sum + Math.max(0, p.balance || 0), 0),
    debtors: players.filter(p => (p.balance || 0) < 0),
    creditors: players.filter(p => (p.balance || 0) > 0),
    balanced: players.filter(p => (p.balance || 0) === 0)
  };

  // Quitar dívida individual
  const handleSettleDebt = async (player, amount = null) => {
    setProcessing(true);
    try {
      const settleAmount = amount || Math.abs(player.balance);
      
      const result = await firestoreService.settleDebt(
        player.id,
        settleAmount,
        amount ? 'Pagamento parcial' : 'Pagamento total da dívida'
      );
      
      if (result.success) {
        alert(`✅ Dívida de ${player.name} quitada: ${settleAmount.toFixed(2)}€`);
        onReload();
      } else {
        alert(`❌ Erro ao quitar dívida: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setProcessing(false);
      setShowConfirmModal(false);
      setSelectedPlayer(null);
      setCustomAmount('');
    }
  };

  // Quitar todas as dívidas
  const handleSettleAllDebts = async () => {
    setProcessing(true);
    try {
      const result = await firestoreService.settleAllDebts();
      
      if (result.success) {
        alert(`✅ Todas as dívidas foram quitadas!`);
        onReload();
      } else {
        alert(`❌ Erro ao quitar dívidas: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setProcessing(false);
      setShowConfirmModal(false);
    }
  };

  // Reset todos os saldos
  const handleResetBalances = async () => {
    setProcessing(true);
    try {
      const result = await firestoreService.resetAllBalances();
      
      if (result.success) {
        alert('✅ Todos os saldos foram resetados para 0€');
        onReload();
      } else {
        alert(`❌ Erro ao resetar saldos: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setProcessing(false);
      setShowConfirmModal(false);
    }
  };

  // Cobrar taxa semanal
  const handleChargeWeeklyFee = async (amount) => {
    setProcessing(true);
    try {
      const result = await firestoreService.chargeWeeklyFees(amount);
      
      if (result.success) {
        alert(`✅ Taxa semanal de ${amount}€ cobrada a todos os jogadores`);
        onReload();
      } else {
        alert(`❌ Erro ao cobrar taxa: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Erro: ${error.message}`);
    } finally {
      setProcessing(false);
      setShowConfirmModal(false);
    }
  };

  // Modal de Confirmação
  const ConfirmModal = () => {
    if (!showConfirmModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowConfirmModal(false)} />
        <div className="relative bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Confirmar Ação</h3>
          
          {actionType === 'settle-individual' && selectedPlayer && (
            <>
              <p className="mb-4">
                Quitar dívida de <strong>{selectedPlayer.name}</strong>?
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Valor atual: {selectedPlayer.balance.toFixed(2)}€
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Valor a pagar (deixe vazio para total)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder={Math.abs(selectedPlayer.balance).toFixed(2)}
                />
              </div>
            </>
          )}
          
          {actionType === 'settle-all' && (
            <p className="mb-4">
              Quitar todas as dívidas? Total: <strong>{Math.abs(stats.totalDebt).toFixed(2)}€</strong>
            </p>
          )}
          
          {actionType === 'reset-all' && (
            <p className="mb-4 text-red-600">
              ⚠️ Resetar TODOS os saldos para 0€? Esta ação não pode ser desfeita!
            </p>
          )}
          
          {actionType === 'weekly-fee' && (
            <>
              <p className="mb-4">Cobrar taxa semanal a todos os jogadores ativos?</p>
              <input
                type="number"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
                placeholder="Valor da taxa"
              />
            </>
          )}
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowConfirmModal(false);
                setSelectedPlayer(null);
                setCustomAmount('');
              }}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              disabled={processing}
            >
              Cancelar
            </button>
            
            <button
              onClick={() => {
                if (actionType === 'settle-individual') {
                  handleSettleDebt(selectedPlayer, customAmount ? parseFloat(customAmount) : null);
                } else if (actionType === 'settle-all') {
                  handleSettleAllDebts();
                } else if (actionType === 'reset-all') {
                  handleResetBalances();
                } else if (actionType === 'weekly-fee') {
                  handleChargeWeeklyFee(parseFloat(customAmount));
                }
              }}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              disabled={processing || (actionType === 'weekly-fee' && !customAmount)}
            >
              {processing ? 'Processando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Dívidas</p>
              <p className="text-xl font-bold text-red-600">
                {Math.abs(stats.totalDebt).toFixed(2)}€
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-200" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Créditos</p>
              <p className="text-xl font-bold text-green-600">
                {stats.totalCredit.toFixed(2)}€
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Devedores</p>
              <p className="text-xl font-bold">{stats.debtors.length}</p>
            </div>
            <XCircle className="h-8 w-8 text-orange-200" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Credores</p>
              <p className="text-xl font-bold">{stats.creditors.length}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-4">Ações Rápidas</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => {
              setActionType('settle-all');
              setShowConfirmModal(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            disabled={processing || stats.debtors.length === 0}
          >
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Quitar Todas</span>
          </button>
          
          <button
            onClick={() => {
              setActionType('weekly-fee');
              setShowConfirmModal(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            disabled={processing}
          >
            <CreditCard className="h-4 w-4" />
            <span className="text-sm">Taxa Semanal</span>
          </button>
          
          <button
            onClick={() => {
              setActionType('reset-all');
              setShowConfirmModal(true);
            }}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
            disabled={processing}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm">Reset Saldos</span>
          </button>
          
          <button
            onClick={onReload}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            disabled={processing}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Lista de Devedores */}
      {stats.debtors.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-red-600">
              Jogadores com Dívidas ({stats.debtors.length})
            </h3>
          </div>
          
          <div className="divide-y">
            {stats.debtors.map(player => (
              <div key={player.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium">{player.name}</p>
                  <p className="text-sm text-red-600">
                    Deve: {Math.abs(player.balance).toFixed(2)}€
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedPlayer(player);
                    setActionType('settle-individual');
                    setShowConfirmModal(true);
                  }}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                  disabled={processing}
                >
                  Quitar Dívida
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Credores */}
      {stats.creditors.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-green-600">
              Jogadores com Crédito ({stats.creditors.length})
            </h3>
          </div>
          
          <div className="divide-y">
            {stats.creditors.map(player => (
              <div key={player.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-medium">{player.name}</p>
                  <p className="text-sm text-green-600">
                    Crédito: {player.balance.toFixed(2)}€
                  </p>
                </div>
                
                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm">
                  A Receber
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal />
    </div>
  );
};

export default DebtManager;