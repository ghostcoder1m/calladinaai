import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBaj78A-7o_xWtzERZC5d6d2dXgV3oT_8c",
  authDomain: "calladina-c62c1.firebaseapp.com",
  projectId: "calladina-c62c1",
  storageBucket: "calladina-c62c1.firebasestorage.app",
  messagingSenderId: "270758545372",
  appId: "1:270758545372:web:f53c558ca35f49e0ef3119",
  measurementId: "G-SK051CWTF7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider(); 