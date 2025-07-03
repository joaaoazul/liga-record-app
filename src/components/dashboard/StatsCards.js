// src/components/dashboard/StatsCards.js - Adaptado para Jantar
import React from 'react';
import { Users, Euro, AlertCircle, UtensilsCrossed, MapPin, Calendar } from 'lucide-react';

const StatsCards = ({ players, settings }) => {
  const getPaidPlayersCount = () => {
    return players.filter(player => player.paid).length;
  };

  const getDebtorsCount = () => {
    return players.filter(player => player.balance < 0).length;
  };

  const getTotalPot = () => {
    return players.reduce((total, player) => {
      return total + (player.balance > 0 ? player.balance : 0);
    }, 0);
  };

  const getTotalDebt = () => {
    return players.reduce((total, player) => {
      return total + (player.balance < 0 ? Math.abs(player.balance) : 0);
    }, 0);
  };

  const getEstimatedDinnerBudget = () => {
    const totalPot = getTotalPot();
    const expectedTotal = players.length * settings.entryFee;
    return totalPot + expectedTotal - getTotalDebt();
  };

  const getBudgetPerPerson = () => {
    const totalBudget = getEstimatedDinnerBudget();
    return players.length > 0 ? totalBudget / players.length : 0;
  };

  const stats = [
    {
      title: '👥 Total Jogadores',
      value: players.length,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: 'Participantes na liga'
    },
    {
      title: '✅ Contribuíram',
      value: getPaidPlayersCount(),
      icon: () => <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
        <span className="text-green-600 font-bold">✓</span>
      </div>,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: `${((getPaidPlayersCount() / Math.max(players.length, 1)) * 100).toFixed(0)}% completo`
    },
    {
      title: '⏳ Pendentes',
      value: getDebtorsCount(),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      subtitle: 'Ainda não pagaram'
    },
    {
      title: '💸 Em Falta',
      value: `${getTotalDebt().toFixed(2)}€`,
      icon: Euro,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      subtitle: 'Total em dívidas'
    },
    {
      title: '🍽️ Pote do Jantar',
      value: `${getTotalPot().toFixed(2)}€`,
      icon: UtensilsCrossed,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: 'Arrecadado até agora'
    },
    {
      title: '💰 Orçamento Total',
      value: `${getEstimatedDinnerBudget().toFixed(2)}€`,
      icon: () => <div className="text-2xl">🎯</div>,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: `~${getBudgetPerPerson().toFixed(2)}€ por pessoa`
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          
          return (
            <div key={index} className={`${stat.bgColor} rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium mb-1">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color} mb-1`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.subtitle}</p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  {typeof IconComponent === 'function' ? (
                    <IconComponent />
                  ) : (
                    <IconComponent className={`h-8 w-8 ${stat.color}`} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dinner Planning Section */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg shadow-md p-6">
        <div className="flex items-center space-x-3 mb-4">
          <UtensilsCrossed className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-800">🍽️ Planeamento do Jantar</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white rounded-lg">
            <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Orçamento Atual</p>
            <p className="text-xl font-bold text-blue-600">{getTotalPot().toFixed(2)}€</p>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg">
            <MapPin className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Orçamento Final</p>
            <p className="text-xl font-bold text-green-600">{getEstimatedDinnerBudget().toFixed(2)}€</p>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg">
            <div className="text-2xl mb-2">👥</div>
            <p className="text-sm text-gray-600">Por Pessoa</p>
            <p className="text-xl font-bold text-purple-600">{getBudgetPerPerson().toFixed(2)}€</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-white rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Progresso das Contribuições:</span>
            <span className="text-sm font-medium">
              {getPaidPlayersCount()}/{players.length} jogadores
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(getPaidPlayersCount() / Math.max(players.length, 1)) * 100}%` }}
            ></div>
          </div>
        </div>

        {getDebtorsCount() > 0 && (
          <div className="mt-4 p-3 bg-orange-100 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>⚠️ Atenção:</strong> Ainda faltam {getDebtorsCount()} jogadores contribuir com {getTotalDebt().toFixed(2)}€ 
              para completar o orçamento do jantar!
            </p>
          </div>
        )}

        {getDebtorsCount() === 0 && players.length > 0 && (
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>🎉 Excelente!</strong> Todos os jogadores já contribuíram! 
              O jantar está garantido com {getTotalPot().toFixed(2)}€ de orçamento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCards;