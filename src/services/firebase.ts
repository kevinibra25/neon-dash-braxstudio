import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query, 
  orderBy, 
  limit, 
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Helper to get or create a persistent local player ID
export const getLocalPlayerId = () => {
  let id = localStorage.getItem('neon-dash-player-id');
  if (!id) {
    id = 'player_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('neon-dash-player-id', id);
  }
  return id;
};

export interface LeaderboardEntry {
  id?: string;
  playerName: string;
  score: number;
  createdAt: Timestamp;
  userId: string;
}

export const isNameTaken = async (name: string): Promise<boolean> => {
  try {
    const userId = getLocalPlayerId();
    const q = query(collection(db, 'leaderboard'));
    const querySnapshot = await getDocs(q);
    
    // Check if the name exists and belongs to a different userId
    return querySnapshot.docs.some(docSnap => {
      const data = docSnap.data() as LeaderboardEntry;
      return data.playerName.toLowerCase() === name.toLowerCase() && docSnap.id !== userId;
    });
  } catch (error) {
    console.error("Error checking name availability:", error);
    return false;
  }
};

export const getLeaderboard = async (maxEntries = 10): Promise<LeaderboardEntry[]> => {
  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(50) // Fetch more to allow for filtering
    );
    const querySnapshot = await getDocs(q);
    const allEntries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LeaderboardEntry[];

    // Unique by playerName, keeping the highest score (first seen)
    const uniqueMap = new Map<string, LeaderboardEntry>();
    allEntries.forEach(entry => {
      if (!uniqueMap.has(entry.playerName)) {
        uniqueMap.set(entry.playerName, entry);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, maxEntries);
  } catch (error: any) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};

export const saveScore = async (playerName: string, score: number) => {
  try {
    const userId = getLocalPlayerId();
    const docRef = doc(db, 'leaderboard', userId);
    
    // Fetch existing score to check if we should update
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const existingData = docSnap.data() as LeaderboardEntry;
      if (score <= existingData.score) {
        // Don't overwrite with a lower or equal score
        return;
      }
    }

    await setDoc(docRef, {
      playerName,
      score,
      userId,
      createdAt: serverTimestamp()
    });
  } catch (error: any) {
    console.error("Error saving score:", error);
    throw error;
  }
};

export const cleanupDuplicates = async () => {
  try {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'));
    const querySnapshot = await getDocs(q);
    const seenNames = new Set();
    const toDelete: any[] = [];

    querySnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const name = data.playerName;
      
      if (seenNames.has(name)) {
        // Since we ordered by score desc, subsequent entries for the same name are lower or equal
        toDelete.push(deleteDoc(doc(db, 'leaderboard', docSnap.id)));
      } else {
        seenNames.add(name);
      }
    });

    await Promise.all(toDelete);
    console.log(`Cleaned up ${toDelete.length} duplicate entries`);
  } catch (err) {
    console.error("Cleanup failed:", err);
  }
};
