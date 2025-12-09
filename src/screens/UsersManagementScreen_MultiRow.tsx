// This is a new version of UsersManagementScreen with multi-row layout
// Each user's roles (System Admin, Product Owner, Stakeholder) are displayed in separate table rows
// The USER and ACTIONS columns span all rows for that user using rowSpan

// TO TEST: Temporarily rename this file to UsersManagementScreen.tsx (backup the original first)

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import mobileLogo from '../assets/New-Millennium-Icon-gold-on-blue-rounded-square.svg';
import desktopLogo from '../assets/New-Millennium-color-logo.svg';
import { 
  Users, Crown, Shield, ShieldCheck, User as UserIcon,
  Calendar, MoreVertical, Plus, Minus, Vote,
  Edit, Trash2, UserX, Search, X, Settings, LogOut, List
} from 'lucide-react';
import { useSession } from '../contexts/SessionContext';
import { getAllUsers, getUserRoleInfo, type UserRoleInfo } from '../services/databaseService';
import { formatDate } from '../utils/date';
import type { VotingSession, Product } from '../types';
import { getProductColor } from '../utils/productColors';

// Define SessionWithAssignment type locally
interface SessionWithAssignment extends VotingSession {
  assignedAt?: string;
  assignedBy?: string;
  assignedByName?: string;
}

// Helper function to format session date range
const formatSessionDateRange = (session: any): string => {
  if (!session.start_date || !session.end_date) return 'No dates set';
  const start = formatDate(session.start_date);
  const end = formatDate(session.end_date);
  return `${start} - ${end}`;
};

type RoleType = 'system-admin' | 'admin' | 'stakeholder';

interface UserWithRoles {
  id: string;
  email: string;
  name: string;
  tenant_id?: string | null;
  tenantId?: string | null;
  created_at?: string;
  roles: UserRoleInfo;
  adminInSessions?: SessionWithAssignment[];
  stakeholderInSessions?: SessionWithAssignment[];
}

interface RoleRow {
  type: RoleType;
  badge: React.ReactNode;
  sessions: SessionWithAssignment[] | null;
  createdDate: string | undefined;
  productCount?: number;
}

// Helper functions for role badge display (from original UsersManagementScreen.tsx)
interface RoleBadgeInfo {
  label: string;
  className: string;
  icon: React.ReactNode;
}

const getRoleBadgeInfo = (
  isSystemAdmin: boolean,
  isSessionAdmin: boolean,
  isStakeholder: boolean
): RoleBadgeInfo | null => {
  if (isSystemAdmin) {
    return { 
      label: 'System Admin', 
      className: 'text-[#C89212]',
      icon: <Crown className="h-3.5 w-3.5" />
    };
  }
  if (isSessionAdmin) {
    return { 
      label: 'Product Owner', 
      className: 'text-[#576C71]',
      icon: <Shield className="h-3.5 w-3.5" />
    };
  }
  if (isStakeholder) {
    return { 
      label: 'Stakeholder', 
      className: 'text-[#8B5A4A]',
      icon: <UserIcon className="h-3.5 w-3.5" />
    };
  }
  return null;
};

const getRoleBadgeInfoFromCurrentRole = (
  currentRole: 'stakeholder' | 'session-admin' | 'system-admin'
): RoleBadgeInfo | null => {
  switch (currentRole) {
    case 'system-admin':
      return { 
        label: 'System Admin', 
        className: 'text-[#C89212]',
        icon: <Crown className="h-3.5 w-3.5" />
      };
    case 'session-admin':
      return { 
        label: 'Product Owner', 
        className: 'text-[#576C71]',
        icon: <Shield className="h-3.5 w-3.5" />
      };
    case 'stakeholder':
      return { 
        label: 'Stakeholder', 
        className: 'text-[#8B5A4A]',
        icon: <UserIcon className="h-3.5 w-3.5" />
      };
    default:
      return null;
  }
};

const getPrimaryRole = (
  isSystemAdmin: boolean,
  isSessionAdmin: boolean,
  isStakeholder: boolean
): 'stakeholder' | 'session-admin' | 'system-admin' => {
  if (isSystemAdmin) return 'system-admin';
  if (isSessionAdmin) return 'session-admin';
  return 'stakeholder';
};

const getRoleBadgeDisplay = (
  isSystemAdmin: boolean,
  isSessionAdmin: boolean,
  isStakeholder: boolean,
  currentRole: 'stakeholder' | 'session-admin' | 'system-admin'
): React.ReactNode => {
  const primaryRole = getPrimaryRole(isSystemAdmin, isSessionAdmin, isStakeholder);
  const primaryBadge = getRoleBadgeInfo(isSystemAdmin, isSessionAdmin, isStakeholder);
  
  if (!primaryBadge) return null;
  
  // If current role matches primary role, just show primary role
  if (currentRole === primaryRole) {
    return (
      <span className="text-sm text-gray-600">
        ,{' '}
        <span className={`inline-flex items-baseline ${primaryBadge.className}`}>
          <span className="inline-flex items-center">{primaryBadge.icon}</span>
          <span className="ml-1 text-sm">{primaryBadge.label}</span>
        </span>
      </span>
    );
  }
  
  // If current role is different, show primary role + "viewing this page as" + view role
  const viewingAsBadge = getRoleBadgeInfoFromCurrentRole(currentRole);
  if (!viewingAsBadge) return null;
  
  return (
    <span className="text-sm text-gray-600">
      ,{' '}
      <span className={`inline-flex items-baseline ${primaryBadge.className}`}>
        <span className="inline-flex items-center">{primaryBadge.icon}</span>
        <span className="ml-1 text-sm">{primaryBadge.label}</span>
      </span>
      <span className="md:inline hidden">, </span>
      <span className="whitespace-nowrap md:inline inline-block">
        <span className="md:hidden">, </span>
        viewing this page as a{' '}
        <span className={`inline-flex items-baseline ${viewingAsBadge.className}`}>
          <span className="inline-flex items-center">{viewingAsBadge.icon}</span>
          <span className="ml-1 text-sm">{viewingAsBadge.label}</span>
        </span>
      </span>
    </span>
  );
};

export default function UsersManagementScreenMultiRow() {
  const navigate = useNavigate();
  const { setCurrentSession, currentUser: sessionUser } = useSession();
  
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [allSessions, setAllSessions] = useState<VotingSession[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'system-admin' | 'session-admin' | 'stakeholder'>('all');
  const [filterProductId, setFilterProductId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'system-admin' | 'session-admin'>('system-admin');
  const [currentUserRoles, setCurrentUserRoles] = useState<UserWithRoles | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isSessionAdmin, setIsSessionAdmin] = useState(false);
  const [userAdminSessions, setUserAdminSessions] = useState<string[]>([]);
  
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userVotedSessions, setUserVotedSessions] = useState<Set<string>>(new Set());
  
  // Modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalType, setRoleModalType] = useState<'stakeholder' | 'session-admin' | 'remove-stakeholder' | null>(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserWithRoles | null>(null);
  const [userSessionMemberships, setUserSessionMemberships] = useState<{
    adminSessions: string[];
    stakeholderSessions: string[];
  }>({ adminSessions: [], stakeholderSessions: [] });
  
  // Role modal product/session selection state
  const [roleModalProductId, setRoleModalProductId] = useState<string>('');
  
  // Add User modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    isSystemAdmin: false,
    isProductOwner: false,
    isStakeholder: false,
    productOwnerProductId: '',
    stakeholderProductId: ''
  });
  
  // Edit user modal state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithRoles | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  
  // Protected users
  const protectedEmails = new Set([
    'spencer.faull@newmill.com',
    'chris.rodes@newmill.com',
    'dave.hoffman@newmill.com'
  ]);
  const [originalAdminId, setOriginalAdminId] = useState<string | null>(null);
  const [protectedUserIds, setProtectedUserIds] = useState<Set<string>>(new Set());
  
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.actions-dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Temporarily disabled due to Supabase 406 errors
  // useEffect(() => {
  //   const checkAdmin = async () => {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (user) {
  //       const admin = await getUserRoleInfo(user.id).then(info => info.isSystemAdmin).catch(() => true);
  //       console.log('UsersManagementScreenMultiRow: Is system admin:', admin);
  //       setIsSystemAdmin(admin);
  //       if (!admin) {
  //         setViewMode('session-admin');
  //       }
  //     }
  //   };
  //   checkAdmin();
  // }, []);

  // Helper functions
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

  const canAddToMoreSessions = (user: UserWithRoles, roleType: 'stakeholder' | 'session-admin' | 'remove-stakeholder' | null) => {
    if (!roleType) return false;
    
    if (roleType === 'session-admin') {
      return user.roles.sessionAdminCount < allSessions.length;
    } else {
      return user.roles.stakeholderSessionCount < allSessions.length;
    }
  };

  // Handler functions
  const openRoleModal = async (user: UserWithRoles, roleType: 'stakeholder' | 'session-admin' | 'remove-stakeholder') => {
    setSelectedUserForRole(user);
    setRoleModalType(roleType);
    setRoleModalProductId('');
    setShowRoleModal(true);
    setOpenDropdown(null);
    
    // TODO: Load user session memberships if needed
  };

  const handleAddRole = async () => {
    if (!selectedUserForRole || !roleModalType || !roleModalProductId) {
      alert('Missing required information');
      return;
    }

    try {
      // Get all sessions for the selected product
      const sessionsToAdd = allSessions
        .filter(s => s.product_id === roleModalProductId)
        .map(s => s.id);

      if (sessionsToAdd.length === 0) {
        alert('No sessions found for this product');
        return;
      }

      // Add role to each session
      for (const sessionId of sessionsToAdd) {
        if (roleModalType === 'session-admin') {
          // Add as product owner (session admin)
          await supabase
            .from('product_product_owners')
            .insert({
              session_id: sessionId,
              user_id: selectedUserForRole.id
            });
        } else if (roleModalType === 'stakeholder') {
          // Add as stakeholder
          await supabase
            .from('product_stakeholders')
            .insert({
              session_id: sessionId,
              user_id: selectedUserForRole.id,
              user_email: selectedUserForRole.email,
              user_name: selectedUserForRole.name
            });
        }
      }

      // Close modal and reload data
      setShowRoleModal(false);
      await loadData();
      
      alert(`Successfully added ${selectedUserForRole.name} as ${roleModalType === 'session-admin' ? 'Product Owner' : 'Stakeholder'} to ${sessionsToAdd.length} session(s)`);
    } catch (error: any) {
      console.error('Error adding role:', error);
      alert(`Failed to add role: ${error.message || 'Unknown error'}`);
    }
  };

  const closeAddUserModal = () => {
    setShowAddUserModal(false);
    setNewUserData({
      name: '',
      email: '',
      isSystemAdmin: false,
      isProductOwner: false,
      isStakeholder: false,
      productOwnerProductId: '',
      stakeholderProductId: ''
    });
  };

  const handleAddUser = async () => {
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      alert('Please fill in all required fields (Name, Email)');
      return;
    }

    setIsAddingUser(true);
    try {
      // Create user directly in users table
      const { data: newUser, error: dbError } = await supabase
        .from('users')
        .insert({
          name: newUserData.name.trim(),
          email: newUserData.email.trim().toLowerCase(),
          created_by: sessionUser?.id,
          created_by_name: sessionUser?.name
        })
        .select()
        .single();

      if (dbError) throw dbError;
      if (!newUser) throw new Error('User creation failed');

      const newUserId = newUser.id;

      // Add system admin role if selected
      if (newUserData.isSystemAdmin) {
        await supabase.from('system_admins').insert({ user_id: newUserId });
      }

      // Add product owner role if product selected
      if (newUserData.isProductOwner && newUserData.productOwnerProductId) {
        const productSessions = allSessions.filter(s => s.product_id === newUserData.productOwnerProductId);
        for (const session of productSessions) {
          await supabase
            .from('product_product_owners')
            .insert({
              session_id: session.id,
              user_id: newUserId
            });
        }
      }

      // Add stakeholder role if product selected
      if (newUserData.isStakeholder && newUserData.stakeholderProductId) {
        const productSessions = allSessions.filter(s => s.product_id === newUserData.stakeholderProductId);
        for (const session of productSessions) {
          await supabase
            .from('product_stakeholders')
            .insert({
              session_id: session.id,
              user_id: newUserId,
              user_email: newUserData.email.trim().toLowerCase(),
              user_name: newUserData.name.trim()
            });
        }
      }

      // Close modal and reload
      closeAddUserModal();
      await loadData();
      
      alert(`Successfully created user: ${newUserData.name}`);
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert(`Failed to create user: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleToggleSystemAdmin = async (userId: string, currentStatus: boolean) => {
    setOpenDropdown(null);
    
    if (!confirm(`Are you sure you want to ${currentStatus ? 'remove' : 'grant'} system admin access for this user?`)) {
      return;
    }

    try {
      const { error } = currentStatus 
        ? await supabase.from('system_admins').delete().eq('user_id', userId)
        : await supabase.from('system_admins').insert({ user_id: userId });
      
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling system admin:', error);
      alert('Failed to update system admin status. Please try again.');
    }
  };

  const handleRemoveAllRoles = async (userId: string, userName: string) => {
    setOpenDropdown(null);
    
    const confirmMessage = viewMode === 'session-admin'
      ? `Are you sure you want to remove ${userName} from all sessions you manage?`
      : `Are you sure you want to remove all roles from ${userName}? This will remove them from all sessions and revoke system admin access.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Remove system admin
      if (viewMode === 'system-admin') {
        await supabase.from('system_admins').delete().eq('user_id', userId);
      }
      
      // Remove from all sessions
      const user = users.find(u => u.id === userId);
      if (user?.email) {
        // Remove as product owner
        await supabase.from('product_product_owners').delete().eq('user_id', userId);
        // Remove as stakeholder
        await supabase.from('product_stakeholders').delete().eq('user_email', user.email);
      }
      
      await loadData();
    } catch (error) {
      console.error('Error removing roles:', error);
      alert('Failed to remove roles. Please try again.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`)) {
      return;
    }

    try {
      // Remove all roles first
      await supabase.from('system_admins').delete().eq('user_id', userId);
      await supabase.from('product_product_owners').delete().eq('user_id', userId);
      await supabase.from('product_stakeholders').delete().eq('user_email', user.email);
      
      // Delete user
      await supabase.from('users').delete().eq('id', userId);
      
      setOpenDropdown(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        navigate('/login');
        return;
      }

      const [usersData, sessionsData, productsData, votesData, adminRelations, stakeholderRelations] = await Promise.all([
        getAllUsers(),
        supabase.from('voting_sessions').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('name'),
        supabase.from('votes').select('user_id, session_id'),
        supabase.from('product_product_owners').select('user_id, product_id, created_at'),
        supabase.from('product_stakeholders').select('user_email, product_id, created_at')
      ]);

      // Build lookup maps
      const adminRelationsByUser = new Map<string, Array<{ product_id: string; created_at: string }>>();
      (adminRelations.data || []).forEach((rel: any) => {
        if (!adminRelationsByUser.has(rel.user_id)) {
          adminRelationsByUser.set(rel.user_id, []);
        }
        adminRelationsByUser.get(rel.user_id)!.push({
          product_id: rel.product_id,
          created_at: rel.created_at
        });
      });

      const stakeholderRelationsByUser = new Map<string, Array<{ product_id: string; created_at: string }>>();
      (stakeholderRelations.data || []).forEach((rel: any) => {
        const key = rel.user_email?.toLowerCase() || '';
        if (key) {
          if (!stakeholderRelationsByUser.has(key)) {
            stakeholderRelationsByUser.set(key, []);
          }
          stakeholderRelationsByUser.get(key)!.push({
            product_id: rel.product_id,
            created_at: rel.created_at
          });
        }
      });

      const sessionMap = new Map((sessionsData.data || []).map(s => [s.id, s]));
      
      // Build sessions by product map
      const sessionsByProduct = new Map<string, any[]>();
      (sessionsData.data || []).forEach(session => {
        const productId = session.product_id || 'unknown';
        if (!sessionsByProduct.has(productId)) {
          sessionsByProduct.set(productId, []);
        }
        sessionsByProduct.get(productId)!.push(session);
      });

      if (usersData) {
        const enrichedUsers = await Promise.all(
          usersData.map(async (user) => {
            const roles = await getUserRoleInfo(user.id);
            
            const adminInSessions: SessionWithAssignment[] = [];
            const stakeholderInSessions: SessionWithAssignment[] = [];

            // Get admin sessions from pre-loaded data (via products)
            const userAdminRelations = adminRelationsByUser.get(user.id) || [];
            userAdminRelations.forEach(rel => {
              const productSessions = sessionsByProduct.get(rel.product_id) || [];
              productSessions.forEach(session => {
                adminInSessions.push({
                  ...session,
                  assignedAt: rel.created_at,
                  assignedBy: 'System',
                  assignedByName: 'System'
                });
              });
            });

            // Get stakeholder sessions from pre-loaded data (via products)
            const userEmailKey = user.email.toLowerCase();
            const userStakeholderRelations = stakeholderRelationsByUser.get(userEmailKey) || [];
            userStakeholderRelations.forEach(rel => {
              const productSessions = sessionsByProduct.get(rel.product_id) || [];
              productSessions.forEach(session => {
                stakeholderInSessions.push({
                  ...session,
                  assignedAt: rel.created_at,
                  assignedBy: 'System',
                  assignedByName: 'System'
                });
              });
            });

            return {
              ...user,
              roles,
              adminInSessions,
              stakeholderInSessions
            };
          })
        );

        setUsers(enrichedUsers);
        
        // Find current user by email (auth user ID != users table ID)
        const current = sessionUser ? enrichedUsers.find(u => u.email.toLowerCase() === sessionUser.email.toLowerCase()) : null;
        setCurrentUserRoles(current || null);
        
        // Set admin status based on current user's roles
        if (current) {
          setIsSystemAdmin(current.roles?.isSystemAdmin || false);
          setIsSessionAdmin((current.roles?.sessionAdminCount || 0) > 0);
        }
        
        const adminSessionIds = current?.adminInSessions?.map(s => s.id) || [];
        setUserAdminSessions(adminSessionIds);
      }

      if (sessionsData.data) {
        setAllSessions(sessionsData.data);
      }

      if (productsData.data) {
        setAllProducts(productsData.data);
      }

      if (votesData.data) {
        const votedSet = new Set(
          votesData.data.map(v => `${v.user_id}-${v.session_id}`)
        );
        setUserVotedSessions(votedSet);
      }

    } catch (error) {
      console.error('UsersManagementScreenMultiRow: Error loading data:', error);
      setError(error instanceof Error ? error.message : 'An error occurred loading data');
    } finally {
      setLoading(false);
    }
  };

  const groupSessionsByProduct = (sessions: SessionWithAssignment[]): Map<string, SessionWithAssignment[]> => {
    const grouped = new Map<string, SessionWithAssignment[]>();
    sessions.forEach(session => {
      const productId = session.product_id || 'unknown';
      if (!grouped.has(productId)) {
        grouped.set(productId, []);
      }
      grouped.get(productId)!.push(session);
    });
    return grouped;
  };

  const getFilteredSessions = (sessions: SessionWithAssignment[] | undefined): SessionWithAssignment[] => {
    if (!sessions) return [];
    
    let filtered = sessions;
    
    // Filter by product if selected
    if (filterProductId) {
      filtered = filtered.filter(s => s.product_id === filterProductId);
    }
    
    // In Product Owner view, only show sessions the current user manages
    if (viewMode === 'session-admin' && !isSystemAdmin && userAdminSessions.length > 0) {
      filtered = filtered.filter(s => userAdminSessions.includes(s.id));
    }
    
    return filtered;
  };

  const getRolesForUser = (user: UserWithRoles): RoleRow[] => {
    const roles: RoleRow[] = [];
    const filteredAdminSessions = getFilteredSessions(user.adminInSessions);
    const filteredStakeholderSessions = getFilteredSessions(user.stakeholderInSessions);

    // System Admin role
    if (user.roles.isSystemAdmin) {
      roles.push({
        type: 'system-admin',
        badge: (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#C89212] text-white">
            <Crown className="h-3.5 w-3.5 mr-1" />
            System Admin
          </span>
        ),
        sessions: null,
        createdDate: user.created_at
      });
    }

    // Product Owner role
    if (filteredAdminSessions.length > 0) {
      const sessionsByProduct = groupSessionsByProduct(filteredAdminSessions);
      roles.push({
        type: 'admin',
        badge: (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#576C71] text-white">
            <Shield className="h-3.5 w-3.5 mr-1" />
            Product Owner ({sessionsByProduct.size})
          </span>
        ),
        sessions: filteredAdminSessions,
        createdDate: user.created_at,
        productCount: sessionsByProduct.size
      });
    }

    // Stakeholder role
    if (filteredStakeholderSessions.length > 0) {
      const sessionsByProduct = groupSessionsByProduct(filteredStakeholderSessions);
      roles.push({
        type: 'stakeholder',
        badge: (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#8B5A4A] text-white">
            <UserIcon className="h-3.5 w-3.5 mr-1" />
            Stakeholder ({sessionsByProduct.size})
          </span>
        ),
        sessions: filteredStakeholderSessions,
        createdDate: user.created_at,
        productCount: sessionsByProduct.size
      });
    }

    // If no roles, show empty row
    if (roles.length === 0) {
      roles.push({
        type: 'system-admin',
        badge: <span className="text-gray-400 text-xs">No roles</span>,
        sessions: null,
        createdDate: user.created_at
      });
    }

    return roles;
  };

  const renderSessionsColumn = (user: UserWithRoles, role: RoleRow): { isExpanded: boolean; content: React.ReactNode } => {
    if (!role.sessions) {
      return { 
        isExpanded: false, 
        content: <span className="text-gray-600 text-xs font-medium">All sessions</span> 
      };
    }

    const sessionCount = role.sessions.length;
    const hasMoreSessions = sessionCount > 1;
    const isExpanded = expandedSessions.has(`${user.id}-${role.type}`);
    const sessionsByProduct = groupSessionsByProduct(role.sessions);
    const firstSessionIds = new Set(
      Array.from(sessionsByProduct.values()).map(sessions => sessions[0]?.id).filter(Boolean)
    );

    const BadgeContent = () => (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium group" 
        style={{ 
          borderColor: role.type === 'admin' ? '#576C71' : '#8B5A4A',
          color: role.type === 'admin' ? '#576C71' : '#8B5A4A'
        }}
      >
        {role.type === 'admin' ? (
          <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ fill: '#576C71', color: '#576C71' }} />
        ) : (
          <UserIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ fill: '#8B5A4A', color: '#8B5A4A' }} />
        )}
        <span>{role.type === 'admin' ? 'Product Owner' : 'Stakeholder'} in {sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
        {hasMoreSessions && (
          <span className="inline-flex items-baseline gap-0.5">
            {isExpanded ? (
              <Minus className="h-2.5 w-2.5 transition-all group-hover:brightness-150 mt-[3px]" />
            ) : (
              <Plus className="h-2.5 w-2.5 transition-all group-hover:brightness-150 mt-[3px]" />
            )}
            <span className="text-[10px] transition-all group-hover:brightness-150">{isExpanded ? 'Hide' : 'Show'}</span>
          </span>
        )}
      </div>
    );

    return { isExpanded, content: (
      <div>
        <div className="mb-2">
          {hasMoreSessions ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const key = `${user.id}-${role.type}`;
                setExpandedSessions(prev => {
                  const next = new Set(prev);
                  if (next.has(key)) {
                    next.delete(key);
                  } else {
                    next.add(key);
                  }
                  return next;
                });
              }}
              className="text-left"
            >
              <BadgeContent />
            </button>
          ) : (
            <BadgeContent />
          )}
        </div>

        {isExpanded && (
          <div>
            {Array.from(sessionsByProduct.entries()).flatMap(([_productId, productSessions], productIndex) => {
              const elements = [];
              
              // Add divider before each product group except the first
              if (productIndex > 0) {
                elements.push(
                  <div key={`divider-${_productId}`} className="border-t border-gray-200" style={{ marginTop: '8px', marginBottom: '8px' }} />
                );
              }
              
              // Add all sessions for this product
              productSessions.forEach((session, sessionIndex) => {
                elements.push(
                  <div
                    key={session.id}
                    className="relative cursor-pointer"
                    style={{ 
                      marginTop: sessionIndex === 0 && productIndex === 0 ? '8px' : sessionIndex === 0 ? '0' : '12px',
                      marginLeft: '1.25rem',
                      marginBottom: '18px'
                    }}
                  onMouseEnter={() => setHoveredSessionId(`${user.id}-${role.type}-${session.id}`)}
                  onMouseLeave={() => setHoveredSessionId(null)}
                  onClick={async (e) => {
                    e.stopPropagation();
                    await setCurrentSession(session);
                    navigate('/admin');
                  }}
                >
                  {hoveredSessionId === `${user.id}-${role.type}-${session.id}` && (
                    <div className="absolute bg-blue-50 pointer-events-none rounded" 
                      style={{ 
                        left: firstSessionIds.has(session.id) ? 'calc(-240px - 2rem - 1rem)' : '-1.25rem',
                        right: '-9rem',
                        top: '-0.375rem',
                        bottom: '-0.375rem',
                        boxShadow: '0 0 0 1px rgb(191 219 254)',
                        outline: 'none',
                        zIndex: 1
                      }}
                    />
                  )}
                  <div className="block text-sm text-left text-gray-700 hover:text-gray-900 relative z-10"
                    style={{ padding: 0, margin: 0, lineHeight: '1.25rem' }}
                  >
                    <div className="flex items-center gap-2 whitespace-nowrap" style={{ height: '20px', lineHeight: '20px' }}>
                      {userVotedSessions.has(`${user.id}-${session.id}`) ? (
                        <div className="relative group">
                          <Vote className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-max bg-gray-900 text-white text-xs rounded py-1 px-2 z-50">
                            Voted!
                          </div>
                        </div>
                      ) : (
                        <div className="relative group">
                          <Vote className="h-5 w-5 text-gray-300 flex-shrink-0" />
                          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-max bg-gray-900 text-white text-xs rounded py-1 px-2 z-50">
                            No Votes
                          </div>
                        </div>
                      )}
                      <span>{session.title || 'Unnamed Session'}</span>
                    </div>
                    <div className="text-xs text-gray-500" style={{ height: '16px', lineHeight: '16px', marginTop: '2px', marginLeft: '28px' }}>
                      {formatSessionDateRange(session)}
                    </div>
                  </div>
                </div>
                );
              });
              
              return elements;
            })}
          </div>
        )}
      </div>
    )};
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchQuery === '' || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || 
      (filterRole === 'system-admin' && user.roles.isSystemAdmin) ||
      (filterRole === 'session-admin' && user.roles.sessionAdminCount > 0) ||
      (filterRole === 'stakeholder' && user.roles.stakeholderSessionCount > 0);
    
    const matchesProduct = !filterProductId || 
      (user.adminInSessions?.some((s: any) => s.product_id === filterProductId)) ||
      (user.stakeholderInSessions?.some((s: any) => s.product_id === filterProductId));
    
    // Product Owner view: only show users with sessions in products they manage
    if (viewMode === 'session-admin') {
      // System admins can see everything in Product Owner view
      if (isSystemAdmin) {
        return matchesSearch && matchesRole && matchesProduct;
      }
      
      // Non-system admin Product Owners: only show users related to sessions they manage
      const hasRelevantSession = 
        user.adminInSessions?.some((s: any) => userAdminSessions.includes(s.id)) ||
        user.stakeholderInSessions?.some((s: any) => userAdminSessions.includes(s.id));
      return matchesSearch && matchesRole && matchesProduct && hasRelevantSession;
    }
    
    return matchesSearch && matchesRole && matchesProduct;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading users...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
          <button 
            onClick={() => loadData()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Desktop: Centered logo at top */}
        <div className="hidden md:flex md:justify-center mb-2">
          <img
            src={desktopLogo}
            alt="New Millennium Building Systems Logo"
            className="-mt-4 cursor-pointer hover:opacity-80 transition-opacity"
            style={{ height: '96px', width: 'auto' }}
            onClick={() => navigate('/sessions')}
          />
        </div>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <div className="flex items-center flex-1 min-w-0">
            {/* Mobile: small logo */}
            <img
              src={mobileLogo}
              alt="New Millennium Building Systems Logo"
              className="mr-3 md:hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ width: '36px', height: '36px', objectFit: 'contain' }}
              onClick={() => navigate('/sessions')}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold text-[#2d4660] truncate">User Management</h1>
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {sessionUser?.name || 'Guest'}
                {sessionUser && (() => {
                  // Determine current role based on viewMode
                  const currentRole = viewMode === 'system-admin' ? 'system-admin' : 'session-admin';
                  // Determine user roles - use state values
                  const userIsStakeholder = (currentUserRoles?.roles?.stakeholderSessionCount || 0) > 0;
                  return getRoleBadgeDisplay(isSystemAdmin, isSessionAdmin, userIsStakeholder, currentRole);
                })()}
              </p>
            </div>
          </div>
          
          <div className="relative z-40 flex-shrink-0 ml-2">
            {/* Desktop buttons */}
            <div className="hidden md:flex space-x-2">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="flex items-center px-4 py-2 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                Add User
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center px-4 py-2 bg-[#1E5461] text-white rounded-lg hover:bg-[#145668] transition-colors"
              >
                <Shield className="h-4 w-4 mr-2" />
                Admin Dashboard
              </button>
              <button
                onClick={() => navigate('/sessions')}
                className="flex items-center px-4 py-2 bg-[#4f6d8e] text-white rounded-lg hover:bg-[#3d5670] transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                My Sessions
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex items-center justify-center p-2 w-10 h-10 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Filters Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="system-admin">System Admin</option>
                <option value="session-admin">Product Owner</option>
                <option value="stakeholder">Stakeholder</option>
              </select>

              <select
                value={filterProductId}
                onChange={(e) => setFilterProductId(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Products</option>
                {allProducts.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>

              {(searchQuery || filterRole !== 'all' || filterProductId) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterRole('all');
                    setFilterProductId('');
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '35%' }}>Sessions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>Created</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery || filterRole !== 'all' || filterProductId
                        ? 'No users found matching your filters.' 
                        : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.flatMap((user) => {
                    const roles = getRolesForUser(user);
                    
                    return roles.map((role, roleIndex) => {
                      const sessionsResult = renderSessionsColumn(user, role);
                      const { isExpanded, content: sessionsContent } = sessionsResult;
                      
                      // Get sessions for date rendering
                      const sessions = role.sessions || [];
                      const sessionsByProduct = groupSessionsByProduct(sessions);
                      const expandedSessionsList = isExpanded 
                        ? Array.from(sessionsByProduct.values()).flatMap(productSessions => productSessions)
                        : [];
                      
                      return (
                        <tr 
                          key={`${user.id}-${role.type}`}
                          className={`${hoveredUserId === user.id ? 'bg-gray-50' : ''} cursor-pointer`}
                          onMouseEnter={() => setHoveredUserId(user.id)}
                          onMouseLeave={() => setHoveredUserId(null)}
                          onClick={(e) => {
                            // Don't toggle if clicking on the actions button or dropdown
                            if ((e.target as Element).closest('.actions-dropdown-container')) {
                              return;
                            }
                            // Toggle expansion for this role
                            const key = `${user.id}-${role.type}`;
                            setExpandedSessions(prev => {
                              const next = new Set(prev);
                              if (next.has(key)) {
                                next.delete(key);
                              } else {
                                next.add(key);
                              }
                              return next;
                            });
                          }}
                        >
                          {/* USER column - only show on first role row */}
                          {roleIndex === 0 && (
                            <td className="px-4 py-4 align-top" rowSpan={roles.length}>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name}
                                  {user.email.toLowerCase() === sessionUser?.email.toLowerCase() && (
                                    <span className="ml-2 text-xs text-[#c59f2d] font-semibold">(You)</span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </td>
                          )}

                          {/* ROLE column */}
                          <td className="px-4 py-4 align-top">
                            {role.type === 'system-admin' ? (
                              role.badge
                            ) : (
                              <div>
                                {/* Role badge */}
                                <div className="mb-2">
                                  {role.badge}
                                </div>
                                {/* Product list aligned with sessions */}
                                {isExpanded && sessions.length > 0 ? (
                                  <div>
                                    {/* Spacing to match first session marginTop */}
                                    <div style={{ height: '8px' }} />
                                    {/* Product names - one per product group */}
                                    <div>
                                      {Array.from(sessionsByProduct.entries()).flatMap(([productId, productSessions], productIndex) => {
                                        const product = allProducts.find(p => p.id === productId);
                                        const productColor = product ? getProductColor(product.name, product.color_hex ?? null) : { background: '#666666', text: '#FFFFFF' };
                                        const elements = [];
                                        
                                        // Add divider before each product group except the first
                                        if (productIndex > 0) {
                                          elements.push(
                                            <div key={`divider-${productId}`} className="border-t border-gray-200" style={{ marginTop: '8px', marginBottom: '8px', position: 'relative', zIndex: 2 }} />
                                          );
                                        }
                                        
                                        // Add product name - height matches full session (title + date)
                                        elements.push(
                                          <div
                                            key={productId}
                                            className="flex items-start gap-1.5"
                                            style={{ 
                                              marginTop: '0',
                                              height: '38px',
                                              lineHeight: '20px',
                                              marginBottom: '18px',
                                              position: 'relative',
                                              zIndex: 2
                                            }}>
                                            <div 
                                              className="w-3 h-3 rounded-sm flex-shrink-0"
                                              style={{ backgroundColor: productColor.background }}
                                            />
                                            <span className="text-xs font-medium text-gray-700">
                                              {product?.name || 'Unknown Product'}
                                            </span>
                                          </div>
                                        );
                                        
                                        // Add empty spacers for remaining sessions in this product group
                                        // Each spacer must match full session height: 20px (title) + 2px + 16px (date) = 38px content + 18px marginBottom
                                        for (let i = 1; i < productSessions.length; i++) {
                                          elements.push(
                                            <div
                                              key={`spacer-${productId}-${i}`}
                                              style={{
                                                height: '38px',
                                                marginTop: '12px',
                                                marginBottom: '18px'
                                              }}
                                            />
                                          );
                                        }
                                        
                                        return elements;
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </td>

                          {/* SESSIONS column */}
                          <td className="px-4 py-4 text-sm text-gray-500 align-top relative overflow-visible min-w-[240px]">
                            {sessionsContent}
                          </td>

                          {/* CREATED column - always show role date, plus session dates when expanded */}
                          <td className="px-4 py-4 text-sm text-gray-500 align-top">
                            <div>
                              {/* Role created date - always visible */}
                              <div className="flex items-center gap-1.5 mb-2">
                                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="font-medium">{role.createdDate ? formatDate(role.createdDate) : 'N/A'}</span>
                              </div>
                              
                              {/* Session dates when expanded */}
                              {isExpanded && expandedSessionsList.length > 0 && (
                                <div>
                                  {/* Spacing to match first session marginTop */}
                                  <div style={{ height: '8px' }} />
                                  {/* Session dates aligned with session list */}
                                  <div>
                                    {Array.from(sessionsByProduct.entries()).flatMap(([productId, productSessions], productIndex) => {
                                      const elements = [];
                                      
                                      // Add divider before each product group except the first
                                      if (productIndex > 0) {
                                        elements.push(
                                          <div key={`divider-${productId}`} className="border-t border-gray-200" style={{ marginTop: '8px', marginBottom: '8px', position: 'relative', zIndex: 2 }} />
                                        );
                                      }
                                      
                                      // Add session dates - height matches full session content
                                      productSessions.forEach((session, sessionIndex) => {
                                        elements.push(
                                          <div
                                            key={session.id}
                                            className="flex items-start gap-1.5"
                                            style={{ 
                                              marginTop: sessionIndex === 0 ? '0' : '12px',
                                              height: '38px',
                                              lineHeight: '20px',
                                              marginBottom: '18px',
                                              position: 'relative',
                                              zIndex: 2
                                            }}
                                          >
                                            <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-500">
                                              {session.assignedAt ? formatDate(session.assignedAt) : (session.created_at ? formatDate(session.created_at) : 'N/A')}
                                            </span>
                                          </div>
                                        );
                                      });
                                      
                                      return elements;
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* ACTIONS column - only show on first role row */}
                          {roleIndex === 0 && (
                            <td className="px-2 py-4 text-right text-sm font-medium align-top" rowSpan={roles.length} style={{ position: 'relative', zIndex: 3 }}>
                              <div className="flex items-center justify-end actions-dropdown-container">
                                <div className="relative inline-block">
                                  <button
                                    onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                                    className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                                    disabled={user.email.toLowerCase() === sessionUser?.email.toLowerCase()}
                                    title={user.email.toLowerCase() === sessionUser?.email.toLowerCase() ? 'Cannot modify your own permissions' : 'Change user role'}
                                  >
                                    <MoreVertical className="h-5 w-5 text-gray-600" />
                                  </button>
                                  
                                  {/* Dropdown menu */}
                                  {openDropdown === user.id && user.email.toLowerCase() !== sessionUser?.email.toLowerCase() && (
                                    <div 
                                      className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]"
                                    >
                                      <div className="py-1">
                                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                          Manage User Roles
                                        </div>

                                        {/* Add Role */}
                                        <button
                                          onClick={() => openRoleModal(user, 'session-admin')}
                                          className="w-full px-4 py-3 text-left flex items-center hover:bg-green-50 text-green-700"
                                        >
                                          <Plus className="h-5 w-5 mr-3 flex-shrink-0" />
                                          <div>
                                            <div className="font-medium text-base">Add Role</div>
                                            <div className="text-xs text-gray-500">Add Role Permissions</div>
                                          </div>
                                        </button>

                                        {/* Remove Role - only show if user has any roles */}
                                        {(user.roles.isSystemAdmin || user.roles.sessionAdminCount > 0 || user.roles.stakeholderSessionCount > 0) && (
                                          <button
                                            onClick={() => openRoleModal(user, 'remove-stakeholder')}
                                            className="w-full px-4 py-3 text-left flex items-center hover:bg-red-50 text-red-700 border-t border-gray-200"
                                          >
                                            <Minus className="h-5 w-5 mr-3 flex-shrink-0" />
                                            <div>
                                              <div className="font-medium text-base">Remove Role</div>
                                              <div className="text-xs text-gray-500">
                                                Remove Role Permissions
                                              </div>
                                            </div>
                                          </button>
                                        )}

                                        {/* User Functions header */}
                                        {((viewMode === 'system-admin') || 
                                          ((viewMode === 'session-admin' && user.roles.stakeholderSessionCount > 0 && 
                                            user.stakeholderInSessions?.some(session => allSessions.some(s => s.id === session.id)))) && 
                                           !protectedEmails.has(user.email)) && (
                                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-200">
                                            User Functions
                                          </div>
                                        )}

                                        {/* Edit User - only for system admins */}
                                        {viewMode === 'system-admin' && (
                                          <button
                                            onClick={() => {
                                              setUserToEdit(user);
                                              setEditingUserName(user.name);
                                              setEditingUserEmail(user.email);
                                              setShowEditUserModal(true);
                                              setOpenDropdown(null);
                                            }}
                                            className="w-full px-4 py-3 text-left flex items-center hover:bg-[#1E5461]/10 text-[#1E5461] border-t border-gray-200"
                                          >
                                            <Edit className="h-5 w-5 mr-3 flex-shrink-0" />
                                            <div>
                                              <div className="font-medium text-base">Edit User Profile</div>
                                              <div className="text-xs text-gray-500">Update name and email</div>
                                            </div>
                                          </button>
                                        )}

                                        {/* Delete User */}
                                        {(viewMode === 'system-admin' || 
                                          (viewMode === 'session-admin' && user.roles.stakeholderSessionCount > 0 && 
                                           user.stakeholderInSessions?.some(session => allSessions.some(s => s.id === session.id)))) && 
                                          !protectedEmails.has(user.email) && (
                                          <button
                                            onClick={() => {
                                              setOpenDropdown(null);
                                              handleDeleteUser(user.id, user.name);
                                            }}
                                            className={`w-full px-4 py-3 text-left flex items-center hover:bg-[#8B5A4A]/10 text-[#8B5A4A] border-t border-gray-200 ${
                                              user.email.toLowerCase() === sessionUser?.email.toLowerCase() || (viewMode === 'system-admin' && protectedUserIds.has(user.id))
                                                ? 'opacity-50 cursor-not-allowed' 
                                                : ''
                                            }`}
                                            disabled={user.email.toLowerCase() === sessionUser?.email.toLowerCase() || (viewMode === 'system-admin' && protectedUserIds.has(user.id))}
                                          >
                                            <Trash2 className="h-5 w-5 mr-3 flex-shrink-0" />
                                            <div>
                                              <div className="font-medium text-base">
                                                {viewMode === 'session-admin'
                                                  ? 'Remove Stakeholder'
                                                  : 'Delete User'}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {viewMode === 'session-admin'
                                                  ? 'Remove from all your sessions'
                                                  : user.email.toLowerCase() === sessionUser?.email.toLowerCase() 
                                                  ? 'Cannot delete your own account'
                                                  : protectedUserIds.has(user.id)
                                                  ? `Cannot delete protected account${getProtectedAccountLabel(user) ? ` (${getProtectedAccountLabel(user)})` : ''}`
                                                  : 'Permanently delete this user'}
                                              </div>
                                            </div>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-gray-600">Total Users: <strong>{users.length}</strong></span>
              </div>
              <div className="flex items-center">
                <Crown className="h-4 w-4 mr-2 text-[#C89212]" />
                <span className="text-gray-600">System Admins: <strong>{users.filter(u => u.roles.isSystemAdmin).length}</strong></span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-[#576C71]" />
                <span className="text-gray-600">Product Owners: <strong>{users.filter(u => u.roles.sessionAdminCount > 0).length}</strong></span>
              </div>
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 mr-2 text-[#8B5A4A]" />
                <span className="text-gray-600">Stakeholders: <strong>{users.filter(u => u.roles.stakeholderSessionCount > 0).length}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle - Session Admin vs System Admin */}
        {isSystemAdmin && (
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  if (isSystemAdmin) {
                    setViewMode('session-admin');
                  }
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  viewMode === 'session-admin'
                    ? 'bg-white text-[#2d4660] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Product Owner View"
              >
                <Shield className="h-4 w-4 inline mr-2" />
                Product Owner
              </button>
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
            </div>
          </div>
        )}
      </div>

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
      {showRoleModal && selectedUserForRole && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowRoleModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#8B5A4A]/10 flex items-center justify-center">
                  {roleModalType === 'session-admin' ? (
                    <Shield className="h-6 w-6 text-[#576C71]" />
                  ) : (
                    <UserIcon className="h-6 w-6 text-[#8B5A4A]" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {roleModalType === 'session-admin' ? 'Add Product Owner Role' : 'Add Stakeholder Role'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Add {selectedUserForRole.name} ({selectedUserForRole.email}) to sessions
                  </p>
                </div>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="flex-shrink-0 ml-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Product Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={roleModalProductId}
                      onChange={(e) => {
                        setRoleModalProductId(e.target.value);
                      }}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent appearance-none bg-white"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em'
                      }}
                    >
                      <option value="">Select a product...</option>
                      {allProducts.map(product => {
                        const productColor = getProductColor(product.name);
                        return (
                          <option 
                            key={product.id} 
                            value={product.id}
                          >
                            {product.name}
                          </option>
                        );
                      })}
                    </select>
                    {/* Product Color Icon - Show for selected or on hover */}
                    <div 
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm pointer-events-none"
                      style={{ 
                        backgroundColor: roleModalProductId 
                          ? getProductColor(allProducts.find(p => p.id === roleModalProductId)?.name || '').background
                          : 'transparent'
                      }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    User will be added to all current and future sessions for this product
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRole}
                  disabled={!roleModalProductId}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2d4660] rounded-md hover:bg-[#1E5461] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && userToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingUserName}
                  onChange={(e) => setEditingUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUserEmail}
                  onChange={(e) => setEditingUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!userToEdit) return;
                  try {
                    await supabase
                      .from('users')
                      .update({ name: editingUserName, email: editingUserEmail })
                      .eq('id', userToEdit.id);
                    setShowEditUserModal(false);
                    await loadData();
                  } catch (error) {
                    console.error('Error updating user:', error);
                    alert('Failed to update user. Please try again.');
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[#2d4660] rounded-md hover:bg-[#1E5461]"
              >
                Save
              </button>
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
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#2D4660]/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-[#2D4660]" />
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Add New User
                  </h2>
                  <p className="text-sm text-gray-600">
                    Create a new user account and optionally assign roles
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
                {/* Name and Email */}
                <div className="grid gap-4 md:grid-cols-2">
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
                      disabled={isAddingUser}
                    />
                  </div>

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
                      disabled={isAddingUser}
                    />
                  </div>
                </div>

                {/* System Admin checkbox */}
                {viewMode === 'system-admin' && (
                  <div className="border-t border-gray-200 pt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                          <Crown
                            className="h-4 w-4 text-[#C89212] transition-transform"
                            style={{
                              transform: newUserData.isSystemAdmin ? 'scale(2)' : 'scale(1)',
                              transformOrigin: 'center'
                            }}
                          />
                        </span>
                        <span className="text-sm font-medium text-gray-700">System Administrator</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={newUserData.isSystemAdmin}
                        onChange={(e) => setNewUserData({ ...newUserData, isSystemAdmin: e.target.checked })}
                        className="sr-only"
                        disabled={isAddingUser}
                      />
                      <span
                        className="flex items-center justify-center w-6 h-6 border rounded-md transition-colors"
                        style={{
                          borderColor: '#C89212',
                          backgroundColor: newUserData.isSystemAdmin ? '#C89212' : '#ffffff'
                        }}
                      >
                        {newUserData.isSystemAdmin && (
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            stroke="#ffffff"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="4 12 10 18 20 6" />
                          </svg>
                        )}
                      </span>
                    </label>
                  </div>
                )}

                {/* Product Owner Role */}
                {viewMode === 'system-admin' && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-start gap-3">
                      <label className="flex items-center gap-3 cursor-pointer flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                            <Shield
                              className="h-4 w-4 text-[#576C71] transition-transform"
                              style={{
                                transform: newUserData.isProductOwner ? 'scale(2)' : 'scale(1)',
                                transformOrigin: 'center'
                              }}
                            />
                          </span>
                          <span className="text-sm font-medium text-gray-700">Product Owner</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newUserData.isProductOwner}
                          onChange={(e) => setNewUserData({ 
                            ...newUserData, 
                            isProductOwner: e.target.checked,
                            productOwnerProductId: e.target.checked ? newUserData.productOwnerProductId : ''
                          })}
                          className="sr-only"
                          disabled={isAddingUser}
                        />
                        <span
                          className="flex items-center justify-center w-6 h-6 border rounded-md transition-colors"
                          style={{
                            borderColor: '#576C71',
                            backgroundColor: newUserData.isProductOwner ? '#576C71' : '#ffffff'
                          }}
                        >
                          {newUserData.isProductOwner && (
                            <svg
                              viewBox="0 0 24 24"
                              className="w-4 h-4"
                              stroke="#ffffff"
                              strokeWidth="3"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="4 12 10 18 20 6" />
                            </svg>
                          )}
                        </span>
                      </label>
                      
                      {newUserData.isProductOwner && (
                        <div className="flex-1">
                          <div className="relative">
                            <select
                              value={newUserData.productOwnerProductId}
                              onChange={(e) => setNewUserData({ ...newUserData, productOwnerProductId: e.target.value })}
                              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent appearance-none bg-white"
                              disabled={isAddingUser}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                backgroundPosition: 'right 0.5rem center',
                                backgroundRepeat: 'no-repeat',
                                backgroundSize: '1.5em 1.5em'
                              }}
                            >
                              <option value="">Select a product...</option>
                              {allProducts.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                            <div 
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm pointer-events-none"
                              style={{ 
                                backgroundColor: newUserData.productOwnerProductId 
                                  ? getProductColor(allProducts.find(p => p.id === newUserData.productOwnerProductId)?.name || '').background
                                  : 'transparent'
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Add to all current and future sessions for this product
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Stakeholder Role */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-start gap-3">
                    <label className="flex items-center gap-3 cursor-pointer flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                          <UserIcon
                            className="h-4 w-4 text-[#8B5A4A] transition-transform"
                            style={{
                              transform: newUserData.isStakeholder ? 'scale(2)' : 'scale(1)',
                              transformOrigin: 'center'
                            }}
                          />
                        </span>
                        <span className="text-sm font-medium text-gray-700">Stakeholder</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={newUserData.isStakeholder}
                        onChange={(e) => setNewUserData({ 
                          ...newUserData, 
                          isStakeholder: e.target.checked,
                          stakeholderProductId: e.target.checked ? newUserData.stakeholderProductId : ''
                        })}
                        className="sr-only"
                        disabled={isAddingUser}
                      />
                      <span
                        className="flex items-center justify-center w-6 h-6 border rounded-md transition-colors"
                        style={{
                          borderColor: '#8B5A4A',
                          backgroundColor: newUserData.isStakeholder ? '#8B5A4A' : '#ffffff'
                        }}
                      >
                        {newUserData.isStakeholder && (
                          <svg
                            viewBox="0 0 24 24"
                            className="w-4 h-4"
                            stroke="#ffffff"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="4 12 10 18 20 6" />
                          </svg>
                        )}
                      </span>
                    </label>
                    
                    {newUserData.isStakeholder && (
                      <div className="flex-1">
                        <div className="relative">
                          <select
                            value={newUserData.stakeholderProductId}
                            onChange={(e) => setNewUserData({ ...newUserData, stakeholderProductId: e.target.value })}
                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent appearance-none bg-white"
                            disabled={isAddingUser}
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                              backgroundPosition: 'right 0.5rem center',
                              backgroundRepeat: 'no-repeat',
                              backgroundSize: '1.5em 1.5em'
                            }}
                          >
                            <option value="">Select a product...</option>
                            {allProducts.map(product => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                          <div 
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-sm pointer-events-none"
                            style={{ 
                              backgroundColor: newUserData.stakeholderProductId 
                                ? getProductColor(allProducts.find(p => p.id === newUserData.stakeholderProductId)?.name || '').background
                                : 'transparent'
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Add to all current and future sessions for this product
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={closeAddUserModal}
                  disabled={isAddingUser}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={isAddingUser || !newUserData.name.trim() || !newUserData.email.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2d4660] rounded-md hover:bg-[#1E5461] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingUser ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
