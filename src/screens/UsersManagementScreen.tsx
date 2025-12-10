// UsersManagementScreen with multi-row layout
// Each user's roles (System Admin, Product Owner, Stakeholder) are displayed in separate table rows
// The USER and ACTIONS columns span all rows for that user using rowSpan

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import mobileLogo from '../assets/New-Millennium-Icon-gold-on-blue-rounded-square.svg';
import desktopLogo from '../assets/New-Millennium-color-logo.svg';
import microsoftLogo from '../assets/microsoft.svg';
import { 
  Users, Crown, Shield, ShieldCheck, User as UserIcon,
  Calendar, MoreVertical, Plus, Minus, Vote,
  Edit, Trash2, UserX, Search, X, Settings, LogOut, List, FilterX
} from 'lucide-react';
import { searchAzureAdUsers, type AzureAdUser } from '../services/azureAdUserService';
import { useSession } from '../contexts/SessionContext';
import { getAllUsers, getUserRoleInfo, getSessionById, type UserRoleInfo } from '../services/databaseService';
import { formatDate } from '../utils/date';
import type { VotingSession, Product } from '../types';
import { getProductColor } from '../utils/productColors';
import { Footer } from '../screens/FeatureVoting';

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

// Helper function to format name as "First Last"
const formatUserName = (name: string | null | undefined): string => {
  if (!name) return '';
  
  const trimmed = name.trim();
  if (!trimmed) return '';
  
  // If name contains a comma, assume it's "Last, First" format
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim()).filter(p => p);
    if (parts.length === 2) {
      return `${parts[1]} ${parts[0]}`;
    }
    // If more than 2 parts, just reverse the order
    return parts.reverse().join(' ');
  }
  
  // Otherwise, assume it's already "First Last" format
  return trimmed;
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
  productOwnerProductIds?: Set<string>; // Product IDs where user is Product Owner (from product_product_owners)
  stakeholderProductIds?: Set<string>; // Product IDs where user is Stakeholder (from product_stakeholders)
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
  isProductOwner: boolean,
  isStakeholder: boolean
): RoleBadgeInfo | null => {
  if (isSystemAdmin) {
    return { 
      label: 'System Admin', 
      className: 'text-[#C89212]',
      icon: <Crown className="h-3.5 w-3.5" />
    };
  }
  if (isProductOwner) {
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
  currentRole: 'stakeholder' | 'product-owner' | 'system-admin'
): RoleBadgeInfo | null => {
  switch (currentRole) {
    case 'system-admin':
      return { 
        label: 'System Admin', 
        className: 'text-[#C89212]',
        icon: <Crown className="h-3.5 w-3.5" />
      };
    case 'product-owner':
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
  isProductOwner: boolean,
  isStakeholder: boolean
): 'stakeholder' | 'product-owner' | 'system-admin' => {
  if (isSystemAdmin) return 'system-admin';
  if (isProductOwner) return 'product-owner';
  return 'stakeholder';
};

const getRoleBadgeDisplay = (
  isSystemAdmin: boolean,
  isProductOwner: boolean,
  isStakeholder: boolean,
  currentRole: 'stakeholder' | 'product-owner' | 'system-admin'
): React.ReactNode => {
  const primaryRole = getPrimaryRole(isSystemAdmin, isProductOwner, isStakeholder);
  const primaryBadge = getRoleBadgeInfo(isSystemAdmin, isProductOwner, isStakeholder);
  
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

export default function UsersManagementScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentSession, currentUser: sessionUser } = useSession();
  
  // Parse URL params for initial filter state
  const urlParams = new URLSearchParams(location.search);
  const urlFilter = urlParams.get('filter');
  const urlProduct = urlParams.get('product');
  
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [allSessions, setAllSessions] = useState<VotingSession[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserProductIds, setCurrentUserProductIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'system-admin' | 'product-owner' | 'stakeholder'>(
    urlFilter === 'product-owner' ? 'product-owner' : 
    urlFilter === 'stakeholder' ? 'stakeholder' : 
    urlFilter === 'system-admin' ? 'system-admin' : 'all'
  );
  const [filterProductId, setFilterProductId] = useState<string>(urlProduct || '');
  const [viewMode, setViewMode] = useState<'system-admin' | 'product-owner'>(() => {
    // Initialize from sessionStorage if available
    const saved = sessionStorage.getItem('usersViewMode') as 'system-admin' | 'product-owner' | null;
    return saved || 'system-admin';
  });
  const [currentUserRoles, setCurrentUserRoles] = useState<UserWithRoles | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isProductOwner, setIsProductOwner] = useState(false);
  const [userAdminSessions, setUserAdminSessions] = useState<string[]>([]);
  
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [userVotedSessions, setUserVotedSessions] = useState<Set<string>>(new Set());
  
  // Modal state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalType, setRoleModalType] = useState<'stakeholder' | 'product-owner' | 'remove-stakeholder' | 'system-admin' | null>(null);
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserWithRoles | null>(null);
  const [userSessionMemberships, setUserSessionMemberships] = useState<{
    adminSessions: string[];
    stakeholderSessions: string[];
  }>({ adminSessions: [], stakeholderSessions: [] });
  
  // Role modal product/session selection state
  const [roleModalProductId, setRoleModalProductId] = useState<string>('');
  const [showRoleModalProductDropdown, setShowRoleModalProductDropdown] = useState(false);
  const roleModalProductDropdownRef = useRef<HTMLDivElement>(null);
  
  // Remove role modal state
  const [selectedRoleToRemove, setSelectedRoleToRemove] = useState<'product-owner' | 'stakeholder' | 'system-admin' | null>(null);
  
  // Add role modal state
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<'product-owner' | 'stakeholder' | 'system-admin' | null>(null);
  
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
  const [showProductOwnerDropdown, setShowProductOwnerDropdown] = useState(false);
  const [showStakeholderDropdown, setShowStakeholderDropdown] = useState(false);
  const productOwnerDropdownRef = useRef<HTMLDivElement>(null);
  const stakeholderDropdownRef = useRef<HTMLDivElement>(null);
  
  // Filter product dropdown
  const [showFilterProductDropdown, setShowFilterProductDropdown] = useState(false);
  const filterProductDropdownRef = useRef<HTMLDivElement>(null);
  
  // Filter role dropdown
  const [showFilterRoleDropdown, setShowFilterRoleDropdown] = useState(false);
  const filterRoleDropdownRef = useRef<HTMLDivElement>(null);
  
  // Azure AD search state
  const [azureUserSearch, setAzureUserSearch] = useState({
    searchTerm: '',
    results: [] as AzureAdUser[],
    isSearching: false,
    showResults: false,
    error: ''
  });
  const [showAzureSearchSection, setShowAzureSearchSection] = useState(true);
  const azureSearchRef = useRef<HTMLDivElement>(null);
  
  // Edit user modal state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithRoles | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ title: '', message: '', type: 'info' });
  
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
      
      // Close product dropdowns when clicking outside
      if (showProductOwnerDropdown && productOwnerDropdownRef.current && !productOwnerDropdownRef.current.contains(event.target as Node)) {
        setShowProductOwnerDropdown(false);
      }
      if (showStakeholderDropdown && stakeholderDropdownRef.current && !stakeholderDropdownRef.current.contains(event.target as Node)) {
        setShowStakeholderDropdown(false);
      }
      if (showRoleModalProductDropdown && roleModalProductDropdownRef.current && !roleModalProductDropdownRef.current.contains(event.target as Node)) {
        setShowRoleModalProductDropdown(false);
      }
      if (showFilterProductDropdown && filterProductDropdownRef.current && !filterProductDropdownRef.current.contains(event.target as Node)) {
        setShowFilterProductDropdown(false);
      }
      if (showFilterRoleDropdown && filterRoleDropdownRef.current && !filterRoleDropdownRef.current.contains(event.target as Node)) {
        setShowFilterRoleDropdown(false);
      }
      
      // Close Azure search dropdown when clicking outside
      if (azureUserSearch.showResults && azureSearchRef.current && !azureSearchRef.current.contains(event.target as Node)) {
        setAzureUserSearch(prev => ({ ...prev, showResults: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown, showProductOwnerDropdown, showStakeholderDropdown, showRoleModalProductDropdown, showFilterProductDropdown, showFilterRoleDropdown, azureUserSearch.showResults]);

  // Temporarily disabled due to Supabase 406 errors
  // useEffect(() => {
  //   const checkAdmin = async () => {
  //     const { data: { user } } = await supabase.auth.getUser();
  //     if (user) {
  //       const admin = await getUserRoleInfo(user.id).then(info => info.isSystemAdmin).catch(() => true);
  // ...existing code...
  //       setIsSystemAdmin(admin);
  //       if (!admin) {
  //         setViewMode('session-admin');
  //       }
  //     }
  //   };
  //   checkAdmin();
  // }, []);

  // Helper functions
  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertModalConfig({ title, message, type });
    setShowAlertModal(true);
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

  const canAddToMoreSessions = (user: UserWithRoles, roleType: 'stakeholder' | 'product-owner' | 'remove-stakeholder' | null) => {
    if (!roleType) return false;
    
    if (roleType === 'product-owner') {
      return user.roles.productOwnerCount < allSessions.length;
    } else {
      return user.roles.stakeholderSessionCount < allSessions.length;
    }
  };

  // Handler functions
  const openRoleModal = async (user: UserWithRoles, roleType: 'stakeholder' | 'product-owner' | 'remove-stakeholder' | 'system-admin') => {
    setSelectedUserForRole(user);
    setRoleModalType(roleType);
    setRoleModalProductId('');
    setSelectedRoleToRemove(null);
    setSelectedRoleToAdd(null);
    setShowRoleModal(true);
    setOpenDropdown(null);
    
    // TODO: Load user session memberships if needed
  };

  const handleAddRole = async () => {
    // For system-admin role, we don't need a product
    if (selectedRoleToAdd !== 'system-admin' && (!selectedUserForRole || !roleModalType || !roleModalProductId)) {
      showAlert('Missing Information', 'Please select a product to continue.', 'error');
      return;
    }
    
    // Basic validation for system-admin
    if (selectedRoleToAdd === 'system-admin' && (!selectedUserForRole || !roleModalType)) {
      showAlert('Missing Information', 'Unable to process request.', 'error');
      return;
    }

    // For remove operations, validate role selection
    if (roleModalType === 'remove-stakeholder' && !selectedRoleToRemove) {
      showAlert('Missing Information', 'Please select a role to remove.', 'error');
      return;
    }
    
    // For add operations, validate role selection
    if ((roleModalType === 'product-owner' || roleModalType === 'stakeholder' || roleModalType === 'system-admin') && !selectedRoleToAdd) {
      showAlert('Missing Information', 'Please select a role to add.', 'error');
      return;
    }

    try {
      // Get all sessions for the selected product

      const sessions = allSessions.filter(s => s.product_id === roleModalProductId);

      // Only show 'No Sessions Found' error for product-owner and stakeholder roles
      if ((selectedRoleToAdd === 'product-owner' || selectedRoleToAdd === 'stakeholder') && sessions.length === 0) {
        showAlert('No Sessions Found', 'There are no sessions available for this product.', 'error');
        return;
      }

      // Handle REMOVE operations
      if (roleModalType === 'remove-stakeholder') {
        
        if (selectedRoleToRemove === 'system-admin') {
          // Remove System Admin role
          const { error } = await supabase
            .from('system_admins')
            .delete()
            .eq('user_id', selectedUserForRole.id);

          if (error) throw error;

          showAlert(
            'Role Removed Successfully',
            `${formatUserName(selectedUserForRole.name)} has been removed as System Admin.`,
            'success'
          );
        } else if (selectedRoleToRemove === 'product-owner') {
          // Remove Product Owner role - use product_id, not session_id
          const { error } = await supabase
            .from('product_product_owners')
            .delete()
            .eq('user_id', selectedUserForRole.id)
            .eq('product_id', roleModalProductId);

          if (error) throw error;

          showAlert(
            'Role Removed Successfully',
            `${formatUserName(selectedUserForRole.name)} has been removed as Product Owner from this product.`,
            'success'
          );
        } else if (selectedRoleToRemove === 'stakeholder') {
          // Remove Stakeholder role from all sessions for this product
          const sessionIds = sessions.map(s => s.id);
          const { error } = await supabase
            .from('product_stakeholders')
            .delete()
            .eq('user_id', selectedUserForRole.id)
            .in('session_id', sessionIds);

          if (error) throw error;

          showAlert(
            'Role Removed Successfully',
            `${formatUserName(selectedUserForRole.name)} has been removed as Stakeholder from ${sessions.length} session(s).`,
            'success'
          );
        }
      } 
      // Handle ADD operations
      else {
        if (selectedRoleToAdd === 'system-admin') {
          // Add as system admin
          const { error } = await supabase
            .from('system_admins')
            .insert({ user_id: selectedUserForRole.id });

          if (error) throw error;

          showAlert(
            'Role Added Successfully',
            `${formatUserName(selectedUserForRole.name)} has been granted System Admin privileges.`,
            'success'
          );
        } else if (selectedRoleToAdd === 'product-owner') {
          // Prevent duplicate Product Owner assignment
          const { data: existingPO, error: fetchError } = await supabase
            .from('product_product_owners')
            .select('id')
            .eq('product_id', roleModalProductId)
            .eq('user_id', selectedUserForRole.id)
            .maybeSingle();

          if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

          if (existingPO) {
            showAlert(
              'Already Assigned',
              `${formatUserName(selectedUserForRole.name)} is already a Product Owner for this product.`,
              'info'
            );
          } else {
            const { error: insertError } = await supabase
              .from('product_product_owners')
              .insert({
                product_id: roleModalProductId,
                user_id: selectedUserForRole.id
              });

            if (insertError) throw insertError;

            showAlert(
              'Role Added Successfully',
              `${formatUserName(selectedUserForRole.name)} has been added as Product Owner to this product.`,
              'success'
            );
          }
        } else if (selectedRoleToAdd === 'stakeholder') {
          // Add as stakeholder to all sessions
          const sessionIds = sessions.map(s => s.id);

          for (const sessionId of sessionIds) {
            await supabase
              .from('product_stakeholders')
              .insert({
                session_id: sessionId,
                user_id: selectedUserForRole.id,
                user_email: selectedUserForRole.email,
                user_name: selectedUserForRole.name
              });
          }

          showAlert(
            'Role Added Successfully',
            `${formatUserName(selectedUserForRole.name)} has been added as Stakeholder to ${sessions.length} session(s).`,
            'success'
          );
        }
      }

      // Close modal and reload data
      setShowRoleModal(false);
      await loadData();
      
    } catch (error: any) {
      console.error('Error with role operation:', error);
      const operation = roleModalType === 'remove-stakeholder' ? 'Remove' : 'Add';
      showAlert(`Failed to ${operation} Role`, error.message || 'An unknown error occurred. Please try again.', 'error');
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
    setShowAzureSearchSection(true);
    setAzureUserSearch({
      searchTerm: '',
      results: [],
      isSearching: false,
      showResults: false,
      error: ''
    });
  };

  // Azure AD user search handler
  const handleAzureUserSearch = async (searchTerm: string) => {
    setAzureUserSearch(prev => ({ ...prev, searchTerm, isSearching: true, showResults: false, error: '' }));
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      setAzureUserSearch(prev => ({ ...prev, results: [], isSearching: false, error: '' }));
      return;
    }

    try {
      const results = await searchAzureAdUsers(searchTerm);
      setAzureUserSearch(prev => ({ 
        ...prev, 
        results, 
        isSearching: false, 
        showResults: results.length > 0,
        error: ''
      }));
    } catch (error: any) {
      console.error('Error searching Azure AD users:', error);
      const errorMessage = error?.message || 'Failed to search company users. Please try again.';
      setAzureUserSearch(prev => ({ 
        ...prev, 
        results: [], 
        isSearching: false, 
        showResults: false,
        error: errorMessage
      }));
    }
  };

  // Select Azure AD user
  const selectAzureUser = (user: AzureAdUser) => {
    // Format name as "First Name Last Name" 
    let formattedName = '';
    if (user.givenName && user.surname) {
      formattedName = `${user.givenName} ${user.surname}`;
    } else if (user.displayName) {
      const displayName = user.displayName.trim();
      if (displayName.includes(',')) {
        const parts = displayName.split(',').map(p => p.trim());
        if (parts.length === 2) {
          formattedName = `${parts[1]} ${parts[0]}`;
        } else {
          formattedName = displayName;
        }
      } else {
        formattedName = displayName;
      }
    } else {
      formattedName = user.mail || user.userPrincipalName || '';
    }
    
    setNewUserData({
      ...newUserData,
      name: formattedName,
      email: user.mail || user.userPrincipalName
    });
    setAzureUserSearch({
      searchTerm: '',
      results: [],
      isSearching: false,
      showResults: false,
      error: ''
    });
    setShowAzureSearchSection(false);
  };

  const handleAddUser = async () => {
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      showAlert('Missing Required Fields', 'Please provide both name and email address.', 'error');
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
        const { error: systemAdminError } = await supabase.from('system_admins').insert({ user_id: newUserId });
        if (systemAdminError) {
          console.error('Error adding system admin:', systemAdminError);
          throw new Error(`Failed to assign System Admin role: ${systemAdminError.message}`);
        }
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
      
      showAlert('User Created Successfully', `${formatUserName(newUserData.name)} has been added to the system.`, 'success');
    } catch (error: any) {
      console.error('Error creating user:', error);
      showAlert('Failed to Create User', error.message || 'An unknown error occurred. Please try again.', 'error');
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
      showAlert('Update Failed', 'Failed to update system admin status. Please try again.', 'error');
    }
  };

  const handleRemoveAllRoles = async (userId: string, userName: string) => {
    setOpenDropdown(null);
    
    const confirmMessage = viewMode === 'product-owner'
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
      showAlert('Failed to Remove Roles', 'An error occurred while removing roles. Please try again.', 'error');
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
      showAlert('Failed to Delete User', 'An error occurred while deleting the user. Please try again.', 'error');
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
            // ...existing code...
            
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

            // Store product IDs directly from product_product_owners and product_stakeholders
            // (regardless of whether there are sessions for those products)
            const productOwnerProductIds = new Set<string>();
            userAdminRelations.forEach(rel => {
              if (rel.product_id) {
                productOwnerProductIds.add(rel.product_id);
              }
            });

            const stakeholderProductIds = new Set<string>();
            userStakeholderRelations.forEach(rel => {
              if (rel.product_id) {
                stakeholderProductIds.add(rel.product_id);
              }
            });

            return {
              ...user,
              roles,
              adminInSessions,
              stakeholderInSessions,
              productOwnerProductIds,
              stakeholderProductIds
            };
          })
        );

        setUsers(enrichedUsers);
        
        // Find current user by email (auth user ID != users table ID)
        const current = sessionUser ? enrichedUsers.find(u => u.email.toLowerCase() === sessionUser.email.toLowerCase()) : null;
        setCurrentUserRoles(current || null);
        
        // Store current user's product IDs directly from product_product_owners table
        if (current && adminRelationsByUser.has(current.id)) {
          const userProductIds = new Set<string>();
          const userAdminRelations = adminRelationsByUser.get(current.id) || [];
          userAdminRelations.forEach(rel => {
            if (rel.product_id) {
              userProductIds.add(rel.product_id);
            }
          });
          console.log('[UsersManagementScreen] Current user product IDs:', Array.from(userProductIds));
          setCurrentUserProductIds(userProductIds);
        } else {
          console.log('[UsersManagementScreen] Current user not found or has no product assignments');
          setCurrentUserProductIds(new Set());
        }
        
        // Set admin status based on current user's roles
        if (current) {
          const isUserSystemAdmin = current.roles?.isSystemAdmin || false;
          const isUserProductOwner = (current.roles?.productOwnerCount || 0) > 0;
          
          // ...existing code...
          
          // TODO: Re-enable authorization check after users table is restored
          // Authorization check: Only System Admins and Product Owners can access this screen
          // if (!isUserSystemAdmin && !isUserProductOwner) {
          // ...existing code...
          //   navigate('/unauthorized');
          //   return;
          // }
          
          setIsSystemAdmin(isUserSystemAdmin);
          setIsProductOwner(isUserProductOwner);
          
          // Set view mode: Product Owners who are NOT System Admins default to product-owner view
          // But only if there's no saved viewMode in sessionStorage
          const savedViewMode = sessionStorage.getItem('usersViewMode') as 'system-admin' | 'product-owner' | null;
          if (!savedViewMode) {
            if (!isUserSystemAdmin && isUserProductOwner) {
              setViewMode('product-owner');
              sessionStorage.setItem('usersViewMode', 'product-owner');
            } else if (isUserSystemAdmin) {
              setViewMode('system-admin');
              sessionStorage.setItem('usersViewMode', 'system-admin');
            }
          } else {
            // Respect the saved viewMode, but only if user has permission for that view
            if (savedViewMode === 'system-admin' && isUserSystemAdmin) {
              setViewMode('system-admin');
            } else if (savedViewMode === 'product-owner' && (isUserSystemAdmin || isUserProductOwner)) {
              setViewMode('product-owner');
            } else {
              // Fallback to default based on permissions
              if (!isUserSystemAdmin && isUserProductOwner) {
                setViewMode('product-owner');
                sessionStorage.setItem('usersViewMode', 'product-owner');
              } else if (isUserSystemAdmin) {
                setViewMode('system-admin');
                sessionStorage.setItem('usersViewMode', 'system-admin');
              }
            }
          }
        } else {
          // ...existing code...
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
    
    // In Product Owner view mode, only show sessions for products the current user is assigned to as Product Owner
    // This applies even if the current user is also a System Admin (they're viewing as Product Owner)
    if (viewMode === 'product-owner') {
      // Use the current user's product IDs directly from product_product_owners table
      if (currentUserProductIds.size > 0) {
        filtered = filtered.filter(s => s.product_id && currentUserProductIds.has(s.product_id));
      } else {
        // If no accessible products, return empty array
        return [];
      }
    }
    
    return filtered;
  };

  // Get products accessible to current user (for Add User modal dropdowns and filtering)
  const getAccessibleProducts = (): Product[] => {
    // In System Admin view mode, System Admins see all products
    if (isSystemAdmin && viewMode === 'system-admin') {
      return allProducts;
    }
    
    // In Product Owner view mode (even for System Admins), only see products they own (as Product Owner)
    // Use the current user's product IDs directly from product_product_owners table
    if (viewMode === 'product-owner') {
      if (currentUserProductIds.size === 0) {
        return [];
      }
      return allProducts.filter(product => currentUserProductIds.has(product.id));
    }
    
    // Fallback: if not in product-owner view and not system admin, return empty
    return [];
  };

  // Get products for role modal (filtered based on add/remove and user's current assignments)
  const getRoleModalProducts = (): Product[] => {
    const accessibleProducts = getAccessibleProducts();
    
    // When removing, filter by the specific role selected
    if (roleModalType === 'remove-stakeholder' && selectedUserForRole && selectedRoleToRemove) {
      const userProductIds = new Set<string>();
      
      if (selectedRoleToRemove === 'product-owner') {
        // Only show products where user is Product Owner
        selectedUserForRole.adminInSessions?.forEach(session => {
          if (session.product_id) {
            userProductIds.add(session.product_id);
          }
        });
      } else if (selectedRoleToRemove === 'stakeholder') {
        // Only show products where user is Stakeholder
        selectedUserForRole.stakeholderInSessions?.forEach(session => {
          if (session.product_id) {
            userProductIds.add(session.product_id);
          }
        });
      }
      
      // Filter to only products the user has AND the current user can access
      return accessibleProducts.filter(product => userProductIds.has(product.id));
    }
    
    // When adding, show all accessible products
    return accessibleProducts;
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
                    // Ensure session has product_id before navigating
                    // Load the full session from database to ensure all fields are present
                    try {
                      const fullSession = await getSessionById(session.id);
                      if (fullSession) {
                        await setCurrentSession(fullSession);
                        navigate('/admin');
                      } else {
                        console.error('Session not found:', session.id);
                        // Fallback to using the session object we have
                        await setCurrentSession(session);
                        navigate('/admin');
                      }
                    } catch (error) {
                      console.error('Error loading session:', error);
                      // Fallback to using the session object we have
                      await setCurrentSession(session);
                      navigate('/admin');
                    }
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
      (filterRole === 'product-owner' && user.roles.productOwnerCount > 0) ||
      (filterRole === 'stakeholder' && user.roles.stakeholderSessionCount > 0);
    
    const matchesProduct = !filterProductId || 
      (user.adminInSessions?.some((s: any) => s.product_id === filterProductId)) ||
      (user.stakeholderInSessions?.some((s: any) => s.product_id === filterProductId));
    
    // In Product Owner view mode, filter to only show users who are Product Owners or Stakeholders
    // for products the current user is assigned to as a Product Owner
    // This applies even if the current user is also a System Admin (they're viewing as Product Owner)
    if (viewMode === 'product-owner') {
      // Use the current user's product IDs directly from product_product_owners table
      // If current user has no assigned products, don't show any users
      if (currentUserProductIds.size === 0) {
        return false;
      }
      
      // Exclude System Admins (unless it's the current user viewing their own Product Owner assignments)
      const isCurrentUser = sessionUser && user.email.toLowerCase() === sessionUser.email.toLowerCase();
      if (user.roles.isSystemAdmin && !isCurrentUser) {
        return false;
      }
      
      // Only show users who have Product Owner or Stakeholder roles SPECIFICALLY in the current user's products
      // We need to check if the user has assignments in any of the current user's products
      
      // Get product IDs directly from the user object (from product_product_owners and product_stakeholders tables)
      // This includes ALL product assignments, not just products with sessions
      const userProductOwnerProductIds = user.productOwnerProductIds || new Set<string>();
      const userStakeholderProductIds = user.stakeholderProductIds || new Set<string>();
      
      // Check if user has ANY product assignment (Product Owner OR Stakeholder) that overlaps with current user's products
      const hasProductOwnerOverlap = Array.from(userProductOwnerProductIds).some(productId => 
        currentUserProductIds.has(productId)
      );
      const hasStakeholderOverlap = Array.from(userStakeholderProductIds).some(productId => 
        currentUserProductIds.has(productId)
      );
      
      const shouldShow = matchesSearch && (hasProductOwnerOverlap || hasStakeholderOverlap);
      
      // Debug logging (remove after testing)
      if (!shouldShow && (user.roles.productOwnerCount > 0 || user.roles.stakeholderSessionCount > 0)) {
        console.log(`[Filter] Hiding user ${user.name}:`, {
          userProductOwnerProducts: Array.from(userProductOwnerProductIds),
          userStakeholderProducts: Array.from(userStakeholderProductIds),
          currentUserProducts: Array.from(currentUserProductIds),
          hasProductOwnerOverlap,
          hasStakeholderOverlap
        });
      }
      
      return shouldShow;
    }
    
    return matchesSearch && matchesRole && matchesProduct;
  }).sort((a, b) => {
    // Extract last name (last word in name)
    const getLastName = (name: string) => {
      const parts = name.trim().split(' ');
      return parts[parts.length - 1].toLowerCase();
    };
    
    const lastNameA = getLastName(a.name);
    const lastNameB = getLastName(b.name);
    
    return lastNameA.localeCompare(lastNameB);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="container mx-auto p-4 max-w-6xl flex-1">
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
                Welcome, {formatUserName(sessionUser?.name) || 'Guest'}
                {sessionUser && (() => {
                  // Show user's actual highest role and viewing indicator
                  const userIsStakeholder = (currentUserRoles?.roles?.stakeholderSessionCount || 0) > 0;
                  const currentRole = viewMode === 'system-admin' ? 'system-admin' : 'product-owner';
                  return getRoleBadgeDisplay(isSystemAdmin, isProductOwner, userIsStakeholder, currentRole);
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-visible">
          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-200">
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
              
              <div className="relative" ref={filterRoleDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowFilterRoleDropdown(!showFilterRoleDropdown)}
                  className="px-4 py-2 pl-12 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left min-w-[200px]"
                >
                  {filterRole === 'system-admin' ? 'System Admin' :
                   filterRole === 'product-owner' ? 'Product Owner' :
                   filterRole === 'stakeholder' ? 'Stakeholder' : 'All Roles'}
                </button>
                
                {/* Role Icon */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {filterRole === 'system-admin' && <Crown className="h-5 w-5 text-[#C89212]" />}
                  {filterRole === 'product-owner' && <Shield className="h-5 w-5 text-[#576C71]" />}
                  {filterRole === 'stakeholder' && <UserIcon className="h-5 w-5 text-[#8B5A4A]" />}
                  {filterRole === 'all' && <Users className="h-5 w-5 text-gray-400" />}
                </div>
                
                {/* Dropdown Arrow */}
                <svg 
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  fill="none" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="1.5" 
                    d="M6 8l4 4 4-4"
                  />
                </svg>
                
                {/* Custom Dropdown */}
                {showFilterRoleDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterRole('all');
                        setShowFilterRoleDropdown(false);
                      }}
                      className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 relative whitespace-nowrap"
                    >
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      All Roles
                    </button>
                    {viewMode === 'system-admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterRole('system-admin');
                          setShowFilterRoleDropdown(false);
                        }}
                        className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 relative whitespace-nowrap"
                      >
                        <Crown className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#C89212]" />
                        System Admin
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFilterRole('product-owner');
                        setShowFilterRoleDropdown(false);
                      }}
                      className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 relative whitespace-nowrap"
                    >
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#576C71]" />
                      Product Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterRole('stakeholder');
                        setShowFilterRoleDropdown(false);
                      }}
                      className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 last:border-b-0 relative whitespace-nowrap"
                    >
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8B5A4A]" />
                      Stakeholder
                    </button>
                  </div>
                )}
              </div>

              <div className="relative" ref={filterProductDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowFilterProductDropdown(!showFilterProductDropdown)}
                  className="px-4 py-2 pl-12 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left min-w-[200px]"
                >
                  {filterProductId 
                    ? getAccessibleProducts().find(p => p.id === filterProductId)?.name || 'All Products'
                    : 'All Products'}
                </button>
                
                {/* Product Color Icon */}
                <div 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md pointer-events-none"
                  style={{ 
                    backgroundColor: (() => {
                      const prod = getAccessibleProducts().find(p => p.id === filterProductId);
                      return prod ? getProductColor(prod.name, prod.color_hex ?? null).background : 'transparent';
                    })()
                  }}
                />
                
                {/* Dropdown Arrow */}
                <svg 
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  fill="none" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    stroke="currentColor" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="1.5" 
                    d="M6 8l4 4 4-4"
                  />
                </svg>
                
                {/* Custom Dropdown */}
                {showFilterProductDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto overflow-x-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterProductId('');
                        setShowFilterProductDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-500 border-b border-gray-100"
                    >
                      All Products
                    </button>
                    {getAccessibleProducts().map(product => {
                      const productColor = getProductColor(product.name, product.color_hex ?? null);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setFilterProductId(product.id);
                            setShowFilterProductDropdown(false);
                          }}
                          className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 relative whitespace-nowrap"
                        >
                          <div 
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md"
                            style={{ backgroundColor: productColor.background }}
                          />
                          {product.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterRole('all');
                  setFilterProductId('');
                }}
                className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                title="Clear all filters"
              >
                <FilterX className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div>
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
                          className={`${hoveredUserId === user.id && !openDropdown ? 'bg-gray-50' : ''} cursor-pointer`}
                          onMouseEnter={() => {
                            if (!openDropdown) {
                              setHoveredUserId(user.id);
                            }
                          }}
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
                                  {formatUserName(user.name)}
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
                                  {((hoveredUserId === user.id && !openDropdown) || openDropdown === user.id) && (
                                    <button
                                      onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                                      className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                                      title="Change user role"
                                    >
                                      <MoreVertical className="h-5 w-5 text-gray-600" />
                                    </button>
                                  )}
                                  
                                  {/* Dropdown menu */}
                                  {openDropdown === user.id && (
                                    <div 
                                      className="absolute right-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg"
                                      style={{ 
                                        zIndex: 1000,
                                        top: 'auto',
                                        bottom: 'auto',
                                        marginTop: '0.25rem',
                                        maxHeight: 'calc(100vh - 100px)',
                                        overflowY: 'auto'
                                      }}
                                    >
                                      <div>
                                        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                          Manage User Roles
                                        </div>

                                        {/* Add Role */}
                                        <button
                                          onClick={() => openRoleModal(user, 'product-owner')}
                                          className="w-full px-4 py-3 text-left flex items-center hover:bg-green-50 text-green-700 transition-colors cursor-pointer"
                                        >
                                          <Plus className="h-5 w-5 mr-3 flex-shrink-0" />
                                          <div>
                                            <div className="font-medium text-base">Add Role</div>
                                            <div className="text-xs text-gray-500">Add Role Permissions</div>
                                          </div>
                                        </button>

                                        {/* Remove Role - only show if user has any roles */}
                                        {(user.roles.isSystemAdmin || user.roles.productOwnerCount > 0 || user.roles.stakeholderSessionCount > 0) && (
                                          <button
                                            onClick={() => openRoleModal(user, 'remove-stakeholder')}
                                            className="w-full px-4 py-3 text-left flex items-center hover:bg-red-50 text-red-700 border-t border-gray-200 transition-colors cursor-pointer"
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

                                        {/* User Functions header - only show if there are buttons to display */}
                                        {viewMode === 'system-admin' && (
                                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-200">
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
                                            className="w-full px-4 py-3 text-left flex items-center hover:bg-[#1E5461]/10 text-[#1E5461] border-t border-gray-200 transition-colors cursor-pointer"
                                          >
                                            <Edit className="h-5 w-5 mr-3 flex-shrink-0" />
                                            <div>
                                              <div className="font-medium text-base">Edit User Profile</div>
                                              <div className="text-xs text-gray-500">Update name and email</div>
                                            </div>
                                          </button>
                                        )}

                                        {/* Delete User - Only show for System Admins */}
                                        {viewMode === 'system-admin' && !protectedEmails.has(user.email) && (
                                          <button
                                            onClick={() => {
                                              setOpenDropdown(null);
                                              handleDeleteUser(user.id, user.name);
                                            }}
                                            className={`w-full px-4 py-3 text-left flex items-center hover:bg-[#8B5A4A]/10 text-[#8B5A4A] border-t border-gray-200 transition-colors ${
                                              protectedUserIds.has(user.id)
                                                ? 'opacity-50 cursor-not-allowed' 
                                                : 'cursor-pointer'
                                            }`}
                                            disabled={protectedUserIds.has(user.id)}
                                          >
                                            <Trash2 className="h-5 w-5 mr-3 flex-shrink-0" />
                                            <div>
                                              <div className="font-medium text-base">Delete User</div>
                                              <div className="text-xs text-gray-500">
                                                {protectedUserIds.has(user.id)
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
                <span className="text-gray-600">Total Users: <strong>{filteredUsers.length}</strong></span>
              </div>
              {/* Only show System Admin count in System Admin view */}
              {viewMode === 'system-admin' && (
                <div className="flex items-center">
                  <Crown className="h-4 w-4 mr-2 text-[#C89212]" />
                  <span className="text-gray-600">System Admins: <strong>{filteredUsers.filter(u => u.roles.isSystemAdmin).length}</strong></span>
                </div>
              )}
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-[#576C71]" />
                <span className="text-gray-600">Product Owners: <strong>{filteredUsers.filter(u => u.roles.productOwnerCount > 0).length}</strong></span>
              </div>
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 mr-2 text-[#8B5A4A]" />
                <span className="text-gray-600">Stakeholders: <strong>{filteredUsers.filter(u => u.roles.stakeholderSessionCount > 0).length}</strong></span>
              </div>
            </div>
          </div>
        </div>

      </div>


      {/* Role Assignment Modal */}
      {showRoleModal && selectedUserForRole && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowRoleModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: 'calc(100vh - 4rem)' }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#8B5A4A]/10 flex items-center justify-center">
                  {roleModalType === 'product-owner' ? (
                    <Shield className="h-6 w-6 text-[#576C71]" />
                  ) : (
                    <UserIcon className="h-6 w-6 text-[#8B5A4A]" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {roleModalType === 'remove-stakeholder' ? 'Remove Role' : 'Add Role'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {roleModalType === 'remove-stakeholder' ? 'Remove' : 'Add'} {formatUserName(selectedUserForRole.name)} ({selectedUserForRole.email}) {roleModalType === 'remove-stakeholder' ? 'from' : 'to'} sessions
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
                {/* Role Selection for remove mode */}
                {roleModalType === 'remove-stakeholder' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Role to Remove <span className="text-red-500">*</span>
                    </label>
                    
                    {/* System Admin Role - Only show if user is System Admin */}
                    {selectedUserForRole.roles.isSystemAdmin && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-3 cursor-pointer flex-shrink-0"
                          onClick={() => {
                            const newValue = selectedRoleToRemove === 'system-admin' ? null : 'system-admin';
                            setSelectedRoleToRemove(newValue);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                              <Crown
                                className="h-4 w-4 text-[#D4AF37] transition-transform"
                                style={{
                                  transform: selectedRoleToRemove === 'system-admin' ? 'scale(2)' : 'scale(1)',
                                  transformOrigin: 'center'
                                }}
                              />
                            </span>
                            <span className="text-sm font-medium text-gray-700">System Admin</span>
                          </div>
                          <span
                            className="flex items-center justify-center w-6 h-6 border rounded-md transition-colors"
                            style={{
                              borderColor: '#D4AF37',
                              backgroundColor: selectedRoleToRemove === 'system-admin' ? '#D4AF37' : '#ffffff'
                            }}
                          >
                            {selectedRoleToRemove === 'system-admin' && (
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
                        </div>
                      </div>
                    )}

                    {/* Product Owner Role */}
                    {selectedUserForRole.roles.productOwnerCount > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-start gap-3">
                          <div 
                            className="flex items-center gap-3 cursor-pointer flex-shrink-0"
                            onClick={() => {
                              const newValue = selectedRoleToRemove === 'product-owner' ? null : 'product-owner';
                              setSelectedRoleToRemove(newValue);
                              setRoleModalProductId('');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                <Shield
                                  className="h-4 w-4 text-[#576C71] transition-transform"
                                  style={{
                                    transform: selectedRoleToRemove === 'product-owner' ? 'scale(2)' : 'scale(1)',
                                    transformOrigin: 'center'
                                  }}
                                />
                              </span>
                              <span className="text-sm font-medium text-gray-700">Product Owner</span>
                            </div>
                            <span
                              className="flex items-center justify-center w-6 h-6 border rounded-md transition-colors"
                              style={{
                                borderColor: '#576C71',
                                backgroundColor: selectedRoleToRemove === 'product-owner' ? '#576C71' : '#ffffff'
                              }}
                            >
                              {selectedRoleToRemove === 'product-owner' && (
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
                          </div>
                          
                          {selectedRoleToRemove === 'product-owner' && (() => {
                            const availableProducts = getRoleModalProducts();
                            if (availableProducts.length === 1) {
                              const product = availableProducts[0];
                              const productColor = getProductColor(product.name, product.color_hex ?? null);
                              // Auto-select the only product
                              if (roleModalProductId !== product.id) {
                                setRoleModalProductId(product.id);
                              }
                              return (
                                <div className="flex-1 pt-0.5">
                                  <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50" style={{ marginTop: '-11px' }}>
                                    <div 
                                      className="w-6 h-6 rounded-md flex-shrink-0"
                                      style={{ backgroundColor: productColor.background }}
                                    />
                                    <span className="text-sm text-gray-700">{product.name}</span>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex-1 pt-0.5" ref={roleModalProductDropdownRef}>
                                  <div className="relative" style={{ marginTop: '-11px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setShowRoleModalProductDropdown(!showRoleModalProductDropdown)}
                                      className="w-full px-4 py-2 pl-12 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent bg-white text-left"
                                    >
                                      {roleModalProductId 
                                        ? availableProducts.find(p => p.id === roleModalProductId)?.name || 'Select a product...'
                                        : 'Select a product...'}
                                    </button>
                                    
                                    {/* Product Color Icon */}
                                    <div 
                                      className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md pointer-events-none"
                                      style={{ 
                                        backgroundColor: (() => {
                                          const prod = availableProducts.find(p => p.id === roleModalProductId);
                                          return prod ? getProductColor(prod.name, prod.color_hex ?? null).background : 'transparent';
                                        })()
                                      }}
                                    />
                                    
                                    {/* Dropdown Arrow */}
                                    <svg 
                                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                                      fill="none" 
                                      viewBox="0 0 20 20"
                                    >
                                      <path 
                                        stroke="currentColor" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth="1.5" 
                                        d="M6 8l4 4 4-4"
                                      />
                                    </svg>
                                    
                                    {/* Custom Dropdown */}
                                    {showRoleModalProductDropdown && (
                                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRoleModalProductId('');
                                            setShowRoleModalProductDropdown(false);
                                          }}
                                          className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-500 border-b border-gray-100"
                                        >
                                          Select a product...
                                        </button>
                                        {availableProducts.map(product => {
                                          const productColor = getProductColor(product.name, product.color_hex ?? null);
                                          return (
                                            <button
                                              key={product.id}
                                              type="button"
                                              onClick={() => {
                                                setRoleModalProductId(product.id);
                                                setShowRoleModalProductDropdown(false);
                                              }}
                                              className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 relative"
                                            >
                                              <div 
                                                className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md"
                                                style={{ backgroundColor: productColor.background }}
                                              />
                                              {product.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Stakeholder Role */}
                    {selectedUserForRole.roles.stakeholderSessionCount > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-start gap-3">
                          <div 
                            className="flex items-center gap-3 cursor-pointer flex-shrink-0"
                            onClick={() => {
                              const newValue = selectedRoleToRemove === 'stakeholder' ? null : 'stakeholder';
                              setSelectedRoleToRemove(newValue);
                              setRoleModalProductId('');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                <UserIcon
                                  className="h-4 w-4 text-[#8B5A4A] transition-transform"
                                  style={{
                                    transform: selectedRoleToRemove === 'stakeholder' ? 'scale(2)' : 'scale(1)',
                                    transformOrigin: 'center'
                                  }}
                                />
                              </span>
                              <span className="text-sm font-medium text-gray-700">Stakeholder</span>
                            </div>
                            <span
                              className="flex items-center justify-center w-6 h-6 border rounded-md transition-colors"
                              style={{
                                borderColor: '#8B5A4A',
                                backgroundColor: selectedRoleToRemove === 'stakeholder' ? '#8B5A4A' : '#ffffff'
                              }}
                            >
                              {selectedRoleToRemove === 'stakeholder' && (
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
                          </div>
                          
                          {selectedRoleToRemove === 'stakeholder' && (() => {
                            const availableProducts = getRoleModalProducts();
                            if (availableProducts.length === 1) {
                              const product = availableProducts[0];
                              const productColor = getProductColor(product.name, product.color_hex ?? null);
                              // Auto-select the only product
                              if (roleModalProductId !== product.id) {
                                setRoleModalProductId(product.id);
                              }
                              return (
                                <div className="flex-1 pt-0.5">
                                  <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50" style={{ marginTop: '-11px' }}>
                                    <div 
                                      className="w-6 h-6 rounded-md flex-shrink-0"
                                      style={{ backgroundColor: productColor.background }}
                                    />
                                    <span className="text-sm text-gray-700">{product.name}</span>
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                <div className="flex-1 pt-0.5" ref={roleModalProductDropdownRef}>
                                  <div className="relative" style={{ marginTop: '-11px' }}>
                                    <button
                                      type="button"
                                      onClick={() => setShowRoleModalProductDropdown(!showRoleModalProductDropdown)}
                                      className="w-full px-4 py-2 pl-12 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent bg-white text-left"
                                    >
                                      {roleModalProductId 
                                        ? availableProducts.find(p => p.id === roleModalProductId)?.name || 'Select a product...'
                                        : 'Select a product...'}
                                    </button>
                                    
                                    {/* Product Color Icon */}
                                    <div 
                                      className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md pointer-events-none"
                                      style={{ 
                                        backgroundColor: (() => {
                                          const prod = availableProducts.find(p => p.id === roleModalProductId);
                                          return prod ? getProductColor(prod.name, prod.color_hex ?? null).background : 'transparent';
                                        })()
                                      }}
                                    />
                                    
                                    {/* Dropdown Arrow */}
                                    <svg 
                                      className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                                      fill="none" 
                                      viewBox="0 0 20 20"
                                    >
                                      <path 
                                        stroke="currentColor" 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth="1.5" 
                                        d="M6 8l4 4 4-4"
                                      />
                                    </svg>
                                    
                                    {/* Custom Dropdown */}
                                    {showRoleModalProductDropdown && (
                                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setRoleModalProductId('');
                                            setShowRoleModalProductDropdown(false);
                                          }}
                                          className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-500 border-b border-gray-100"
                                        >
                                          Select a product...
                                        </button>
                                        {availableProducts.map(product => {
                                          const productColor = getProductColor(product.name, product.color_hex ?? null);
                                          return (
                                            <button
                                              key={product.id}
                                              type="button"
                                              onClick={() => {
                                                setRoleModalProductId(product.id);
                                                setShowRoleModalProductDropdown(false);
                                              }}
                                              className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 relative"
                                            >
                                              <div 
                                                className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md"
                                                style={{ backgroundColor: productColor.background }}
                                              />
                                              {product.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Role Selection for Add operations */}
                {(roleModalType === 'product-owner' || roleModalType === 'stakeholder' || roleModalType === 'system-admin') && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Role to Add <span className="text-red-500">*</span>
                    </label>
                    
                    {/* System Admin Role - Only visible to System Admins for non-admin users */}
                    {isSystemAdmin && !selectedUserForRole?.roles.isSystemAdmin && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-3 cursor-pointer flex-shrink-0"
                          onClick={() => {
                            const newValue = selectedRoleToAdd === 'system-admin' ? null : 'system-admin';
                            setSelectedRoleToAdd(newValue);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                              <Crown
                                className="h-4 w-4 text-[#D4AF37] transition-transform"
                                style={{
                                  transform: selectedRoleToAdd === 'system-admin' ? 'scale(2)' : 'scale(1)',
                                  transformOrigin: 'center'
                                }}
                              />
                            </span>
                            <span className="text-sm font-medium text-gray-700">System Admin</span>
                          </div>
                          <span
                            className="flex items-center justify-center w-6 h-6 border rounded-md transition-colors"
                            style={{
                              borderColor: '#D4AF37',
                              backgroundColor: selectedRoleToAdd === 'system-admin' ? '#D4AF37' : '#ffffff'
                            }}
                          >
                            {selectedRoleToAdd === 'system-admin' && (
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
                        </div>
                      </div>
                    )}

                    {/* Product Owner Role - Only visible to System Admins */}
                    {isSystemAdmin && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-start gap-3">
                          <div 
                            className="flex items-center gap-3 cursor-pointer flex-shrink-0"
                            onClick={() => {
                              const newValue = selectedRoleToAdd === 'product-owner' ? null : 'product-owner';
                              setSelectedRoleToAdd(newValue);
                              setRoleModalProductId('');
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                <Shield
                                  className="h-4 w-4 text-[#576C71] transition-transform"
                                  style={{
                                    transform: selectedRoleToAdd === 'product-owner' ? 'scale(2)' : 'scale(1)',
                                    transformOrigin: 'center'
                                  }}
                                />
                              </span>
                              <span className="text-sm font-medium text-gray-700">Product Owner</span>
                            </div>
                            <span
                              className="flex items-center justify-center w-6 h-6 border rounded-md transition-colors"
                              style={{
                                borderColor: '#576C71',
                                backgroundColor: selectedRoleToAdd === 'product-owner' ? '#576C71' : '#ffffff'
                              }}
                            >
                              {selectedRoleToAdd === 'product-owner' && (
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
                          </div>
                          
                          {selectedRoleToAdd === 'product-owner' && (() => {
                          const availableProducts = getRoleModalProducts();
                          if (availableProducts.length === 1) {
                            const product = availableProducts[0];
                            const productColor = getProductColor(product.name, product.color_hex ?? null);
                            // Auto-select the only product
                            if (roleModalProductId !== product.id) {
                              setRoleModalProductId(product.id);
                            }
                            return (
                              <div className="flex-1 pt-0.5">
                                <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50" style={{ marginTop: '-11px' }}>
                                  <div 
                                    className="w-6 h-6 rounded-md flex-shrink-0"
                                    style={{ backgroundColor: productColor.background }}
                                  />
                                  <span className="text-sm text-gray-700">{product.name}</span>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex-1 pt-0.5" ref={roleModalProductDropdownRef}>
                                <div className="relative" style={{ marginTop: '-11px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowRoleModalProductDropdown(!showRoleModalProductDropdown)}
                                    className="w-full px-4 py-2 pl-12 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent bg-white text-left"
                                  >
                                    {roleModalProductId 
                                      ? availableProducts.find(p => p.id === roleModalProductId)?.name || 'Select a product...'
                                      : 'Select a product...'}
                                  </button>
                                  
                                  {/* Product Color Icon */}
                                  <div 
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md pointer-events-none"
                                    style={{ 
                                      backgroundColor: (() => {
                                        const prod = availableProducts.find(p => p.id === roleModalProductId);
                                        return prod ? getProductColor(prod.name, prod.color_hex ?? null).background : 'transparent';
                                      })()
                                    }}
                                  />
                                  
                                  {/* Dropdown Arrow */}
                                  <svg 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                                    fill="none" 
                                    viewBox="0 0 20 20"
                                  >
                                    <path 
                                      stroke="currentColor" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      strokeWidth="1.5" 
                                      d="M6 8l4 4 4-4"
                                    />
                                  </svg>
                                  
                                  {/* Custom Dropdown */}
                                  {showRoleModalProductDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRoleModalProductId('');
                                          setShowRoleModalProductDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-500 border-b border-gray-100"
                                      >
                                        Select a product...
                                      </button>
                                      {availableProducts.map(product => {
                                        const productColor = getProductColor(product.name, product.color_hex ?? null);
                                        return (
                                          <button
                                            key={product.id}
                                            type="button"
                                            onClick={() => {
                                              setRoleModalProductId(product.id);
                                              setShowRoleModalProductDropdown(false);
                                            }}
                                            className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 relative"
                                          >
                                            <div 
                                              className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md"
                                              style={{ backgroundColor: productColor.background }}
                                            />
                                            {product.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        })()}
                        </div>
                      </div>
                    )}

                    {/* Stakeholder Role */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-start gap-3">
                        <div 
                          className="flex items-center gap-3 cursor-pointer flex-shrink-0"
                          onClick={() => {
                            const newValue = selectedRoleToAdd === 'stakeholder' ? null : 'stakeholder';
                            setSelectedRoleToAdd(newValue);
                            setRoleModalProductId('');
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                              <UserIcon
                                className="h-4 w-4 text-[#8B5A4A] transition-transform"
                                style={{
                                  transform: selectedRoleToAdd === 'stakeholder' ? 'scale(2)' : 'scale(1)',
                                  transformOrigin: 'center'
                                }}
                              />
                            </span>
                            <span className="text-sm font-medium text-gray-700">Stakeholder</span>
                          </div>
                          <span
                            className="flex items-center justify-center w-6 h-6 border rounded-md transition-colors"
                            style={{
                              borderColor: '#8B5A4A',
                              backgroundColor: selectedRoleToAdd === 'stakeholder' ? '#8B5A4A' : '#ffffff'
                            }}
                          >
                            {selectedRoleToAdd === 'stakeholder' && (
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
                        </div>
                        
                        {selectedRoleToAdd === 'stakeholder' && (() => {
                          const availableProducts = getRoleModalProducts();
                          if (availableProducts.length === 1) {
                            const product = availableProducts[0];
                            const productColor = getProductColor(product.name, product.color_hex ?? null);
                            // Auto-select the only product
                            if (roleModalProductId !== product.id) {
                              setRoleModalProductId(product.id);
                            }
                            return (
                              <div className="flex-1 pt-0.5">
                                <div className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg bg-gray-50" style={{ marginTop: '-11px' }}>
                                  <div 
                                    className="w-6 h-6 rounded-md flex-shrink-0"
                                    style={{ backgroundColor: productColor.background }}
                                  />
                                  <span className="text-sm text-gray-700">{product.name}</span>
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex-1 pt-0.5" ref={roleModalProductDropdownRef}>
                                <div className="relative" style={{ marginTop: '-11px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowRoleModalProductDropdown(!showRoleModalProductDropdown)}
                                    className="w-full px-4 py-2 pl-12 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent bg-white text-left"
                                  >
                                    {roleModalProductId 
                                      ? availableProducts.find(p => p.id === roleModalProductId)?.name || 'Select a product...'
                                      : 'Select a product...'}
                                  </button>
                                  
                                  {/* Product Color Icon */}
                                  <div 
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md pointer-events-none"
                                    style={{ 
                                      backgroundColor: (() => {
                                        const prod = availableProducts.find(p => p.id === roleModalProductId);
                                        return prod ? getProductColor(prod.name, prod.color_hex ?? null).background : 'transparent';
                                      })()
                                    }}
                                  />
                                  
                                  {/* Dropdown Arrow */}
                                  <svg 
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                                    fill="none" 
                                    viewBox="0 0 20 20"
                                  >
                                    <path 
                                      stroke="currentColor" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round" 
                                      strokeWidth="1.5" 
                                      d="M6 8l4 4 4-4"
                                    />
                                  </svg>
                                  
                                  {/* Custom Dropdown */}
                                  {showRoleModalProductDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRoleModalProductId('');
                                          setShowRoleModalProductDropdown(false);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-500 border-b border-gray-100"
                                      >
                                        Select a product...
                                      </button>
                                      {availableProducts.map(product => {
                                        const productColor = getProductColor(product.name, product.color_hex ?? null);
                                        return (
                                          <button
                                            key={product.id}
                                            type="button"
                                            onClick={() => {
                                              setRoleModalProductId(product.id);
                                              setShowRoleModalProductDropdown(false);
                                            }}
                                            className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 relative"
                                          >
                                            <div 
                                              className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md"
                                              style={{ backgroundColor: productColor.background }}
                                            />
                                            {product.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={
                    (selectedRoleToRemove !== 'system-admin' && selectedRoleToAdd !== 'system-admin' && !roleModalProductId) || 
                    (roleModalType === 'remove-stakeholder' && !selectedRoleToRemove) ||
                    ((roleModalType === 'product-owner' || roleModalType === 'stakeholder' || roleModalType === 'system-admin') && !selectedRoleToAdd)
                  }
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    roleModalType === 'remove-stakeholder' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-[#2d4660] hover:bg-[#1E5461]'
                  }`}
                >
                  {roleModalType === 'remove-stakeholder' ? 'Remove Role' : 'Add Role'}
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
                    showAlert('Failed to Update User', 'An error occurred while updating the user information. Please try again.', 'error');
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
                {/* Azure AD User Search */}
                {showAzureSearchSection ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Company Users (Optional)
                    </label>
                    <div className="relative" ref={azureSearchRef}>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={azureUserSearch.searchTerm}
                            onChange={(e) => {
                              const term = e.target.value;
                              setAzureUserSearch(prev => ({ ...prev, searchTerm: term }));
                              handleAzureUserSearch(term);
                            }}
                            onFocus={() => {
                              if (azureUserSearch.results.length > 0) {
                                setAzureUserSearch(prev => ({ ...prev, showResults: true }));
                              }
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent"
                            placeholder="Search by name or email (min 2 characters)..."
                            disabled={isAddingUser}
                          />
                          {azureUserSearch.isSearching && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2D4660]"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    
                      {/* Search Results Dropdown */}
                      {azureUserSearch.showResults && azureUserSearch.results.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {azureUserSearch.results.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => selectAzureUser(user)}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="font-medium text-gray-900">{user.displayName}</div>
                              <div className="text-sm text-gray-500">{user.mail || user.userPrincipalName}</div>
                              {user.jobTitle && (
                                <div className="text-xs text-gray-400 mt-0.5">{user.jobTitle}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {azureUserSearch.error && (
                        <div className="absolute z-10 w-full mt-1 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 text-sm text-red-700">
                          <div className="font-medium mb-1">Search Error</div>
                          <div>{azureUserSearch.error}</div>
                          <div className="mt-2 text-xs text-red-600">
                            You can still enter the email manually below.
                          </div>
                        </div>
                      )}
                      {azureUserSearch.searchTerm.length >= 2 && !azureUserSearch.isSearching && azureUserSearch.results.length === 0 && !azureUserSearch.error && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm text-gray-500 text-center">
                          No users found. You can still enter the email manually below.
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Search for users in your organization by name or email, or enter manually below
                    </p>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#2D4660] hover:underline focus:outline-none"
                      onClick={() => {
                        setShowAzureSearchSection(true);
                        setAzureUserSearch({
                          searchTerm: '',
                          results: [],
                          isSearching: false,
                          showResults: false,
                          error: ''
                        });
                      }}
                      disabled={isAddingUser}
                    >
                      Search Company Users again
                    </button>
                  </div>
                )}

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
                        <div className="flex-1 pt-0.5" ref={productOwnerDropdownRef}>
                          <div className="relative" style={{ marginTop: '-11px' }}>
                            <button
                              type="button"
                              onClick={() => !isAddingUser && setShowProductOwnerDropdown(!showProductOwnerDropdown)}
                              disabled={isAddingUser}
                              className="w-full px-4 py-2 pl-12 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent bg-white text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {newUserData.productOwnerProductId 
                                ? allProducts.find(p => p.id === newUserData.productOwnerProductId)?.name || 'Select a product...'
                                : 'Select a product...'}
                            </button>
                            
                            {/* Product Color Icon */}
                            <div 
                              className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md pointer-events-none"
                              style={{ 
                                backgroundColor: newUserData.productOwnerProductId 
                                  ? (() => {
                                      const prod = allProducts.find(p => p.id === newUserData.productOwnerProductId);
                                      return prod ? getProductColor(prod.name, prod.color_hex ?? null).background : 'transparent';
                                    })()
                                  : 'transparent'
                              }}
                            />
                            
                            {/* Dropdown Arrow */}
                            <svg 
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                              fill="none" 
                              viewBox="0 0 20 20"
                            >
                              <path 
                                stroke="currentColor" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth="1.5" 
                                d="M6 8l4 4 4-4"
                              />
                            </svg>
                            
                            {/* Custom Dropdown */}
                            {showProductOwnerDropdown && (
                              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewUserData({ ...newUserData, productOwnerProductId: '' });
                                    setShowProductOwnerDropdown(false);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-500 border-b border-gray-100"
                                >
                                  Select a product...
                                </button>
                                {getAccessibleProducts().map(product => {
                                  const productColor = getProductColor(product.name, product.color_hex ?? null);
                                  return (
                                    <button
                                      key={product.id}
                                      type="button"
                                      onClick={() => {
                                        setNewUserData({ ...newUserData, productOwnerProductId: product.id });
                                        setShowProductOwnerDropdown(false);
                                      }}
                                      className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 relative"
                                    >
                                      <div 
                                        className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md"
                                        style={{ backgroundColor: productColor.background }}
                                      />
                                      {product.name}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
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
                      <div className="flex-1 pt-0.5" ref={stakeholderDropdownRef}>
                        <div className="relative" style={{ marginTop: '-11px' }}>
                          <button
                            type="button"
                            onClick={() => !isAddingUser && setShowStakeholderDropdown(!showStakeholderDropdown)}
                            disabled={isAddingUser}
                            className="w-full px-4 py-2 pl-12 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent bg-white text-left disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {newUserData.stakeholderProductId 
                              ? allProducts.find(p => p.id === newUserData.stakeholderProductId)?.name || 'Select a product...'
                              : 'Select a product...'}
                          </button>
                          
                          {/* Product Color Icon */}
                          <div 
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md pointer-events-none"
                            style={{ 
                              backgroundColor: newUserData.stakeholderProductId 
                                ? (() => {
                                    const prod = allProducts.find(p => p.id === newUserData.stakeholderProductId);
                                    return prod ? getProductColor(prod.name, prod.color_hex ?? null).background : 'transparent';
                                  })()
                                : 'transparent'
                            }}
                          />
                          
                          {/* Dropdown Arrow */}
                          <svg 
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                            fill="none" 
                            viewBox="0 0 20 20"
                          >
                            <path 
                              stroke="currentColor" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth="1.5" 
                              d="M6 8l4 4 4-4"
                            />
                          </svg>
                          
                          {/* Custom Dropdown */}
                          {showStakeholderDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewUserData({ ...newUserData, stakeholderProductId: '' });
                                  setShowStakeholderDropdown(false);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-500 border-b border-gray-100"
                              >
                                Select a product...
                              </button>
                              {getAccessibleProducts().map(product => {
                                const productColor = getProductColor(product.name, product.color_hex ?? null);
                                return (
                                  <button
                                    key={product.id}
                                    type="button"
                                    onClick={() => {
                                      setNewUserData({ ...newUserData, stakeholderProductId: product.id });
                                      setShowStakeholderDropdown(false);
                                    }}
                                    className="w-full px-4 py-2 pl-12 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 relative"
                                  >
                                    <div 
                                      className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md"
                                      style={{ backgroundColor: productColor.background }}
                                    />
                                    {product.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
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
              <div className="flex gap-3 justify-end mt-6 pt-4 border-gray-200">
                <button
                  onClick={handleAddUser}
                  disabled={isAddingUser || !newUserData.name.trim() || !newUserData.email.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2d4660] rounded-md hover:bg-[#1E5461] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(() => {
                    const roles: string[] = [];
                    if (newUserData.isSystemAdmin) roles.push('System Admin');
                    if (newUserData.isProductOwner && newUserData.productOwnerProductId) roles.push('Product Owner');
                    if (newUserData.isStakeholder && newUserData.stakeholderProductId) roles.push('Stakeholder');
                    
                    if (roles.length === 0) {
                      return isAddingUser ? 'Creating User...' : 'Create User';
                    }
                    const label = roles.join(' & ');
                    return isAddingUser ? `Adding ${label}...` : `Add ${label}`;
                  })()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              {/* Icon and Title */}
              <div className="flex items-start mb-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  alertModalConfig.type === 'success' ? 'bg-green-100' : 
                  alertModalConfig.type === 'error' ? 'bg-red-100' : 
                  'bg-blue-100'
                }`}>
                  {alertModalConfig.type === 'success' && <ShieldCheck className="h-6 w-6 text-green-600" />}
                  {alertModalConfig.type === 'error' && <X className="h-6 w-6 text-red-600" />}
                  {alertModalConfig.type === 'info' && <Shield className="h-6 w-6 text-blue-600" />}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {alertModalConfig.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {alertModalConfig.message}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowAlertModal(false)}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    alertModalConfig.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 
                    alertModalConfig.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 
                    'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer with role toggle - only render once */}
      {!loading && !error && (
        <Footer
          key="users-page-footer"
          currentRole={viewMode === 'system-admin' ? 'system-admin' : 'product-owner'}
          onSelectSystemAdmin={isSystemAdmin ? () => {
            setViewMode('system-admin');
            sessionStorage.setItem('usersViewMode', 'system-admin');
          } : undefined}
          onSelectProductOwner={(isSystemAdmin || isProductOwner) ? () => {
            setViewMode('product-owner');
            sessionStorage.setItem('usersViewMode', 'product-owner');
          } : undefined}
          showRoleToggle={isSystemAdmin || isProductOwner}
          isSessionAdmin={isProductOwner && !isSystemAdmin}
          helpText="Contact your Product Owner or IT administrator for assistance with user management."
        />
      )}
    </div>
  );
}
