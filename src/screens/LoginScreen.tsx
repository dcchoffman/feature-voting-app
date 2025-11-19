// ============================================
// Login Screen
// ============================================
// Location: src/screens/LoginScreen.tsx
// ============================================

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import { LogIn } from 'lucide-react';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setCurrentUser, setCurrentSession } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Get or create user
      const user = await db.getOrCreateUser(email.trim().toLowerCase(), name.trim());
      setCurrentUser(user);

      // Check if there's a session code in the URL
      const sessionCode = searchParams.get('session');
      if (sessionCode) {
        // Try to load the session by code
        const session = await db.getSessionByCode(sessionCode);
        if (session) {
          setCurrentSession(session);
          
          // Check if user is system admin, session admin, or stakeholder
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
        navigate('/sessions');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to log in. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
          alt="New Millennium Building Systems Logo"
          className="mx-auto h-24 w-auto cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/sessions')}
        />
        <h2 className="mt-6 text-center text-3xl font-bold text-[#2d4660]">
          Feature Voting System
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your voting sessions
        </p>
      </div>

      <div className="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
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
  );
}