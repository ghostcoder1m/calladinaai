import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const FirebaseConnectionTest = () => {
  const [user, setUser] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addTestResult = (message, success = true) => {
    setTestResults(prev => [...prev, { message, success, timestamp: new Date() }]);
  };

  const runTests = async () => {
    setTestResults([]);
    
    // Test 1: Check environment variables
    addTestResult('🔍 Checking environment variables...');
    const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
    const apiKey = process.env.REACT_APP_FIREBASE_API_KEY;
    const authDomain = process.env.REACT_APP_FIREBASE_AUTH_DOMAIN;
    
    if (!projectId || !apiKey || !authDomain) {
      addTestResult('❌ Missing Firebase environment variables', false);
      return;
    }
    
    addTestResult(`✅ Project ID: ${projectId}`);
    addTestResult(`✅ Auth Domain: ${authDomain}`);
    addTestResult(`✅ API Key: ${apiKey.substring(0, 20)}...`);
    
    // Test 2: Check authentication
    if (!user) {
      addTestResult('❌ No user authenticated', false);
      return;
    }
    
    addTestResult(`✅ User authenticated: ${user.email}`);
    
    // Test 3: Test Firestore connection
    try {
      addTestResult('🔄 Testing Firestore write...');
      const testDocRef = doc(db, 'connectionTest', user.uid);
      await setDoc(testDocRef, {
        message: 'Connection test',
        timestamp: serverTimestamp(),
        userId: user.uid,
        userEmail: user.email
      });
      addTestResult('✅ Firestore write successful');
      
      // Test 4: Test Firestore read
      addTestResult('🔄 Testing Firestore read...');
      const docSnap = await getDoc(testDocRef);
      if (docSnap.exists()) {
        addTestResult('✅ Firestore read successful');
        addTestResult(`📄 Data: ${JSON.stringify(docSnap.data())}`);
      } else {
        addTestResult('❌ Could not read document after write', false);
      }
      
      // Test 5: Test setup configuration save
      addTestResult('🔄 Testing setup configuration save...');
      const setupDocRef = doc(db, 'setupConfigurations', user.uid);
      await setDoc(setupDocRef, {
        testData: 'This is a test configuration',
        currentStep: 1,
        lastUpdated: serverTimestamp(),
        userId: user.uid,
        userEmail: user.email
      }, { merge: true });
      addTestResult('✅ Setup configuration save successful');
      
    } catch (error) {
      addTestResult(`❌ Firestore error: ${error.message}`, false);
      console.error('Firestore error:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">🔧 Firebase Connection Test</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Configuration Status:</h3>
        <div className="bg-gray-100 p-3 rounded text-sm">
          <p><strong>Project ID:</strong> {process.env.REACT_APP_FIREBASE_PROJECT_ID || 'Not set'}</p>
          <p><strong>Auth Domain:</strong> {process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'Not set'}</p>
          <p><strong>User:</strong> {user ? user.email : 'Not authenticated'}</p>
        </div>
      </div>

      <button
        onClick={runTests}
        disabled={!user}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mb-4"
      >
        {user ? 'Run Connection Tests' : 'Please sign in first'}
      </button>

      {testResults.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <div className="space-y-1 text-sm font-mono">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`p-2 rounded ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {result.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">
        <p><strong>Note:</strong> If tests fail, you may need to update your Firebase configuration in the .env file.</p>
      </div>
    </div>
  );
};

export default FirebaseConnectionTest; 