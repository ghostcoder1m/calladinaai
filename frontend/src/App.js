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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center animate-scale-in">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-auto">
            {/* Simple Logo */}
            <div className="mb-6">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg font-medium text-slate-900">
                Calladina AI
              </h2>
              <p className="text-sm text-slate-500">
                Loading your workspace...
              </p>
              
              {/* Simple loading indicator */}
              <div className="mt-6">
                <div className="w-6 h-6 mx-auto">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-slate-600"></div>
                </div>
              </div>
            </div>
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
