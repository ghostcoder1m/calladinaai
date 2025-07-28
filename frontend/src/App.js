import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import SetupGuide from './SetupGuide';
import AgentTraining from './AgentTraining';
import FirebaseConnectionTest from './FirebaseConnectionTest';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(null); // Start with null to check setup status first

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // Check if user has completed setup
        try {
          const docRef = doc(db, 'setupConfigurations', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.setupCompleted) {
              // Setup is completed, go directly to dashboard
              setCurrentView('dashboard');
            } else {
              // Setup not completed, start with setup
              setCurrentView('setup');
            }
          } else {
            // No setup data exists, start with setup
            setCurrentView('setup');
          }
        } catch (error) {
          console.error('Error checking setup status:', error);
          // Default to setup on error
          setCurrentView('setup');
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSetupComplete = () => {
    setCurrentView('training');
  };

  const handleTrainingComplete = () => {
    setCurrentView('dashboard');
  };

  if (loading || !currentView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl mb-6 shadow-soft-lg animate-pulse">
            <span className="text-3xl">🤖</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Loading Calladina</h2>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Navigation component for authenticated users
  const Navigation = () => (
    <div className={`fixed top-0 right-0 bg-white/90 backdrop-blur-md border-b border-slate-200 z-20 ${
      currentView === 'dashboard' ? 'left-64' : 'left-0'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-end">
          <div></div>
          
          <div className="flex items-center space-x-4">
            <nav className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentView('setup')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'setup'
                    ? 'bg-blue-500 text-white shadow-soft'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Setup
              </button>
              <button
                onClick={() => setCurrentView('training')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'training'
                    ? 'bg-purple-500 text-white shadow-soft'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                AI Training
              </button>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  currentView === 'dashboard'
                    ? 'bg-green-500 text-white shadow-soft'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Dashboard
              </button>
            </nav>
            
            <div className="h-6 w-px bg-slate-300"></div>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <button
                onClick={() => auth.signOut()}
                className="text-slate-600 hover:text-slate-900 font-medium transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="App">
      <Navigation />
      <div className={currentView === 'dashboard' ? '' : 'pt-20'}> {/* Add padding to account for fixed navigation, except for dashboard */}
        {currentView === 'setup' && (
          <SetupGuide user={user} onComplete={handleSetupComplete} />
        )}
        {currentView === 'training' && (
          <AgentTraining user={user} onComplete={handleTrainingComplete} />
        )}
        {currentView === 'dashboard' && (
          <Dashboard 
            user={user} 
            onReconfigure={() => setCurrentView('setup')}
            onSignOut={() => auth.signOut()}
          />
        )}
      </div>
      
      {/* Development Tools - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-6 right-6 z-50">
          <details className="bg-white rounded-lg shadow-soft border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
              🔧 Dev Tools
            </summary>
            <div className="mt-3 space-y-2">
              <FirebaseConnectionTest />
              <div className="text-xs text-slate-500 mt-2">
                User: {user.email}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export default App;
