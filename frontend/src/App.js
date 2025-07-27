import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import LoginPage from './LoginPage';
import SetupGuide from './SetupGuide';
import Dashboard from './Dashboard';
import './output.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user has completed setup from Firestore
        try {
          const docRef = doc(db, 'setupConfigurations', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists() && docSnap.data().setupCompleted) {
            setSetupComplete(true);
          } else {
            setSetupComplete(false);
          }
        } catch (error) {
          console.error('Error checking setup status:', error);
          setSetupComplete(false);
        }
      } else {
        setSetupComplete(false);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    // The user state will be updated automatically by onAuthStateChanged
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSetupComplete(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleReconfigure = async () => {
    try {
      // Mark setup as incomplete in Firestore
      const docRef = doc(db, 'setupConfigurations', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await setDoc(docRef, {
          ...docSnap.data(),
          setupCompleted: false
        }, { merge: true });
      }
      setSetupComplete(false);
    } catch (error) {
      console.error('Error resetting setup:', error);
    }
  };

  const handleSetupComplete = () => {
    // Setup completion is now handled in SetupGuide via Firestore
    setSetupComplete(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-gray-900 text-lg font-semibold">Loading your AI assistant...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show setup guide if user hasn't completed setup
  if (!setupComplete) {
    return <SetupGuide onComplete={handleSetupComplete} />;
  }

  // Dashboard/Home page (after setup completion)
  if (setupComplete) {
    return (
      <Dashboard 
        onReconfigure={handleReconfigure}
        onSignOut={handleLogout}
      />
    );
  }
}

export default App;
