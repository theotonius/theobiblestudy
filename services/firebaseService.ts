
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getDatabase, ref, push, onValue, set, query, limitToLast, serverTimestamp, Database } from "firebase/database";
import { Message } from "../types";

/**
 * সংযোগ নির্দেশিকা:
 * ১. Firebase Console থেকে আপনার ক্রেডেনশিয়ালগুলো কপি করুন।
 * ২. নিচের 'firebaseConfig' অবজেক্টে সেগুলো বসিয়ে দিন।
 * ৩. apiKey এবং databaseURL সঠিক হলে অ্যাপটি স্বয়ংক্রিয়ভাবে Firebase-এ কানেক্ট হবে।
 */
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY", // এখানে আপনার API Key দিন
  authDomain: "your-app-id.firebaseapp.com",
  databaseURL: "https://your-app-id-default-rtdb.firebaseio.com", // এখানে আপনার DB URL দিন
  projectId: "your-app-id",
  storageBucket: "your-app-id.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

let app: FirebaseApp | null = null;
let db: Database | null = null;

const isConfigValid = firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && firebaseConfig.databaseURL.includes("https://");

if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getDatabase(app);
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

const MOCK_STORAGE_KEY = 'sm_local_chat_messages';
const LOCAL_SYNC_EVENT = 'sm_local_chat_sync';

const getLocalMessages = (): Message[] => {
  const saved = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!saved) return [
    { 
      id: 'welcome-1', 
      text: 'স্বাগতম! বাইবেল সং অ্যাপের ফেলোশিপে আপনাকে স্বাগতম। আপনার নিজের Firebase Key যুক্ত করলে এটি রিয়েলটাইমে সবার সাথে কাজ করবে।', 
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
  const updated = [...messages, message].slice(-50);
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

/**
 * Firebase বা Local Storage চেক করার জন্য এক্সপোর্ট করা ফাংশন
 */
export const isFirebaseConnected = () => !!db;

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
  if (!db) {
    callback(getLocalMessages());
    
    // Listen for updates from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === MOCK_STORAGE_KEY) callback(getLocalMessages());
    };
    
    // Listen for updates from the SAME tab
    const handleLocalSync = () => {
      callback(getLocalMessages());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(LOCAL_SYNC_EVENT, handleLocalSync);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(LOCAL_SYNC_EVENT, handleLocalSync);
    };
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
  });
};

export const sendChatMessage = async (message: Omit<Message, 'id'>) => {
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
      console.error("Firebase send failed:", error);
    }
  }

  // Fallback: Local Storage Sync
  const localMsg: Message = {
    ...message,
    id: `local-${Date.now()}`,
    timestamp: Date.now()
  };
  saveLocalMessage(localMsg);
  
  // Trigger both for cross-tab and same-tab
  window.dispatchEvent(new StorageEvent('storage', { key: MOCK_STORAGE_KEY }));
  window.dispatchEvent(new CustomEvent(LOCAL_SYNC_EVENT));
};
