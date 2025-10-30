// ============================================
// Session Selection Screen - ADMIN ONLY
// ============================================
// Location: src/screens/SessionSelectionScreen.tsx
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import {
  Calendar, Clock, Users, Vote, Settings, LogOut,
  CheckCircle, AlertCircle, Plus, Mail, List, Info, BarChart2
} from 'lucide-react';

export default function SessionSelectionScreen() {
  const { currentUser, sessions, setCurrentSession, refreshSessions, setCurrentUser } = useSession();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [adminSessions, setAdminSessions] = useState<any[]>([]);
  const [featureCounts, setFeatureCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    checkAdminAccessAndLoadSessions();
  }, [currentUser]);

  const checkAdminAccessAndLoadSessions = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      // Get fresh sessions directly from database
      const freshSessions = await db.getSessionsForUser(currentUser.id);

      // Check which sessions the user is an admin for
      const adminSessionList: any[] = [];
      const counts: Record<string, number> = {};

      for (const session of freshSessions) {
        const [isAdmin, features] = await Promise.all([
          db.isUserSessionAdmin(session.id, currentUser.id),
          db.getFeatures(session.id)
        ]);

        if (isAdmin) {
          adminSessionList.push(session);
          counts[session.id] = features.length;
        }
      }

      // If user is not an admin of ANY session, redirect them
      if (adminSessionList.length === 0) {
        // Check if they're a stakeholder of any session
        let firstStakeholderSession = null;
        for (const session of freshSessions) {
          const isStakeholder = await db.isUserSessionStakeholder(session.id, currentUser.email);
          if (isStakeholder) {
            firstStakeholderSession = session;
            break;
          }
        }

        if (firstStakeholderSession) {
          // Redirect to voting for their first stakeholder session
          setCurrentSession(firstStakeholderSession);
          navigate('/vote');
        } else {
          // No sessions at all - redirect to unauthorized
          navigate('/unauthorized');
        }
        return;
      }

      // Refresh the context with fresh sessions
      await refreshSessions();

      setAdminSessions(adminSessionList);
      setFeatureCounts(counts);
    } catch (error) {
      console.error('Error loading admin sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEffectiveVotesPerUser = (session: any): { votes: number; displayText: string; isAuto: boolean; formula: string } => {
    const featureCount = featureCounts[session.id] || 0;

    if (session.use_auto_votes) {
      const calculatedVotes = Math.max(1, Math.floor(featureCount / 2));
      return {
        votes: calculatedVotes,
        displayText: `${calculatedVotes} votes per user`,
        isAuto: true,
        formula: `Auto: ${featureCount} ${featureCount === 1 ? 'feature' : 'features'} ÷ 2 = ${calculatedVotes}`
      };
    } else {
      return {
        votes: session.votes_per_user,
        displayText: `${session.votes_per_user} votes per user`,
        isAuto: false,
        formula: ''
      };
    }
  };

  const handleSelectSession = (session: any) => {
    setCurrentSession(session);
    navigate('/admin');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSessionStatus = (session: any) => {
    const now = new Date();
    const start = new Date(session.start_date);
    const end = new Date(session.end_date);

    if (now < start) {
      return { text: 'Upcoming', color: 'text-yellow-600 bg-yellow-50', icon: Clock };
    } else if (now > end) {
      return { text: 'Closed', color: 'text-gray-600 bg-gray-100', icon: AlertCircle };
    } else {
      return { text: 'Active', color: 'text-[#1E6154] bg-[#1E6154]/10', icon: CheckCircle };
    }
  };

  const handleEmailInvite = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();

    const inviteUrl = `${window.location.origin}/login?session=${session.session_code}`;
    const subject = encodeURIComponent(`You're invited to vote: ${session.title}`);
    const body = encodeURIComponent(
      `Hi,\n\nYou've been invited to participate in a feature voting session.\n\n` +
      `Session: ${session.title}\n` +
      `Goal: ${session.goal}\n\n` +
      `To get started, copy and paste this link into your browser:\n\n` +
      `${inviteUrl}\n\n` +
      `Voting Period: ${formatDate(session.start_date)} - ${formatDate(session.end_date)}\n\n` +
      `Best regards,\n${currentUser?.name}`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleViewResults = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setCurrentSession(session);
    navigate('/results');
  };

  const handleManageAdmins = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setCurrentSession(session);
    navigate('/manage-admins');
  };

  const handleManageStakeholders = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setCurrentSession(session);
    navigate('/manage-stakeholders');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen pb-8">
      {/* Desktop: Centered logo at top */}
      <div className="hidden md:flex md:justify-center mb-2">
        <img
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
          alt="New Millennium Building Systems Logo"
          className="-mt-4"
          style={{ height: '96px', width: 'auto' }}
        />
      </div>

      {/* Title and buttons in same row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {/* Mobile: small logo next to title */}
          <img
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px' }}
          />
          <div>
            <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">My Voting Sessions</h1>
            <p className="text-sm text-gray-600">Welcome, {currentUser?.name}</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/system-admins')}
            className="flex items-center px-4 py-2 bg-[#2d4660] text-white rounded-lg hover:bg-[#1d3a53] transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">System Admins</span>
            <span className="sm:hidden">System</span>
          </button>
          <button
            onClick={() => navigate('/create-session')}
            className="flex items-center px-4 py-2 bg-[#c59f2d] text-white rounded-lg hover:bg-[#a88a26] transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Create Session</span>
            <span className="sm:hidden">Create</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {adminSessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Vote className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No admin sessions</h3>
          <p className="text-sm text-gray-500 mb-6">
            You are not an administrator of any voting sessions.
          </p>
          <button
            onClick={() => navigate('/create-session')}
            className="inline-flex items-center px-4 py-2 bg-[#2d4660] text-white rounded-lg hover:bg-[#1d3a53] transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {adminSessions.map((session) => {
            const status = getSessionStatus(session);
            const StatusIcon = status.icon;
            const votesInfo = getEffectiveVotesPerUser(session);

            return (
              <div
                key={session.id}
                className="relative z-10 bg-white overflow-hidden shadow-md rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleSelectSession(session)}
              >
                <div className="p-6">
                  {/* Action Buttons */}
                  <div className="flex justify-end items-start mb-4">
                    <div className="flex items-center gap-2">
                      <button
  onClick={(e) => handleManageAdmins(e, session)}
  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#E6EBF1] text-[#173B65] hover:bg-[#D4DCE6] transition-colors cursor-pointer"
>
  <Settings className="h-3 w-3 mr-1" />
  Admins
</button>
                      <button
                        onClick={(e) => handleManageStakeholders(e, session)}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        Stakeholders
                      </button>
                    </div>
                  </div>

                  {/* Session Title */}
                  <h3 className="text-lg font-semibold text-[#2d4660] mb-2">
                    {session.title}
                  </h3>

                  {/* Session Goal */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {session.goal}
                  </p>

                  {/* Session Details */}
                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDate(session.start_date)} - {formatDate(session.end_date)}</span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.text}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <List className="h-4 w-4 mr-2" />
                      <span>{featureCounts[session.id] || 0} {featureCounts[session.id] === 1 ? 'feature' : 'features'}</span>
                    </div>
                    <div className="flex items-start">
                      <Vote className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="break-words">{votesInfo.displayText}</span>
                          {votesInfo.isAuto && (
                            <div className="group relative ml-1 mt-0.5">
                              <Info className="h-4 w-4 text-blue-500 cursor-help" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10 pointer-events-none">
                                {votesInfo.formula}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleViewResults(e, session)}
                          className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#c59f2d] text-white hover:bg-[#a88a26] transition-colors cursor-pointer flex-shrink-0"
                        >
                          <BarChart2 className="h-3 w-3 mr-1" />
                          {status.text === 'Closed' ? 'Final Results' : 'Current Results'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Email Invite */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => handleEmailInvite(e, session)}
                      className="w-full flex items-center justify-center px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <Mail className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-600">Email Invite to Stakeholders</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Footer */}
      <div className="relative z-10 mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Users className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Inviting Stakeholders:</p>
            <p>Click "Email Invite to Stakeholders" on any session card to send an invitation link via email. Recipients will be able to access the voting session directly from the link.</p>
          </div>
        </div>
      </div>
    </div>
  );
}