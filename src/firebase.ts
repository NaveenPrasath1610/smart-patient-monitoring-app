import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC3dm8w7r8bK7HBdRMxouOF1u0X3WSW-cc",
  authDomain: "speedy-ethos-jx6pd.firebaseapp.com",
  projectId: "speedy-ethos-jx6pd",
  storageBucket: "speedy-ethos-jx6pd.firebasestorage.app",
  messagingSenderId: "1075824740109",
  appId: "1:1075824740109:web:30d8bfa6c0acc7333fd244"
};

const app = initializeApp(firebaseConfig);
// Initialize Firestore targeting the custom database ID from configuration
const db = getFirestore(app, "ai-studio-8a8ad555-35fd-43dc-8ae3-d8c5e31a93ac");

export { db };
