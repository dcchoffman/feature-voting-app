// ============================================
// Login Screen
// ============================================
// Location: src/screens/LoginScreen.tsx
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import { LogIn } from 'lucide-react';
import { supabase } from '../supabaseClient';
import desktopLogo from '../../New-Millennium-color-logo1.png';
import microsoftLogo from '../assets/microsoft.svg';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setCurrentUser, setCurrentSession } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for OAuth errors in URL parameters or sessionStorage
  useEffect(() => {
    // Check sessionStorage first (for errors redirected from /sessions)
    const storedError = sessionStorage.getItem('oauth_error');
    if (storedError) {
      setError(storedError);
      sessionStorage.removeItem('oauth_error');
    }
    
    // Check URL parameters
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');
    
    if (errorParam) {
      // Decode the error description (it's URL encoded)
      const decodedError = errorDescription 
        ? decodeURIComponent(errorDescription) 
        : 'An authentication error occurred.';
      
      // Check for specific errors
      if (errorParam === 'invalid_request' && decodedError.includes('AADSTS9002325')) {
        setError('Azure AD authentication requires PKCE. Please ensure your Azure AD app is configured correctly. The redirect URI must be registered under the "Web" platform in Azure AD.');
      } else if (errorCode === 'unexpected_failure' && decodedError.includes('email')) {
        setError('Azure AD did not return your email address. Please ensure your Azure AD app has the correct API permissions (User.Read or email) and that your account has an email address.');
      } else {
        setError(`Authentication failed: ${decodedError}`);
      }
      
      // Clean up the URL - React Router handles basename automatically
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    console.log('[LoginScreen] ⚡ handleLogin called!', { email, name });
    e.preventDefault();
    console.log('[LoginScreen] Form prevented default');
    setError('');
    setIsLoading(true);
    console.log('[LoginScreen] Set loading state');

    try {
      console.log('[LoginScreen] Starting login process...');
      // Get or create user
      console.log('[LoginScreen] Getting or creating user...');
      const user = await db.getOrCreateUser(email.trim().toLowerCase(), name.trim());
      console.log('[LoginScreen] User created/retrieved:', user);
      setCurrentUser(user);

      // Check if there's a session code in the URL
      const sessionCode = searchParams.get('session');
      if (sessionCode) {
        console.log('[LoginScreen] Session code found, loading session...');
        // Try to load the session by code
        const session = await db.getSessionByCode(sessionCode);
        if (session) {
          setCurrentSession(session);
          
          // Check if user is system admin, session admin, or stakeholder
          console.log('[LoginScreen] Checking user roles...');
          const [isSysAdmin, isAdmin, isStakeholder] = await Promise.all([
            db.isUserSystemAdmin(user.id),
            db.isUserSessionAdmin(session.id, user.id),
            db.isUserSessionStakeholder(session.id, user.email)
          ]);

          // System admins have full access to all sessions
          if (isSysAdmin || isAdmin) {
            navigate('/admin');
          } else if (isStakeholder) {
            navigate('/vote');
          } else {
            // User not authorized for this session
            setError('You are not authorized to access this voting session.');
            setIsLoading(false);
            return;
          }
        } else {
          setError('Invalid session code.');
          setIsLoading(false);
          return;
        }
      } else {
        // No session code, go to session list
        console.log('[LoginScreen] No session code, navigating to /sessions');
        navigate('/sessions');
      }
    } catch (err) {
      console.error('[LoginScreen] Login error:', err);
      setError(`Failed to log in: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
      setIsLoading(false);
    }
  };

  const handleAzureLogin = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      // Get the basename from the current pathname or default to '/feature-voting-app'
      const basename = window.location.pathname.startsWith('/feature-voting-app') 
        ? '/feature-voting-app' 
        : '';
      
      // Construct the full redirect URL
      const redirectTo = `${window.location.origin}${basename}/sessions`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectTo,
          scopes: 'email openid profile User.ReadBasic.All',
          queryParams: {
            // Force the redirect_to parameter to be the production URL
            redirect_to: redirectTo
          }
        }
      });
      
      if (error) {
        setError('Failed to sign in with Azure AD. Please try again.');
        setIsLoading(false);
      }
      // If successful, user will be redirected to Azure, then back to /sessions
    } catch (err) {
      console.error('Azure login error:', err);
      setError('Failed to sign in with Azure AD. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white shadow-lg sm:rounded-lg overflow-hidden relative z-10">
          {/* Logo with gradient fade */}
          <div className="relative">
              <div className="px-10 pt-8 pb-6 text-center">
        <img
                  src={desktopLogo}
          alt="New Millennium Building Systems Logo"
          className="mx-auto h-24 w-auto"
        />
              </div>
            {/* Gradient overlay at bottom of logo section */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 1))'
              }}
            />
          </div>

          <div className="px-4 sm:px-10 pb-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-[#2d4660]">
          Feature Voting System
        </h2>
              <p className="mt-2 text-sm text-gray-600">
          Sign in to access your voting sessions
        </p>
      </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2d4660] focus:border-[#2d4660]"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2d4660] focus:border-[#2d4660]"
                  placeholder="your.email@company.com"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2d4660] hover:bg-[#1d3a53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2d4660] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleAzureLogin}
              disabled={isLoading}
              className="microsoft-signin-button"
              style={{
                width: '100%',
                height: '41px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingLeft: '12px',
                paddingRight: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#5E5E5E', marginRight: '12px' }}></div>
                  <span style={{ color: '#5E5E5E' }}>Signing in...</span>
                </>
              ) : (
                <>
                  <img 
                    src={microsoftLogo}
                    alt="Microsoft"
                    style={{ width: '21px', height: '21px', marginRight: '12px', flexShrink: 0 }}
                  />
                  <span style={{ color: '#5E5E5E', fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", Arial, sans-serif', fontSize: '15px', fontWeight: 600 }}>Sign in with Microsoft</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  No registration required
                </span>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-gray-500">
              <p>Simply enter your name and email to access</p>
              <p>voting sessions you've been invited to</p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}