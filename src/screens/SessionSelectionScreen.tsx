// ============================================
// Session Selection Screen - For All Users
// ============================================
// Location: src/screens/SessionSelectionScreen.tsx
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { supabase } from '../supabaseClient';
import * as db from '../services/databaseService';
import { Footer } from '../components/FeatureVotingSystem';
import {
  Calendar, Clock, Users, Vote, Settings, LogOut,
  CheckCircle, AlertCircle, Plus, Mail, List, Info, BarChart2
} from 'lucide-react';

export default function SessionSelectionScreen() {
  const { currentUser, setCurrentSession, refreshSessions, setCurrentUser } = useSession();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [sessionRoles, setSessionRoles] = useState<Record<string, { isAdmin: boolean; isStakeholder: boolean }>>({});
  const [featureCounts, setFeatureCounts] = useState<Record<string, number>>({});
  const [votingStatus, setVotingStatus] = useState<Record<string, boolean>>({});
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'admin' | 'stakeholder'>('admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside as any);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    loadUserSessions();
  }, [currentUser]);

  const loadUserSessions = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      // Check if system admin
      const sysAdmin = await db.isUserSystemAdmin(currentUser.id);
      setIsSystemAdmin(sysAdmin);

      // Get all sessions for this user
      const freshSessions = await db.getSessionsForUser(currentUser.id);

      const roles: Record<string, { isAdmin: boolean; isStakeholder: boolean }> = {};
      const counts: Record<string, number> = {};
      const votedStatus: Record<string, boolean> = {};

      for (const session of freshSessions) {
        const [isAdmin, isStakeholder, features, votes] = await Promise.all([
          // System admins have admin access to all sessions
          sysAdmin ? Promise.resolve(true) : db.isUserSessionAdmin(session.id, currentUser.id),
          db.isUserSessionStakeholder(session.id, currentUser.email),
          db.getFeatures(session.id),
          db.getVotes(session.id)
        ]);

        roles[session.id] = { isAdmin, isStakeholder };
        counts[session.id] = features.length;
        
        // Check if user has voted in this session
        const hasVoted = votes.some(v => v.user_id === currentUser.id);
        votedStatus[session.id] = hasVoted;
      }

      // Refresh the context with fresh sessions
      await refreshSessions();

      setUserSessions(freshSessions);
      setSessionRoles(roles);
      setFeatureCounts(counts);
      setVotingStatus(votedStatus);
    } catch (error) {
      console.error('Error loading sessions:', error);
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
    const role = sessionRoles[session.id];
    
    // If in stakeholder view mode, always go to voting
    if (viewMode === 'stakeholder') {
      navigate('/vote');
    }
    // If user is admin and in admin view, go to admin dashboard
    // Otherwise, go to voting screen
    else if (role?.isAdmin) {
      navigate('/admin');
    } else {
      navigate('/vote');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      setCurrentSession(null as any);
    } catch {}
    setCurrentUser(null);
    // Clear stored session/auth flags
    try {
      localStorage.removeItem('voting_system_current_session');
      localStorage.removeItem('azureDevOpsAuthInProgress');
      sessionStorage.removeItem('oauth_return_path');
      sessionStorage.removeItem('oauth_action');
    } catch {}
    setMobileMenuOpen(false);
    navigate('/login', { replace: true });
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

  // Separate sessions by role
  // System admins see ALL sessions as admin sessions
  const adminSessions = isSystemAdmin 
    ? userSessions  // System admins see all sessions
    : userSessions.filter(s => sessionRoles[s.id]?.isAdmin);
  const stakeholderOnlySessions = isSystemAdmin
    ? []  // System admins don't have "stakeholder-only" sessions
    : userSessions.filter(s => 
        sessionRoles[s.id]?.isStakeholder && !sessionRoles[s.id]?.isAdmin
      );
  
  // Determine if user has any admin access
  const hasAdminAccess = isSystemAdmin || adminSessions.length > 0;
  
  // When in stakeholder view mode, show all sessions as stakeholder cards
  const sessionsToDisplay = viewMode === 'stakeholder' ? userSessions : [];
  const adminSessionsToDisplay = viewMode === 'admin' ? adminSessions : [];
  const stakeholderSessionsToDisplay = viewMode === 'admin' ? stakeholderOnlySessions : [];

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

      {/* Title and buttons - same row on mobile with menu */}
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
            <p className="text-sm text-gray-600">
              Welcome, {currentUser?.name}
              {isSystemAdmin && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  System Admin
                </span>
              )}
              {!isSystemAdmin && adminSessions.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Session Admin
                </span>
              )}
              {!isSystemAdmin && adminSessions.length === 0 && stakeholderOnlySessions.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Stakeholder
                </span>
              )}
            </p>
          </div>
        </div>

        <div ref={mobileMenuRef} className="relative z-40 md:justify-end">
          {/* Desktop buttons */}
          <div className="hidden md:flex space-x-2">
            {isSystemAdmin && viewMode === 'admin' && (
              <>
                <button
                  onClick={() => navigate('/users')}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </button>
              </>
            )}
            {(isSystemAdmin || adminSessions.length > 0) && viewMode === 'admin' && (
              <button
                onClick={() => navigate('/create-session')}
                className="flex items-center px-4 py-2 bg-[#c59f2d] text-white rounded-lg hover:bg-[#a88a26] transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Create Session</span>
                <span className="sm:hidden">Create</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden justify-end">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md border border-gray-200 bg-white shadow-sm"
              aria-label="Open menu"
            >
              <List className="h-5 w-5 text-gray-700" />
            </button>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg md:hidden z-50">
              <div className="py-1">
                {isSystemAdmin && viewMode === 'admin' && (
                  <>
                    <button
                      onClick={() => { setMobileMenuOpen(false); navigate('/users'); }}
                      className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                    >
                      <Users className="h-4 w-4 mr-2 text-gray-700" />
                      User Management
                    </button>
                  </>
                )}
                {(isSystemAdmin || adminSessions.length > 0) && viewMode === 'admin' && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/create-session'); }}
                    className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2 text-gray-700" />
                    Create Session
                  </button>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4 mr-2 text-gray-700" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {userSessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Vote className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No voting sessions</h3>
          <p className="text-sm text-gray-500 mb-6">
            You are not part of any voting sessions yet.
          </p>
          {isSystemAdmin && (
            <button
              onClick={() => navigate('/create-session')}
              className="inline-flex items-center px-4 py-2 bg-[#2d4660] text-white rounded-lg hover:bg-[#1d3a53] transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Session
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stakeholder View Mode - Show all sessions with voter cards */}
          {viewMode === 'stakeholder' && (
            <div>
              <h2 className="text-xl font-semibold text-[#2d4660] mb-4 flex items-center">
                <Vote className="h-5 w-5 mr-2" />
                All Your Voting Sessions
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sessionsToDisplay.map((session) => {
                  const status = getSessionStatus(session);
                  const StatusIcon = status.icon;
                  const votesInfo = getEffectiveVotesPerUser(session);
                  const hasVoted = votingStatus[session.id];

                  return (
                    <div
                      key={session.id}
                      className="relative z-10 bg-white overflow-hidden shadow-md rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleSelectSession(session)}
                    >
                      <div className="p-6">
                        {/* Voting Status Badge */}
                        <div className="flex justify-end items-start mb-4">
                          {hasVoted ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Voted
                            </span>
                          ) : status.text === 'Active' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs Your Vote
                            </span>
                          ) : null}
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
                            <span>{featureCounts[session.id] || 0} {featureCounts[session.id] === 1 ? 'feature' : 'features'} to vote on</span>
                          </div>
                          <div className="flex items-center">
                            <Vote className="h-4 w-4 mr-2" />
                            <span>{votesInfo.displayText}</span>
                            {votesInfo.isAuto && (
                              <div className="group relative ml-1">
                                <Info className="h-4 w-4 text-blue-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10 pointer-events-none">
                                  {votesInfo.formula}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSession(session);
                            }}
                            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg transition-colors font-medium ${
                              hasVoted
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-[#2d4660] text-white hover:bg-[#1d3a53]'
                            }`}
                          >
                            <Vote className="h-4 w-4 mr-2" />
                            {hasVoted ? 'View or Change Votes' : 'Cast Your Votes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin View Mode - Show separated sections */}
          {viewMode === 'admin' && (
            <>
              {/* Stakeholder Sessions Section */}
              {stakeholderSessionsToDisplay.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-[#2d4660] mb-4 flex items-center">
                    <Vote className="h-5 w-5 mr-2" />
                    Your Voting Sessions
                  </h2>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {stakeholderSessionsToDisplay.map((session) => {
                  const status = getSessionStatus(session);
                  const StatusIcon = status.icon;
                  const votesInfo = getEffectiveVotesPerUser(session);
                  const hasVoted = votingStatus[session.id];

                  return (
                    <div
                      key={session.id}
                      className="relative z-10 bg-white overflow-hidden shadow-md rounded-lg hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleSelectSession(session)}
                    >
                      <div className="p-6">
                        {/* Voting Status Badge */}
                        <div className="flex justify-end items-start mb-4">
                          {hasVoted ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Voted
                            </span>
                          ) : status.text === 'Active' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Needs Your Vote
                            </span>
                          ) : null}
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
                            <span>{featureCounts[session.id] || 0} {featureCounts[session.id] === 1 ? 'feature' : 'features'} to vote on</span>
                          </div>
                          <div className="flex items-center">
                            <Vote className="h-4 w-4 mr-2" />
                            <span>{votesInfo.displayText}</span>
                            {votesInfo.isAuto && (
                              <div className="group relative ml-1">
                                <Info className="h-4 w-4 text-blue-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10 pointer-events-none">
                                  {votesInfo.formula}
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSession(session);
                            }}
                            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg transition-colors font-medium ${
                              hasVoted
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-[#2d4660] text-white hover:bg-[#1d3a53]'
                            }`}
                          >
                            <Vote className="h-4 w-4 mr-2" />
                            {hasVoted ? 'View or Change Votes' : 'Cast Your Votes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admin Sessions Section */}
          {adminSessionsToDisplay.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-[#2d4660] mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Sessions You Manage
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {adminSessionsToDisplay.map((session) => {
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
            </div>
          )}
          </>
          )}
        </div>
      )}

      {/* Info Footer - Show based on view mode */}
      {viewMode === 'stakeholder' && userSessions.length > 0 && (
        <div className="relative z-10 mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Vote className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About Voting Sessions:</p>
              <p>Click on any session card to cast your votes. You can change your votes at any time before the voting period ends.</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'admin' && stakeholderSessionsToDisplay.length > 0 && adminSessionsToDisplay.length === 0 && (
        <div className="relative z-10 mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Vote className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">About Voting Sessions:</p>
              <p>Click on any session card to cast your votes. You can change your votes at any time before the voting period ends.</p>
            </div>
          </div>
        </div>
      )}

      {/* Info Footer - Only show for admins */}
      {viewMode === 'admin' && adminSessionsToDisplay.length > 0 && (
        <div className="relative z-10 mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Users className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Managing Sessions:</p>
              <p>Click "Email Invite to Stakeholders" on any session card to send invitation links. Use the Admins and Stakeholders buttons to manage access.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer with view toggle to match FeatureVotingSystem */}
      <Footer
        isAdmin={hasAdminAccess}
        viewMode={viewMode === 'admin' ? 'admin' : 'voting'}
        onToggleView={() => setViewMode(viewMode === 'admin' ? 'stakeholder' : 'admin')}
      />
    </div>
  );
}