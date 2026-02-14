
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getDatabase, ref, push, onValue, set, query, limitToLast, serverTimestamp, Database } from "firebase/database";
import { Message } from "../types";

// IMPORTANT: Replace these with your actual Firebase project config from Firebase Console
// If you don't have these yet, the app will show a warning in console but won't crash.
const firebaseConfig = {
  apiKey: "AIzaSyCe5s56r7d4txfeXXMNq6notCs-XDk0JEA",
  authDomain: "theobiblestudy-bac71.firebaseapp.com",
  databaseURL: "https://theobiblestudy-bac71-default-rtdb.firebaseio.com",
  projectId: "theobiblestudy-bac71",
  storageBucket: "theobiblestudy-bac71.firebasestorage.app",
  messagingSenderId: "94907339663",
  appId: "1:94907339663:web:3875ae4d395e757014b1fa"
};

let app: FirebaseApp;
let db: Database;

const isConfigValid = firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY";

try {
  if (isConfigValid) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getDatabase(app);
  } else {
    console.warn("Firebase config is not set. Chat functionality will be limited to local simulation.");
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

export const subscribeToMessages = (callback: (messages: Message[]) => void) => {
  if (!db) {
    // Fallback for local simulation if Firebase is not configured
    callback([]);
    return () => {};
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
  });
};

export const sendChatMessage = async (message: Omit<Message, 'id'>) => {
  if (!db) {
    console.error("Cannot send message: Firebase Database is not initialized.");
    return;
  }

  try {
    const messagesRef = ref(db, 'messages');
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, {
      ...message,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error sending message to Firebase:", error);
    throw error;
  }
};
