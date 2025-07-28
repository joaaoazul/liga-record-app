// src/services/firebase.js - VERSÃO COMPLETA CORRIGIDA
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  setDoc, 
  doc,
  query,
  where,
  deleteDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';

// Substitui com as tuas configurações do Firebase Console
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper para obter userId
const getCurrentUserId = () => {
  return auth.currentUser?.uid || null;
};

// Auth functions
export const authService = {
  async signIn(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async signUp(email, password, displayName) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
};

// Firestore functions
export const firestoreService = {
  
  // PLAYERS
  async getPlayers() {
    try {
      const userId = getCurrentUserId();
      console.log('🔍 Getting players for user:', userId);
      
      const snapshot = await getDocs(collection(db, 'players'));
      let players = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Total players in DB:', players.length);
      
      // Filtrar por userId manualmente SE estiver autenticado
      if (userId) {
        players = players.filter(player => player.userId === userId);
        console.log('📊 Players for user:', players.length);
      }
      
      // Ordenar manualmente por data de criação
      players.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      console.log('✅ Final players list:', players);
      return players;
    } catch (error) {
      console.error('❌ Error getting players:', error);
      return [];
    }
  },

  async savePlayer(player) {
    try {
      const userId = getCurrentUserId();
      console.log('💾 Saving player:', player, 'for user:', userId);
      
      const playerData = {
        ...player,
        updatedAt: new Date().toISOString()
      };

      // Adicionar userId se disponível
      if (userId) {
        playerData.userId = userId;
      }

      // Se tem ID e não é temporário, é update
      if (player.id && !player.id.startsWith('temp_')) {
        console.log('🔄 Updating existing player');
        const playerRef = doc(db, 'players', player.id);
        await updateDoc(playerRef, playerData);
        console.log('✅ Player updated');
        return { success: true, id: player.id };
      } else {
        // É criação - se tem ID específico, usar setDoc
        console.log('➕ Creating new player');
        if (!playerData.createdAt) {
          playerData.createdAt = new Date().toISOString();
        }
        
        if (player.id && player.id.startsWith('player_')) {
          // Usar o ID específico
          console.log('💾 Creating player with specific ID:', player.id);
          const playerRef = doc(db, 'players', player.id);
          await setDoc(playerRef, playerData);
          console.log('✅ Player created with ID:', player.id);
          return { success: true, id: player.id };
        } else {
          // Gerar ID automático
          const docRef = await addDoc(collection(db, 'players'), playerData);
          console.log('✅ Player created with auto ID:', docRef.id);
          return { success: true, id: docRef.id };
        }
      }
    } catch (error) {
      console.error('❌ Error saving player:', error);
      return { success: false, error: error.message };
    }
  },

  async deletePlayer(playerId) {
    try {
      console.log('🗑️ Attempting to delete player with ID:', playerId);
      
      if (!playerId) {
        console.error('❌ No playerId provided');
        return { success: false, error: 'No player ID provided' };
      }
      
      // Verificar se o documento existe primeiro
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);
      
      if (!playerDoc.exists()) {
        console.error('❌ Player document does not exist:', playerId);
        return { success: false, error: 'Player not found in database' };
      }
      
      console.log('📄 Player exists, proceeding with deletion...');
      await deleteDoc(playerRef);
      console.log('✅ Player deleted successfully');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error deleting player:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      return { success: false, error: error.message };
    }
  },

  // SETTINGS
  async getSettings() {
    try {
      const userId = getCurrentUserId();
      console.log('⚙️ Getting settings for user:', userId);
      
      const snapshot = await getDocs(collection(db, 'settings'));
      const allSettings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filtrar por userId se disponível
      if (userId) {
        const userSettings = allSettings.find(s => s.userId === userId);
        if (userSettings) {
          console.log('📊 User settings found:', userSettings);
          return userSettings;
        }
      }
      
      // Fallback para configurações globais
      const globalSettings = allSettings.find(s => !s.userId) || allSettings[0];
      if (globalSettings) {
        console.log('📊 Global settings found:', globalSettings);
        return globalSettings;
      }
      
      // Default settings
      const defaults = { entryFee: 20, ligaName: 'Liga Record' };
      console.log('📊 Using default settings:', defaults);
      return defaults;
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      return { entryFee: 20, ligaName: 'Liga Record' };
    }
  },

  async saveSettings(settings) {
    try {
      const userId = getCurrentUserId();
      console.log('💾 Saving settings for user:', userId);
      
      const settingsData = {
        ...settings,
        updatedAt: new Date().toISOString()
      };

      if (userId) {
        settingsData.userId = userId;
        
        // Procurar configurações existentes do utilizador
        const snapshot = await getDocs(collection(db, 'settings'));
        const existingSettings = snapshot.docs.find(doc => {
          const data = doc.data();
          return data.userId === userId;
        });
        
        if (existingSettings) {
          // Update existing
          const settingsRef = doc(db, 'settings', existingSettings.id);
          await updateDoc(settingsRef, settingsData);
        } else {
          // Create new
          settingsData.createdAt = new Date().toISOString();
          await addDoc(collection(db, 'settings'), settingsData);
        }
      } else {
        // Configurações globais
        const settingsRef = doc(db, 'settings', 'global');
        await setDoc(settingsRef, settingsData);
      }
      
      console.log('✅ Settings saved');
      return { success: true };
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      return { success: false, error: error.message };
    }
  },

  // TRANSACTIONS
  async addTransaction(transaction) {
    try {
      const userId = getCurrentUserId();
      console.log('💸 Adding transaction for user:', userId);
      
      const transactionData = {
        ...transaction,
        timestamp: transaction.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      if (userId) {
        transactionData.userId = userId;
        transactionData.createdBy = transaction.createdBy || userId;
      }
      
      await addDoc(collection(db, 'transactions'), transactionData);
      console.log('✅ Transaction added');
      return { success: true };
    } catch (error) {
      console.error('❌ Error adding transaction:', error);
      return { success: false, error: error.message };
    }
  },

  async getTransactions() {
    try {
      const userId = getCurrentUserId();
      console.log('💸 Getting transactions for user:', userId);
      
      const snapshot = await getDocs(collection(db, 'transactions'));
      let transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Total transactions in DB:', transactions.length);
      
      // Filtrar por userId manualmente
      if (userId) {
        transactions = transactions.filter(t => t.userId === userId);
        console.log('📊 Transactions for user:', transactions.length);
      }
      
      // Ordenar manualmente por timestamp
      transactions.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.createdAt || 0);
        const dateB = new Date(b.timestamp || b.createdAt || 0);
        return dateB - dateA;
      });
      
      console.log('✅ Final transactions list:', transactions.length);
      return transactions;
    } catch (error) {
      console.error('❌ Error getting transactions:', error);
      return [];
    }
  },

  // ROUNDS
  async getRounds() {
    try {
      const userId = getCurrentUserId();
      console.log('🎯 Getting rounds for user:', userId);
      
      const snapshot = await getDocs(collection(db, 'rounds'));
      let rounds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('📊 Total rounds in DB:', rounds.length);
      
      // Filtrar por userId manualmente
      if (userId) {
        rounds = rounds.filter(r => r.userId === userId);
        console.log('📊 Rounds for user:', rounds.length);
      }
      
      // Ordenar manualmente por data de criação
      rounds.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      console.log('✅ Final rounds list:', rounds.length);
      return rounds;
    } catch (error) {
      console.error('❌ Error getting rounds:', error);
      return [];
    }
  },

  async addRound(round) {
    try {
      const userId = getCurrentUserId();
      console.log('🎯 Adding round for user:', userId);
      
      const roundData = {
        ...round,
        timestamp: new Date().toISOString(),
        createdAt: round.createdAt || new Date().toISOString()
      };
      
      if (userId) {
        roundData.userId = userId;
        roundData.createdBy = round.createdBy || userId;
      }
      
      // CORREÇÃO CRÍTICA: Se a ronda tem um ID específico, usar setDoc
      if (round.id) {
        console.log('💾 Creating round with specific ID:', round.id);
        const roundRef = doc(db, 'rounds', round.id);
        await setDoc(roundRef, roundData);
        console.log('✅ Round added with ID:', round.id);
      } else {
        // Se não tem ID, usar addDoc (gera ID automático)
        const docRef = await addDoc(collection(db, 'rounds'), roundData);
        console.log('✅ Round added with auto ID:', docRef.id);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error adding round:', error);
      return { success: false, error: error.message };
    }
  },

  async updateRound(roundId, updates) {
    try {
      console.log('🔄 Updating round:', roundId, 'with updates:', updates);
      
      if (!roundId) {
        console.error('❌ No roundId provided');
        return { success: false, error: 'No round ID provided' };
      }
      
      const roundRef = doc(db, 'rounds', roundId);
      
      // Verificar se existe primeiro
      const roundDoc = await getDoc(roundRef);
      if (!roundDoc.exists()) {
        console.error('❌ Round does not exist:', roundId);
        return { success: false, error: 'Round not found', code: 'ROUND_NOT_FOUND' };
      }
      
      // Adicionar timestamp de atualização
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Tentar atualizar
      await updateDoc(roundRef, updateData);
      
      console.log('✅ Round updated successfully');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error updating round:', error);
      return { success: false, error: error.message };
    }
  },

  async getRoundById(roundId) {
    try {
      console.log('🔍 Getting round by ID:', roundId);
      
      const roundRef = doc(db, 'rounds', roundId);
      const roundDoc = await getDoc(roundRef);
      
      if (roundDoc.exists()) {
        const roundData = { id: roundDoc.id, ...roundDoc.data() };
        console.log('📊 Round found:', roundData);
        return roundData;
      } else {
        console.log('⚠️ Round not found with ID:', roundId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting round by ID:', error);
      return null;
    }
  },

  async getCurrentRound() {
    try {
      const userId = getCurrentUserId();
      console.log('🎯 Getting current round for user:', userId);
      
      const snapshot = await getDocs(collection(db, 'rounds'));
      let rounds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar manualmente
      if (userId) {
        rounds = rounds.filter(r => r.userId === userId && r.status === 'active');
      } else {
        rounds = rounds.filter(r => r.status === 'active');
      }
      
      // Ordenar e pegar o mais recente
      rounds.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const currentRound = rounds.length > 0 ? rounds[0] : null;
      console.log('📊 Current round:', currentRound);
      
      return currentRound;
    } catch (error) {
      console.error('❌ Error getting current round:', error);
      return null;
    }
  },

  async deleteRound(roundId) {
    try {
      console.log('🗑️ Attempting to delete round with ID:', roundId);
      
      if (!roundId) {
        console.error('❌ No roundId provided');
        return { success: false, error: 'No round ID provided' };
      }
      
      // Verificar se o documento existe primeiro
      const roundRef = doc(db, 'rounds', roundId);
      const roundDoc = await getDoc(roundRef);
      
      if (!roundDoc.exists()) {
        console.error('❌ Round document does not exist:', roundId);
        return { success: false, error: 'Round not found in database' };
      }
      
      console.log('📄 Round exists, proceeding with deletion...');
      await deleteDoc(roundRef);
      console.log('✅ Round deleted successfully');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error deleting round:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      return { success: false, error: error.message };
    }
  },

  // FINANCIAL REPORTS
  async generateFinancialReport(leagueId = 'default') {
    try {
      const userId = getCurrentUserId();
      console.log('📊 Generating financial report for user:', userId);
      
      // 1. Verificar se existem 5 rondas completas
      const rounds = await this.getRounds();
      const completedRounds = rounds.filter(r => r.status === 'completed');
      
      if (completedRounds.length < 5) {
        return { 
          success: false, 
          error: `Apenas ${completedRounds.length} rondas completas. Necessário 5.` 
        };
      }
      
      // 2. Buscar todos os jogadores
      const players = await this.getPlayers();
      
      // 3. Calcular sumário financeiro
      const playerSummary = players.map(player => {
        const roundsPlayed = completedRounds.filter(round => 
          round.participants?.some(p => p.playerId === player.id)
        );
        
        const totalPaid = roundsPlayed.reduce((sum, round) => {
          const participant = round.participants.find(p => p.playerId === player.id);
          return sum + (participant?.weeklyPayment || 0);
        }, 0);
        
        return {
          playerId: player.id,
          playerName: player.name,
          currentBalance: player.balance || 0,
          totalPaid: totalPaid,
          totalOwed: Math.abs(Math.min(0, player.balance || 0)),
          netBalance: player.balance || 0,
          roundsPlayed: roundsPlayed.length
        };
      });
      
      // 4. Calcular totais
      const totals = {
        totalToCollect: playerSummary.reduce((sum, p) => sum + p.totalOwed, 0),
        totalToPay: playerSummary.reduce((sum, p) => sum + Math.max(0, p.netBalance), 0),
        netBalance: playerSummary.reduce((sum, p) => sum + p.netBalance, 0)
      };
      
      // 5. Criar documento do relatório
      const reportData = {
        leagueId,
        userId,
        season: new Date().getFullYear(),
        generatedAt: new Date().toISOString(),
        generatedBy: userId,
        playerSummary,
        totals,
        rounds: completedRounds.map(r => ({
          roundId: r.id,
          roundName: r.name,
          completedAt: r.completedAt,
          participants: r.participants
        })),
        status: 'final'
      };
      
      // 6. Guardar no Firestore
      const docRef = await addDoc(collection(db, 'financialReports'), reportData);
      console.log('✅ Financial report generated:', docRef.id);
      
      // 7. Criar registos de tracking de pagamentos
      const paymentTracking = playerSummary
        .filter(p => p.totalOwed > 0)
        .map(p => ({
          reportId: docRef.id,
          userId,
          playerId: p.playerId,
          playerName: p.playerName,
          amountOwed: p.totalOwed,
          amountPaid: 0,
          paymentStatus: 'pending',
          createdAt: new Date().toISOString()
        }));
      
      // Adicionar tracking de pagamentos
      for (const payment of paymentTracking) {
        await addDoc(collection(db, 'paymentTracking'), payment);
      }
      
      return { 
        success: true, 
        reportId: docRef.id,
        data: reportData 
      };
      
    } catch (error) {
      console.error('❌ Error generating financial report:', error);
      return { success: false, error: error.message };
    }
  },

  async getFinancialReports() {
    try {
      const userId = getCurrentUserId();
      const snapshot = await getDocs(collection(db, 'financialReports'));
      
      let reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (userId) {
        reports = reports.filter(r => r.userId === userId);
      }
      
      reports.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
      
      return reports;
    } catch (error) {
      console.error('❌ Error getting financial reports:', error);
      return [];
    }
  },

  async getFinancialReport(reportId) {
    try {
      const docRef = doc(db, 'financialReports', reportId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting financial report:', error);
      return null;
    }
  },

  async updatePaymentStatus(paymentId, amountPaid, notes) {
    try {
      const userId = getCurrentUserId();
      const paymentRef = doc(db, 'paymentTracking', paymentId);
      
      // Primeiro, buscar o documento para obter o amountOwed
      const paymentDoc = await getDoc(paymentRef);
      if (!paymentDoc.exists()) {
        throw new Error('Payment record not found');
      }
      
      const paymentData = paymentDoc.data();
      const amountOwed = paymentData.amountOwed || 0;
      
      const updates = {
        amountPaid,
        paymentStatus: amountPaid >= amountOwed ? 'paid' : 'partial',
        paidAt: new Date().toISOString(),
        confirmedBy: userId,
        notes
      };
      
      await updateDoc(paymentRef, updates);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating payment:', error);
      return { success: false, error: error.message };
    }
  },

  // Função auxiliar para verificar se documento existe
  async documentExists(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error('Error checking document existence:', error);
      return false;
    }
  }
};

// Expor funções globalmente para debug (remover em produção)
if (typeof window !== 'undefined') {
  window.firestoreService = firestoreService;
  window.authService = authService;
}

export default { authService, firestoreService };