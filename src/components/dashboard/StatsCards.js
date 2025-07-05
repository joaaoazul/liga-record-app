// src/components/dashboard/StatsCards.js - Com Pote do Jantar
import React from 'react';
import { Users, Euro, TrendingUp, Trophy, UtensilsCrossed } from 'lucide-react';

const StatsCards = ({ players = [], settings = {} }) => {
  // Calcular estatísticas
  const totalPlayers = players.length;
  const playersInDebt = players.filter(p => p.balance < 0).length;
  const playersWithCredit = players.filter(p => p.balance > 0).length;
  const playersPaid = players.filter(p => p.paid).length;
  
  const totalBalance = players.reduce((sum, player) => sum + (player.balance || 0), 0);
  const totalDebt = players.reduce((sum, player) => {
    return sum + (player.balance < 0 ? Math.abs(player.balance) : 0);
  }, 0);
  const totalCredit = players.reduce((sum, player) => {
    return sum + (player.balance > 0 ? player.balance : 0);
  }, 0);
  
  // POTE DO JANTAR - valores positivos acumulados
  const dinnerPot = totalCredit;
  
  const totalPoints = players.reduce((sum, player) => sum + (player.totalPoints || 0), 0);
  const totalRounds = players.reduce((sum, player) => sum + (player.totalRounds || 0), 0);

  const stats = [
    {
      title: 'Total Jogadores',
      value: totalPlayers,
      subtitle: `${playersPaid} em dia • ${totalPlayers - playersPaid} pendentes`,
      icon: Users,
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Saldo da Liga',
      value: `${totalBalance >= 0 ? '+' : ''}${totalBalance.toFixed(2)}€`,
      subtitle: `${totalCredit.toFixed(2)}€ crédito • ${totalDebt.toFixed(2)}€ dívida`,
      icon: Euro,
      color: totalBalance >= 0 ? 'green' : 'red',
      gradient: totalBalance >= 0 ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'
    },
    {
      title: 'Pote do Jantar',
      value: `${dinnerPot.toFixed(2)}€`,
      subtitle: `Fundos disponíveis • ${playersWithCredit} contribuíram`,
      icon: UtensilsCrossed,
      color: 'amber',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      title: 'Pontos Totais',
      value: totalPoints,
      subtitle: `${totalRounds} rondas jogadas • ${(totalPoints / Math.max(totalRounds, 1)).toFixed(1)} média`,
      icon: Trophy,
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <>
      {stats.map((stat, index) => (
        <div key={index} className="group">
          <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
            {/* Header colorido */}
            <div className={`bg-gradient-to-r ${stat.gradient} px-6 py-4`}>
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h3 className="text-sm font-medium text-white/90">{stat.title}</h3>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg">
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 leading-relaxed">{stat.subtitle}</p>
            </div>
            
            {/* Progress indicator */}
            <div className="px-6 pb-4">
              {stat.title === 'Total Jogadores' && totalPlayers > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Pagamentos em dia</span>
                    <span>{Math.round((playersPaid / totalPlayers) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`bg-gradient-to-r ${stat.gradient} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${(playersPaid / totalPlayers) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {stat.title === 'Pote do Jantar' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Estado do pote</span>
                    <span className={dinnerPot > 50 ? 'text-green-600' : dinnerPot > 20 ? 'text-yellow-600' : 'text-red-600'}>
                      {dinnerPot > 50 ? 'Excelente' : dinnerPot > 20 ? 'Razoável' : 'Baixo'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((dinnerPot / 100) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default StatsCards;