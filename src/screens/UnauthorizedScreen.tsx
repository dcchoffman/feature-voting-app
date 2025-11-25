// ============================================
// Unauthorized Screen with Admin Contact
// ============================================
// Location: src/screens/UnauthorizedScreen.tsx
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { Lock, Mail, Users, ArrowLeft, CheckCircle } from 'lucide-react';
import * as db from '../services/databaseService';
import desktopLogo from '../assets/New-Millennium-color-logo.svg';

export default function UnauthorizedScreen() {
  const { currentUser, sessions } = useSession();
  const navigate = useNavigate();
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    loadAdminEmails();
  }, [sessions]);

  const loadAdminEmails = async () => {
    setIsLoading(true);
    try {
      // Get all unique admin emails from all sessions
      const allAdmins = new Set<string>();
      
      for (const session of sessions) {
        const sessionAdmins = await db.getSessionAdmins(session.id);
        sessionAdmins.forEach(admin => {
          if (admin.user && admin.user.email) {
            allAdmins.add(admin.user.email);
          }
        });
      }
      
      setAdminEmails(Array.from(allAdmins));
    } catch (error) {
      console.error('Error loading admin emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestAccess = () => {
    const subject = encodeURIComponent('🙋 Request: Add me to Feature Voting System');
    const body = encodeURIComponent(
      `Hi Team,\n\n` +
      `I tried to access the Feature Voting System but don't have admin permissions yet.\n\n` +
      `Could you please add me to the system so I can participate in voting?\n\n` +
      `My details:\n` +
      `Name: ${currentUser?.name || 'Unknown'}\n` +
      `Email: ${currentUser?.email || 'Unknown'}\n\n` +
      `Thanks!\n` +
      `${currentUser?.name || 'A hopeful voter'} 🗳️`
    );
    
    const mailto = adminEmails.length > 0 
      ? `mailto:${adminEmails.join(',')}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;
    
    window.location.href = mailto;
    setEmailSent(true);
  };

  const handleGoBack = () => {
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={desktopLogo}
            alt="New Millennium Building Systems Logo"
            className="mx-auto cursor-pointer hover:opacity-80 transition-opacity"
            style={{ height: '80px', width: 'auto' }}
            onClick={() => navigate('/sessions')}
          />
        </div>

        {/* Main Card */}
        <div className="relative z-10 bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header with Icon */}
          <div className="bg-gradient-to-r from-[#2d4660] to-[#1d3a53] p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Whoa There, Speedracer! 🏎️
            </h1>
            <p className="text-blue-100 text-sm">
              You need access to the Feature Voting System
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {!emailSent ? (
              <>
                <div className="mb-6">
                  <p className="text-gray-600 mb-4">
                    Looks like you're trying to access the Feature Voting System, but you haven't been added yet. 
                  </p>
                  <p className="text-gray-600 mb-4">
                    No worries! Click the button below to send a quick message to the admins asking to be added.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Users className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        {adminEmails.length > 0 ? (
                          <>
                            <p className="font-medium mb-1">Your message will be sent to:</p>
                            <p className="text-xs">{adminEmails.join(', ')}</p>
                          </>
                        ) : (
                          <p>Your message will help the admin team get you set up!</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleRequestAccess}
                    className="w-full flex items-center justify-center px-4 py-3 bg-[#c59f2d] text-white rounded-lg hover:bg-[#a88a26] transition-colors font-medium"
                  >
                    <Mail className="h-5 w-5 mr-2" />
                    Request Access from Admins
                  </button>
                  
                  <button
                    onClick={handleGoBack}
                    className="w-full flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Email Sent! 📧
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Your access request has been sent to the admin team. They'll get you set up soon!
                  </p>
                  <button
                    onClick={handleGoBack}
                    className="inline-flex items-center px-4 py-2 bg-[#2d4660] text-white rounded-lg hover:bg-[#1d3a53] transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Once you're added to the system, you'll be able to participate in voting sessions.
          </p>
        </div>
      </div>
    </div>
  );
}