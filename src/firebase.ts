import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAN4cZRbVyGza6YrUunItYdWHnqcjjeZSs",
  authDomain: "traders-journal-32225.firebaseapp.com",
  projectId: "traders-journal-32225",
  storageBucket: "traders-journal-32225.firebasestorage.app",
  messagingSenderId: "982554735905",
  appId: "1:982554735905:web:f27d3790d150ab1cb53a60"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
