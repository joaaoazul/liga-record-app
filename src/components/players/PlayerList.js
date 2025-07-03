// src/components/players/PlayerList.js
import React, { useState } from 'react';
import { Users, Plus, Search, Filter } from 'lucide-react';
import PlayerCard from './PlayerCard';

const PlayerList = ({ 
  players, 
  onViewProfile, 
  onTogglePaidStatus, 
  onRemovePlayer, 
  onAddPlayer 
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, pending, debt

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
      setShowAddPlayer(false);
    }
  };

  const getFilteredPlayers = () => {
    let filtered = players;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    switch (filterStatus) {
      case 'paid':
        filtered = filtered.filter(player => player.paid);
        break;
      case 'pending':
        filtered = filtered.filter(player => !player.paid);
        break;
      case 'debt':
        filtered = filtered.filter(player => player.balance < 0);
        break;
      case 'credit':
        filtered = filtered.filter(player => player.balance > 0);
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredPlayers = getFilteredPlayers();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          👥 Jogadores da Liga ({filteredPlayers.length}/{players.length})
        </h2>
        <button
          onClick={() => setShowAddPlayer(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Pesquisar jogadores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        
        <div className="relative">
          <Filter className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="all">Todos</option>
            <option value="paid">✅ Em Dia</option>
            <option value="pending">⏳ Pendentes</option>
            <option value="debt">💸 Devedores</option>
            <option value="credit">💰 Com Crédito</option>
          </select>
        </div>
      </div>

      {/* Add Player Form */}
      {showAddPlayer && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="font-semibold text-gray-800 mb-3">➕ Adicionar Novo Jogador</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Nome do jogador"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
              autoFocus
            />
            <button
              onClick={handleAddPlayer}
              disabled={!newPlayerName.trim()}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              ✅ Adicionar
            </button>
            <button
              onClick={() => {
                setShowAddPlayer(false);
                setNewPlayerName('');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              ❌ Cancelar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 O jogador será automaticamente adicionado com uma dívida igual à quota de entrada
          </p>
        </div>
      )}

      {/* Filter Summary */}
      {(searchTerm || filterStatus !== 'all') && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            🔍 A mostrar {filteredPlayers.length} de {players.length} jogadores
            {searchTerm && ` | Pesquisa: "${searchTerm}"`}
            {filterStatus !== 'all' && ` | Filtro: ${
              filterStatus === 'paid' ? 'Em Dia' :
              filterStatus === 'pending' ? 'Pendentes' :
              filterStatus === 'debt' ? 'Devedores' :
              filterStatus === 'credit' ? 'Com Crédito' : filterStatus
            }`}
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
              }}
              className="ml-2 text-blue-600 hover:text-blue-800 underline"
            >
              Limpar filtros
            </button>
          </p>
        </div>
      )}

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            onViewProfile={onViewProfile}
            onTogglePaidStatus={onTogglePaidStatus}
            onRemovePlayer={onRemovePlayer}
          />
        ))}
      </div>
      
      {/* Empty State */}
      {filteredPlayers.length === 0 && players.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">👥 Ainda não há jogadores na liga!</h3>
          <p className="text-gray-500 mb-4">Começa por adicionar o primeiro jogador à tua liga</p>
          <button
            onClick={() => setShowAddPlayer(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            ➕ Adicionar Primeiro Jogador
          </button>
        </div>
      )}

      {/* No Results State */}
      {filteredPlayers.length === 0 && players.length > 0 && (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">🔍 Nenhum jogador encontrado com os filtros aplicados</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
            }}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerList;