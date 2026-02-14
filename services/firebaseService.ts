
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getDatabase, ref, push, onValue, set, query, limitToLast, serverTimestamp, Database } from "firebase/database";
import { Message } from "../types";

// Firebase project configuration
const firebaseConfig = {
 apiKey: "AIzaSyCe5s56r7d4txfeXXMNq6notCs-XDk0JEA",
  authDomain: "theobiblestudy-bac71.firebaseapp.com",
  databaseURL: "https://theobiblestudy-bac71-default-rtdb.firebaseio.com",
  projectId: "theobiblestudy-bac71",
  storageBucket: "theobiblestudy-bac71.firebasestorage.app",
  messagingSenderId: "94907339663",
  appId: "1:94907339663:web:3875ae4d395e757014b1fa"
};

let app: FirebaseApp | null = null;
let db: Database | null = null;

const isConfigValid = firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && firebaseConfig.databaseURL.includes("https://");

// Initialize Firebase only if config is valid
if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getDatabase(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

/**
 * MOCK DATABASE SYSTEM (Fallback)
 * Uses LocalStorage to simulate a persistent chat when Firebase is not configured.
 */
const MOCK_STORAGE_KEY = 'sm_local_chat_messages';

const getLocalMessages = (): Message[] => {
  const saved = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!saved) return [
    { 
      id: 'welcome-1', 
      text: 'স্বাগতম! বাইবেল সং অ্যাপের ফেলোশিপে আপনাকে স্বাগতম।', 
      senderId: 'system', 
      senderName: 'Sacred Melodies', 
      senderPhoto: 'https://api.dicebear.com/7.x/bottts/svg?seed=system', 
      timestamp: Date.now() 
    }
  ];
  return JSON.parse(saved);
};

const saveLocalMessage = (message: Message) => {
  const messages = getLocalMessages();
  const updated = [...messages, message].slice(-50); // Keep last 50
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * API IMPLEMENTATION
 */

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
  if (!db) {
    // Return mock messages immediately
    callback(getLocalMessages());
    
    // Listen for local storage changes (if opened in multiple tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === MOCK_STORAGE_KEY) {
        callback(getLocalMessages());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }

  const messagesRef = query(ref(db, 'messages'), limitToLast(50));
  
  return onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    
    const messagesList: Message[] = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    callback(messagesList);
  }, (error) => {
    console.error("Firebase subscription error:", error);
    // Fallback on error
    callback(getLocalMessages());
  });
};

export const sendChatMessage = async (message: Omit<Message, 'id'>) => {
  // Use Firebase if available
  if (db) {
    try {
      const messagesRef = ref(db, 'messages');
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        ...message,
        timestamp: serverTimestamp()
      });
      return;
    } catch (error) {
      console.error("Error sending message to Firebase, falling back to local:", error);
    }
  }

  // Fallback: Save to LocalStorage
  const localMsg: Message = {
    ...message,
    id: `local-${Date.now()}`,
    timestamp: Date.now()
  };
  saveLocalMessage(localMsg);
  
  // Trigger a custom event to notify the same tab
  window.dispatchEvent(new StorageEvent('storage', { key: MOCK_STORAGE_KEY }));
};
