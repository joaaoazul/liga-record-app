// src/components/dashboard/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebase';
import Header from '../common/Header';
import Loading from '../common/Loading';
import StatsCards from './StatsCards';
import PlayerList from '../players/PlayerList';
import PlayerProfile from '../players/PlayerProfile';
import RoundsManager from '../rounds/RoundsManager';

const Dashboard = () => {
  const [players, setPlayers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({ entryFee: 20, ligaName: 'Liga Record' });
  const [loading, setLoading] = useState(true);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const debugLog = {
        timestamp: new Date().toLocaleTimeString(),
        user: user ? { uid: user.uid, email: user.email } : 'No user',
        steps: []
      };

      debugLog.steps.push('🔄 Starting data load...');
      
      // Test 1: Basic connection
      try {
        debugLog.steps.push('📡 Testing Firebase connection...');
        const testResult = await firestoreService.getSettings();
        debugLog.steps.push(`✅ Firebase connected. Settings: ${JSON.stringify(testResult)}`);
      } catch (testError) {
        debugLog.steps.push(`❌ Firebase connection failed: ${testError.message}`);
      }

      // Test 2: Players query
      try {
        debugLog.steps.push('👥 Querying players...');
        const playersData = await firestoreService.getPlayers();
        debugLog.steps.push(`📊 Players query result: ${playersData.length} players found`);
        debugLog.playersData = playersData;
        setPlayers(playersData);
      } catch (playersError) {
        debugLog.steps.push(`❌ Players query failed: ${playersError.message}`);
        setPlayers([]);
      }

      // Test 3: Direct Firebase query (bypassing service)
      try {
        debugLog.steps.push('🔍 Direct Firebase query...');
        const { getDocs, collection } = await import('firebase/firestore');
        const { db } = await import('../../services/firebase');
        
        const directSnapshot = await getDocs(collection(db, 'players'));
        debugLog.steps.push(`📋 Direct query result: ${directSnapshot.size} documents in 'players' collection`);
        
        const directPlayers = [];
        directSnapshot.forEach(doc => {
          directPlayers.push({ id: doc.id, ...doc.data() });
        });
        debugLog.directPlayers = directPlayers;
        
      } catch (directError) {
        debugLog.steps.push(`❌ Direct query failed: ${directError.message}`);
      }

      // Test 4: Settings and transactions
      try {
        debugLog.steps.push('⚙️ Loading settings and transactions...');
        const [settingsData, transactionsData] = await Promise.all([
          firestoreService.getSettings(),
          firestoreService.getTransactions()
        ]);
        
        debugLog.steps.push(`⚙️ Settings loaded: ${JSON.stringify(settingsData)}`);
        debugLog.steps.push(`💸 Transactions loaded: ${transactionsData.length} transactions`);
        
        setSettings(settingsData);
        setTransactions(transactionsData);
      } catch (otherError) {
        debugLog.steps.push(`❌ Settings/transactions failed: ${otherError.message}`);
      }

      debugLog.steps.push('✅ Data loading completed');
      setDebugInfo(debugLog);

    } catch (error) {
      const errorLog = {
        timestamp: new Date().toLocaleTimeString(),
        error: error.message,
        stack: error.stack
      };
      setDebugInfo(errorLog);
      setError('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testAddPlayer = async () => {
    try {
      const testPlayer = {
        id: Date.now(),
        name: `Teste ${Date.now()}`,
        balance: -20,
        paid: false,
        totalPoints: 0,
        totalRounds: 0,
        rounds: [],
        createdAt: new Date().toISOString(),
        createdBy: user?.uid || 'no-user'
      };

      const result = await firestoreService.savePlayer(testPlayer);
      
      setDebugInfo(prev => ({
        ...prev,
        lastTest: {
          timestamp: new Date().toLocaleTimeString(),
          action: 'Add test player',
          player: testPlayer,
          result: result,
          success: result.success
        }
      }));

      if (result.success) {
        await loadData(); // Reload to see if it appears
      }
      
    } catch (error) {
      setDebugInfo(prev => ({
        ...prev,
        lastTest: {
          timestamp: new Date().toLocaleTimeString(),
          action: 'Add test player',
          error: error.message,
          success: false
        }
      }));
    }
  };

  const addPlayer = async (playerName) => {
    try {
      const newPlayer = {
        id: Date.now(),
        name: playerName,
        balance: -settings.entryFee,
        paid: false,
        totalPoints: 0,
        totalRounds: 0,
        rounds: [],
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      };

      const saveResult = await firestoreService.savePlayer(newPlayer);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save player');
      }

      await firestoreService.addTransaction({
        playerId: newPlayer.id,
        playerName: newPlayer.name,
        type: 'debt',
        amount: settings.entryFee,
        note: 'Quota de entrada da liga',
        balanceAfter: -settings.entryFee
      });

      await loadData();
      
    } catch (error) {
      setError('Erro ao adicionar jogador: ' + error.message);
    }
  };

  if (loading) {
    return <Loading message="A carregar dados da liga..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <Header settings={settings} onSettingsChange={() => {}} />
        
        {/* PAINEL DE DEBUG VISUAL */}
        <div className="bg-white rounded-lg shadow-md mb-6 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">🔍 Debug Visual</h2>
          
          {/* Status do Utilizador */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">👤 Utilizador</h3>
              <p className="text-sm text-blue-600">
                {user ? `✅ ${user.email}` : '❌ Não autenticado'}
              </p>
              <p className="text-xs text-blue-500">
                UID: {user?.uid || 'N/A'}
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">📊 Estado Atual</h3>
              <p className="text-sm text-green-600">Jogadores: {players.length}</p>
              <p className="text-sm text-green-600">Transações: {transactions.length}</p>
              <p className="text-xs text-green-500">
                Última atualização: {debugInfo.timestamp || 'N/A'}
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">🧪 Testes</h3>
              <button
                onClick={testAddPlayer}
                className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 mb-2 w-full"
              >
                Testar Adicionar Jogador
              </button>
              <button
                onClick={loadData}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 w-full"
              >
                Recarregar Dados
              </button>
            </div>
          </div>

          {/* Log de Debug Detalhado */}
          {debugInfo.steps && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="font-semibold text-gray-800 mb-2">📋 Log de Carregamento</h4>
              <div className="text-sm space-y-1">
                {debugInfo.steps.map((step, index) => (
                  <div key={index} className="font-mono text-xs">
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dados dos Jogadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debugInfo.playersData && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">
                  📊 Jogadores via Service ({debugInfo.playersData.length})
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  <pre className="text-xs">
                    {JSON.stringify(debugInfo.playersData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {debugInfo.directPlayers && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-2">
                  🔍 Query Direta Firebase ({debugInfo.directPlayers.length})
                </h4>
                <div className="max-h-32 overflow-y-auto">
                  <pre className="text-xs">
                    {JSON.stringify(debugInfo.directPlayers, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Último Teste */}
          {debugInfo.lastTest && (
            <div className="bg-indigo-50 p-4 rounded-lg mt-4">
              <h4 className="font-semibold text-indigo-800 mb-2">🧪 Último Teste</h4>
              <div className="text-sm">
                <p><strong>Ação:</strong> {debugInfo.lastTest.action}</p>
                <p><strong>Timestamp:</strong> {debugInfo.lastTest.timestamp}</p>
                <p><strong>Sucesso:</strong> {debugInfo.lastTest.success ? '✅' : '❌'}</p>
                {debugInfo.lastTest.error && (
                  <p className="text-red-600"><strong>Erro:</strong> {debugInfo.lastTest.error}</p>
                )}
                {debugInfo.lastTest.result && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Ver resultado completo</summary>
                    <pre className="text-xs bg-white p-2 rounded mt-1">
                      {JSON.stringify(debugInfo.lastTest, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Normal */}
        <div className="grid grid-cols-1 gap-6">
          <StatsCards players={players} settings={settings} />
          <PlayerList
            players={players}
            onViewProfile={() => {}}
            onTogglePaidStatus={() => {}}
            onRemovePlayer={() => {}}
            onAddPlayer={addPlayer}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;