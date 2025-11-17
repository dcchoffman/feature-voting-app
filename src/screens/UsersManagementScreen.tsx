// ============================================
// Users Management Screen
// ============================================
// Location: src/screens/UsersManagementScreen.tsx
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import type { User, VotingSession } from '../types';
import type { UserRoleInfo } from '../services/databaseService';
import { 
  ChevronLeft, Users, Crown, Shield, User as UserIcon, 
  Settings, List, LogOut, Search, X, MoreVertical, Trash2, UserX, Calendar, ChevronDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface UserWithRoles extends User {
  roles: UserRoleInfo;
  adminInSessions?: VotingSession[];
  stakeholderInSessions?: VotingSession[];
}

type RoleModalType = 'stakeholder' | 'session-admin' | 'remove-stakeholder' | null;

export default function UsersManagementScreen() {
  const { currentUser, setCurrentUser, setCurrentSession, currentSession } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // All hooks must be called before any conditional logic
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'system-admin' | 'session-admin' | 'stakeholder' | 'none'>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const hasCheckedAccess = useRef(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isSessionAdmin, setIsSessionAdmin] = useState(false);
  const [userAdminSessions, setUserAdminSessions] = useState<string[]>([]); // Session IDs the current user admins
  const [viewMode, setViewMode] = useState<'system-admin' | 'session-admin'>('system-admin');
  const [checkingAccess, setCheckingAccess] = useState(true);
  
  // Modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalType, setRoleModalType] = useState<RoleModalType>(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserWithRoles | null>(null);
  const [allSessions, setAllSessions] = useState<VotingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [userSessionMemberships, setUserSessionMemberships] = useState<{
    adminSessions: string[];
    stakeholderSessions: string[];
  }>({ adminSessions: [], stakeholderSessions: [] });
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [originalAdminId, setOriginalAdminId] = useState<string | null>(null);
  const [protectedUserIds, setProtectedUserIds] = useState<Set<string>>(new Set());
  const [duplicateEmails, setDuplicateEmails] = useState<Map<string, string[]>>(new Map()); // email -> [userId1, userId2, ...]
  
  // Add User modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    isSystemAdmin: false,
    sessionAdminIds: [] as string[],
    stakeholderSessionIds: [] as string[]
  });
  const [accordionOpen, setAccordionOpen] = useState({
    systemAdmin: false,
    sessionAdmin: false,
    stakeholder: false
  });
  const [pageTitle, setPageTitle] = useState('User Management');

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      setCurrentSession(null as any);
    } catch {}
    setCurrentUser(null);
    try {
      localStorage.removeItem('voting_system_current_session');
      localStorage.removeItem('azureDevOpsAuthInProgress');
      sessionStorage.removeItem('oauth_return_path');
      sessionStorage.removeItem('oauth_action');
    } catch {}
    setMobileMenuOpen(false);
    navigate('/login', { replace: true });
  };

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

  // Handle dropdown close when clicking outside
  useEffect(() => {
    if (!openDropdown) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const ref = dropdownRefs.current[openDropdown];
      if (ref && !ref.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside as any);
    };
  }, [openDropdown]);

  const loadSessions = async () => {
    try {
      const sessions = await db.getAllSessions();
      setAllSessions(sessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Update title when query string and session context change
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'session-admin') {
      setPageTitle('Session Admin Management');
      setFilterRole('session-admin');
    } else if (filterParam === 'stakeholder') {
      setPageTitle('Stakeholder Management');
      setFilterRole('stakeholder');
    } else {
      setPageTitle('User Management');
    }
  }, [searchParams]);

  const loadUsers = async (sessions: VotingSession[]) => {
    setIsLoading(true);
    
    // Check database schema for users table
    console.log('=== CHECKING USERS TABLE SCHEMA ===');
    try {
      const { data: sampleUser, error } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single();
      
      if (sampleUser) {
        console.log('✓ Sample user record:', sampleUser);
        console.log('✓ Available fields:', Object.keys(sampleUser));
        console.log('✓ Has created_by?', 'created_by' in sampleUser);
        console.log('✓ Has created_by_name?', 'created_by_name' in sampleUser);
        console.log('✓ Has created_by_user_id?', 'created_by_user_id' in sampleUser);
      } else {
        console.log('✗ No users found or error:', error);
      }
    } catch (err) {
      console.log('✗ Error checking schema:', err);
    }
    console.log('=== END SCHEMA CHECK ===\n');
    
    try {
      const allUsers = await db.getAllUsers();
      
      // Pre-load all stakeholders for all sessions (reduces calls from N*M to M)
      const sessionStakeholdersMap = new Map<string, any[]>();
      await Promise.all(
        sessions.map(async (session) => {
          try {
            const stakeholders = await db.getSessionStakeholders(session.id);
            sessionStakeholdersMap.set(session.id, stakeholders);
          } catch (err) {
            console.error(`Error loading stakeholders for session ${session.id}:`, err);
            sessionStakeholdersMap.set(session.id, []);
          }
        })
      );
      
      // Now process users with pre-loaded stakeholder data
      const usersWithRoles = await Promise.all(
        allUsers.map(async (user) => {
          const roles = await db.getUserRoleInfo(user.id);
          
          // Check sessions - NEW APPROACH: Query session_admins table directly
          const adminInSessions: VotingSession[] = [];
          const stakeholderInSessions: VotingSession[] = [];
          
          // If user has admin sessions, get them directly from the database
          if (roles.sessionAdminCount > 0) {
            try {
              // Query the session_admins table to get session IDs where this user is admin
              const { data: adminRelations, error } = await supabase
                .from('session_admins')
                .select('session_id')
                .eq('user_id', user.id);
              
              if (error) {
                console.error('Error fetching admin sessions:', error);
              } else if (adminRelations) {
                // Match session IDs to actual session objects
                const adminSessionIds = adminRelations.map(r => r.session_id);
                adminInSessions.push(...sessions.filter(s => adminSessionIds.includes(s.id)));
              }
            } catch (err) {
              console.error('Error querying session_admins:', err);
            }
          }
          
          // Check stakeholder status from pre-loaded data
          for (const session of sessions) {
            const stakeholders = sessionStakeholdersMap.get(session.id) || [];
            const isStakeholder = stakeholders.some((s: any) => {
              const emailMatch = s.user_email && user.email && 
                s.user_email.toLowerCase() === user.email.toLowerCase();
              const idMatch = (s.user_id === user.id) || (s.id === user.id);
              return emailMatch || idMatch;
            });
            
            if (isStakeholder) {
              stakeholderInSessions.push(session);
            }
          }
          
          return { ...user, roles, adminInSessions, stakeholderInSessions };
        })
      );
      
      setUsers(usersWithRoles);
      
      // Detect duplicate emails
      const emailMap = new Map<string, string[]>();
      usersWithRoles.forEach(user => {
        const normalizedEmail = user.email.toLowerCase().trim();
        if (!emailMap.has(normalizedEmail)) {
          emailMap.set(normalizedEmail, []);
        }
        emailMap.get(normalizedEmail)!.push(user.id);
      });
      
      // Filter to only emails with duplicates
      const duplicates = new Map<string, string[]>();
      emailMap.forEach((userIds, email) => {
        if (userIds.length > 1) {
          duplicates.set(email, userIds);
        }
      });
      
      setDuplicateEmails(duplicates);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAccess = async () => {
    if (!currentUser) return;
    
    setCheckingAccess(true);
    try {
      const sysAdmin = await db.isUserSystemAdmin(currentUser.id);
      setIsSystemAdmin(sysAdmin);
      
      // Get all sessions first
      const allSessionsCheck = await db.getAllSessions();
      
      // Check if user is a session admin
      let sessionAdminSessions: string[] = [];
      if (!sysAdmin) {
        // Check which sessions the user admins
        const adminChecks = await Promise.all(
          allSessionsCheck.map(session => 
            db.isUserSessionAdmin(session.id, currentUser.id)
          )
        );
        
        allSessionsCheck.forEach((session, index) => {
          if (adminChecks[index]) {
            sessionAdminSessions.push(session.id);
          }
        });
        
        const hasSessionAdminAccess = sessionAdminSessions.length > 0;
        setIsSessionAdmin(hasSessionAdminAccess);
        setUserAdminSessions(sessionAdminSessions);
        
        if (!hasSessionAdminAccess) {
          // Not a system admin or session admin, redirect to sessions
          navigate('/sessions');
          return;
        }
        
        // Session admin: only show sessions they admin
        const filteredSessions = allSessionsCheck.filter(s => sessionAdminSessions.includes(s.id));
        setAllSessions(filteredSessions);
        setViewMode('session-admin');
        
        // Load users for session admin (only users in their sessions)
        await loadUsers(filteredSessions);
      } else {
        // System admin: show all sessions
        setAllSessions(allSessionsCheck);
        // Load original admin ID
        await loadOriginalAdminId();
        // Load all users
        await loadUsers(allSessionsCheck);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/sessions');
    } finally {
      setCheckingAccess(false);
    }
  };

  const loadOriginalAdminId = async () => {
    try {
      const protectedEmails = [
        'chris.rodes@newmill.com',     // Manager
        'spencer.faull@newmill.com'    // Portfolio Owner
      ];
      
      const protectedIds = new Set<string>();
      
      // Get the original admin (first system admin by created_at)
      const systemAdmins = await db.getSystemAdmins();
      if (systemAdmins.length > 0) {
        const firstAdmin = systemAdmins.reduce((earliest, admin) => 
          new Date(admin.created_at) < new Date(earliest.created_at) ? admin : earliest
        );
        setOriginalAdminId(firstAdmin.user_id);
        protectedIds.add(firstAdmin.user_id);
      }
      
      // Get all users to find protected accounts by email
      const allUsers = await db.getAllUsers();
      allUsers.forEach(user => {
        if (protectedEmails.includes(user.email.toLowerCase())) {
          protectedIds.add(user.id);
        }
      });
      
      setProtectedUserIds(protectedIds);
    } catch (error) {
      console.error('Error loading protected accounts:', error);
    }
  };

  const getProtectedAccountLabel = (user: UserWithRoles): string | null => {
    if (user.id === originalAdminId) {
      return 'Original Admin';
    }
    
    const email = user.email.toLowerCase();
    if (email === 'chris.rodes@newmill.com') {
      return 'Manager';
    }
    if (email === 'spencer.faull@newmill.com') {
      return 'Portfolio Owner';
    }
    
    return null;
  };

  const isDuplicateAccount = (user: UserWithRoles): boolean => {
    const normalizedEmail = user.email.toLowerCase().trim();
    const duplicateGroup = duplicateEmails.get(normalizedEmail);
    return duplicateGroup ? duplicateGroup.length > 1 : false;
  };

  const getDuplicateCount = (user: UserWithRoles): number => {
    const normalizedEmail = user.email.toLowerCase().trim();
    const duplicateGroup = duplicateEmails.get(normalizedEmail);
    return duplicateGroup ? duplicateGroup.length : 1;
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Restrict visibility based on current view mode
    if (viewMode === 'session-admin' && allSessions.length > 0) {
      const managedSessionIds = new Set(allSessions.map((session) => session.id));
      filtered = filtered.filter((user) => {
        if (user.id === currentUser?.id) {
          return true;
        }

        const adminMatch = user.adminInSessions?.some((session) => session && managedSessionIds.has(session.id));
        const stakeholderMatch = user.stakeholderInSessions?.some((session) => session && managedSessionIds.has(session.id));

        return !!adminMatch || !!stakeholderMatch;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => {
        switch (filterRole) {
          case 'system-admin':
            return user.roles.isSystemAdmin;
          case 'session-admin':
            return user.roles.sessionAdminCount > 0 && !user.roles.isSystemAdmin;
          case 'stakeholder':
            return user.roles.stakeholderSessionCount > 0 && 
                   user.roles.sessionAdminCount === 0 && 
                   !user.roles.isSystemAdmin;
          case 'none':
            return !user.roles.isSystemAdmin &&
                   user.roles.sessionAdminCount === 0 &&
                   user.roles.stakeholderSessionCount === 0;
          default:
            return true;
        }
      });
    }

    setFilteredUsers(filtered);
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Prevent duplicate calls in React StrictMode
    if (hasCheckedAccess.current) {
      return;
    }
    hasCheckedAccess.current = true;
    
    checkAccess();
    
    // Cleanup function
    return () => {
      // Cleanup if needed
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);
  
  // Separate useEffect to handle URL filter parameter
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam && ['system-admin', 'session-admin', 'stakeholder', 'none'].includes(filterParam)) {
      setFilterRole(filterParam as any);
    }
  }, [searchParams]);

  // Ensure session-admin mode never exposes system-admin filter
  useEffect(() => {
    if (viewMode === 'session-admin') {
      if (filterRole === 'all' || filterRole === 'system-admin') {
        setFilterRole('session-admin');
      }
    }
  }, [viewMode, filterRole]);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filterRole, viewMode, allSessions, currentUser]);

  const loadUserSessionMemberships = async (userId: string) => {
    try {
      // Get all sessions where user is admin
      const adminSessions: string[] = [];
      const stakeholderSessions: string[] = [];
      
      for (const session of allSessions) {
        const isAdmin = await db.isUserSessionAdmin(userId, session.id);
        if (isAdmin) {
          adminSessions.push(session.id);
        }
        
        const isStakeholder = await db.isUserStakeholder(userId, session.id);
        if (isStakeholder) {
          stakeholderSessions.push(session.id);
        }
      }
      
      setUserSessionMemberships({ adminSessions, stakeholderSessions });
    } catch (error) {
      console.error('Error loading user session memberships:', error);
    }
  };

  const openRoleModal = async (user: UserWithRoles, roleType: RoleModalType) => {
    setSelectedUserForRole(user);
    setRoleModalType(roleType);
    setSelectedSessionId('');
    setShowRoleModal(true);
    setOpenDropdown(null);
    
    await loadUserSessionMemberships(user.id);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setRoleModalType(null);
    setSelectedUserForRole(null);
    setSelectedSessionId('');
    setUserSessionMemberships({ adminSessions: [], stakeholderSessions: [] });
  };

  const handleAddToSession = async () => {
    if (!selectedUserForRole || !selectedSessionId || !roleModalType) return;

    try {
      if (roleModalType === 'session-admin') {
        await db.addSessionAdmin(selectedSessionId, selectedUserForRole.id);
      } else if (roleModalType === 'stakeholder') {
        // Use addSessionStakeholderByEmail which handles the stakeholder creation
        await db.addSessionStakeholderByEmail(selectedSessionId, selectedUserForRole.email, selectedUserForRole.name);
      } else if (roleModalType === 'remove-stakeholder') {
        // Remove stakeholder using email
        await db.removeSessionStakeholder(selectedSessionId, selectedUserForRole.email);
      }
      
      // Close modal first
      closeRoleModal();
      
      // Reload users to refresh session memberships and show updated data
      await loadUsers(allSessions);
    } catch (error: any) {
      console.error('Error modifying user session role:', error);
      // Show more detailed error message
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Full error details:', error);
      alert(`Failed to ${roleModalType === 'remove-stakeholder' ? 'remove stakeholder from' : 'add user to'} session.\n\nError: ${errorMessage}\n\nPlease check the console for more details.`);
    }
  };

  const handleToggleSystemAdmin = async (userId: string, currentStatus: boolean) => {
    setOpenDropdown(null);
    
    if (!confirm(`Are you sure you want to ${currentStatus ? 'remove' : 'grant'} system admin access for this user?`)) {
      return;
    }

    try {
      if (currentStatus) {
        await db.removeSystemAdmin(userId);
      } else {
        await db.addSystemAdmin(userId);
      }
      await loadUsers(allSessions);
    } catch (error) {
      console.error('Error toggling system admin:', error);
      alert('Failed to update system admin status. Please try again.');
    }
  };

  const handleRemoveAllRoles = async (userId: string, userName: string) => {
    setOpenDropdown(null);
    
    const confirmMessage = viewMode === 'session-admin'
      ? `Are you sure you want to remove ${userName} from all sessions you manage? This will remove them as a stakeholder or session admin from your sessions only.`
      : `Are you sure you want to remove all roles from ${userName}? This will remove them from all sessions and revoke system admin access.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Only remove system admin in system-admin mode
      if (viewMode === 'system-admin') {
        await db.removeSystemAdmin(userId);
      }
      
      // For session-admin mode, only remove from sessions they manage
      if (viewMode === 'session-admin') {
        // Remove as session admin from user's sessions
        for (const sessionId of userAdminSessions) {
          try {
            await db.removeSessionAdmin(sessionId, userId);
          } catch (error) {
            console.error(`Error removing session admin from ${sessionId}:`, error);
          }
        }
        // Remove as stakeholder from user's sessions
        for (const sessionId of userAdminSessions) {
          try {
            await db.removeStakeholder(sessionId, userId);
          } catch (error) {
            console.error(`Error removing stakeholder from ${sessionId}:`, error);
          }
        }
      } else {
        // Remove from all sessions (system-admin mode)
        for (const session of allSessions) {
          try {
            await db.removeSessionAdmin(session.id, userId);
            await db.removeStakeholder(session.id, userId);
          } catch (err) {
            // Continue even if removal fails (they might not be in that session)
          }
        }
      }
      
      await loadUsers(allSessions);
    } catch (error) {
      console.error('Error removing roles:', error);
      alert('Failed to remove roles. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // In session-admin mode, remove as stakeholder instead of deleting
    if (viewMode === 'session-admin') {
      // Check if user has any stakeholder roles (they might be a stakeholder in sessions we manage)
      if (user.roles.stakeholderSessionCount === 0) {
        alert('This user is not a stakeholder in any sessions.');
        return;
      }
      
      // Remove as stakeholder from all sessions the Session Admin manages
      // (Assume Session Admin manages all sessions shown in session-admin view mode)
      const confirmMessage = `Are you sure you want to remove ${userName} as a stakeholder from all sessions you manage?`;
      if (!confirm(confirmMessage)) {
        return;
      }
      
      try {
        let removedCount = 0;
        for (const session of allSessions) {
          try {
            await db.removeSessionStakeholder(session.id, user.email);
            removedCount++;
          } catch (err) {
            // Continue even if removal fails (they might not be in that session)
            console.error(`Error removing stakeholder from session ${session.id}:`, err);
          }
        }
        await loadUsers(allSessions);
        if (removedCount > 0) {
          alert(`${userName} has been removed as a stakeholder from ${removedCount} session(s) you manage.`);
        } else {
          alert(`${userName} was not a stakeholder in any of the sessions you manage.`);
        }
      } catch (error) {
        console.error('Error removing stakeholder:', error);
        alert('Failed to remove stakeholder. Please try again.');
      }
      return;
    }
    
    // System admin mode: show delete modal
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    // Check if this is a protected account
    if (protectedUserIds.has(userToDelete.id)) {
      const label = getProtectedAccountLabel(userToDelete);
      alert(`Cannot delete this protected account${label ? ` (${label})` : ''}. This protects against accidentally locking important users out of the system.`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      return;
    }
    
    setIsDeleting(true);
    try {
      // Remove from all sessions first
      for (const session of allSessions) {
        try {
          await db.removeSessionAdmin(session.id, userToDelete.id);
          await db.removeStakeholder(session.id, userToDelete.id);
        } catch (err) {
          // Continue even if removal fails
        }
      }
      
      // Remove system admin role if applicable
      if (userToDelete.roles.isSystemAdmin) {
        try {
          await db.removeSystemAdmin(userToDelete.id);
        } catch (err) {
          console.error('Error removing system admin role:', err);
        }
      }
      
      // Delete the user record from the users table
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);
      
      if (deleteError) throw deleteError;
      
      // Note: The actual auth user deletion would need to be done server-side with admin privileges
      // For now, we're just removing them from the database and all roles
      // They won't be able to access anything even if they can still log in
      
      // Reload users
      await loadUsers(allSessions);
      
      // Close modal
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const openAddUserModal = () => {
    setNewUserData({
      name: '',
      email: '',
      password: generatePassword(),
      isSystemAdmin: false,
      sessionAdminIds: [],
      stakeholderSessionIds: []
    });
    setShowAddUserModal(true);
  };

  const closeAddUserModal = () => {
    setShowAddUserModal(false);
    setNewUserData({
      name: '',
      email: '',
      password: '',
      isSystemAdmin: false,
      sessionAdminIds: [],
      stakeholderSessionIds: []
    });
    setAccordionOpen({
      systemAdmin: false,
      sessionAdmin: false,
      stakeholder: false
    });
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleAddUser = async () => {
    if (!newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password.trim()) {
      alert('Please fill in all required fields (Name, Email, Password)');
      return;
    }

    setIsAddingUser(true);
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
        options: {
          data: {
            name: newUserData.name
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed');

      const newUserId = authData.user.id;

      // Insert into users table with creator info
      const { error: dbError } = await supabase
        .from('users')
        .insert({
          id: newUserId,
          name: newUserData.name,
          email: newUserData.email,
          created_by: currentUser?.id,
          created_by_name: currentUser?.name
        });

      if (dbError) throw dbError;

      // Add system admin role if selected (only in system-admin mode)
      if (viewMode === 'system-admin' && newUserData.isSystemAdmin) {
        await db.addSystemAdmin(newUserId);
      }

      // Add session admin roles (only in system-admin mode)
      if (viewMode === 'system-admin') {
        for (const sessionId of newUserData.sessionAdminIds) {
          try {
            await db.addSessionAdmin(sessionId, newUserId);
          } catch (err) {
            console.error('Error adding session admin role:', err);
          }
        }
      }

      // Add stakeholder roles (both modes, but session-admin mode only adds to their sessions)
      console.log('Adding stakeholder to sessions:', newUserData.stakeholderSessionIds);
      console.log('View mode:', viewMode);
      console.log('User admin sessions:', userAdminSessions);
      console.log('All sessions:', allSessions.map(s => ({ id: s.id, title: s.title })));
      
      if (newUserData.stakeholderSessionIds.length === 0) {
        console.log('No stakeholder sessions selected');
      } else {
        for (const sessionId of newUserData.stakeholderSessionIds) {
          // In session-admin mode, ensure we only add to sessions they manage
          // Note: In session-admin mode, allSessions already contains only their sessions
          if (viewMode === 'session-admin') {
            // Verify the session is in allSessions (which should already be filtered)
            const sessionExists = allSessions.some(s => s.id === sessionId);
            if (!sessionExists) {
              console.warn(`Skipping session ${sessionId} - not in managed sessions`);
              continue; // Skip sessions they don't admin
            }
          }
          
          try {
            console.log(`Adding ${newUserData.email} as stakeholder to session ${sessionId}`);
            const result = await db.addSessionStakeholderByEmail(sessionId, newUserData.email, newUserData.name);
            console.log(`Successfully added stakeholder to session ${sessionId}:`, result);
          } catch (err: any) {
            console.error(`Error adding stakeholder role to session ${sessionId}:`, err);
            // Show error message
            const errorMsg = err?.message || err?.toString() || 'Unknown error';
            alert(`Warning: Failed to add ${newUserData.email} to session ${sessionId}.\n\nError: ${errorMsg}`);
          }
        }
        
        console.log('Finished adding stakeholder roles');
      }

      // Close modal first (before reload to avoid UI delay)
      closeAddUserModal();

      // Reload users to show new user with their roles
      await loadUsers(allSessions);

      // Show success message
      alert(`User created successfully!\n\nEmail: ${newUserData.email}\nTemporary Password: ${newUserData.password}\n\nPlease save this password and share it with the user securely.`);
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(`Failed to create user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAddingUser(false);
    }
  };

  const toggleSessionAdmin = (sessionId: string) => {
    setNewUserData(prev => ({
      ...prev,
      sessionAdminIds: prev.sessionAdminIds.includes(sessionId)
        ? prev.sessionAdminIds.filter(id => id !== sessionId)
        : [...prev.sessionAdminIds, sessionId]
    }));
  };

  const toggleStakeholder = (sessionId: string) => {
    setNewUserData(prev => ({
      ...prev,
      stakeholderSessionIds: prev.stakeholderSessionIds.includes(sessionId)
        ? prev.stakeholderSessionIds.filter(id => id !== sessionId)
        : [...prev.stakeholderSessionIds, sessionId]
    }));
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getRoleBadge = (user: UserWithRoles) => {
    if (user.roles.isSystemAdmin) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Crown className="h-3 w-3 mr-1" />
          System Admin
        </span>
      );
    } else if (user.roles.sessionAdminCount > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#173B65] text-white">
          <Shield className="h-3 w-3 mr-1" />
          Session Admin ({user.roles.sessionAdminCount})
        </span>
      );
    } else if (user.roles.stakeholderSessionCount > 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <UserIcon className="h-3 w-3 mr-1" />
          Stakeholder ({user.roles.stakeholderSessionCount})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          No Role
        </span>
      );
    }
  };

  const getAvailableSessions = (roleType: RoleModalType) => {
    if (!roleType) return [];
    
    if (roleType === 'session-admin') {
      return allSessions.filter(s => !userSessionMemberships.adminSessions.includes(s.id));
    } else if (roleType === 'remove-stakeholder') {
      // For removing stakeholders: show sessions where user IS a stakeholder AND session admin manages
      return allSessions.filter(s => 
        userSessionMemberships.stakeholderSessions.includes(s.id) &&
        (viewMode === 'system-admin' || userAdminSessions.includes(s.id))
      );
    } else {
      // For adding stakeholders: show sessions where user is NOT already a stakeholder
      return allSessions.filter(s => !userSessionMemberships.stakeholderSessions.includes(s.id));
    }
  };

  const canAddToMoreSessions = (user: UserWithRoles, roleType: RoleModalType) => {
    if (!roleType) return false;
    
    if (roleType === 'session-admin') {
      return user.roles.sessionAdminCount < allSessions.length;
    } else {
      return user.roles.stakeholderSessionCount < allSessions.length;
    }
  };

  if (checkingAccess || isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">{checkingAccess ? 'Checking access...' : 'Loading users...'}</p>
        </div>
      </div>
    );
  }

  if (!isSystemAdmin) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Desktop: Centered logo at top */}
        <div className="hidden md:flex md:justify-center mb-2">
          <img
            src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
            alt="New Millennium Building Systems Logo"
            className="-mt-4"
            style={{ height: '96px', width: 'auto' }}
          />
        </div>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div className="flex items-center flex-1 min-w-0">
            {/* Mobile: small logo */}
            <img
              src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
              alt="New Millennium Building Systems Logo"
              className="mr-3 md:hidden flex-shrink-0"
              style={{ width: '36px', height: '36px' }}
            />
            <button 
              onClick={() => {
                // Check if user has a current session (likely came from AdminDashboard)
                if (currentSession?.id) {
                  navigate('/admin');
                } else {
                  navigate('/sessions');
                }
              }}
              className="mr-2 p-1 rounded-full hover:bg-gray-200 cursor-pointer flex-shrink-0"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-xl md:text-3xl font-bold text-[#2d4660] truncate">{pageTitle}</h1>
          </div>
          
          <div ref={mobileMenuRef} className="relative z-40 flex-shrink-0 ml-2">
            {/* Desktop buttons */}
            <div className="hidden md:flex space-x-2">
              {(isSystemAdmin || isSessionAdmin) && (
                <button
                  onClick={openAddUserModal}
                  className="flex items-center px-4 py-2 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {viewMode === 'session-admin' ? 'Add Stakeholder' : 'Add User'}
                </button>
              )}
              {(isSystemAdmin || isSessionAdmin) && currentSession && (
                <button
                  onClick={() => navigate('/admin')}
                  className="flex items-center px-4 py-2 bg-[#1E5461] text-white rounded-lg hover:bg-[#145668] transition-colors"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={() => navigate('/sessions')}
                className="flex items-center px-4 py-2 bg-[#4f6d8e] text-white rounded-lg hover:bg-[#3d5670] transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                My Sessions
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>

            {/* Mobile menu trigger */}
            <div className="flex md:hidden">
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
                {(isSystemAdmin || isSessionAdmin) && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); openAddUserModal(); }}
                    className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
                  >
                    <Users className="h-5 w-5 mr-3 text-green-600" />
                    <span className="text-base">{viewMode === 'session-admin' ? 'Add Stakeholder' : 'Add User'}</span>
                  </button>
                )}
                {(isSystemAdmin || isSessionAdmin) && currentSession && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/admin'); }}
                    className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
                  >
                    <Shield className="h-5 w-5 mr-3 text-[#1E5461]" />
                    <span className="text-base">Admin Dashboard</span>
                  </button>
                )}
                  <button
                    onClick={() => { setMobileMenuOpen(false); navigate('/sessions'); }}
                    className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
                  >
                    <Settings className="h-5 w-5 mr-3 text-gray-700" />
                    <span className="text-base">My Sessions</span>
                  </button>
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="w-full px-4 py-3 flex items-center text-left hover:bg-gray-50"
                  >
                    <LogOut className="h-5 w-5 mr-3 text-gray-700" />
                    <span className="text-base">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="relative z-10 bg-white rounded-lg shadow-md p-3 md:p-4 mb-4 md:mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4660] focus:border-transparent text-base"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <select
              value={filterRole === 'system-admin' && viewMode === 'session-admin' ? 'session-admin' : filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="px-4 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4660] focus:border-transparent text-base"
            >
              {viewMode !== 'session-admin' && <option value="all">All Roles</option>}
              {viewMode !== 'session-admin' && <option value="system-admin">System Admin</option>}
              <option value="session-admin">Session Admin</option>
              <option value="stakeholder">Stakeholder</option>
              <option value="none">No Role</option>
            </select>
          </div>
        </div>

        {/* Mobile: Card View */}
        <div className="md:hidden space-y-3 relative z-10">
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              {searchQuery || filterRole !== 'all' 
                ? 'No users found matching your filters.' 
                : 'No users found.'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                        {user.name}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-[#c59f2d] font-semibold">
                            (You)
                          </span>
                        )}
                        {getProtectedAccountLabel(user) && (
                          <span className="ml-2 text-xs text-[#c59f2d] font-semibold">
                            ({getProtectedAccountLabel(user)})
                          </span>
                        )}
                        {isDuplicateAccount(user) && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                            Duplicate ({getDuplicateCount(user)})
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(viewMode === 'system-admin' || 
                        (viewMode === 'session-admin' && user.roles.stakeholderSessionCount > 0 && 
                         user.stakeholderInSessions?.some(session => allSessions.some(s => s.id === session.id)))) && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className={`p-2 rounded-md hover:bg-red-50 transition-colors ${
                            user.id === currentUser?.id || (viewMode === 'system-admin' && protectedUserIds.has(user.id)) 
                              ? 'opacity-50 cursor-not-allowed' 
                              : ''
                          }`}
                          disabled={user.id === currentUser?.id || (viewMode === 'system-admin' && protectedUserIds.has(user.id))}
                          title={
                            viewMode === 'session-admin'
                              ? 'Remove stakeholder from all your sessions'
                              : protectedUserIds.has(user.id)
                              ? `Cannot delete protected account${getProtectedAccountLabel(user) ? ` (${getProtectedAccountLabel(user)})` : ''}`
                              : user.id === currentUser?.id 
                              ? 'Cannot delete your own account' 
                              : 'Delete user'
                          }
                        >
                          <Trash2 className="h-5 w-5 text-red-600" />
                        </button>
                      )}
                      <div 
                        className="relative"
                        ref={(el) => { dropdownRefs.current[user.id] = el; }}
                      >
                        <button
                          onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                          className={`p-2 rounded-md hover:bg-gray-100 transition-colors ${
                            user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={user.id === currentUser?.id}
                          title={user.id === currentUser?.id ? 'Cannot modify your own permissions' : 'Change user role'}
                        >
                          <MoreVertical className="h-5 w-5 text-gray-600" />
                        </button>
                        
                        {openDropdown === user.id && user.id !== currentUser?.id && (
                          <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <div className="py-1">
                              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                Change User Role
                              </div>
                              
                              {/* System Admin option - only in system-admin mode */}
                              {viewMode === 'system-admin' && (
                                <>
                                  {user.roles.isSystemAdmin ? (
                                    <button
                                      onClick={() => handleToggleSystemAdmin(user.id, true)}
                                      className="w-full px-4 py-3 text-left flex items-center hover:bg-red-50 text-red-700"
                                    >
                                      <Crown className="h-5 w-5 mr-3 flex-shrink-0" />
                                      <div>
                                        <div className="font-medium text-base">Remove System Admin</div>
                                        <div className="text-xs text-gray-500">Revoke global admin access</div>
                                      </div>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleToggleSystemAdmin(user.id, false)}
                                      className="w-full px-4 py-3 text-left flex items-center hover:bg-purple-50 text-purple-700"
                                    >
                                      <Crown className="h-5 w-5 mr-3 flex-shrink-0" />
                                      <div>
                                        <div className="font-medium text-base">Make System Admin</div>
                                        <div className="text-xs text-gray-500">Grant global admin access</div>
                                      </div>
                                    </button>
                                  )}

                                  {/* Session Admin option - only show if not in all sessions */}
                                  {canAddToMoreSessions(user, 'session-admin') && (
                                    <button
                                      onClick={() => openRoleModal(user, 'session-admin')}
                                      className="w-full px-4 py-3 text-left flex items-center hover:bg-[#E8EDF2] text-[#2D4660] border-t border-gray-200"
                                    >
                                      <Shield className="h-5 w-5 mr-3 flex-shrink-0" />
                                      <div>
                                        <div className="font-medium text-base">Make Session Admin</div>
                                        <div className="text-xs text-gray-500">Add to a session as admin</div>
                                      </div>
                                    </button>
                                  )}
                                </>
                              )}

                              {/* Stakeholder option - only show if not in all sessions */}
                              {canAddToMoreSessions(user, 'stakeholder') && (
                                <button
                                  onClick={() => openRoleModal(user, 'stakeholder')}
                                  className="w-full px-4 py-3 text-left flex items-center hover:bg-green-50 text-green-700 border-t border-gray-200"
                                >
                                  <UserIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                                  <div>
                                    <div className="font-medium text-base">Make Stakeholder</div>
                                    <div className="text-xs text-gray-500">Add to a session as stakeholder</div>
                                  </div>
                                </button>
                              )}

                              {/* Remove Stakeholder option - For Session Admins only */}
                              {viewMode === 'session-admin' && user.stakeholderInSessions && user.stakeholderInSessions.length > 0 && 
                               user.stakeholderInSessions.some(session => userAdminSessions.includes(session.id)) && (
                                <button
                                  onClick={() => openRoleModal(user, 'remove-stakeholder')}
                                  className="w-full px-4 py-3 text-left flex items-center hover:bg-red-50 text-red-700 border-t border-gray-200"
                                >
                                  <UserX className="h-5 w-5 mr-3 flex-shrink-0" />
                                  <div>
                                    <div className="font-medium text-base">Remove Stakeholder</div>
                                    <div className="text-xs text-gray-500">Remove from a session you manage</div>
                                  </div>
                                </button>
                              )}

                              {/* Remove all roles option */}
                              {(user.roles.isSystemAdmin || user.roles.sessionAdminCount > 0 || user.roles.stakeholderSessionCount > 0) && (
                                <button
                                  onClick={() => handleRemoveAllRoles(user.id, user.name)}
                                  className="w-full px-4 py-3 text-left flex items-center hover:bg-gray-50 text-gray-700 border-t border-gray-200"
                                >
                                  <UserX className="h-5 w-5 mr-3 flex-shrink-0" />
                                  <div>
                                    <div className="font-medium text-base">Remove All Roles</div>
                                    <div className="text-xs text-gray-500">Remove from all sessions</div>
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    {getRoleBadge(user)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Sessions */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Sessions</div>
                    <div className="space-y-1">
                      {user.roles.sessionAdminCount > 0 && (
                        <div 
                          className="flex items-center text-sm cursor-help"
                          title={user.adminInSessions && user.adminInSessions.length > 0 
                            ? `Admin in: ${user.adminInSessions.map(s => s.title || s.name || 'Unnamed Session').join(', ')}` 
                            : 'Loading session details...'}
                        >
                          <Shield className="h-4 w-4 mr-2 text-[#2D4660] flex-shrink-0" />
                          <span className="text-gray-700">{user.roles.sessionAdminCount} as Admin</span>
                        </div>
                      )}
                      {user.roles.stakeholderSessionCount > 0 && (
                        <div 
                          className="flex items-center text-sm cursor-help"
                          title={user.stakeholderInSessions && user.stakeholderInSessions.length > 0 
                            ? `Stakeholder in: ${user.stakeholderInSessions.map(s => s.title || s.name || 'Unnamed Session').join(', ')}` 
                            : 'Loading session details...'}
                        >
                          <UserIcon className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{user.roles.stakeholderSessionCount} as Stakeholder</span>
                        </div>
                      )}
                      {user.roles.sessionAdminCount === 0 && user.roles.stakeholderSessionCount === 0 && (
                        <span className="text-sm text-gray-400">No session roles</span>
                      )}
                    </div>
                  </div>

                  {/* Created Date */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Created</div>
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      {user.created_at ? formatDate(user.created_at) : 'N/A'}
                    </div>
                  </div>

                  {/* Created By */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Created By</div>
                    <div className="flex items-center text-sm text-gray-700">
                      <UserIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      {user.created_by_name || 'System'}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden md:block relative z-10 bg-white rounded-lg shadow-md overflow-visible">
            <table className="min-w-full divide-y divide-gray-200 rounded-t-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery || filterRole !== 'all' 
                        ? 'No users found matching your filters.' 
                        : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-gray-50"
                      onMouseEnter={() => setHoveredRow(user.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-xs text-[#c59f2d] font-semibold">
                                (You)
                              </span>
                            )}
                            {getProtectedAccountLabel(user) && (
                              <span className="ml-2 text-xs text-[#c59f2d] font-semibold">
                                ({getProtectedAccountLabel(user)})
                              </span>
                            )}
                            {isDuplicateAccount(user) && (
                              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                Duplicate ({getDuplicateCount(user)})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="space-y-2">
                          {user.roles.sessionAdminCount === 0 && user.roles.stakeholderSessionCount === 0 && (
                            <span className="text-gray-400">None</span>
                          )}
                          
                          {user.adminInSessions && user.adminInSessions.length > 0 && (
                            <div>
                              <div className="flex items-center text-sm font-medium text-gray-700 mb-1.5">
                                <Shield className="h-4 w-4 mr-1.5 text-[#173B65]" />
                                Admin in {user.adminInSessions.length} session{user.adminInSessions.length !== 1 ? 's' : ''}:
                              </div>
                              <div className="space-y-1.5 ml-5">
                                {user.adminInSessions.map(session => (
                                  <div key={session.id} className="flex items-start">
                                    <div className="text-xs text-gray-600">
                                      <div className="font-medium text-gray-900">{session.title || session.name || 'Unnamed Session'}</div>
                                      {session.created_at && (
                                        <div className="flex items-center text-gray-500 mt-0.5">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          {new Date(session.created_at).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric', 
                                            year: 'numeric' 
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {user.stakeholderInSessions && user.stakeholderInSessions.length > 0 && (
                            <div className={user.adminInSessions && user.adminInSessions.length > 0 ? 'pt-2 border-t border-gray-100' : ''}>
                              <div className="flex items-center text-sm font-medium text-gray-700 mb-1.5">
                                <UserIcon className="h-4 w-4 mr-1.5 text-green-600" />
                                Stakeholder in {user.stakeholderInSessions.length} session{user.stakeholderInSessions.length !== 1 ? 's' : ''}:
                              </div>
                              <div className="space-y-1.5 ml-5">
                                {user.stakeholderInSessions.map(session => (
                                  <div key={session.id} className="flex items-start">
                                    <div className="text-xs text-gray-600">
                                      <div className="font-medium text-gray-900">{session.title || session.name || 'Unnamed Session'}</div>
                                      {session.created_at && (
                                        <div className="flex items-center text-gray-500 mt-0.5">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          {new Date(session.created_at).toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric', 
                                            year: 'numeric' 
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>
                          <div className="flex items-center text-gray-700">
                            <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                            {user.created_at ? formatDate(user.created_at) : 'N/A'}
                          </div>
                          <div className="flex items-center text-gray-500 text-xs mt-1">
                            <UserIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                            {user.created_by_name || 'System'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {(viewMode === 'system-admin' || 
                            (viewMode === 'session-admin' && user.roles.stakeholderSessionCount > 0 && 
                             user.stakeholderInSessions?.some(session => allSessions.some(s => s.id === session.id)))) && (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className={`p-2 rounded-md hover:bg-red-50 transition-all md:transition-opacity ${
                                user.id === currentUser?.id || (viewMode === 'system-admin' && protectedUserIds.has(user.id))
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : hoveredRow === user.id 
                                    ? 'opacity-100 visible' 
                                    : 'md:opacity-0 md:invisible opacity-100 visible'
                              }`}
                              disabled={user.id === currentUser?.id || (viewMode === 'system-admin' && protectedUserIds.has(user.id))}
                              title={
                                viewMode === 'session-admin'
                                  ? 'Remove stakeholder from all your sessions'
                                  : protectedUserIds.has(user.id)
                                  ? `Cannot delete protected account${getProtectedAccountLabel(user) ? ` (${getProtectedAccountLabel(user)})` : ''}`
                                  : user.id === currentUser?.id 
                                  ? 'Cannot delete your own account' 
                                  : 'Delete user'
                              }
                            >
                              <Trash2 className="h-5 w-5 text-red-600" />
                            </button>
                          )}

                          <div 
                            className={`relative inline-block transition-all md:transition-opacity ${
                              user.id === currentUser?.id 
                                ? 'opacity-50' 
                                : hoveredRow === user.id 
                                  ? 'opacity-100 visible' 
                                  : 'md:opacity-0 md:invisible opacity-100 visible'
                            }`}
                            ref={(el) => { dropdownRefs.current[user.id] = el; }}
                          >
                            <button
                              onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                              className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                              disabled={user.id === currentUser?.id}
                              title={user.id === currentUser?.id ? 'Cannot modify your own permissions' : 'Change user role'}
                            >
                              <MoreVertical className="h-5 w-5 text-gray-600" />
                            </button>
                            
                            {openDropdown === user.id && user.id !== currentUser?.id && (
                              <div className="fixed mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[100]" 
                                style={{
                                  top: dropdownRefs.current[user.id]?.getBoundingClientRect().bottom ?? 0,
                                  right: window.innerWidth - (dropdownRefs.current[user.id]?.getBoundingClientRect().right ?? 0)
                                }}
                              >
                                <div className="py-1">
                                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                    Change User Role
                                  </div>
                                  
                                  {viewMode === 'system-admin' && (
                                    <>
                                      {user.roles.isSystemAdmin ? (
                                        <button
                                          onClick={() => handleToggleSystemAdmin(user.id, true)}
                                          className="w-full px-4 py-2 text-left flex items-center hover:bg-red-50 text-red-700"
                                        >
                                          <Crown className="h-4 w-4 mr-3" />
                                          <div>
                                            <div className="font-medium">Remove System Admin</div>
                                            <div className="text-xs text-gray-500">Revoke global admin access</div>
                                          </div>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => handleToggleSystemAdmin(user.id, false)}
                                          className="w-full px-4 py-2 text-left flex items-center hover:bg-purple-50 text-purple-700"
                                        >
                                          <Crown className="h-4 w-4 mr-3" />
                                          <div>
                                            <div className="font-medium">Make System Admin</div>
                                            <div className="text-xs text-gray-500">Grant global admin access</div>
                                          </div>
                                        </button>
                                      )}

                                      {canAddToMoreSessions(user, 'session-admin') && (
                                        <button
                                          onClick={() => openRoleModal(user, 'session-admin')}
                                          className="w-full px-4 py-2 text-left flex items-center hover:bg-[#E8EDF2] text-[#2D4660] border-t border-gray-200"
                                        >
                                          <Shield className="h-4 w-4 mr-3" />
                                          <div>
                                            <div className="font-medium">Make Session Admin</div>
                                            <div className="text-xs text-gray-500">Add to a session as admin</div>
                                          </div>
                                        </button>
                                      )}
                                    </>
                                  )}

                                  {canAddToMoreSessions(user, 'stakeholder') && (
                                    <button
                                      onClick={() => openRoleModal(user, 'stakeholder')}
                                      className="w-full px-4 py-2 text-left flex items-center hover:bg-green-50 text-green-700 border-t border-gray-200"
                                    >
                                      <UserIcon className="h-4 w-4 mr-3" />
                                      <div>
                                        <div className="font-medium">Make Stakeholder</div>
                                        <div className="text-xs text-gray-500">Add to a session as stakeholder</div>
                                      </div>
                                    </button>
                                  )}

                                  {/* Remove Stakeholder option - For Session Admins only */}
                                  {viewMode === 'session-admin' && user.stakeholderInSessions && user.stakeholderInSessions.length > 0 && 
                                   user.stakeholderInSessions.some(session => userAdminSessions.includes(session.id)) && (
                                    <button
                                      onClick={() => openRoleModal(user, 'remove-stakeholder')}
                                      className="w-full px-4 py-2 text-left flex items-center hover:bg-red-50 text-red-700 border-t border-gray-200"
                                    >
                                      <UserX className="h-4 w-4 mr-3" />
                                      <div>
                                        <div className="font-medium">Remove Stakeholder</div>
                                        <div className="text-xs text-gray-500">Remove from a session you manage</div>
                                      </div>
                                    </button>
                                  )}

                                  {(user.roles.isSystemAdmin || user.roles.sessionAdminCount > 0 || user.roles.stakeholderSessionCount > 0) && (
                                    <button
                                      onClick={() => handleRemoveAllRoles(user.id, user.name)}
                                      className="w-full px-4 py-2 text-left flex items-center hover:bg-gray-50 text-gray-700 border-t border-gray-200"
                                    >
                                      <UserX className="h-4 w-4 mr-3" />
                                      <div>
                                        <div className="font-medium">Remove All Roles</div>
                                        <div className="text-xs text-gray-500">Remove from all sessions</div>
                                      </div>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

          {/* Summary Stats */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-gray-600">Total Users: <strong>{users.length}</strong></span>
              </div>
              <div className="flex items-center">
                <Crown className="h-4 w-4 mr-2 text-purple-500" />
                <span className="text-gray-600">System Admins: <strong>{users.filter(u => u.roles.isSystemAdmin).length}</strong></span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-[#2D4660]" />
                <span className="text-gray-600">Session Admins: <strong>{users.filter(u => u.roles.sessionAdminCount > 0).length}</strong></span>
              </div>
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 mr-2 text-green-500" />
                <span className="text-gray-600">Stakeholders: <strong>{users.filter(u => u.roles.stakeholderSessionCount > 0).length}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Summary Stats */}
        <div className="md:hidden mt-4 bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-lg font-bold text-gray-900">{users.length}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Crown className="h-5 w-5 mr-2 text-purple-500 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Sys Admins</div>
                <div className="text-lg font-bold text-gray-900">{users.filter(u => u.roles.isSystemAdmin).length}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-[#2D4660] flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Session Admins</div>
                <div className="text-lg font-bold text-gray-900">{users.filter(u => u.roles.sessionAdminCount > 0).length}</div>
              </div>
            </div>
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-green-500 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Stakeholders</div>
                <div className="text-lg font-bold text-gray-900">{users.filter(u => u.roles.stakeholderSessionCount > 0).length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle - System Admin vs Session Admin */}
        {(isSystemAdmin || isSessionAdmin) && (
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  if (isSystemAdmin) {
                    setViewMode('system-admin');
                  }
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  viewMode === 'system-admin'
                    ? 'bg-white text-[#2d4660] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                disabled={!isSystemAdmin}
                title={!isSystemAdmin ? 'Only available for System Admins' : 'System Admin View'}
              >
                <Crown className="h-4 w-4 inline mr-2" />
                System Admin
              </button>
              <button
                onClick={() => {
                  if (isSessionAdmin || isSystemAdmin) {
                    setViewMode('session-admin');
                  }
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  viewMode === 'session-admin'
                    ? 'bg-white text-[#2d4660] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Session Admin View"
              >
                <Shield className="h-4 w-4 inline mr-2" />
                Session Admin
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">New Millennium Building Systems</h3>
              <p className="text-xs leading-relaxed">
                A Steel Dynamics Company<br />
                Innovation in structural steel manufacturing
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Quick Links</h3>
              <ul className="space-y-1 text-xs">
                <li>
                  <a 
                    href="https://www.steeldynamics.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-[#2d4660] transition-colors"
                  >
                    Steel Dynamics Inc.
                  </a>
                </li>
                <li>
                  <a 
                    href="https://www.newmill.com" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-[#2d4660] transition-colors"
                  >
                    New Millennium
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-xs">
                Contact your Product Owner or IT administrator for assistance with user management.
              </p>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>© 2025 New Millennium Building Systems, LLC. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUserForRole && roleModalType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {roleModalType === 'session-admin' 
                  ? 'Add Session Admin' 
                  : roleModalType === 'remove-stakeholder'
                  ? 'Remove Stakeholder'
                  : 'Add Stakeholder'}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {roleModalType === 'remove-stakeholder' ? (
                  <>Select a session to remove <strong>{selectedUserForRole.name}</strong> as a stakeholder.</>
                ) : (
                  <>Select a session to add <strong>{selectedUserForRole.name}</strong> as {roleModalType === 'session-admin' ? 'an admin' : 'a stakeholder'}.</>
                )}
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose Session
                </label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2d4660] focus:border-transparent"
                >
                  <option value="">-- Select a session --</option>
                  {getAvailableSessions(roleModalType).map((session) => {
                    const sessionTitle = session.title || session.name || session.session_name || 'Unnamed Session';
                    const createdDate = session.created_at ? new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
                    const displayName = createdDate ? `${sessionTitle} (${createdDate})` : sessionTitle;
                    
                    return (
                      <option key={session.id} value={session.id}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
                
                {/* Debug/Status info */}
                {allSessions.length === 0 && (
                  <p className="mt-2 text-sm text-red-500">
                    No sessions found in the system. Create a session first.
                  </p>
                )}
                
                {allSessions.length > 0 && getAvailableSessions(roleModalType).length === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    {roleModalType === 'remove-stakeholder' 
                      ? 'This user is not a stakeholder in any sessions you manage.'
                      : `This user is already ${roleModalType === 'session-admin' ? 'an admin' : 'a stakeholder'} in all ${allSessions.length} session(s).`}
                  </p>
                )}
                
                {allSessions.length > 0 && getAvailableSessions(roleModalType).length > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    {getAvailableSessions(roleModalType).length} session(s) available
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeRoleModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToSession}
                  disabled={!selectedSessionId}
                  className={`flex-1 px-4 py-2.5 rounded-lg transition-colors ${
                    selectedSessionId
                      ? roleModalType === 'remove-stakeholder'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-[#4f6d8e] text-white hover:bg-[#3d5670]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {roleModalType === 'remove-stakeholder' ? 'Remove from Session' : 'Add to Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Delete User Account
                  </h2>
                  <p className="text-sm text-gray-600">
                    This action cannot be undone. Please review the details below.
                  </p>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <div className="font-medium text-gray-900">{userToDelete.name}</div>
                    <div className="text-sm text-gray-500">{userToDelete.email}</div>
                  </div>
                </div>

                {/* Current Roles */}
                <div className="space-y-2 border-t border-gray-200 pt-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase">Current Roles</div>
                  {userToDelete.roles.isSystemAdmin && (
                    <div className="flex items-center text-sm">
                      <Crown className="h-4 w-4 mr-2 text-purple-500" />
                      <span className="text-gray-700">System Admin</span>
                    </div>
                  )}
                  {userToDelete.roles.sessionAdminCount > 0 && (
                    <div className="flex items-center text-sm">
                      <Shield className="h-4 w-4 mr-2 text-[#2D4660]" />
                      <span className="text-gray-700">Session Admin in {userToDelete.roles.sessionAdminCount} session{userToDelete.roles.sessionAdminCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {userToDelete.roles.stakeholderSessionCount > 0 && (
                    <div className="flex items-center text-sm">
                      <UserIcon className="h-4 w-4 mr-2 text-green-500" />
                      <span className="text-gray-700">Stakeholder in {userToDelete.roles.stakeholderSessionCount} session{userToDelete.roles.stakeholderSessionCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {!userToDelete.roles.isSystemAdmin && 
                   userToDelete.roles.sessionAdminCount === 0 && 
                   userToDelete.roles.stakeholderSessionCount === 0 && (
                    <div className="text-sm text-gray-500">No roles assigned</div>
                  )}
                </div>
              </div>

              {/* Sessions to be removed from */}
              {(userToDelete.adminInSessions && userToDelete.adminInSessions.length > 0) || 
               (userToDelete.stakeholderInSessions && userToDelete.stakeholderInSessions.length > 0) ? (
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    User will be removed from these sessions:
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {userToDelete.adminInSessions && userToDelete.adminInSessions.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center">
                          <Shield className="h-3.5 w-3.5 mr-1.5 text-[#173B65]" />
                          Admin Sessions ({userToDelete.adminInSessions.length})
                        </div>
                        <div className="space-y-1 ml-5">
                          {userToDelete.adminInSessions.map(session => (
                            <div key={session.id} className="text-sm text-gray-700">
                              • {session.title || session.name || 'Unnamed Session'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {userToDelete.stakeholderInSessions && userToDelete.stakeholderInSessions.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center">
                          <UserIcon className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                          Stakeholder Sessions ({userToDelete.stakeholderInSessions.length})
                        </div>
                        <div className="space-y-1 ml-5">
                          {userToDelete.stakeholderInSessions.map(session => (
                            <div key={session.id} className="text-sm text-gray-700">
                              • {session.title || session.name || 'Unnamed Session'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Warning: This action is permanent
                    </h3>
                    <div className="mt-1 text-sm text-yellow-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>User account will be permanently deleted</li>
                        <li>All authentication access will be revoked</li>
                        <li>User will be removed from all sessions</li>
                        <li>This action cannot be undone</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={cancelDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete User Permanently'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={closeAddUserModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {viewMode === 'session-admin' ? 'Add New Stakeholder' : 'Add New User'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {viewMode === 'session-admin' 
                      ? 'Create a new user account and add as stakeholder to your sessions'
                      : 'Create a new user account and assign roles'}
                  </p>
                </div>
                <button
                  onClick={closeAddUserModal}
                  disabled={isAddingUser}
                  className="flex-shrink-0 ml-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent"
                    placeholder="john.doe@newmill.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent font-mono text-sm"
                      placeholder="Auto-generated password"
                    />
                    <button
                      onClick={() => setNewUserData({ ...newUserData, password: generatePassword() })}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                    >
                      Regenerate
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Save this password to share with the user securely
                  </p>
                </div>

                {/* System Admin Accordion - Only for System Admins */}
                {viewMode === 'system-admin' && (
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setAccordionOpen({ ...accordionOpen, systemAdmin: !accordionOpen.systemAdmin })}
                      className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -ml-2 transition-colors"
                    >
                      <div className="flex items-center">
                        <Crown className="h-4 w-4 mr-2 text-purple-500" />
                        <span className="text-sm font-medium text-gray-700">System Administrator</span>
                      </div>
                      <ChevronDown 
                        className={`h-4 w-4 text-gray-500 transition-transform ${accordionOpen.systemAdmin ? 'rotate-180' : ''}`}
                      />
                    </button>
                    
                    {accordionOpen.systemAdmin && (
                      <div className="mt-3 ml-6 space-y-3">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newUserData.isSystemAdmin}
                            onChange={(e) => setNewUserData({ ...newUserData, isSystemAdmin: e.target.checked })}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="ml-3 text-sm text-gray-700">
                            Grant system administrator privileges
                          </span>
                        </label>
                        <p className="text-xs text-gray-500">
                          Full access to all sessions and user management
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Session Admin Accordion - Only for System Admins */}
                {viewMode === 'system-admin' && (
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setAccordionOpen({ ...accordionOpen, sessionAdmin: !accordionOpen.sessionAdmin })}
                      className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -ml-2 transition-colors"
                    >
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-[#2D4660]" />
                        <span className="text-sm font-medium text-gray-700">Session Admin</span>
                        {newUserData.sessionAdminIds.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-[#E8EDF2] text-[#173B65] text-xs rounded-full">
                            {newUserData.sessionAdminIds.length}
                          </span>
                        )}
                      </div>
                      <ChevronDown 
                        className={`h-4 w-4 text-gray-500 transition-transform ${accordionOpen.sessionAdmin ? 'rotate-180' : ''}`}
                      />
                    </button>
                    
                    {accordionOpen.sessionAdmin && (
                      <div className="mt-3 ml-6 space-y-3">
                        <p className="text-xs text-gray-500">
                          Select sessions where this user will be an admin
                        </p>
                        {allSessions.length === 0 ? (
                          <p className="text-sm text-gray-400">No sessions available</p>
                        ) : (
                          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                            {allSessions.map((session) => (
                              <label
                                key={session.id}
                                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={newUserData.sessionAdminIds.includes(session.id)}
                                  onChange={() => toggleSessionAdmin(session.id)}
                                  className="w-4 h-4 text-[#173B65] border-gray-300 rounded focus:ring-[#2D4660]"
                                />
                                <span className="ml-3 text-sm text-gray-700">
                                  {session.title || session.name || 'Unnamed Session'}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Stakeholder Section */}
                {viewMode === 'session-admin' ? (
                  // For Session Admins: Show directly without accordion
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center mb-3">
                      <UserIcon className="h-4 w-4 mr-2 text-green-500" />
                      <span className="text-sm font-medium text-gray-700">Add as Stakeholder</span>
                      {newUserData.stakeholderSessionIds.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                          {newUserData.stakeholderSessionIds.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">
                        Select sessions where this user will be a stakeholder (voting access)
                      </p>
                      {allSessions.length === 0 ? (
                        <p className="text-sm text-gray-400">No sessions available</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                          {allSessions.map((session) => (
                            <label
                              key={session.id}
                              className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={newUserData.stakeholderSessionIds.includes(session.id)}
                                onChange={() => toggleStakeholder(session.id)}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-[#2D4660]"
                              />
                              <span className="ml-3 text-sm text-gray-700">
                                {session.title || session.name || 'Unnamed Session'}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // For System Admins: Show in accordion
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setAccordionOpen({ ...accordionOpen, stakeholder: !accordionOpen.stakeholder })}
                      className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -ml-2 transition-colors"
                    >
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2 text-green-500" />
                        <span className="text-sm font-medium text-gray-700">Stakeholder</span>
                        {newUserData.stakeholderSessionIds.length > 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            {newUserData.stakeholderSessionIds.length}
                          </span>
                        )}
                      </div>
                      <ChevronDown 
                        className={`h-4 w-4 text-gray-500 transition-transform ${accordionOpen.stakeholder ? 'rotate-180' : ''}`}
                      />
                    </button>
                    
                    {accordionOpen.stakeholder && (
                      <div className="mt-3 ml-6 space-y-3">
                        <p className="text-xs text-gray-500">
                          Select sessions where this user will be a stakeholder (voting access)
                        </p>
                        {allSessions.length === 0 ? (
                          <p className="text-sm text-gray-400">No sessions available</p>
                        ) : (
                          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                            {allSessions.map((session) => (
                              <label
                                key={session.id}
                                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={newUserData.stakeholderSessionIds.includes(session.id)}
                                  onChange={() => toggleStakeholder(session.id)}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-[#2D4660]"
                                />
                                <span className="ml-3 text-sm text-gray-700">
                                  {session.title || session.name || 'Unnamed Session'}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={closeAddUserModal}
                  disabled={isAddingUser}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={isAddingUser || !newUserData.name.trim() || !newUserData.email.trim() || !newUserData.password.trim()}
                  className="flex-1 px-4 py-2.5 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAddingUser ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating User...
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}