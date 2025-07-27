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
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-neutral-50 to-accent-50 flex items-center justify-center p-6">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-soft"></div>
          <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-soft" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse-soft" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative z-10 text-center animate-scale-in">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 border border-white/20 shadow-soft-lg max-w-md mx-auto">
            {/* Logo/Icon */}
            <div className="relative mb-8">
              <div className="w-20 h-20 bg-wealthsimple-gradient rounded-2xl flex items-center justify-center mx-auto shadow-glow transform rotate-3 animate-bounce-gentle">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              {/* Shimmer effect */}
              <div className="absolute inset-0 w-20 h-20 mx-auto rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shimmer"></div>
              </div>
            </div>
            
            {/* Text */}
            <div className="space-y-4">
              <h2 className="text-2xl font-display font-bold text-neutral-900">
                Calladina AI
              </h2>
              <p className="text-neutral-600 font-medium">
                Loading your AI assistant...
              </p>
              
              {/* Loading bar */}
              <div className="relative mt-8">
                <div className="overflow-hidden h-2 text-xs flex rounded-full bg-neutral-200">
                  <div className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-wealthsimple-gradient rounded-full animate-pulse w-full"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating elements */}
          <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary-200 rounded-full animate-bounce-gentle opacity-60" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute -bottom-6 -right-6 w-6 h-6 bg-accent-300 rounded-full animate-bounce-gentle opacity-60" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-1/2 -right-8 w-4 h-4 bg-secondary-300 rounded-full animate-bounce-gentle opacity-60" style={{animationDelay: '2.5s'}}></div>
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
