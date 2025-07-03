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
  deleteDoc 
} from 'firebase/firestore';

// Substitui com as tuas configurações do Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "liga-record-2025.firebaseapp.com",
  projectId: "liga-record-2025",
  storageBucket: "liga-record-2025.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

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

// Firestore functions
export const firestoreService = {
  // Players
  async getPlayers() {
    try {
      const querySnapshot = await getDocs(collection(db, 'players'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting players:', error);
      return [];
    }
  },

  async savePlayer(player) {
    try {
      const playerRef = doc(db, 'players', player.id.toString());
      await setDoc(playerRef, player);
      return { success: true };
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
      const querySnapshot = await getDocs(collection(db, 'settings'));
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data();
      }
      return { entryFee: 20, ligaName: 'Liga Record' };
    } catch (error) {
      console.error('Error getting settings:', error);
      return { entryFee: 20, ligaName: 'Liga Record' };
    }
  },

  async saveSettings(settings) {
    try {
      const settingsRef = doc(db, 'settings', 'liga');
      await setDoc(settingsRef, settings);
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  },

  // Transactions
  async addTransaction(transaction) {
    try {
      await addDoc(collection(db, 'transactions'), {
        ...transaction,
        timestamp: new Date().toISOString(),
        createdBy: auth.currentUser?.uid
      });
      return { success: true };
    } catch (error) {
      console.error('Error adding transaction:', error);
      return { success: false, error: error.message };
    }
  },

  async getTransactions() {
    try {
      const q = query(
        collection(db, 'transactions'), 
        orderBy('timestamp', 'desc')
      );
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
      const q = query(
        collection(db, 'transactions'),
        where('playerId', '==', playerId),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting player transactions:', error);
      return [];
    }
  }
};

export default { authService, firestoreService };