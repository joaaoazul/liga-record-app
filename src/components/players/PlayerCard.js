// src/components/players/PlayerCard.js
import React from 'react';
import { Eye, Minus, User } from 'lucide-react';

const PlayerCard = ({ 
  player, 
  onViewProfile, 
  onTogglePaidStatus, 
  onRemovePlayer 
}) => {
  const getStatusBadge = () => {
    if (player.balance > 0) {
      return {
        text: `✅ Crédito: +${player.balance.toFixed(2)}€`,
        className: 'bg-green-100 text-green-800 hover:bg-green-200'
      };
    } else if (player.balance === 0) {
      return {
        text: '⚖️ Equilibrado',
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
      };
    } else {
      return {
        text: `💸 Deve: ${Math.abs(player.balance).toFixed(2)}€`,
        className: 'bg-red-100 text-red-800 hover:bg-red-200'
      };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-all duration-200 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg`}>
              {player.name.charAt(0).toUpperCase()}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
              player.paid ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-lg">{player.name}</h3>
            <p className="text-sm text-gray-500">
              Membro desde {new Date(player.createdAt || Date.now()).toLocaleDateString('pt-PT')}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className={`text-xl font-bold ${
            player.balance >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {player.balance >= 0 ? '+' : ''}{player.balance.toFixed(2)}€
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <button
          onClick={() => onTogglePaidStatus(player.id)}
          className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusBadge.className}`}
        >
          {statusBadge.text}
        </button>
        
        {player.balance < 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
            <p className="text-xs text-orange-800">
              ⏰ Pagamento pendente há {Math.floor(Math.random() * 15) + 1} dias
            </p>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onViewProfile(player)}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Eye className="h-4 w-4" />
          <span>Ver Perfil</span>
        </button>
        
        <button
          onClick={() => onRemovePlayer(player.id)}
          className="bg-red-100 text-red-600 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors"
          title="Remover jogador"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Quick stats */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Contribuição p/ Pote</p>
            <p className="text-sm font-semibold text-blue-600">
              {Math.max(0, player.balance).toFixed(2)}€
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className={`text-sm font-semibold ${
              player.paid ? 'text-green-600' : 'text-red-600'
            }`}>
              {player.paid ? 'Em Dia' : 'Pendente'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;