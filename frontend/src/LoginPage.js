import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentView, setCurrentView] = useState('signin'); // 'signin', 'signup', 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validateForm = () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (currentView !== 'forgot' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    if (currentView === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      if (currentView === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccess('Account created successfully!');
      } else if (currentView === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess('Signed in successfully!');
      } else if (currentView === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('Password reset email sent! Check your inbox.');
        setCurrentView('signin');
      }
      onLogin();
    } catch (error) {
      let errorMessage = 'An error occurred. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email already exists.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccess('Signed in with Google successfully!');
      onLogin();
    } catch (error) {
      let errorMessage = 'Failed to sign in with Google.';
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (currentView) {
      case 'signup': return 'Create your account';
      case 'forgot': return 'Reset your password';
      default: return 'Welcome back';
    }
  };

  const getSubtitle = () => {
    switch (currentView) {
      case 'signup': return 'Join Calladina AI to get started with your intelligent voice assistant';
      case 'forgot': return 'Enter your email address and we\'ll send you a reset link';
      default: return 'Sign in to your Calladina AI account';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Please wait...';
    switch (currentView) {
      case 'signup': return 'Create account';
      case 'forgot': return 'Send reset email';
      default: return 'Sign in';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-neutral-50 to-accent-50 flex items-center justify-center p-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-soft"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-accent-200 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse-soft" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse-soft" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto animate-scale-in">
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20 shadow-soft-lg">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="relative mb-6">
              <div className="w-16 h-16 bg-wealthsimple-gradient rounded-2xl flex items-center justify-center mx-auto shadow-glow transform rotate-3">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            </div>
            
            <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">
              {getTitle()}
            </h1>
            <p className="text-neutral-600 text-sm leading-relaxed">
              {getSubtitle()}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl animate-slide-down">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-secondary-50 border border-secondary-200 rounded-2xl animate-slide-down">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-secondary-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-secondary-700 text-sm font-medium">{success}</p>
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          {currentView !== 'forgot' && (
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full mb-6 px-6 py-4 bg-white border-2 border-neutral-200 rounded-2xl text-neutral-700 font-semibold hover:border-neutral-300 hover:shadow-soft transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
            >
              <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          )}

          {/* Divider */}
          {currentView !== 'forgot' && (
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-neutral-500 font-medium">or</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-4 bg-white border-2 border-neutral-200 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:ring-0 focus:shadow-glow transition-all duration-300"
                required
              />
            </div>

            {/* Password Input */}
            {currentView !== 'forgot' && (
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-4 bg-white border-2 border-neutral-200 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:ring-0 focus:shadow-glow transition-all duration-300"
                  required
                />
              </div>
            )}

            {/* Confirm Password Input */}
            {currentView === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-neutral-700 mb-2">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full px-4 py-4 bg-white border-2 border-neutral-200 rounded-2xl text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:ring-0 focus:shadow-glow transition-all duration-300"
                  required
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 px-6 py-4 bg-wealthsimple-gradient text-white font-bold rounded-2xl shadow-soft hover:shadow-glow hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
            >
              <span className="flex items-center justify-center">
                {loading && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {getButtonText()}
              </span>
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-3">
            {currentView === 'signin' && (
              <>
                <button
                  onClick={() => setCurrentView('forgot')}
                  className="text-primary-600 hover:text-primary-700 text-sm font-semibold hover:underline transition-colors duration-300"
                >
                  Forgot your password?
                </button>
                <div className="text-neutral-600 text-sm">
                  Don't have an account?{' '}
                  <button
                    onClick={() => setCurrentView('signup')}
                    className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-colors duration-300"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}

            {currentView === 'signup' && (
              <div className="text-neutral-600 text-sm">
                Already have an account?{' '}
                <button
                  onClick={() => setCurrentView('signin')}
                  className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-colors duration-300"
                >
                  Sign in
                </button>
              </div>
            )}

            {currentView === 'forgot' && (
              <button
                onClick={() => setCurrentView('signin')}
                className="text-primary-600 hover:text-primary-700 text-sm font-semibold hover:underline transition-colors duration-300"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="mt-8 text-center">
          <p className="text-neutral-500 text-xs">
            Secure authentication powered by Firebase
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 