// src/services/firebase.js - VERSÃO COMPLETA E CORRIGIDA
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';

// =====================================
// FIREBASE CONFIGURATION
// =====================================
const firebaseConfig = {
  // Your Firebase config here
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// =====================================
// HELPER FUNCTIONS
// =====================================
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (user) {
    return user.uid;
  }
  return 'anonymous';
};

// =====================================
// AUTH SERVICE
// =====================================
export const authService = {
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

  async signIn(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
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
  },

  getCurrentUser() {
    return auth.currentUser;
  }
};

// =====================================
// FIRESTORE SERVICE - COMPLETO E CORRIGIDO
// =====================================
export const firestoreService = {
  
  // ========== PLAYERS ==========
  async getPlayers() {
    try {
      const userId = getCurrentUserId();
      console.log('🔍 Getting players for user:', userId);
      
      const snapshot = await getDocs(collection(db, 'players'));
      let players = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar por userId se existir
      if (userId) {
        players = players.filter(p => p.userId === userId);
      }
      
      console.log('📊 Total players found:', players.length);
      return players;
    } catch (error) {
      console.error('❌ Error getting players:', error);
      return [];
    }
  },

  async getPlayerById(playerId) {
    try {
      console.log('🔍 Getting player by ID:', playerId);
      
      if (!playerId) {
        console.error('❌ No playerId provided');
        return null;
      }
      
      const playerRef = doc(db, 'players', playerId);
      const playerDoc = await getDoc(playerRef);
      
      if (playerDoc.exists()) {
        const playerData = { 
          id: playerDoc.id, 
          ...playerDoc.data() 
        };
        console.log('📊 Player found:', playerData);
        return playerData;
      } else {
        console.log('⚠️ Player not found with ID:', playerId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting player by ID:', error);
      return null;
    }
  },

  async addPlayer(playerData) {
    try {
      const userId = getCurrentUserId();
      console.log('➕ Adding player for user:', userId);
      
      const player = {
        ...playerData,
        userId: userId || 'anonymous',
        createdAt: new Date().toISOString(),
        balance: playerData.balance || 0,
        paid: playerData.paid || false,
        totalPoints: 0,
        totalRounds: 0,
        rounds: []
      };
      
      const docRef = await addDoc(collection(db, 'players'), player);
      console.log('✅ Player added with ID:', docRef.id);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error adding player:', error);
      return { success: false, error: error.message };
    }
  },

  async updatePlayer(playerId, updates) {
    try {
      console.log('🔄 Updating player:', playerId);
      
      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Player updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating player:', error);
      return { success: false, error: error.message };
    }
  },

  async savePlayer(player) {
    try {
      if (player.id) {
        // Update existing player
        const { id, ...playerData } = player;
        return await this.updatePlayer(id, playerData);
      } else {
        // Add new player
        return await this.addPlayer(player);
      }
    } catch (error) {
      console.error('❌ Error saving player:', error);
      return { success: false, error: error.message };
    }
  },

  async deletePlayer(playerId) {
    try {
      console.log('🗑️ Deleting player:', playerId);
      
      await deleteDoc(doc(db, 'players', playerId));
      
      console.log('✅ Player deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting player:', error);
      return { success: false, error: error.message };
    }
  },

  // ========== ROUNDS ==========
  async getRounds() {
    try {
      const userId = getCurrentUserId();
      console.log('🔍 Getting rounds for user:', userId);
      
      const snapshot = await getDocs(collection(db, 'rounds'));
      let rounds = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar por userId se existir
      if (userId) {
        rounds = rounds.filter(r => r.userId === userId);
      }
      
      // Ordenar por data de criação
      rounds.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      
      console.log('📊 Total rounds found:', rounds.length);
      return rounds;
    } catch (error) {
      console.error('❌ Error getting rounds:', error);
      return [];
    }
  },

  // ⭐ MÉTODO CORRIGIDO: getRoundById
  async getRoundById(roundId) {
    try {
      console.log('🔍 Getting round by ID:', roundId);
      
      if (!roundId) {
        console.error('❌ No roundId provided');
        return null;
      }
      
      const roundRef = doc(db, 'rounds', roundId);
      const roundDoc = await getDoc(roundRef);
      
      if (roundDoc.exists()) {
        const roundData = { 
          id: roundDoc.id, 
          ...roundDoc.data() 
        };
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

  async addRound(roundData) {
    try {
      const userId = getCurrentUserId();
      console.log('➕ Adding round for user:', userId);
      
      const round = {
        ...roundData,
        userId: userId || 'anonymous',
        createdAt: new Date().toISOString(),
        status: 'active',
        participants: []
      };
      
      const docRef = await addDoc(collection(db, 'rounds'), round);
      console.log('✅ Round added with ID:', docRef.id);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error adding round:', error);
      return { success: false, error: error.message };
    }
  },

  async updateRound(roundId, updates) {
    try {
      console.log('🔄 Updating round:', roundId);
      
      const roundRef = doc(db, 'rounds', roundId);
      await updateDoc(roundRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ Round updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating round:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteRound(roundId) {
    try {
      console.log('🗑️ Deleting round:', roundId);
      
      await deleteDoc(doc(db, 'rounds', roundId));
      
      console.log('✅ Round deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting round:', error);
      return { success: false, error: error.message };
    }
  },

  // ========== TRANSACTIONS ==========
  async getTransactions() {
    try {
      const userId = getCurrentUserId();
      console.log('🔍 Getting transactions for user:', userId);
      
      const snapshot = await getDocs(collection(db, 'transactions'));
      let transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar por userId se existir
      if (userId) {
        transactions = transactions.filter(t => t.userId === userId);
      }
      
      // Ordenar por data
      transactions.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
      });
      
      console.log('📊 Total transactions found:', transactions.length);
      return transactions;
    } catch (error) {
      console.error('❌ Error getting transactions:', error);
      return [];
    }
  },

  async addTransaction(transactionData) {
    try {
      const userId = getCurrentUserId();
      console.log('➕ Adding transaction for user:', userId);
      
      const transaction = {
        ...transactionData,
        userId: userId || 'anonymous',
        createdAt: new Date().toISOString(),
        date: transactionData.date || new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'transactions'), transaction);
      console.log('✅ Transaction added with ID:', docRef.id);
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ Error adding transaction:', error);
      return { success: false, error: error.message };
    }
  },

  // ========== SETTINGS ==========
  async getSettings() {
    try {
      const userId = getCurrentUserId();
      console.log('🔍 Getting settings for user:', userId);
      
      const q = query(
        collection(db, 'settings'),
        where('userId', '==', userId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const settingsDoc = snapshot.docs[0];
        return {
          id: settingsDoc.id,
          ...settingsDoc.data()
        };
      }
      
      // Return default settings if none exist
      return {
        entryFee: 121,
        weeklyPayment: 5,
        dinnerPotGoal: 200,
        distributionPercentages: [40, 30, 20, 10]
      };
    } catch (error) {
      console.error('❌ Error getting settings:', error);
      return null;
    }
  },

  async updateSettings(settings) {
    try {
      const userId = getCurrentUserId();
      console.log('🔄 Updating settings for user:', userId);
      
      // Check if settings exist
      const q = query(
        collection(db, 'settings'),
        where('userId', '==', userId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Update existing settings
        const settingsDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'settings', settingsDoc.id), {
          ...settings,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new settings
        await addDoc(collection(db, 'settings'), {
          ...settings,
          userId,
          createdAt: new Date().toISOString()
        });
      }
      
      console.log('✅ Settings updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating settings:', error);
      return { success: false, error: error.message };
    }
  },

  // ========== UTILITY METHODS ==========
  async chargeWeeklyFees(amount) {
    try {
      console.log('💰 Charging weekly fees:', amount);
      
      const players = await this.getPlayers();
      
      for (const player of players) {
        if (player.paid) {
          const newBalance = (player.balance || 0) - amount;
          
          await this.updatePlayer(player.id, { balance: newBalance });
          
          await this.addTransaction({
            playerId: player.id,
            playerName: player.name,
            type: 'debt',
            amount: amount,
            note: 'Taxa semanal',
            balanceAfter: newBalance
          });
        }
      }
      
      console.log('✅ Weekly fees charged successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error charging weekly fees:', error);
      return { success: false, error: error.message };
    }
  },

  async settleAllDebts() {
    try {
      console.log('💳 Settling all debts');
      
      const players = await this.getPlayers();
      
      for (const player of players) {
        if (player.balance < 0) {
          await this.updatePlayer(player.id, { balance: 0 });
          
          await this.addTransaction({
            playerId: player.id,
            playerName: player.name,
            type: 'payment',
            amount: Math.abs(player.balance),
            note: 'Liquidação de dívida',
            balanceAfter: 0
          });
        }
      }
      
      console.log('✅ All debts settled successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error settling debts:', error);
      return { success: false, error: error.message };
    }
  },

  async settleDebt(playerId, amount, note = 'Pagamento de dívida') {
    try {
      console.log('💳 Settling debt for player:', playerId);
      
      const player = await this.getPlayerById(playerId);
      if (!player) {
        throw new Error('Player not found');
      }
      
      const newBalance = (player.balance || 0) + amount;
      
      await this.updatePlayer(playerId, { balance: newBalance });
      
      await this.addTransaction({
        playerId: player.id,
        playerName: player.name,
        type: 'payment',
        amount: amount,
        note: note,
        balanceAfter: newBalance
      });
      
      console.log('✅ Debt settled successfully');
      return { success: true, newBalance };
    } catch (error) {
      console.error('❌ Error settling debt:', error);
      return { success: false, error: error.message };
    }
  },

  // ========== PAYMENT METHODS ==========
  async confirmPayment(paymentId, amount) {
    try {
      console.log('💳 Confirming payment:', paymentId);
      
      const paymentRef = doc(db, 'payments', paymentId);
      
      // Primeiro buscar o pagamento para obter os dados
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        throw new Error('Payment not found');
      }
      
      const payment = paymentDoc.data();
      
      // Atualizar o pagamento
      await updateDoc(paymentRef, {
        status: amount >= (payment.amount || 0) ? 'paid' : 'partial',
        paidAmount: amount,
        paidAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Atualizar o saldo do jogador
      if (payment.playerId) {
        const player = await this.getPlayerById(payment.playerId);
        if (player) {
          const newBalance = (player.balance || 0) + amount;
          await this.updatePlayer(payment.playerId, { balance: newBalance });
          
          // Adicionar transação
          await this.addTransaction({
            playerId: payment.playerId,
            playerName: player.name,
            type: 'payment',
            amount: amount,
            note: `Pagamento confirmado - ${payment.description || 'Sem descrição'}`,
            balanceAfter: newBalance,
            paymentId: paymentId
          });
        }
      }
      
      console.log('✅ Payment confirmed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      return { success: false, error: error.message };
    }
  },

  // ========== FINANCIAL REPORTS ==========
  async generateFinancialReport(leagueId = 'default') {
    try {
      const userId = getCurrentUserId();
      console.log('📊 Generating financial report');
      
      // Buscar todos os dados necessários
      const [players, transactions, rounds] = await Promise.all([
        this.getPlayers(),
        this.getTransactions(),
        this.getRounds()
      ]);
      
      // Calcular estatísticas
      const completedRounds = rounds.filter(r => r.status === 'completed');
      
      const playerSummary = players.map(player => {
        const playerTransactions = transactions.filter(t => t.playerId === player.id);
        const totalDebts = playerTransactions
          .filter(t => t.type === 'debt')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalPayments = playerTransactions
          .filter(t => t.type === 'payment')
          .reduce((sum, t) => sum + t.amount, 0);
        
        return {
          playerId: player.id,
          playerName: player.name,
          currentBalance: player.balance || 0,
          totalDebts,
          totalPayments,
          netBalance: totalPayments - totalDebts,
          roundsPlayed: player.totalRounds || 0,
          totalPoints: player.totalPoints || 0
        };
      });
      
      const totals = {
        totalPlayers: players.length,
        totalRounds: completedRounds.length,
        totalDebt: playerSummary.reduce((sum, p) => sum + Math.max(0, -p.currentBalance), 0),
        totalCredit: playerSummary.reduce((sum, p) => sum + Math.max(0, p.currentBalance), 0),
        dinnerPot: Math.abs(playerSummary.reduce((sum, p) => sum + p.currentBalance, 0))
      };
      
      const reportData = {
        leagueId,
        userId,
        generatedAt: new Date().toISOString(),
        playerSummary,
        totals,
        rounds: completedRounds.length,
        status: 'generated'
      };
      
      // Guardar relatório
      const docRef = await addDoc(collection(db, 'reports'), reportData);
      
      console.log('✅ Financial report generated:', docRef.id);
      return { success: true, reportId: docRef.id, data: reportData };
    } catch (error) {
      console.error('❌ Error generating report:', error);
      return { success: false, error: error.message };
    }
  }
};

// Export tudo como default também para compatibilidade
export default {
  auth,
  db,
  authService,
  firestoreService
};