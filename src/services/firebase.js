// src/services/firebase.js - VERSÃO SEM ÍNDICES
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
  updateDoc
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

// Firestore functions SEM ÍNDICES - só queries básicas
export const firestoreService = {
  
  // PLAYERS - Query básica + filtro manual
  async getPlayers() {
    try {
      const userId = getCurrentUserId();
      console.log('🔍 Getting players for user:', userId);
      
      // Query básica SEM orderBy para evitar índices
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
        return dateB - dateA; // Mais recentes primeiro
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

      // Determinar se é update ou create
      const isUpdate = player.id && 
                      typeof player.id === 'string' && 
                      !player.id.startsWith('temp_') &&
                      player.id.length > 10;

      if (isUpdate) {
        console.log('🔄 Updating existing player');
        const playerRef = doc(db, 'players', player.id);
        await updateDoc(playerRef, playerData);
        console.log('✅ Player updated');
        return { success: true, id: player.id };
      } else {
        console.log('➕ Creating new player');
        if (!playerData.createdAt) {
          playerData.createdAt = new Date().toISOString();
        }
        
        const docRef = await addDoc(collection(db, 'players'), playerData);
        console.log('✅ Player created with ID:', docRef.id);
        return { success: true, id: docRef.id };
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
      console.log('✅ Player deleted');
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting player:', error);
      return { success: false, error: error.message };
    }
  },

  // SETTINGS - Query básica + filtro manual
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

  // TRANSACTIONS - Query básica + filtro manual
  async addTransaction(transaction) {
    try {
      const userId = getCurrentUserId();
      console.log('💸 Adding transaction for user:', userId);
      
      const transactionData = {
        ...transaction,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      
      if (userId) {
        transactionData.userId = userId;
        transactionData.createdBy = userId;
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
      
      // Query básica SEM orderBy
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
        return dateB - dateA; // Mais recentes primeiro
      });
      
      console.log('✅ Final transactions list:', transactions.length);
      return transactions;
    } catch (error) {
      console.error('❌ Error getting transactions:', error);
      return [];
    }
  },

  // ROUNDS - Query básica + filtro manual
  async getRounds() {
    try {
      const userId = getCurrentUserId();
      console.log('🎯 Getting rounds for user:', userId);
      
      // Query básica SEM orderBy
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
        createdAt: new Date().toISOString()
      };
      
      if (userId) {
        roundData.userId = userId;
        roundData.createdBy = userId;
      }
      
      await addDoc(collection(db, 'rounds'), roundData);
      console.log('✅ Round added');
      return { success: true };
    } catch (error) {
      console.error('❌ Error adding round:', error);
      return { success: false, error: error.message };
    }
  },

  async updateRound(roundId, updates) {
    try {
      console.log('🔄 Updating round:', roundId, updates);
      
      // ESTRATÉGIA 1: Tentar update direto
      try {
        const roundRef = doc(db, 'rounds', roundId);
        await updateDoc(roundRef, {
          ...updates,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Round updated successfully');
        return { success: true };
      } catch (updateError) {
        console.warn('⚠️ Direct update failed:', updateError.message);
        
        // ESTRATÉGIA 2: Se falha, verificar se existe
        const existingRound = await this.getRoundById(roundId);
        
        if (!existingRound) {
          console.log('💾 Round not found, will be created by calling function');
          return { success: false, error: 'ROUND_NOT_FOUND', needsCreation: true };
        } else {
          // Se existe mas update falhou, tentar setDoc
          console.log('🔄 Trying setDoc as fallback...');
          const roundRef = doc(db, 'rounds', roundId);
          await setDoc(roundRef, {
            ...existingRound,
            ...updates,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log('✅ Round updated with setDoc');
          return { success: true };
        }
      }
    } catch (error) {
      console.error('❌ Error updating round:', error);
      return { success: false, error: error.message };
    }
  },

  async createCompletedRound(roundData) {
    try {
      console.log('🆕 Creating completed round:', roundData);
      
      const completeRoundData = {
        ...roundData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Use setDoc para garantir que o ID específico é usado
      const roundRef = doc(db, 'rounds', roundData.id);
      await setDoc(roundRef, completeRoundData);
      
      console.log('✅ Completed round created successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error creating completed round:', error);
      return { success: false, error: error.message };
    }
  },

  async getRoundById(roundId) {
    try {
      console.log('🔍 Getting round by ID:', roundId);
      
      const snapshot = await getDocs(collection(db, 'rounds'));
      const round = snapshot.docs.find(doc => doc.id === roundId);
      
      if (round) {
        const roundData = { id: round.id, ...round.data() };
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
      
      // Query básica SEM where
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
  }
};

export default { authService, firestoreService };