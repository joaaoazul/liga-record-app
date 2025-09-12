// src/components/dashboard/FullDesktopDashboard.js 
import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, Euro, Plus, Settings, Search, Filter,
  ChevronDown, User, X, Check, AlertCircle, FileText,
  RefreshCw, LogOut, Menu, Calendar, DollarSign, Target,
  Award, CreditCard, TrendingUp, TrendingDown, Clock,
  UtensilsCrossed, Trash2, Edit, MoreVertical, ChevronRight,
  Home, PieChart, Wallet, Receipt, Bell, Activity, BarChart3,
  Download, Upload, Database, Shield, Zap, ArrowUpRight,
  ArrowDownRight, Info, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';
import PlayerProfile from '../players/PlayerProfile';
import RoundsManager from '../rounds/RoundsManager';
import SettingsPage from '../configs/config';
import FinancialReport from '../financial/FinancialReport';

// Função auxiliar para garantir que um valor seja número
const safeNumber = (value, defaultValue = 0) => {
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

// Função auxiliar para formatar valores com toFixed de forma segura
const safeToFixed = (value, decimals = 2, defaultValue = 0) => {
  const num = safeNumber(value, defaultValue);
  return num.toFixed(decimals);
};

const FullDesktopDashboard = () => {
  const [players, setPlayers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [settings, setSettings] = useState({
    entryFee: 10,
    weeklyPayment: 12,
    dinnerPotGoal: 500,
    distributionPercentages: [40, 30, 20, 10]
  });
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [viewingProfile, setViewingProfile] = useState(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const { user, signOut } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [playersData, transactionsData, settingsData, roundsData] = await Promise.all([
        firestoreService.getPlayers().catch(() => []),
        firestoreService.getTransactions().catch(() => []),
        firestoreService.getSettings().catch(() => null),
        firestoreService.getRounds().catch(() => [])
      ]);

      setPlayers(playersData || []);
      setTransactions(transactionsData || []);
      setRounds(roundsData || []);
      if (settingsData) setSettings(settingsData);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate all stats - CORRIGIDO COM VALIDAÇÕES
  const stats = {
    totalPlayers: players.length,
    paidPlayers: players.filter(p => p.paid).length,
    unpaidPlayers: players.filter(p => !p.paid).length,
    // CORREÇÃO: Garantir que todos os valores sejam números válidos
    totalBalance: safeNumber(players.reduce((sum, p) => sum + safeNumber(p.balance), 0)),
    totalCredit: safeNumber(players.reduce((sum, p) => sum + Math.max(0, safeNumber(p.balance)), 0)),
    totalDebt: Math.abs(safeNumber(players.reduce((sum, p) => sum + Math.min(0, safeNumber(p.balance)), 0))),
    dinnerPot: Math.abs(safeNumber(players.reduce((sum, p) => sum + safeNumber(p.balance), 0))),
    totalPoints: safeNumber(players.reduce((sum, p) => sum + safeNumber(p.totalPoints), 0)),
    averagePoints: players.length > 0 ? 
      safeToFixed(safeNumber(players.reduce((sum, p) => sum + safeNumber(p.totalPoints), 0)) / players.length, 1) : '0.0',
    totalRounds: rounds.length,
    activePercentage: players.length > 0 ? 
      safeToFixed((players.filter(p => p.paid).length / players.length) * 100, 0) : '0',
    lastTransaction: transactions[0]?.date ? new Date(transactions[0].date).toLocaleDateString('pt-PT') : 'N/A',
    topPlayer: players.sort((a, b) => safeNumber(b.totalPoints) - safeNumber(a.totalPoints))[0]?.name || 'N/A',
    weeklyGrowth: 12.5, // Mock data
    monthlyGrowth: 28.3 // Mock data
  };

  const getPotStatus = () => {
    if (stats.dinnerPot === 0) return { text: 'Vazio', color: 'text-gray-600', bg: 'bg-gray-100' };
    if (stats.dinnerPot < 50) return { text: 'Baixo', color: 'text-red-600', bg: 'bg-red-100' };
    if (stats.dinnerPot < 100) return { text: 'Médio', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: 'Bom', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const potStatus = getPotStatus();

  // Filter players - CORRIGIDO
  const filteredPlayers = players.filter(player => {
    // Verificar se o jogador existe e tem nome
    if (!player || !player.name) {
      console.warn('Jogador inválido encontrado:', player);
      return false;
    }
    
    // Garantir que searchQuery é string
    const searchTerm = (searchQuery || '').toLowerCase();
    const playerName = player.name.toLowerCase();
    
    const matchesSearch = playerName.includes(searchTerm);
    
    // Usar safeNumber para comparações de balance
    const playerBalance = safeNumber(player.balance);
    const matchesFilter =
      filterStatus === 'Todos' ||
      (filterStatus === 'Pagos' && player.paid) ||
      (filterStatus === 'Por Pagar' && !player.paid) ||
      (filterStatus === 'Devedores' && playerBalance < 0) ||
      (filterStatus === 'Credores' && playerBalance > 0);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-20 w-20 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Trophy className="h-10 w-10 text-white" />
            </div>
          </div>
          <p className="text-gray-600 text-lg">A carregar Liga Record...</p>
        </div>
      </div>
    );
  }

  // Sidebar Navigation
  const Sidebar = () => (
    <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white border-r h-screen fixed left-0 top-0 transition-all duration-300 z-40`}>
      {/* Logo */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-lg">Liga Record</h1>
                <p className="text-xs text-gray-500">dos Cuícos</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`p-1 hover:bg-gray-100 rounded ${sidebarCollapsed ? 'mx-auto mt-2' : ''}`}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Home },
          { id: 'players', label: 'Jogadores', icon: Users },
          { id: 'rounds', label: 'Rondas', icon: Trophy },
          { id: 'financial', label: 'Finanças', icon: PieChart },
          { id: 'settings', label: 'Configurações', icon: Settings }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-lg transition-all ${
              currentView === item.id 
                ? 'bg-green-50 text-green-600' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            title={sidebarCollapsed ? item.label : ''}
          >
            <item.icon className="h-5 w-5" />
            {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{user?.email?.split('@')[0] || 'joaoazul'}</p>
              <button
                onClick={signOut}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'ml-20' : 'ml-64'} transition-all duration-300`}>
        {/* Top Bar */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentView === 'dashboard' && 'Dashboard'}
                {currentView === 'players' && 'Gestão de Jogadores'}
                {currentView === 'rounds' && 'Gestão de Rondas'}
                {currentView === 'financial' && 'Gestão Financeira e Relatórios'}
                {currentView === 'settings' && (
  <div className="p-6">
    <SettingsPage 
      onClose={() => setCurrentView('dashboard')}
      onUpdate={(newSettings) => {
        setSettings(newSettings);
        loadData();
      }}
    />
  </div>
)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={loadData}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Atualizar"
              >
                <RefreshCw className="h-5 w-5 text-gray-600" />
              </button>
              
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-gray-100 rounded-lg relative"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              </button>
              
              <button
                onClick={() => alert('Exportar dados em desenvolvimento')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span className="text-sm font-medium">Exportar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        {currentView === 'dashboard' && (
          <div className="p-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              {/* Main Stats Cards - USANDO safeToFixed PARA TODOS OS VALORES */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    stats.weeklyGrowth > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {stats.weeklyGrowth > 0 ? '+' : ''}{stats.weeklyGrowth}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPlayers}</p>
                <p className="text-sm text-gray-500 mt-1">Total de Jogadores</p>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600">{stats.paidPlayers} pagos</span>
                    <span className="text-orange-600">{stats.unpaidPlayers} pendentes</span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${stats.activePercentage}%` }} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Euro className="h-6 w-6 text-green-600" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalBalance >= 0 ? '+' : ''}{safeToFixed(stats.totalBalance)}€
                </p>
                <p className="text-sm text-gray-500 mt-1">Saldo Total</p>
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Créditos:</span>
                    <span className="text-green-600 font-medium">+{safeToFixed(stats.totalCredit)}€</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Dívidas:</span>
                    <span className="text-red-600 font-medium">-{safeToFixed(stats.totalDebt)}€</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
                    <UtensilsCrossed className="h-6 w-6 text-orange-600" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${potStatus.bg} ${potStatus.color}`}>
                    {potStatus.text}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{safeToFixed(stats.dinnerPot)}€</p>
                <p className="text-sm text-gray-500 mt-1">Pote do Jantar</p>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-600">Meta:</span>
                    <span className="font-medium">{settings.dinnerPotGoal}€</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((stats.dinnerPot / settings.dinnerPotGoal) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-purple-600" />
                  </div>
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPoints}</p>
                <p className="text-sm text-gray-500 mt-1">Pontos Totais</p>
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Média:</span>
                    <span className="font-medium">{stats.averagePoints} pts</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Líder:</span>
                    <span className="font-medium text-purple-600">{stats.topPlayer}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Players Table */}
              <div className="col-span-2 bg-white rounded-xl shadow-sm">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center space-x-2">
                      <Users className="h-5 w-5 text-gray-700" />
                      <span>Jogadores ({filteredPlayers.length})</span>
                    </h3>
                    <button
                      onClick={() => setShowAddPlayer(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="font-medium">Adicionar</span>
                    </button>
                  </div>
                  
                  <div className="flex space-x-3">
                    <div className="flex-1 relative">
                      <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar jogadores..."
                        className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option>Todos</option>
                      <option>Pagos</option>
                      <option>Por Pagar</option>
                      <option>Devedores</option>
                      <option>Credores</option>
                    </select>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Jogador
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Saldo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Pontos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredPlayers.map(player => {
                        // USAR safeNumber PARA COMPARAÇÕES
                        const playerBalance = safeNumber(player.balance);
                        const isDebtor = playerBalance < 0;
                        const isCreditor = playerBalance > 0;
                        
                        return (
                          <tr key={player.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${
                                  isDebtor ? 'bg-red-500' : 
                                  isCreditor ? 'bg-green-500' : 
                                  'bg-gray-400'
                                }`}>
                                  {player.name.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-medium">{player.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`font-medium ${
                                isDebtor ? 'text-red-600' : 
                                isCreditor ? 'text-green-600' : 
                                'text-gray-600'
                              }`}>
                                {playerBalance >= 0 ? '+' : ''}{safeToFixed(playerBalance)}€
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-blue-600 font-medium">
                                {safeNumber(player.totalPoints)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                player.paid
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {player.paid ? 'Pago' : 'Por Pagar'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => setViewingProfile(player)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                Ver Perfil
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {filteredPlayers.length === 0 && (
                    <div className="py-12 text-center">
                      <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nenhum jogador encontrado</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Side Panel */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold mb-4">Ações Rápidas</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setCurrentView('rounds')}
                      className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center justify-between group"
                    >
                      <span className="font-medium">Nova Ronda</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm(`Cobrar taxa semanal de ${settings.weeklyPayment}€ a todos?`)) {
                          await firestoreService.chargeWeeklyFees(settings.weeklyPayment);
                          await loadData();
                        }
                      }}
                      className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center justify-between group"
                    >
                      <span className="font-medium">Cobrar Taxa ({settings.weeklyPayment}€)</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm('Quitar todas as dívidas?')) {
                          await firestoreService.settleAllDebts();
                          await loadData();
                        }
                      }}
                      className="w-full px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 flex items-center justify-between group"
                    >
                      <span className="font-medium">Quitar Dívidas</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setCurrentView('financial')}
                      className="w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 flex items-center justify-between group"
                    >
                      <span className="font-medium">Gerar Relatório</span>
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>

                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold mb-4">Atividade Recente</h3>
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((t, idx) => {
                      const player = players.find(p => p.id === t.playerId);
                      const transactionAmount = safeNumber(t.amount);
                      return (
                        <div key={idx} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-3">
                            <div className={`h-2 w-2 rounded-full ${
                              transactionAmount > 0 ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <p className="text-sm font-medium">{player?.name || 'Unknown'}</p>
                              <p className="text-xs text-gray-500">{t.description || t.type}</p>
                            </div>
                          </div>
                          <span className={`text-sm font-bold ${
                            transactionAmount > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transactionAmount > 0 ? '+' : ''}{safeToFixed(transactionAmount)}€
                          </span>
                        </div>
                      );
                    })}
                    
                    {transactions.length === 0 && (
                      <p className="text-gray-500 text-sm text-center py-4">
                        Sem transações recentes
                      </p>
                    )}
                  </div>
                </div>

                {/* System Info */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
                  <h3 className="text-lg font-bold mb-4">Informação do Sistema</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Última Atualização:</span>
                      <span className="font-medium">{stats.lastTransaction}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Versão:</span>
                      <span className="font-medium">v1.6.0</span>
                  <span className="font-medium">Made with love in Monte Gordo ❤️</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estado:</span>
                      <span className="text-green-600 font-medium">Online</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Players View - Lista completa dos jogadores */}
        {currentView === 'players' && (
          <div className="p-6">
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold">Lista Completa de Jogadores</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={loadData}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Atualizar</span>
                    </button>
                    <button
                      onClick={() => setShowAddPlayer(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Adicionar Jogador</span>
                    </button>
                  </div>
                </div>
                
                {/* Filters */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="relative">
                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar jogadores..."
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option>Todos</option>
                    <option>Pagos</option>
                    <option>Por Pagar</option>
                    <option>Devedores</option>
                    <option>Credores</option>
                  </select>
                  
                  <button
                    onClick={async () => {
                      if (window.confirm(`Cobrar taxa semanal de ${settings.weeklyPayment}€ a todos?`)) {
                        await firestoreService.chargeWeeklyFees(settings.weeklyPayment);
                        await loadData();
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Cobrar Taxa Semanal</span>
                  </button>
                  
                  <button
                    onClick={() => alert('Exportar lista em desenvolvimento')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Exportar Lista</span>
                  </button>
                </div>
                
                {/* Stats Summary - USANDO safeToFixed */}
                <div className="grid grid-cols-6 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Total</p>
                    <p className="text-xl font-bold text-blue-900">{players.length}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium">Pagos</p>
                    <p className="text-xl font-bold text-green-900">{stats.paidPlayers}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-orange-600 font-medium">Pendentes</p>
                    <p className="text-xl font-bold text-orange-900">{stats.unpaidPlayers}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium">Média Pontos</p>
                    <p className="text-xl font-bold text-purple-900">{stats.averagePoints}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-red-600 font-medium">Total Dívidas</p>
                    <p className="text-xl font-bold text-red-900">{safeToFixed(stats.totalDebt, 0)}€</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs text-emerald-600 font-medium">Total Créditos</p>
                    <p className="text-xl font-bold text-emerald-900">{safeToFixed(stats.totalCredit, 0)}€</p>
                  </div>
                </div>
              </div>
              
              {/* Players Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jogador
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pontos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rondas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado Pagamento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Última Atividade
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPlayers.map((player, index) => {
                      const playerBalance = safeNumber(player.balance);
                      const isDebtor = playerBalance < 0;
                      const isCreditor = playerBalance > 0;
                      
                      return (
                        <tr key={player.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${
                                isDebtor ? 'bg-red-500' : 
                                isCreditor ? 'bg-green-500' : 
                                'bg-gray-400'
                              }`}>
                                {player.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium">{player.name}</p>
                                <p className="text-xs text-gray-500">{player.email || 'Sem email'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-medium ${
                              isDebtor ? 'text-red-600' : 
                              isCreditor ? 'text-green-600' : 
                              'text-gray-600'
                            }`}>
                              {playerBalance >= 0 ? '+' : ''}{safeToFixed(playerBalance)}€
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-blue-600 font-medium">
                              {safeNumber(player.totalPoints)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-600">
                              {safeNumber(player.totalRounds)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              player.paid
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}>
                              {player.paid ? 'Pago' : 'Por Pagar'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {player.lastActivity ? new Date(player.lastActivity).toLocaleDateString('pt-PT') : 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => setViewingProfile(player)}
                                className="text-blue-600 hover:text-blue-700"
                                title="Ver Perfil"
                              >
                                <User className="h-4 w-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  await firestoreService.updatePlayer(player.id, { paid: !player.paid });
                                  await loadData();
                                }}
                                className="text-green-600 hover:text-green-700"
                                title="Alterar Estado"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Eliminar ${player.name}?`)) {
                                    await firestoreService.deletePlayer(player.id);
                                    await loadData();
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {filteredPlayers.length === 0 && (
                  <div className="py-12 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum jogador encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other Views */}
        {currentView === 'rounds' && (
          <div className="p-6">
            <RoundsManager
              players={players}
              rounds={rounds}
              onReload={loadData}
              settings={settings}
            />
          </div>
        )}

        {currentView === 'financial' && (
          <div className="p-6">
            <FinancialReport
              players={players}
              transactions={transactions}
              settings={settings}
              onBack={() => setCurrentView('dashboard')}
            />
          </div>
        )}
      </div>

      {/* Add Player Modal */}
      {showAddPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Adicionar Novo Jogador</h3>
              <button onClick={() => setShowAddPlayer(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Nome do jogador"
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
              autoFocus
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddPlayer(false);
                  setNewPlayerName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (newPlayerName.trim()) {
                    const newPlayer = {
                      name: newPlayerName.trim(),
                      balance: -(settings?.entryFee || 20),
                      paid: false,
                      totalPoints: 0,
                      createdAt: new Date().toISOString()
                    };
                    
                    const result = await firestoreService.savePlayer(newPlayer);
                    
                    if (result.success) {
                      await loadData(); // CRUCIAL!
                      setNewPlayerName('');
                      setShowAddPlayer(false);
                    }
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile */}
      {viewingProfile && (
        <PlayerProfile
          player={viewingProfile}
          transactions={transactions.filter(t => t.playerId === viewingProfile.id)}
          onClose={() => setViewingProfile(null)}
          onUpdate={async () => {
            await loadData();
            setViewingProfile(null);
          }}
        />
      )}
    </div>
  );
};

export default FullDesktopDashboard;