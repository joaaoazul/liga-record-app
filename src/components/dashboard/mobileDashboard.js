// src/components/dashboard/PerfectMobileDashboard.js 
import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Users, 
  Euro,
  Plus,
  Settings,
  Search,
  Filter,
  ChevronDown,
  User,
  X,
  Check,
  AlertCircle,
  FileText,
  RefreshCw,
  LogOut,
  Menu,
  Calendar,
  DollarSign,
  Target,
  Award,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock,
  UtensilsCrossed,
  Trash2,
  Edit,
  MoreVertical,
  ChevronRight,
  Home,
  PieChart,
  Wallet,
  Receipt,
  Bell
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';
import PlayerProfile from '../players/PlayerProfile';
import RoundsManager from '../rounds/RoundsManager';
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

const PerfectMobileDashboard = () => {
  const [players, setPlayers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [settings, setSettings] = useState({
    entryFee: 10,
    weeklyPayment: 5,
    dinnerPotGoal: 200,
    distributionPercentages: [40, 30, 20, 10]
  });
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('Dashboard');
  const [viewingProfile, setViewingProfile] = useState(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerActions, setShowPlayerActions] = useState(false);
  
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
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const addPlayer = async () => {
    if (!newPlayerName.trim()) {
      alert('Nome não pode estar vazio!');
      return;
    }
    
    try {
      await firestoreService.addPlayer(newPlayerName.trim());
      await loadData();
      setNewPlayerName('');
      setShowAddPlayer(false);
    } catch (error) {
      alert('Erro ao adicionar jogador');
    }
  };

  const togglePaidStatus = async (playerId) => {
    try {
      const player = players.find(p => p.id === playerId);
      if (!player) return;
      
      await firestoreService.updatePlayer(playerId, {
        paid: !player.paid
      });
      
      await loadData();
    } catch (error) {
      console.error('Error toggling paid status:', error);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (window.confirm(`Eliminar ${player?.name}?`)) {
      await firestoreService.deletePlayer(playerId);
      await loadData();
      setShowPlayerActions(false);
      setSelectedPlayer(null);
    }
  };

  const handleChargeWeeklyFee = async () => {
    if (window.confirm(`Cobrar taxa semanal de ${settings.weeklyPayment}€ a todos?`)) {
      await firestoreService.chargeWeeklyFees(settings.weeklyPayment);
      await loadData();
    }
  };

  const handleSettleDebts = async () => {
    if (window.confirm('Quitar todas as dívidas?')) {
      await firestoreService.settleAllDebts();
      await loadData();
    }
  };

  // Calculate stats - CORRIGIDO COM VALIDAÇÕES
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
    totalRounds: rounds.length
  };

  // Get pot status
  const getPotStatus = () => {
    if (stats.dinnerPot === 0) return 'Vazio';
    if (stats.dinnerPot < 50) return 'Baixo';
    if (stats.dinnerPot < 100) return 'Médio';
    return 'Bom';
  };

  const potStatus = getPotStatus();

  // Filter players - CORRIGIDO
  const filteredPlayers = players.filter(player => {
    // Verificar se o jogador existe e tem nome
    if (!player || !player.name) {
      console.warn('Jogador inválido encontrado:', player);
      return false;
    }
    
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
    
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
          <Trophy className="h-12 w-12 text-green-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">A carregar Liga Record...</p>
        </div>
      </div>
    );
  }

  // Quick Actions Menu
  const QuickActionsMenu = () => (
    showQuickActions && (
      <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowQuickActions(false)} />
        <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl p-6 animate-slide-up">
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
          
          <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowAddPlayer(true);
                setShowQuickActions(false);
              }}
              className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
            >
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Plus className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Adicionar Jogador</p>
                <p className="text-sm text-gray-500">Novo membro da liga</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                handleChargeWeeklyFee();
                setShowQuickActions(false);
              }}
              className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
            >
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Cobrar Taxa Semanal</p>
                <p className="text-sm text-gray-500">{settings.weeklyPayment}€ por jogador</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                setCurrentTab('Rondas');
                setShowQuickActions(false);
              }}
              className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
            >
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Trophy className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Nova Ronda</p>
                <p className="text-sm text-gray-500">Registar resultado</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                handleSettleDebts();
                setShowQuickActions(false);
              }}
              className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
            >
              <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Quitar Dívidas</p>
                <p className="text-sm text-gray-500">Liquidar todos os débitos</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                setCurrentTab('Finanças');
                setShowQuickActions(false);
              }}
              className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
            >
              <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Gerar Relatório</p>
                <p className="text-sm text-gray-500">Exportar dados financeiros</p>
              </div>
            </button>
          </div>
          
          <button
            onClick={() => setShowQuickActions(false)}
            className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  );

  // Settings Menu
  const SettingsMenu = () => (
    showSettingsMenu && (
      <div className="absolute top-16 right-4 bg-white rounded-lg shadow-xl p-2 w-56 z-50">
        <button
          onClick={() => {
            handleRefresh();
            setShowSettingsMenu(false);
          }}
          className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
        >
          <RefreshCw className={`h-5 w-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm">Atualizar Dados</span>
        </button>
        
        <button
          onClick={() => {
            alert('Configurações em desenvolvimento');
            setShowSettingsMenu(false);
          }}
          className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
        >
          <Settings className="h-5 w-5 text-gray-600" />
          <span className="text-sm">Configurações</span>
        </button>
        
        <button
          onClick={() => {
            alert('Notificações em desenvolvimento');
            setShowSettingsMenu(false);
          }}
          className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
        >
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="text-sm">Notificações</span>
        </button>
        
        <hr className="my-2" />
        
        <button
          onClick={() => {
            signOut();
            setShowSettingsMenu(false);
          }}
          className="w-full flex items-center space-x-3 p-3 hover:bg-red-50 rounded-lg text-red-600"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm">Sair</span>
        </button>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - EXACTAMENTE como na imagem */}
      <div className="bg-white shadow-sm relative">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 bg-green-600 rounded-lg flex items-center justify-center">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Liga Record dos Cuícos</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <Settings className="h-5 w-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-2 px-2">
                <User className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.email?.split('@')[0] || 'joaoazul'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs - EXACTAMENTE como na imagem */}
        <div className="flex border-t">
          {['Dashboard', 'Rondas', 'Finanças'].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className={`flex-1 py-3 text-center font-medium transition-colors relative ${
                currentTab === tab 
                  ? 'text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${
                  currentTab === tab ? 'bg-blue-600' : 
                  tab === 'Rondas' ? 'bg-gray-400' : ''
                }`} />
                <span className="text-sm">{tab}</span>
              </div>
              {currentTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>
        
        <SettingsMenu />
      </div>

      {/* Dashboard Tab */}
      {currentTab === 'Dashboard' && (
        <div className="px-4 py-4 space-y-4">
          {/* Stats Cards - EXACTO como na imagem - USANDO safeToFixed */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Jogadores - Card Azul Escuro */}
            <div className="bg-[#1e3a8a] rounded-2xl p-4 text-white relative overflow-hidden">
              <div className="absolute top-3 right-3 opacity-20">
                <Users className="h-8 w-8" />
              </div>
              <div className="relative">
                <p className="text-xs font-medium opacity-90 mb-1">Total Jogadores</p>
                <p className="text-3xl font-bold mb-3">{stats.totalPlayers}</p>
                <div className="pt-2 border-t border-white/20">
                  <p className="text-[10px] opacity-75">
                    {stats.paidPlayers} em dia • {stats.unpaidPlayers} pendentes
                  </p>
                </div>
              </div>
            </div>

            {/* Saldo da Liga - Card Verde */}
            <div className="bg-green-600 rounded-2xl p-4 text-white relative overflow-hidden">
              <div className="absolute top-3 right-3 opacity-20">
                <Euro className="h-8 w-8" />
              </div>
              <div className="relative">
                <p className="text-xs font-medium opacity-90 mb-1">Saldo da Liga</p>
                <p className="text-2xl font-bold mb-3">
                  {stats.totalBalance >= 0 ? '+' : ''}{safeToFixed(stats.totalBalance)} €
                </p>
                <div className="pt-2 border-t border-white/20">
                  <p className="text-[10px] opacity-75">
                    {safeToFixed(stats.totalCredit)} € crédito {safeToFixed(stats.totalDebt)} € dívida
                  </p>
                </div>
              </div>
            </div>

            {/* Pote do Jantar - Card Laranja */}
            <div className="bg-orange-500 rounded-2xl p-4 text-white relative overflow-hidden">
              <div className="absolute top-3 right-3 opacity-20">
                <UtensilsCrossed className="h-8 w-8" />
              </div>
              <div className="relative">
                <p className="text-xs font-medium opacity-90 mb-1">Pote do Jantar</p>
                <p className="text-2xl font-bold mb-3">{safeToFixed(stats.dinnerPot)} €</p>
                <div className="pt-2 border-t border-white/20">
                  <p className="text-[10px]">
                    Fundos disponíveis
                  </p>
                  <p className="text-[10px] opacity-75">
                    {stats.paidPlayers} contribuíram{' '}
                    <span className={`font-bold ${
                      potStatus === 'Baixo' ? 'text-red-200' :
                      potStatus === 'Médio' ? 'text-yellow-200' :
                      potStatus === 'Bom' ? 'text-green-200' :
                      'text-gray-200'
                    }`}>
                      {potStatus}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Pontos Totais - Card Roxo */}
            <div className="bg-purple-600 rounded-2xl p-4 text-white relative overflow-hidden">
              <div className="absolute top-3 right-3 opacity-20">
                <Award className="h-8 w-8" />
              </div>
              <div className="relative">
                <p className="text-xs font-medium opacity-90 mb-1">Pontos Totais</p>
                <p className="text-3xl font-bold mb-3">{stats.totalPoints}</p>
                <div className="pt-2 border-t border-white/20">
                  <p className="text-[10px] opacity-75">
                    {stats.totalRounds} rondas jogadas
                  </p>
                  <p className="text-[10px] opacity-75">
                    {stats.averagePoints} média
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Players Section - EXACTO como na imagem */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-gray-700" />
                  <h2 className="text-lg font-bold text-gray-900">
                    Jogadores da Liga ({filteredPlayers.length}/{players.length})
                  </h2>
                </div>
                <button
                  onClick={() => setShowAddPlayer(true)}
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Adicionar</span>
                </button>
              </div>

              {/* Search and Filter */}
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar jogadores..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-gray-50"
                  />
                </div>
                <button
                  className="px-3 py-2 border border-gray-200 rounded-lg flex items-center space-x-1.5 hover:bg-gray-50 bg-white"
                  onClick={() => {
                    const options = ['Todos', 'Pagos', 'Por Pagar', 'Devedores', 'Credores'];
                    const currentIndex = options.indexOf(filterStatus);
                    const nextIndex = (currentIndex + 1) % options.length;
                    setFilterStatus(options[nextIndex]);
                  }}
                >
                  <Filter className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{filterStatus}</span>
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Players List - USANDO safeNumber e safeToFixed */}
            <div className="divide-y divide-gray-100">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map(player => {
                  const playerBalance = safeNumber(player.balance);
                  const isDebtor = playerBalance < 0;
                  const isCreditor = playerBalance > 0;
                  const playerPoints = safeNumber(player.totalPoints);
                  
                  return (
                    <div
                      key={player.id}
                      onClick={() => setViewingProfile(player)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                            isDebtor ? 'bg-red-500' : 
                            isCreditor ? 'bg-green-500' : 
                            'bg-gray-400'
                          }`}>
                            {player.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{player.name}</p>
                            <div className="flex items-center space-x-2 text-xs">
                              <span className={`font-medium ${
                                isDebtor ? 'text-red-600' : 
                                isCreditor ? 'text-green-600' : 
                                'text-gray-600'
                              }`}>
                                {playerBalance >= 0 ? '+' : ''}{safeToFixed(playerBalance)}€
                              </span>
                              {playerPoints > 0 && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-blue-600 font-medium">
                                    {playerPoints} pts
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePaidStatus(player.id);
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                              player.paid
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                          >
                            {player.paid ? 'Pago' : 'Por Pagar'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlayer(player);
                              setShowPlayerActions(true);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center">
                  <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-gray-900 font-medium mb-1">
                    Ainda não há jogadores na liga!
                  </p>
                  <p className="text-sm text-gray-500">
                    Adiciona o primeiro jogador para começar
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Button */}
          <button
            onClick={() => setShowQuickActions(true)}
            className="fixed bottom-6 right-6 h-14 w-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 z-40"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Rondas Tab */}
      {currentTab === 'Rondas' && (
        <div className="px-4 py-4">
          <RoundsManager
            players={players}
            rounds={rounds}
            onReload={loadData}
            settings={settings}
          />
        </div>
      )}

      {/* Finanças Tab */}
      {currentTab === 'Finanças' && (
        <div className="px-4 py-4">
          <FinancialReport
            players={players}
            transactions={transactions}
            settings={settings}
            onBack={() => setCurrentTab('Dashboard')}
          />
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowAddPlayer(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
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
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
              autoFocus
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddPlayer(false);
                  setNewPlayerName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={addPlayer}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Actions Menu - USANDO safeNumber e safeToFixed */}
      {showPlayerActions && selectedPlayer && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowPlayerActions(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl p-6 animate-slide-up">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6" />
            
            <div className="flex items-center space-x-3 mb-6">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-white ${
                safeNumber(selectedPlayer.balance) < 0 ? 'bg-red-500' : 
                safeNumber(selectedPlayer.balance) > 0 ? 'bg-green-500' : 
                'bg-gray-400'
              }`}>
                {selectedPlayer.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-bold">{selectedPlayer.name}</p>
                <p className="text-sm text-gray-500">
                  Saldo: {safeNumber(selectedPlayer.balance) >= 0 ? '+' : ''}{safeToFixed(selectedPlayer.balance)}€
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setViewingProfile(selectedPlayer);
                  setShowPlayerActions(false);
                }}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
              >
                <User className="h-5 w-5 text-gray-600" />
                <span>Ver Perfil Completo</span>
              </button>
              
              <button
                onClick={() => {
                  // Add transaction logic
                  setShowPlayerActions(false);
                }}
                className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
              >
                <Receipt className="h-5 w-5 text-gray-600" />
                <span>Adicionar Transação</span>
              </button>
              
              <button
                onClick={() => {
                  handleDeletePlayer(selectedPlayer.id);
                }}
                className="w-full flex items-center space-x-3 p-3 hover:bg-red-50 rounded-lg text-red-600"
              >
                <Trash2 className="h-5 w-5" />
                <span>Eliminar Jogador</span>
              </button>
            </div>
            
            <button
              onClick={() => setShowPlayerActions(false)}
              className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium"
            >
              Fechar
            </button>
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

      <QuickActionsMenu />
    </div>
  );
};

export default PerfectMobileDashboard;