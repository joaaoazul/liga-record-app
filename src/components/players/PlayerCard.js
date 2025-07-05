// src/components/players/PlayerCard.js - VERSÃO CORRIGIDA
import React from 'react';
import { Eye, Trash2, CheckCircle, Clock, Euro } from 'lucide-react';

const PlayerCard = ({ 
  player, 
  onViewProfile, 
  onTogglePaidStatus, 
  onRemovePlayer 
}) => {
  const handleRemovePlayer = async (e) => {
    e.stopPropagation();
    console.log('🗑️ PlayerCard: Remove button clicked for player:', player.id, player.name);
    
    if (onRemovePlayer) {
      console.log('🗑️ PlayerCard: Calling onRemovePlayer function...');
      await onRemovePlayer(player.id);
    } else {
      console.error('❌ PlayerCard: onRemovePlayer function not provided');
      alert('Erro: Função de remoção não disponível');
    }
  };

  const handleTogglePaid = async (e) => {
    e.stopPropagation();
    if (onTogglePaidStatus) {
      await onTogglePaidStatus(player.id);
    }
  };

  const handleViewProfile = (e) => {
    e.stopPropagation();
    if (onViewProfile) {
      onViewProfile(player);
    }
  };

  // Calcular dias desde criação
  const daysSinceCreation = player.createdAt ? 
    Math.floor((new Date() - new Date(player.createdAt)) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header com avatar e nome */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            {player.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{player.name}</h3>
            <p className="text-xs text-gray-500">
              Membro desde {new Date(player.createdAt || Date.now()).toLocaleDateString('pt-PT')}
            </p>
          </div>
        </div>
      </div>

      {/* Saldo */}
      <div className="mb-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Saldo</span>
          <span className={`font-bold text-lg ${
            player.balance > 0 ? 'text-green-600' : 
            player.balance < 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {player.balance > 0 ? '+' : ''}{(player.balance || 0).toFixed(2)}€
          </span>
        </div>
      </div>

      {/* Status de pagamento */}
      <div className="mb-3">
        {player.balance < 0 ? (
          <div className="bg-red-50 border border-red-200 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="text-red-800 text-sm">💸 Deve: {Math.abs(player.balance).toFixed(2)}€</span>
            </div>
            <div className="text-xs text-red-600 mt-1">
              ⏰ Pagamento pendente há {daysSinceCreation} dias
            </div>
          </div>
        ) : player.balance > 0 ? (
          <div className="bg-green-50 border border-green-200 rounded p-2">
            <div className="flex items-center justify-between">
              <span className="text-green-800 text-sm">💰 Crédito: {player.balance.toFixed(2)}€</span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded p-2">
            <span className="text-gray-600 text-sm">⚖️ Saldo equilibrado</span>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div className="text-center">
          <div className="text-gray-500">Contribuição p/ Pote</div>
          <div className="font-semibold text-blue-600">{(player.balance > 0 ? player.balance : 0).toFixed(2)}€</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">Status</div>
          <div className={`font-semibold ${player.paid ? 'text-green-600' : 'text-red-600'}`}>
            {player.paid ? 'Pendente' : 'Pendente'}
          </div>
        </div>
      </div>

      {/* Pontos e Rondas */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div className="text-center">
          <div className="text-gray-500">🏆 Pontos</div>
          <div className="font-semibold">{player.totalPoints || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-500">🎯 Rondas</div>
          <div className="font-semibold">{player.totalRounds || 0}</div>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex space-x-2">
        <button
          onClick={handleViewProfile}
          className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
        >
          <Eye className="h-4 w-4" />
          <span>Ver Perfil</span>
        </button>
        
        <button
          onClick={handleRemovePlayer}
          className="bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 transition-colors flex items-center justify-center"
          title={`Eliminar ${player.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Debug info */}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          ID: {player.id} | onRemove: {onRemovePlayer ? '✅' : '❌'}
        </p>
      </div>
    </div>
  );
};

export default PlayerCard;