// src/services/firebase.js
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
  orderBy,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

// Substitui com as tuas configurações do Firebase Console


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper para obter userId - só se estiver autenticado
const getCurrentUserId = () => {
  return auth.currentUser?.uid || null;
};

// Auth functions
export const authService = {
  // Login
  async signIn(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Register
  async signUp(email, password, displayName) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Logout
  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Auth state observer
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
};

// Firestore functions - com isolamento básico por utilizador
export const firestoreService = {
  // Players
  async getPlayers() {
    try {
      const userId = getCurrentUserId();
      
      if (userId) {
        // Se está autenticado, buscar só os seus players
        console.log('🔍 Getting players for user:', userId);
        const q = query(
          collection(db, 'players'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } else {
        // Fallback para compatibilidade
        console.log('🔍 Getting all players (no user)');
        const querySnapshot = await getDocs(collection(db, 'players'));
        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
    } catch (error) {
      console.error('Error getting players:', error);
      return [];
    }
  },

  async savePlayer(player) {
    try {
      const userId = getCurrentUserId();
      console.log('💾 Saving player:', player, 'for user:', userId);
      
      // Adicionar userId se está autenticado
      const playerData = {
        ...player,
        ...(userId && { userId }),
        updatedAt: new Date().toISOString()
      };

      if (player.id && typeof player.id === 'string' && !player.id.startsWith('temp_')) {
        // Update existing player
        const playerRef = doc(db, 'players', player.id);
        await updateDoc(playerRef, playerData);
        console.log('✅ Player updated');
        return { success: true };
      } else {
        // Add new player - manter o comportamento original
        if (!playerData.createdAt) {
          playerData.createdAt = new Date().toISOString();
        }
        
        const playerRef = doc(db, 'players', player.id.toString());
        await setDoc(playerRef, playerData);
        console.log('✅ Player saved with ID:', player.id);
        return { success: true };
      }
    } catch (error) {
      console.error('Error saving player:', error);
      return { success: false, error: error.message };
    }
  },

  async deletePlayer(playerId) {
    try {
      await deleteDoc(doc(db, 'players', playerId.toString()));
      return { success: true };
    } catch (error) {
      console.error('Error deleting player:', error);
      return { success: false, error: error.message };
    }
  },

  // Settings
  async getSettings() {
    try {
      const userId = getCurrentUserId();
      
      if (userId) {
        // Buscar configurações do utilizador
        console.log('🔍 Getting settings for user:', userId);
        const q = query(
          collection(db, 'settings'),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          return querySnapshot.docs[0].data();
        }
      } else {
        // Fallback para configurações globais
        const querySnapshot = await getDocs(collection(db, 'settings'));
        if (!querySnapshot.empty) {
          return querySnapshot.docs[0].data();
        }
      }
      
      return { entryFee: 20, ligaName: 'Liga Record' };
    } catch (error) {
      console.error('Error getting settings:', error);
      return { entryFee: 20, ligaName: 'Liga Record' };
    }
  },

  async saveSettings(settings) {
    try {
      const userId = getCurrentUserId();
      
      const settingsData = {
        ...settings,
        ...(userId && { userId }),
        updatedAt: new Date().toISOString()
      };

      if (userId) {
        // Salvar configurações do utilizador
        const q = query(
          collection(db, 'settings'),
          where('userId', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const settingsRef = doc(db, 'settings', querySnapshot.docs[0].id);
          await updateDoc(settingsRef, settingsData);
        } else {
          settingsData.createdAt = new Date().toISOString();
          await addDoc(collection(db, 'settings'), settingsData);
        }
      } else {
        // Fallback para configurações globais
        const settingsRef = doc(db, 'settings', 'liga');
        await setDoc(settingsRef, settingsData);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  },

  // Transactions
  async addTransaction(transaction) {
    try {
      const userId = getCurrentUserId();
      
      const transactionData = {
        ...transaction,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...(userId && { userId, createdBy: userId })
      };
      
      await addDoc(collection(db, 'transactions'), transactionData);
      return { success: true };
    } catch (error) {
      console.error('Error adding transaction:', error);
      return { success: false, error: error.message };
    }
  },

  async getTransactions() {
    try {
      const userId = getCurrentUserId();
      
      let q;
      if (userId) {
        q = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc')
        );
      } else {
        q = query(
          collection(db, 'transactions'), 
          orderBy('timestamp', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },

  async getPlayerTransactions(playerId) {
    try {
      const userId = getCurrentUserId();
      
      let q;
      if (userId) {
        q = query(
          collection(db, 'transactions'),
          where('userId', '==', userId),
          where('playerId', '==', playerId),
          orderBy('timestamp', 'desc')
        );
      } else {
        q = query(
          collection(db, 'transactions'),
          where('playerId', '==', playerId),
          orderBy('timestamp', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting player transactions:', error);
      return [];
    }
  },

  // Rounds functions
  async getRounds() {
    try {
      const userId = getCurrentUserId();
      
      let q;
      if (userId) {
        q = query(
          collection(db, 'rounds'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'rounds'), 
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting rounds:', error);
      return [];
    }
  },

  async addRound(round) {
    try {
      const userId = getCurrentUserId();
      
      const roundData = {
        ...round,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        ...(userId && { userId, createdBy: userId })
      };
      
      await addDoc(collection(db, 'rounds'), roundData);
      return { success: true };
    } catch (error) {
      console.error('Error adding round:', error);
      return { success: false, error: error.message };
    }
  },

  async updateRound(roundId, updates) {
    try {
      console.log('🔄 Updating round:', roundId, updates);
      
      const roundRef = doc(db, 'rounds', roundId.toString());
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(roundRef, updateData);
      console.log('✅ Round updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating round:', error);
      return { success: false, error: error.message };
    }
  },

  async getCurrentRound() {
    try {
      const userId = getCurrentUserId();
      
      let q;
      if (userId) {
        q = query(
          collection(db, 'rounds'),
          where('userId', '==', userId),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'rounds'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        );
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.length > 0 ? {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      } : null;
    } catch (error) {
      console.error('Error getting current round:', error);
      return null;
    }
  }
};

export default { authService, firestoreService };