// ============================================
// Users Management Screen
// ============================================
// Location: src/screens/UsersManagementScreen.tsx
// ============================================

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import type { User, VotingSession, Product } from '../types';
import type { UserRoleInfo } from '../services/databaseService';
import { 
  ChevronLeft, Users, Crown, Shield, ShieldCheck, User as UserIcon,
  Settings, List, LogOut, Search, X, MoreVertical, Trash2, UserX, Calendar, ChevronDown, CheckCircle, Info, Edit, Plus, Minus
} from 'lucide-react';
import { getProductColor } from '../utils/productColors';
import { supabase } from '../supabaseClient';
import mobileLogo from '../assets/New-Millennium-Icon-gold-on-blue-rounded-square.svg';
import desktopLogo from '../assets/New-Millennium-color-logo.svg';
import { searchAzureAdUsers, type AzureAdUser } from '../services/azureAdUserService';

interface SessionWithAssignment extends VotingSession {
  assignedAt?: string;
  assignedBy?: string;
  assignedByName?: string;
}

interface UserWithRoles extends User {
  roles: UserRoleInfo;
  adminInSessions?: SessionWithAssignment[];
  stakeholderInSessions?: SessionWithAssignment[];
}

type RoleModalType = 'stakeholder' | 'session-admin' | 'remove-stakeholder' | null;

const getInitialAzureSearchState = () => ({
  searchTerm: '',
  results: [] as AzureAdUser[],
  isSearching: false,
  showResults: false,
  error: ''
});

// Product Select Component
interface ProductSelectProps {
  products: Product[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: boolean;
  onProductChange?: () => void;
}

function ProductSelect({ products, value, onChange, label, error, onProductChange }: ProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProduct = products.find(p => p.id === value);
  const selectedColors = selectedProduct ? getProductColor(selectedProduct.name, selectedProduct.color_hex ?? null) : null;

  return (
    <div ref={dropdownRef} className="relative overflow-visible">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border rounded-md bg-white cursor-pointer flex items-center justify-between hover:border-gray-400 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedProduct && selectedColors && (
            <div
              className="w-4 h-4 rounded flex-shrink-0"
              style={{ backgroundColor: selectedColors.background }}
            />
          )}
          <span className={`text-sm truncate ${!value ? 'text-gray-400' : 'text-gray-900'}`}>
            {selectedProduct ? selectedProduct.name : 'Select a Product'}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'transform rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {products.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">No products available</div>
          ) : (
            products.map(product => {
              const colors = getProductColor(product.name, product.color_hex ?? null);
              const isSelected = value === product.id;
              return (
                <div
                  key={product.id}
                  onClick={() => {
                    onChange(product.id);
                    setIsOpen(false);
                    if (onProductChange) onProductChange();
                  }}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${
                    isSelected ? 'bg-gray-50' : ''
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: colors.background }}
                  />
                  <span className="text-sm text-gray-900 flex-1">{product.name}</span>
                  {isSelected && <CheckCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Product Session Selector Component (Reusable)
interface ProductSessionSelectorProps {
  products: Product[];
  sessions: VotingSession[];
  selectedProductId: string;
  onProductChange: (productId: string) => void;
  useAllSessions: boolean;
  onToggleAllSessions: (useAll: boolean) => void;
  selectedSessionIds: string[];
  onSessionToggle: (sessionId: string) => void;
  getSessionStatus: (session: VotingSession) => { text: string; color: string };
  formatSessionDateRange: (session: VotingSession) => string;
  filterSessions: (sessions: VotingSession[], productId: string) => VotingSession[];
}

function ProductSessionSelector({
  products,
  sessions,
  selectedProductId,
  onProductChange,
  useAllSessions,
  onToggleAllSessions,
  selectedSessionIds,
  onSessionToggle,
  getSessionStatus,
  formatSessionDateRange,
  filterSessions
}: ProductSessionSelectorProps) {
  const filteredSessions = selectedProductId ? filterSessions(sessions, selectedProductId) : [];

  return (
    <div className="space-y-3 overflow-visible">
      {/* Product Selection */}
      <div className="overflow-visible">
        <ProductSelect
          products={products}
          value={selectedProductId}
          onChange={(productId) => {
            onProductChange(productId);
            onToggleAllSessions(true);
          }}
          label="Product *"
        />
      </div>

      {/* Session Selection Toggle - Only show after product is selected */}
      {selectedProductId && (
        <div className="space-y-3">
          {/* Toggle: All Sessions / Select Sessions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Selection *
            </label>
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => onToggleAllSessions(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  !useAllSessions
                    ? 'bg-white text-[#2d4660] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Select Sessions
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleAllSessions(true);
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                  useAllSessions
                    ? 'bg-white text-[#2d4660] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Sessions
              </button>
            </div>
            {useAllSessions && (
              <p className="mt-2 text-xs text-gray-500">
                User will be added to all current and future sessions for this product
              </p>
            )}
          </div>

          {/* Session Selection List - Only show if "Select Sessions" is chosen */}
          {!useAllSessions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sessions * (Current and Future)
              </label>
              {filteredSessions.length === 0 ? (
                <p className="text-sm text-gray-500">No current or future sessions found for this product.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {filteredSessions.map((session) => (
                    <label
                      key={session.id}
                      className="flex items-start px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSessionIds.includes(session.id)}
                        onChange={() => onSessionToggle(session.id)}
                        className="w-4 h-4 border-gray-300 rounded focus:ring-[#2D4660] accent-green-600 mt-1"
                        style={{ accentColor: '#16a34a' }}
                      />
                      <div className="ml-3 flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {session.title || 'Unnamed Session'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {formatSessionDateRange(session)}
                        </div>
                        <div className="text-xs mt-0.5">
                          <span className={`font-medium ${getSessionStatus(session).color}`}>
                            {getSessionStatus(session).text}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Session MultiSelect Component
interface SessionMultiSelectProps {
  sessions: VotingSession[];
  selectedSessionIds: string[];
  onSelectionChange: (sessionIds: string[]) => void;
  label?: string;
}

function SessionMultiSelect({ sessions, selectedSessionIds, onSelectionChange, label }: SessionMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSession = (sessionId: string) => {
    if (selectedSessionIds.includes(sessionId)) {
      onSelectionChange(selectedSessionIds.filter(id => id !== sessionId));
    } else {
      onSelectionChange([...selectedSessionIds, sessionId]);
    }
  };

  const removeSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedSessionIds.filter(id => id !== sessionId));
  };

  const selectedSessions = sessions.filter(s => selectedSessionIds.includes(s.id));
  const displayText = selectedSessions.length > 0 
    ? `${selectedSessions.length} session${selectedSessions.length !== 1 ? 's' : ''} selected`
    : 'Select sessions...';

  return (
    <div ref={dropdownRef} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[42px] px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer flex items-center justify-between hover:border-gray-400"
      >
        <div className="flex-1 flex flex-wrap gap-1 items-center">
          {selectedSessions.length === 0 ? (
            <span className="text-sm text-gray-400">{displayText}</span>
          ) : (
            <>
              {selectedSessions.map(session => (
                <span
                  key={session.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full"
                >
                  <span className="truncate max-w-[150px]">{session.title || 'Unnamed Session'}</span>
                  <button
                    onClick={(e) => removeSession(session.id, e)}
                    className="hover:bg-green-200 rounded-full p-0.5"
                    type="button"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {sessions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              No current or future sessions found for this product.
            </div>
          ) : (
            sessions.map(session => {
              const isSelected = selectedSessionIds.includes(session.id);
              return (
                <div
                  key={session.id}
                  onClick={() => toggleSession(session.id)}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    isSelected ? 'bg-green-50' : ''
                  }`}
                >
                  <span className="text-sm text-gray-900">{session.title || 'Unnamed Session'}</span>
                  {isSelected && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

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
  const [expandedSessions, setExpandedSessions] = useState<{ userId: string; role: 'admin' | 'stakeholder' } | null>(null);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null); // Format: "userId-sessionId"
  
  // Helper function to get most recent active session
  const getMostRecentActiveSession = <T extends VotingSession>(sessions: T[]): T | null => {
    const now = new Date();
    const activeSessions = sessions.filter(s => {
      const startDate = s.start_date ? new Date(s.start_date) : null;
      const endDate = s.end_date ? new Date(s.end_date) : null;
      
      if (startDate && now < startDate) return false; // Upcoming
      if (endDate && now > endDate) return false; // Closed
      if (startDate && now >= startDate && (!endDate || now <= endDate)) return true; // Active
      return false;
    });
    
    if (activeSessions.length === 0) return null;
    
    // Sort by start date (most recent first)
    return activeSessions.sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;
      return dateB - dateA;
    })[0];
  };
  
  // Protected email addresses - hide trash cans for these users
  const protectedEmails = new Set([
    'spencer.faull@newmill.com',
    'chris.rodes@newmill.com',
    'dave.hoffman@newmill.com'
  ]);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const azureSearchRef = useRef<HTMLDivElement | null>(null);
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
  const [userSessionMemberships, setUserSessionMemberships] = useState<{
    adminSessions: string[];
    stakeholderSessions: string[];
  }>({ adminSessions: [], stakeholderSessions: [] });
  
  // Role modal product/session selection state
  const [roleModalProductId, setRoleModalProductId] = useState<string>('');
  const [roleModalUseAllSessions, setRoleModalUseAllSessions] = useState<boolean>(true);
  const [roleModalSelectedSessionIds, setRoleModalSelectedSessionIds] = useState<string[]>([]);
  
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
    isSystemAdmin: false,
    sessionAdminIds: [] as string[],
    stakeholderSessionIds: [] as string[]
  });
  const [azureUserSearch, setAzureUserSearch] = useState(getInitialAzureSearchState());
  const [showAzureSearchSection, setShowAzureSearchSection] = useState(true);
  const [isAzureSignedIn, setIsAzureSignedIn] = useState<boolean | null>(null);
  const [accordionOpen, setAccordionOpen] = useState({
    sessionAdmin: false,
    stakeholder: false
  });
  const [pageTitle, setPageTitle] = useState('User Management');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [filteredSessionsForProduct, setFilteredSessionsForProduct] = useState<VotingSession[]>([]);
  const [selectedProductIdForSessionAdmin, setSelectedProductIdForSessionAdmin] = useState<string>('');
  const [filteredSessionsForSessionAdmin, setFilteredSessionsForSessionAdmin] = useState<VotingSession[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{ email: string; userType: string } | null>(null);
  const [useAllSessionsForStakeholder, setUseAllSessionsForStakeholder] = useState<boolean>(true);
  const [useAllSessionsForSessionAdmin, setUseAllSessionsForSessionAdmin] = useState<boolean>(true);

  const sessionAdminActive =
    Boolean(selectedProductIdForSessionAdmin) &&
    (useAllSessionsForSessionAdmin || newUserData.sessionAdminIds.length > 0);

  const stakeholderActive =
    Boolean(selectedProductId) &&
    (useAllSessionsForStakeholder || newUserData.stakeholderSessionIds.length > 0);

  const sessionAdminProductName = products.find(p => p.id === selectedProductIdForSessionAdmin)?.name || '';

  const stakeholderProductName = products.find(p => p.id === selectedProductId)?.name || '';

  const formatSessionNames = (sessionIds: string[]) => {
    const selected = sessionIds
      .map(id => allSessions.find(session => session.id === id))
      .filter((session): session is VotingSession => Boolean(session));
    if (selected.length === 0) return '';
    const titles = selected.map(session => session.title || 'Unnamed Session');
    return titles.join(', ');
  };

  const sessionAdminSummary = sessionAdminActive
    ? `${sessionAdminProductName || 'Selected Product'} · ${
        useAllSessionsForSessionAdmin
          ? 'All Sessions'
          : formatSessionNames(newUserData.sessionAdminIds) || 'Sessions selected'
      }`
    : '';

  const stakeholderSummary = stakeholderActive
    ? `${stakeholderProductName || 'Selected Product'} · ${
        useAllSessionsForStakeholder
          ? 'All Sessions'
          : formatSessionNames(newUserData.stakeholderSessionIds) || 'Sessions selected'
      }`
    : '';

  const selectedRoleLabels = (() => {
    const roles: string[] = [];
    if (newUserData.isSystemAdmin) roles.push('System Admin');
    if (sessionAdminActive) roles.push('Session Admin');
    if (stakeholderActive) roles.push('Stakeholder');
    return roles;
  })();

  const getRoleButtonLabel = (isLoading: boolean) => {
    if (selectedRoleLabels.length === 0) {
      return isLoading ? 'Creating User...' : 'Create User';
    }
    const label = selectedRoleLabels.join(' & ');
    return isLoading ? `Adding ${label}...` : `Add ${label}`;
  };

  // Edit user modal state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserWithRoles | null>(null);
  const [editingUserName, setEditingUserName] = useState('');
  const [editingUserEmail, setEditingUserEmail] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const handleLogout = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    
    try {
      setCurrentSession(null as any);
    } catch (error) {
      console.error('Error clearing session:', error);
    }
    
    setCurrentUser(null);
    
    try {
      localStorage.removeItem('voting_system_current_session');
      localStorage.removeItem('voting_system_user');
      localStorage.removeItem('azureDevOpsAuthInProgress');
      sessionStorage.removeItem('oauth_return_path');
      sessionStorage.removeItem('oauth_action');
      sessionStorage.removeItem('oauth_error');
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
    
    setMobileMenuOpen(false);
    
    // Navigate to login - React Router handles basename automatically
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

  const loadProducts = useCallback(async () => {
    try {
      const productsList = await db.getProducts();
      // Use already loaded allSessions instead of fetching again
      const now = new Date();
      
      // Filter products to only show those with active or upcoming sessions
      const productsWithSessions = productsList.filter(product => {
        return allSessions.some(session => {
          if (session.product_id !== product.id) return false;
          const endDate = new Date(session.end_date);
          return endDate >= now; // Only current and future sessions
        });
      });
      
      setProducts(productsWithSessions);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, [allSessions]);

  const clearSessionAdminSelections = () => {
    setSelectedProductIdForSessionAdmin('');
    setFilteredSessionsForSessionAdmin([]);
    setNewUserData(prev => ({ ...prev, sessionAdminIds: [] }));
    setUseAllSessionsForSessionAdmin(true);
    setAccordionOpen(prev => ({ ...prev, sessionAdmin: false }));
  };

  const clearStakeholderSelections = () => {
    setSelectedProductId('');
    setNewUserData(prev => ({ ...prev, stakeholderSessionIds: [] }));
    setUseAllSessionsForStakeholder(true);
    setAccordionOpen(prev => ({ ...prev, stakeholder: false }));
  };

  const filterSessionsByProduct = (productId: string) => {
    if (!productId) {
      setFilteredSessionsForProduct([]);
      return;
    }
    const now = new Date();
    const filtered = allSessions.filter(session => {
      // Filter by product
      if (session.product_id !== productId) return false;
      // Only show current and future sessions (not past)
      const endDate = new Date(session.end_date);
      return endDate >= now;
    });
    setFilteredSessionsForProduct(filtered);
  };

  useEffect(() => {
    if (selectedProductId) {
      filterSessionsByProduct(selectedProductId);
    } else {
      setFilteredSessionsForProduct([]);
    }
  }, [selectedProductId, allSessions]);

  const filterSessionsForSessionAdmin = (productId: string) => {
    if (!productId) {
      setFilteredSessionsForSessionAdmin([]);
      return;
    }
    const now = new Date();
    const filtered = allSessions.filter(session => {
      // Filter by product
      if (session.product_id !== productId) return false;
      // Only show current and future sessions (not past)
      const endDate = new Date(session.end_date);
      return endDate >= now;
    });
    setFilteredSessionsForSessionAdmin(filtered);
  };

  useEffect(() => {
    if (selectedProductIdForSessionAdmin) {
      filterSessionsForSessionAdmin(selectedProductIdForSessionAdmin);
    } else {
      setFilteredSessionsForSessionAdmin([]);
    }
  }, [selectedProductIdForSessionAdmin, allSessions]);

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
    
    try {
      // Fetch all data in parallel
      const [allUsers, allAdminRelations, allStakeholderRelations] = await Promise.all([
        db.getAllUsers(),
        // Fetch all session_admin relations at once
        supabase
          .from('session_admins')
          .select('user_id, session_id, created_at')
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching all admin relations:', error);
              return [];
            }
            return data || [];
          }),
        // Fetch all session_stakeholder relations at once
        // Note: session_stakeholders table uses user_email, not user_id
        supabase
          .from('session_stakeholders')
          .select('user_email, session_id, created_at')
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching all stakeholder relations:', error);
              return [];
            }
            return data || [];
          })
      ]);
      
      // Build maps for fast lookup
      const adminRelationsByUser = new Map<string, Array<{ session_id: string; created_at: string }>>();
      allAdminRelations.forEach(rel => {
        if (!adminRelationsByUser.has(rel.user_id)) {
          adminRelationsByUser.set(rel.user_id, []);
        }
        adminRelationsByUser.get(rel.user_id)!.push({
          session_id: rel.session_id,
          created_at: rel.created_at
        });
      });
      
      const stakeholderRelationsByUser = new Map<string, Array<{ session_id: string; created_at: string }>>();
      allStakeholderRelations.forEach(rel => {
        // session_stakeholders uses user_email, not user_id
        const key = rel.user_email?.toLowerCase() || '';
        if (key) {
          if (!stakeholderRelationsByUser.has(key)) {
            stakeholderRelationsByUser.set(key, []);
          }
          stakeholderRelationsByUser.get(key)!.push({
            session_id: rel.session_id,
            created_at: rel.created_at
          });
        }
      });
      
      // Create session lookup map
      const sessionMap = new Map(sessions.map(s => [s.id, s]));
      
      // Process users with pre-loaded data
      const usersWithRoles = await Promise.all(
        allUsers.map(async (user) => {
          const roles = await db.getUserRoleInfo(user.id);
          
          const adminInSessions: SessionWithAssignment[] = [];
          const stakeholderInSessions: SessionWithAssignment[] = [];
          
          // Get admin sessions from pre-loaded data
          const userAdminRelations = adminRelationsByUser.get(user.id) || [];
          userAdminRelations.forEach(rel => {
            const session = sessionMap.get(rel.session_id);
            if (session) {
              adminInSessions.push({
                ...session,
                assignedAt: rel.created_at,
                assignedBy: 'System',
                assignedByName: 'System'
              });
            }
          });
          
          // Get stakeholder sessions from pre-loaded data
          // session_stakeholders uses user_email, not user_id
          const userEmailKey = user.email.toLowerCase();
          const userStakeholderRelations = stakeholderRelationsByUser.get(userEmailKey) || [];
          userStakeholderRelations.forEach(rel => {
            const session = sessionMap.get(rel.session_id);
            if (session) {
              stakeholderInSessions.push({
                ...session,
                assignedAt: rel.created_at,
                assignedBy: 'System',
                assignedByName: 'System'
              });
            }
          });
          
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
      // Get all sessions first (needed for both system and session admins)
      const allSessionsCheck = await db.getAllSessions();
      
      // Check system admin and session admin status in parallel
      const [sysAdmin, adminRelations] = await Promise.all([
        db.isUserSystemAdmin(currentUser.id),
        // Fetch all session_admin relations for this user at once (much faster than N queries)
        supabase
          .from('session_admins')
          .select('session_id')
          .eq('user_id', currentUser.id)
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching admin sessions:', error);
              return [];
            }
            return (data || []).map(r => r.session_id);
          })
      ]);
      
      setIsSystemAdmin(sysAdmin);
      
      // Check if user is a session admin
      const sessionAdminSessions: string[] = adminRelations;
      
      if (!sysAdmin) {
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
        // Load original admin ID and users in parallel
        await Promise.all([
          loadOriginalAdminId(),
          loadUsers(allSessionsCheck)
        ]);
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
            return user.roles.sessionAdminCount > 0;
          case 'stakeholder':
            return user.roles.stakeholderSessionCount > 0;
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
  // Session admins can only filter by 'stakeholder' or 'none'
  // When switching to system-admin, always default to 'all'
  useEffect(() => {
    if (viewMode === 'session-admin') {
      if (filterRole === 'system-admin' || filterRole === 'session-admin' || filterRole === 'all') {
        setFilterRole('stakeholder');
      }
    } else if (viewMode === 'system-admin') {
      // When switching to system-admin view, always reset filter to 'all'
      setFilterRole('all');
    }
  }, [viewMode]);

  // Memoize filterUsers to prevent unnecessary recalculations
  const memoizedFilterUsers = useCallback(() => {
    filterUsers();
  }, [users, searchQuery, filterRole, viewMode, allSessions, currentUser]);
  
  useEffect(() => {
    memoizedFilterUsers();
  }, [memoizedFilterUsers]);

  // Handle click outside for Azure AD search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (azureSearchRef.current && !azureSearchRef.current.contains(event.target as Node)) {
        setAzureUserSearch(prev => ({ ...prev, showResults: false }));
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setRoleModalProductId('');
    setRoleModalUseAllSessions(true);
    setRoleModalSelectedSessionIds([]);
    setShowRoleModal(true);
    setOpenDropdown(null);
    
    // Load products if not already loaded
    if (products.length === 0) {
      await loadProducts();
    }
    
    await loadUserSessionMemberships(user.id);
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setRoleModalType(null);
    setSelectedUserForRole(null);
    setRoleModalProductId('');
    setRoleModalUseAllSessions(true);
    setRoleModalSelectedSessionIds([]);
    setUserSessionMemberships({ adminSessions: [], stakeholderSessions: [] });
  };

  // Helper function to filter sessions by product (for role modal)
  const filterSessionsForRoleModal = (sessions: VotingSession[], productId: string): VotingSession[] => {
    if (!productId) return [];
    const now = new Date();
    return sessions.filter(session => {
      // Filter by product
      if (session.product_id !== productId) return false;
      // Only show current and future sessions (not past)
      const endDate = new Date(session.end_date);
      return endDate >= now;
    });
  };

  const handleAddToSession = async () => {
    if (!selectedUserForRole || !roleModalType) return;
    
    // Validate product selection
    if (!roleModalProductId) {
      alert('Please select a product first.');
      return;
    }

    // Get sessions to add/remove
    let sessionsToProcess: string[] = [];
    if (roleModalUseAllSessions) {
      // Get all current and future sessions for the product
      const filtered = filterSessionsForRoleModal(
        getAvailableSessions(roleModalType),
        roleModalProductId
      );
      sessionsToProcess = filtered.map(s => s.id);
    } else {
      // Use selected sessions
      if (roleModalSelectedSessionIds.length === 0) {
        alert('Please select at least one session.');
        return;
      }
      sessionsToProcess = roleModalSelectedSessionIds;
    }

    if (sessionsToProcess.length === 0) {
      alert('No sessions available for this product.');
      return;
    }

    try {
      // Process each session
      for (const sessionId of sessionsToProcess) {
      if (roleModalType === 'session-admin') {
          await db.addSessionAdmin(sessionId, selectedUserForRole.id);
      } else if (roleModalType === 'stakeholder') {
        // Use addSessionStakeholderByEmail which handles the stakeholder creation
          await db.addSessionStakeholderByEmail(sessionId, selectedUserForRole.email, selectedUserForRole.name);
      } else if (roleModalType === 'remove-stakeholder') {
        // Remove stakeholder using email
          await db.removeSessionStakeholder(sessionId, selectedUserForRole.email);
        }
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
      alert(`Failed to ${roleModalType === 'remove-stakeholder' ? 'remove stakeholder from' : 'add user to'} session(s).\n\nError: ${errorMessage}\n\nPlease check the console for more details.`);
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
      if (!currentUser) {
        throw new Error('You must be logged in to delete users');
      }

      // Use Edge Function to delete user (bypasses RLS)
      const supabaseUrl = (supabase as any).supabaseUrl;
      const deleteUserUrl = `${supabaseUrl}/functions/v1/delete-user`;

      const response = await fetch(deleteUserUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(supabase as any).supabaseKey}`, // Use service key for Edge Function call
        },
        body: JSON.stringify({
          userId: userToDelete.id,
          currentUserId: currentUser.id
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete user';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Remove from local state immediately (optimistic update)
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userToDelete.id));
      
      // Close modal first
      setShowDeleteModal(false);
      const deletedUserId = userToDelete.id;
      setUserToDelete(null);
      
      // Then reload users to ensure consistency
      try {
        await loadUsers(allSessions);
      } catch (reloadError) {
        console.error('Error reloading users after deletion:', reloadError);
        // If reload fails, at least we've already removed from state
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error?.message || error?.error?.message || 'Unknown error';
      
      // Revert optimistic update if deletion failed
      setUsers(prevUsers => {
        // If user was removed optimistically, add them back
        const wasRemoved = !prevUsers.find(u => u.id === userToDelete?.id);
        if (wasRemoved && userToDelete) {
          return [...prevUsers, userToDelete].sort((a, b) => 
            (a.name || a.email).localeCompare(b.name || b.email)
          );
        }
        return prevUsers;
      });
      
      alert(`Failed to delete user: ${errorMessage}\n\nIf this persists, the deletion may be blocked by database security policies. Please check the console for details.`);
      
      // Still try to reload users in case partial deletion occurred
      try {
        await loadUsers(allSessions);
      } catch (reloadError) {
        console.error('Error reloading users after failed deletion:', reloadError);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleUpdateUser = async () => {
    if (!userToEdit) return;
    
    if (!editingUserName.trim()) {
      alert('Name is required');
      return;
    }
    
    if (!editingUserEmail.trim()) {
      alert('Email is required');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editingUserEmail.trim())) {
      alert('Please enter a valid email address');
      return;
    }
    
    setIsUpdatingUser(true);
    
    try {
      // Update user in Supabase auth.users table (if admin API is available)
      // Otherwise, update the users table directly
      const { error: dbError } = await supabase
        .from('users')
        .update({
          name: editingUserName.trim(),
          email: editingUserEmail.trim().toLowerCase()
        })
        .eq('id', userToEdit.id);
      
      if (dbError) {
        throw dbError;
      }
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u.id === userToEdit.id 
            ? { ...u, name: editingUserName.trim(), email: editingUserEmail.trim().toLowerCase() }
            : u
        )
      );
      
      setShowEditUserModal(false);
      setUserToEdit(null);
      setEditingUserName('');
      setEditingUserEmail('');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const openAddUserModal = () => {
    setMobileMenuOpen(false);
    setShowAddUserModal(true);
    setNewUserData({
      name: '',
      email: '',
      isSystemAdmin: false,
      sessionAdminIds: [],
      stakeholderSessionIds: []
    });
    setAzureUserSearch(getInitialAzureSearchState());
    setSelectedProductId('');
    setFilteredSessionsForProduct([]);
    setSelectedProductIdForSessionAdmin('');
    setFilteredSessionsForSessionAdmin([]);
    loadProducts();
    setShowAzureSearchSection(true);
  };

  const closeAddUserModal = () => {
    setShowAddUserModal(false);
    setNewUserData({
      name: '',
      email: '',
      isSystemAdmin: false,
      sessionAdminIds: [],
      stakeholderSessionIds: []
    });
    setAzureUserSearch(getInitialAzureSearchState());
    setSelectedProductId('');
    setFilteredSessionsForProduct([]);
    setSelectedProductIdForSessionAdmin('');
    setFilteredSessionsForSessionAdmin([]);
    setUseAllSessionsForStakeholder(true);
    setUseAllSessionsForSessionAdmin(true);
    setAccordionOpen({
      sessionAdmin: false,
      stakeholder: false
    });
    setShowAzureSearchSection(true);
  };

  // Check if user is signed in with Azure
  useEffect(() => {
    const checkAzureSignIn = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const isAzureProvider = session.user?.app_metadata?.provider === 'azure' || 
                                 session.user?.identities?.some((id: any) => id.provider === 'azure');
          setIsAzureSignedIn(isAzureProvider || false);
        } else {
          setIsAzureSignedIn(false);
        }
      } catch (error) {
        console.error('Error checking Azure sign-in status:', error);
        setIsAzureSignedIn(false);
      }
    };
    
    checkAzureSignIn();
    
    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const isAzureProvider = session.user?.app_metadata?.provider === 'azure' || 
                               session.user?.identities?.some((id: any) => id.provider === 'azure');
        setIsAzureSignedIn(isAzureProvider || false);
      } else {
        setIsAzureSignedIn(false);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle Azure sign-in
  const handleAzureSignIn = async () => {
    try {
      // Get the basename from the current pathname or default to '/feature-voting-app'
      const basename = window.location.pathname.startsWith('/feature-voting-app') 
        ? '/feature-voting-app' 
        : '';
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: `${window.location.origin}${basename}/users`,
          scopes: 'email openid profile User.ReadBasic.All'
        }
      });
      
      if (error) {
        console.error('Azure sign-in error:', error);
        setAzureUserSearch(prev => ({ 
          ...prev, 
          error: 'Failed to sign in with Microsoft. Please try again.' 
        }));
      }
      // If successful, user will be redirected to Azure, then back to /users
    } catch (err) {
      console.error('Azure sign-in error:', err);
      setAzureUserSearch(prev => ({ 
        ...prev, 
        error: 'Failed to sign in with Microsoft. Please try again.' 
      }));
    }
  };

  // Search Azure AD users
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

  // Select an Azure AD user
  const selectAzureUser = (user: AzureAdUser) => {
    // Format name as "First Name Last Name" instead of "Last Name, First Name"
    let formattedName = '';
    if (user.givenName && user.surname) {
      formattedName = `${user.givenName} ${user.surname}`;
    } else if (user.displayName) {
      // If displayName is "Last, First", convert it to "First Last"
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
    setAzureUserSearch(getInitialAzureSearchState());
    setShowAzureSearchSection(false);
  };

  const handleAddUser = async () => {
    if (!newUserData.name.trim() || !newUserData.email.trim()) {
      alert('Please fill in all required fields (Name, Email)');
      return;
    }

    setIsAddingUser(true);
    try {
      // Create user directly in users table (they'll use Azure AD for authentication)
      const { data: newUser, error: dbError } = await supabase
        .from('users')
        .insert({
          name: newUserData.name.trim(),
          email: newUserData.email.trim().toLowerCase(),
          created_by: currentUser?.id,
          created_by_name: currentUser?.name
        })
        .select()
        .single();

      if (dbError) throw dbError;
      if (!newUser) throw new Error('User creation failed');

      const newUserId = newUser.id;

      // Add system admin role if selected (only in system-admin mode)
      if (viewMode === 'system-admin' && newUserData.isSystemAdmin) {
        await db.addSystemAdmin(newUserId);
      }

      // Add session admin roles (only in system-admin mode)
      if (viewMode === 'system-admin') {
        if (accordionOpen.sessionAdmin && selectedProductIdForSessionAdmin) {
          if (useAllSessionsForSessionAdmin) {
            // Add to all current sessions for the product
            for (const session of filteredSessionsForSessionAdmin) {
              try {
                await db.addSessionAdmin(session.id, newUserId);
              } catch (err) {
                console.error(`Error adding session admin role to session ${session.id}:`, err);
              }
            }
          } else {
            // Add to selected sessions only
        for (const sessionId of newUserData.sessionAdminIds) {
          try {
            await db.addSessionAdmin(sessionId, newUserId);
          } catch (err) {
            console.error('Error adding session admin role:', err);
              }
            }
          }
        }
      }

      // Add stakeholder roles (both modes, but session-admin mode only adds to their sessions)
      console.log('Adding stakeholder to sessions:', newUserData.stakeholderSessionIds);
      console.log('View mode:', viewMode);
      console.log('User admin sessions:', userAdminSessions);
      console.log('All sessions:', allSessions.map(s => ({ id: s.id, title: s.title })));
      
      // Determine which sessions to add the user to
      let sessionsToAdd: string[] = [];
      
      if (viewMode === 'session-admin') {
        // Session Admin mode: use selected product's sessions
        if (selectedProductId && useAllSessionsForStakeholder) {
          // Add to all current sessions for the product
          sessionsToAdd = filteredSessionsForProduct.map(s => s.id);
        } else if (selectedProductId && !useAllSessionsForStakeholder) {
          // Add to selected sessions only
          sessionsToAdd = newUserData.stakeholderSessionIds;
        }
      } else if (viewMode === 'system-admin') {
        // System Admin mode: check if stakeholder accordion is open
        if (accordionOpen.stakeholder && selectedProductId) {
          if (useAllSessionsForStakeholder) {
            // Add to all current sessions for the product
            sessionsToAdd = filteredSessionsForProduct.map(s => s.id);
      } else {
            // Add to selected sessions only
            sessionsToAdd = newUserData.stakeholderSessionIds;
          }
        }
      }
      
      if (sessionsToAdd.length === 0) {
        console.log('No stakeholder sessions to add');
      } else {
        for (const sessionId of sessionsToAdd) {
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

      // Determine user type for success message
      let userType = 'User';
      if (newUserData.isSystemAdmin) {
        userType = 'System Admin';
      } else if (accordionOpen.sessionAdmin && selectedProductIdForSessionAdmin && (useAllSessionsForSessionAdmin || newUserData.sessionAdminIds.length > 0)) {
        userType = 'Session Admin';
      } else if ((viewMode === 'session-admin' && selectedProductId && (useAllSessionsForStakeholder || newUserData.stakeholderSessionIds.length > 0)) || 
                 (viewMode === 'system-admin' && accordionOpen.stakeholder && selectedProductId && (useAllSessionsForStakeholder || newUserData.stakeholderSessionIds.length > 0))) {
        userType = 'Stakeholder';
      }

      // Close modal first (before reload to avoid UI delay)
      closeAddUserModal();

      // Reload users to show new user with their roles
      await loadUsers(allSessions);

      // Show success modal
      setSuccessModalData({
        email: newUserData.email,
        userType: userType
      });
      setShowSuccessModal(true);
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
    // Parse as local date to avoid timezone issues
    const dateOnly = dateString.split('T')[0].split(' ')[0];
    const parts = dateOnly.split('-');
    
    if (parts.length !== 3) {
      // Fallback to original behavior if format is unexpected
    const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric'
      });
    }
    
    // Parse as local date (month is 0-indexed)
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const getSessionStatus = (session: VotingSession): { text: string; color: string } => {
    const now = new Date();
    const startDate = new Date(session.start_date);
    const endDate = new Date(session.end_date);
    
    if (session.is_active && now >= startDate && now <= endDate) {
      return { text: 'Active', color: 'text-green-600' };
    } else if (now < startDate) {
      return { text: 'Upcoming', color: 'text-blue-600' };
    } else {
      return { text: 'Ended', color: 'text-gray-500' };
    }
  };

  const formatSessionDateRange = (session: VotingSession): string => {
    const start = new Date(session.start_date);
    const end = new Date(session.end_date);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const getRoleBadge = (user: UserWithRoles) => {
    if (user.roles.isSystemAdmin) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#C89212] text-white">
          <Crown className="h-3.5 w-3.5 mr-1" />
          System Admin
        </span>
      );
    } else if (user.roles.sessionAdminCount > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#576C71] text-white">
          <Shield className="h-3.5 w-3.5 mr-1" />
          Session Admin ({user.roles.sessionAdminCount})
        </span>
      );
    } else if (user.roles.stakeholderSessionCount > 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#8B5A4A] text-white">
          <UserIcon className="h-3.5 w-3.5 mr-1" />
          Stakeholder ({user.roles.stakeholderSessionCount})
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
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
            <h1 className="text-xl md:text-3xl font-bold text-[#2d4660] truncate">{pageTitle}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {currentUser?.name}
                {isSystemAdmin && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#C89212] text-white">
                    <Crown className="h-3.5 w-3.5 mr-1" />
                    System Admin
                  </span>
                )}
                {!isSystemAdmin && isSessionAdmin && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#576C71] text-white">
                    <Shield className="h-3.5 w-3.5 mr-1" />
                    Session Admin
                  </span>
                )}
              </p>
            </div>
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLogout(e);
                }}
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMobileMenuOpen(false);
                      handleLogout(e);
                    }}
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
              {viewMode !== 'session-admin' && <option value="session-admin">Session Admin</option>}
              <option value="stakeholder">Stakeholder</option>
              <option value="none">No Role</option>
            </select>
          </div>
        </div>

        {/* Mobile: Card View */}
        <div className="md:hidden space-y-3 relative z-10 overflow-visible">
          {filteredUsers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              {searchQuery || filterRole !== 'all' 
                ? 'No users found matching your filters.' 
                : 'No users found.'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-lg shadow-md overflow-visible">
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900 truncate">
                          {user.name || user.email}
                        </h3>
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-[#c59f2d] font-semibold">
                            (You)
                          </span>
                        )}
                        {user.roles.isSystemAdmin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#C89212] text-white">
                            System Admin
                          </span>
                        )}
                        {user.roles.sessionAdminCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Session Admin ({user.roles.sessionAdminCount})
                          </span>
                        )}
                        {user.roles.stakeholderSessionCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Stakeholder ({user.roles.stakeholderSessionCount})
                          </span>
                        )}
                        {getProtectedAccountLabel(user) && (
                          <span className="text-xs text-[#c59f2d] font-semibold">
                            ({getProtectedAccountLabel(user)})
                          </span>
                        )}
                        {isDuplicateAccount(user) && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                            Duplicate ({getDuplicateCount(user)})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
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
                          <div 
                            className="fixed md:absolute md:right-0 md:mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]" 
                            style={(() => {
                              const ref = dropdownRefs.current[user.id];
                              if (!ref) return {};
                              const rect = ref.getBoundingClientRect();
                              if (window.innerWidth < 768) {
                                // Mobile: use fixed positioning
                                return {
                                  top: `${rect.bottom + 4}px`,
                                  right: `${window.innerWidth - rect.right + 4}px`,
                                  left: 'auto'
                                };
                              }
                              // Desktop: use absolute positioning (default)
                              return {};
                            })()}
                          >
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
                                      className="w-full px-4 py-3 text-left flex items-center hover:bg-[#C89212]/10 text-[#C89212]"
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
                                      className="w-full px-4 py-3 text-left flex items-center hover:bg-[#576C71]/10 text-[#576C71] border-t border-gray-200"
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
                                  className="w-full px-4 py-3 text-left flex items-center hover:bg-[#8B5A4A]/10 text-[#8B5A4A] border-t border-gray-200"
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

                              {/* User Functions header */}
                              {((viewMode === 'system-admin') || 
                                ((viewMode === 'session-admin' && user.roles.stakeholderSessionCount > 0 && 
                                  user.stakeholderInSessions?.some(session => allSessions.some(s => s.id === session.id)))) && 
                                 !protectedEmails.has(user.email)) && (
                                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-200">
                                  User Functions
                            </div>
                              )}

                              {/* Edit User - only for system admins - moved to bottom */}
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

                              {/* Delete User - moved to bottom */}
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
                                    user.id === currentUser?.id || (viewMode === 'system-admin' && protectedUserIds.has(user.id))
                                      ? 'opacity-50 cursor-not-allowed' 
                                      : ''
                                  }`}
                                  disabled={user.id === currentUser?.id || (viewMode === 'system-admin' && protectedUserIds.has(user.id))}
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
                                        : user.id === currentUser?.id 
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
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium" style={{ borderColor: '#576C71', color: '#576C71' }}>
                            <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ fill: '#576C71', color: '#576C71' }} />
                            <span>{user.roles.sessionAdminCount} as Session Admin</span>
                          </div>
                          {user.adminInSessions && user.adminInSessions.length > 0 && (
                            <>
                              {(() => {
                                const mostRecentActive = getMostRecentActiveSession(user.adminInSessions);
                                // Always show at least one session - prefer active, otherwise first session
                                const sessionToShow = mostRecentActive || user.adminInSessions[0];
                                const hasMoreSessions = user.adminInSessions.length > 1;
                                const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'admin';
                                
                                return (
                                  <>
                                    {sessionToShow && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await setCurrentSession(sessionToShow);
                                          navigate('/admin');
                                        }}
                                        className="ml-6 text-left text-sm text-gray-700 hover:text-gray-900 hover:underline"
                                      >
                                        <div>{sessionToShow.title || 'Unnamed Session'}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {formatSessionDateRange(sessionToShow)}
                                        </div>
                                      </button>
                                    )}
                                    {hasMoreSessions && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isExpanded) {
                                            setExpandedSessions(null);
                                          } else {
                                            setExpandedSessions({ userId: user.id, role: 'admin' });
                                          }
                                        }}
                                        className="ml-6 text-xs text-gray-500 hover:text-gray-700 hover:underline mt-1 block flex items-center gap-1.5"
                                        style={{ minWidth: '70px' }}
                                      >
                                        <span className="inline-flex items-center justify-center w-4 h-4 border border-gray-400 rounded text-gray-600">
                                          {isExpanded ? <Minus className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                                        </span>
                                        {isExpanded ? 'Hide' : 'Show'}
                                      </button>
                                    )}
                                    {isExpanded && (
                                      <div className="ml-6 mt-1 space-y-1">
                                        {user.adminInSessions
                                          .filter(s => s.id !== sessionToShow?.id)
                                          .map(session => (
                                            <button
                                              key={session.id}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await setCurrentSession(session);
                                                navigate('/admin');
                                              }}
                                              className="block text-sm text-left text-gray-700 hover:text-gray-900 hover:underline w-full"
                                            >
                                              <div>{session.title || 'Unnamed Session'}</div>
                                              <div className="text-xs text-gray-500 mt-0.5">
                                                {formatSessionDateRange(session)}
                                              </div>
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
                      {user.roles.stakeholderSessionCount > 0 && (
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium" style={{ borderColor: '#8B5A4A', color: '#8B5A4A' }}>
                            <UserIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ fill: '#8B5A4A', color: '#8B5A4A' }} />
                            <span>{user.roles.stakeholderSessionCount} as Stakeholder</span>
                          </div>
                          {user.stakeholderInSessions && user.stakeholderInSessions.length > 0 && (
                            <>
                              {(() => {
                                const mostRecentActive = getMostRecentActiveSession(user.stakeholderInSessions);
                                // Always show at least one session - prefer active, otherwise first session
                                const sessionToShow = mostRecentActive || user.stakeholderInSessions[0];
                                const hasMoreSessions = user.stakeholderInSessions.length > 1;
                                const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'stakeholder';
                                
                                return (
                                  <>
                                    {sessionToShow && (
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await setCurrentSession(sessionToShow);
                                          navigate('/admin');
                                        }}
                                        className="ml-6 text-left text-sm text-gray-700 hover:text-gray-900 hover:underline"
                                      >
                                        <div>{sessionToShow.title || 'Unnamed Session'}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {formatSessionDateRange(sessionToShow)}
                                        </div>
                                      </button>
                                    )}
                                    {hasMoreSessions && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isExpanded) {
                                            setExpandedSessions(null);
                                          } else {
                                            setExpandedSessions({ userId: user.id, role: 'stakeholder' });
                                          }
                                        }}
                                        className="ml-6 text-xs text-gray-500 hover:text-gray-700 hover:underline mt-1 block flex items-center gap-1.5"
                                        style={{ minWidth: '70px' }}
                                      >
                                        <span className="inline-flex items-center justify-center w-4 h-4 border border-gray-400 rounded text-gray-600">
                                          {isExpanded ? <Minus className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                                        </span>
                                        {isExpanded ? 'Hide' : 'Show'}
                                      </button>
                                    )}
                                    {isExpanded && (
                                      <div className="ml-6 mt-1 space-y-1">
                                        {user.stakeholderInSessions
                                          .filter(s => s.id !== sessionToShow?.id)
                                          .map(session => (
                                            <button
                                              key={session.id}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await setCurrentSession(session);
                                                navigate('/admin');
                                              }}
                                              className="block text-sm text-left text-gray-700 hover:text-gray-900 hover:underline w-full"
                                            >
                                              <div>{session.title || 'Unnamed Session'}</div>
                                              <div className="text-xs text-gray-500 mt-0.5">
                                                {formatSessionDateRange(session)}
                                              </div>
                                            </button>
                                          ))}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
                      {user.roles.sessionAdminCount === 0 && user.roles.stakeholderSessionCount === 0 && (
                        <span className="text-sm text-gray-400">No session roles</span>
                      )}
                    </div>
                  </div>

                  {/* Created/Assigned Date */}
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Assigned</div>
                    <div className="space-y-2">
                      {user.roles.sessionAdminCount === 0 && user.roles.stakeholderSessionCount === 0 && (
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span>{user.created_at ? formatDate(user.created_at) : 'N/A'}</span>
                          <span className="text-gray-500 text-xs ml-2">by {((user as any).created_by_name) || 'System'}</span>
                    </div>
                      )}
                      
                      {user.adminInSessions && user.adminInSessions.length > 0 && (
                        <div className="space-y-3">
                          {(() => {
                            const mostRecentActive = getMostRecentActiveSession(user.adminInSessions);
                            const sessionToShow = mostRecentActive || user.adminInSessions[0];
                            const hasMoreSessions = user.adminInSessions.length > 1;
                            const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'admin';
                            
                            return (
                              <>
                                {sessionToShow && (
                                  <div className="ml-5 space-y-1">
                                    <div className="flex items-center text-xs text-gray-700 whitespace-nowrap">
                                      <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                      <span>{sessionToShow.assignedAt ? formatDate(sessionToShow.assignedAt) : 'N/A'}</span>
                  </div>
                                    <div className="text-xs text-gray-500 ml-5">
                                      by {sessionToShow.assignedByName || 'System'}
                                    </div>
                                  </div>
                                )}
                                {isExpanded && (
                                  <div className="ml-5 mt-2 space-y-3">
                                    {user.adminInSessions
                                      .filter(s => s.id !== sessionToShow?.id)
                                      .map(session => (
                                        <div key={session.id} className="space-y-1">
                                          <div className="flex items-center text-xs text-gray-700 whitespace-nowrap">
                                            <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                            <span>{session.assignedAt ? formatDate(session.assignedAt) : 'N/A'}</span>
                                          </div>
                                          <div className="text-xs text-gray-500 ml-5">
                                            by {session.assignedByName || 'System'}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      
                      {user.stakeholderInSessions && user.stakeholderInSessions.length > 0 && (
                        <div className={user.adminInSessions && user.adminInSessions.length > 0 ? 'pt-4 border-t border-gray-100 mt-4' : ''}>
                          <div className="space-y-3">
                            {(() => {
                              const mostRecentActive = getMostRecentActiveSession(user.stakeholderInSessions);
                              const sessionToShow = mostRecentActive || user.stakeholderInSessions[0];
                              const hasMoreSessions = user.stakeholderInSessions.length > 1;
                              const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'stakeholder';
                              
                              return (
                                <>
                                  {sessionToShow && (
                                    <div className="ml-5 space-y-1">
                                      <div className="flex items-center text-xs text-gray-700 whitespace-nowrap">
                                        <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                        <span>{sessionToShow.assignedAt ? formatDate(sessionToShow.assignedAt) : 'N/A'}</span>
                    </div>
                                      <div className="text-xs text-gray-500 ml-5">
                                        by {sessionToShow.assignedByName || 'System'}
                                      </div>
                                    </div>
                                  )}
                                  {isExpanded && (
                                    <div className="ml-5 mt-2 space-y-3">
                                      {user.stakeholderInSessions
                                        .filter(s => s.id !== sessionToShow?.id)
                                        .map(session => (
                                          <div key={session.id} className="space-y-1">
                                            <div className="flex items-center text-xs text-gray-700 whitespace-nowrap">
                                              <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                              <span>{session.assignedAt ? formatDate(session.assignedAt) : 'N/A'}</span>
                                            </div>
                                            <div className="text-xs text-gray-500 ml-5">
                                              by {session.assignedByName || 'System'}
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
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
                      className="hover:bg-gray-50 relative"
                      onMouseEnter={() => setHoveredRow(user.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap align-top">
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
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        {getRoleBadge(user)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 align-top relative overflow-visible">
                        <div className="space-y-2">
                          {user.roles.sessionAdminCount === 0 && user.roles.stakeholderSessionCount === 0 && (
                            <span className="text-gray-400">None</span>
                          )}
                          
                          {user.adminInSessions && user.adminInSessions.length > 0 && (
                            <div>
                              <div className="mb-2">
                                {(() => {
                                  const sessionCount = user.adminInSessions?.length || 0;
                                  const hasMoreSessions = sessionCount > 1;
                                  const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'admin';
                                  const BadgeContent = () => (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium group" style={{ borderColor: '#576C71', color: '#576C71' }}>
                                      <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ fill: '#576C71', color: '#576C71' }} />
                                      <span>Session Admin in {sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
                                      {hasMoreSessions && (
                                        <span className="inline-flex items-baseline gap-0.5" style={{ color: '#576C71' }}>
                                          {isExpanded ? (
                                            <Minus 
                                              className="h-2.5 w-2.5 transition-all group-hover:brightness-150 mt-[3px]" 
                                              style={{ color: '#576C71' }}
                                            />
                                          ) : (
                                            <Plus 
                                              className="h-2.5 w-2.5 transition-all group-hover:brightness-150 mt-[3px]" 
                                              style={{ color: '#576C71' }}
                                            />
                                          )}
                                          <span className="text-[10px] transition-all group-hover:brightness-150">{isExpanded ? 'Hide' : 'Show'}</span>
                                        </span>
                                      )}
                              </div>
                                  );
                                  
                                  return hasMoreSessions ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isExpanded) {
                                          setExpandedSessions(null);
                                        } else {
                                          setExpandedSessions({ userId: user.id, role: 'admin' });
                                        }
                                      }}
                                      className="text-left"
                                    >
                                      <BadgeContent />
                                    </button>
                                  ) : (
                                    <BadgeContent />
                                  );
                                })()}
                                        </div>
                              {(() => {
                                const mostRecentActive = getMostRecentActiveSession(user.adminInSessions);
                                // Always show at least one session - prefer active, otherwise first session
                                const sessionToShow = mostRecentActive || user.adminInSessions[0];
                                const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'admin';
                                
                                return (
                                  <>
                                    {sessionToShow && (
                                      <div 
                                        className="relative cursor-pointer"
                                        style={{ marginLeft: '1.25rem', marginTop: '0.75rem' }}
                                        onMouseEnter={() => setHoveredSessionId(`${user.id}-${sessionToShow.id}`)}
                                        onMouseLeave={() => setHoveredSessionId(null)}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await setCurrentSession(sessionToShow);
                                          navigate('/admin');
                                        }}
                                      >
                                        {hoveredSessionId === `${user.id}-${sessionToShow.id}` && (
                                          <div className="absolute bg-blue-50 pointer-events-none z-0 rounded" 
                                            style={{ 
                                              left: '-0.5rem', 
                                              right: '-13rem',
                                              top: '-0.375rem',
                                              bottom: '-0.375rem',
                                              boxShadow: '0 0 0 1px rgb(191 219 254)',
                                              outline: 'none'
                                            }}
                                          />
                                        )}
                                        <div className="text-left text-sm text-gray-700 hover:text-gray-900 block relative z-10"
                                          style={{ padding: 0, margin: 0, lineHeight: '1.25rem' }}
                                        >
                                          <div style={{ height: '20px', lineHeight: '20px' }}>{sessionToShow.title || 'Unnamed Session'}</div>
                                          <div className="text-xs text-gray-500" style={{ height: '16px', lineHeight: '16px', marginTop: '2px' }}>
                                            {formatSessionDateRange(sessionToShow)}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {isExpanded && (
                                      <div style={{ marginTop: '0.5rem' }}>
                                        {user.adminInSessions
                                          .filter(s => s.id !== sessionToShow?.id)
                                          .map((session, index) => (
                                            <div
                                              key={session.id}
                                              className="relative cursor-pointer"
                                              style={{ marginTop: index === 0 ? '0.75rem' : '0.75rem', marginLeft: '1.25rem' }}
                                              onMouseEnter={() => setHoveredSessionId(`${user.id}-${session.id}`)}
                                              onMouseLeave={() => setHoveredSessionId(null)}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await setCurrentSession(session);
                                                navigate('/admin');
                                              }}
                                            >
                                              {hoveredSessionId === `${user.id}-${session.id}` && (
                                                <div className="absolute bg-blue-50 pointer-events-none z-0 rounded" 
                                                  style={{ 
                                                    left: '-0.5rem', 
                                                    right: '-13rem',
                                                    top: '-0.375rem',
                                                    bottom: '-0.375rem',
                                                    boxShadow: '0 0 0 1px rgb(191 219 254)',
                                                    outline: 'none'
                                                  }}
                                                />
                                              )}
                                              <div className="block text-sm text-left text-gray-700 hover:text-gray-900 relative z-10"
                                                style={{ padding: 0, margin: 0, lineHeight: '1.25rem' }}
                                              >
                                                <div style={{ height: '20px', lineHeight: '20px' }}>{session.title || 'Unnamed Session'}</div>
                                                <div className="text-xs text-gray-500" style={{ height: '16px', lineHeight: '16px', marginTop: '2px' }}>
                                                  {formatSessionDateRange(session)}
                                                </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                          
                          {user.stakeholderInSessions && user.stakeholderInSessions.length > 0 && (
                            <div className={user.adminInSessions && user.adminInSessions.length > 0 ? 'pt-4 border-t border-gray-100 mt-4' : ''}>
                              <div>
                                <div className="mb-2">
                                  {(() => {
                                    const sessionCount = user.stakeholderInSessions?.length || 0;
                                    const hasMoreSessions = sessionCount > 1;
                                    const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'stakeholder';
                                    const BadgeContent = () => (
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium group" style={{ borderColor: '#8B5A4A', color: '#8B5A4A' }}>
                                        <UserIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ fill: '#8B5A4A', color: '#8B5A4A' }} />
                                        <span>Stakeholder in {sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
                                        {hasMoreSessions && (
                                          <span className="inline-flex items-baseline gap-0.5" style={{ color: '#8B5A4A' }}>
                                            {isExpanded ? (
                                              <Minus 
                                                className="h-2.5 w-2.5 transition-all group-hover:brightness-150 mt-[3px]" 
                                                style={{ color: '#8B5A4A' }}
                                              />
                                            ) : (
                                              <Plus 
                                                className="h-2.5 w-2.5 transition-all group-hover:brightness-150 mt-[3px]" 
                                                style={{ color: '#8B5A4A' }}
                                              />
                                            )}
                                            <span className="text-[10px] transition-all group-hover:brightness-150">{isExpanded ? 'Hide' : 'Show'}</span>
                                          </span>
                                        )}
                              </div>
                                    );
                                    
                                    return hasMoreSessions ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isExpanded) {
                                            setExpandedSessions(null);
                                          } else {
                                            setExpandedSessions({ userId: user.id, role: 'stakeholder' });
                                          }
                                        }}
                                        className="text-left"
                                      >
                                        <BadgeContent />
                                      </button>
                                    ) : (
                                      <BadgeContent />
                                    );
                                  })()}
                                        </div>
                                {(() => {
                                  const mostRecentActive = getMostRecentActiveSession(user.stakeholderInSessions);
                                  // Always show at least one session - prefer active, otherwise first session
                                  const sessionToShow = mostRecentActive || user.stakeholderInSessions[0];
                                  const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'stakeholder';
                                  
                                  return (
                                    <>
                                      {sessionToShow && (
                                        <div 
                                          className="relative cursor-pointer"
                                          style={{ marginLeft: '1.25rem', marginTop: '0.75rem' }}
                                          onMouseEnter={() => setHoveredSessionId(`${user.id}-${sessionToShow.id}`)}
                                          onMouseLeave={() => setHoveredSessionId(null)}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await setCurrentSession(sessionToShow);
                                            navigate('/admin');
                                          }}
                                        >
                                          {hoveredSessionId === `${user.id}-${sessionToShow.id}` && (
                                            <div className="absolute bg-blue-50 pointer-events-none z-0 rounded" 
                                              style={{ 
                                                left: '-0.5rem', 
                                                right: '-13rem',
                                                top: '-0.25rem',
                                                bottom: '-0.25rem',
                                                boxShadow: '0 0 0 1px rgb(191 219 254)',
                                                outline: 'none'
                                              }}
                                            />
                                          )}
                                          <div className="text-left text-sm text-gray-700 hover:text-gray-900 hover:underline block relative z-10"
                                            style={{ padding: 0, margin: 0, lineHeight: '1.25rem' }}
                                          >
                                            <div style={{ height: '20px', lineHeight: '20px' }}>{sessionToShow.title || 'Unnamed Session'}</div>
                                            <div className="text-xs text-gray-500" style={{ height: '16px', lineHeight: '16px', marginTop: '2px' }}>
                                              {formatSessionDateRange(sessionToShow)}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {isExpanded && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                          {user.stakeholderInSessions
                                            .filter(s => s.id !== sessionToShow?.id)
                                            .map((session, index) => (
                                              <div
                                                key={session.id}
                                                className="relative cursor-pointer"
                                                style={{ marginTop: index === 0 ? '0.75rem' : '0.75rem', marginLeft: '1.25rem' }}
                                                onMouseEnter={() => setHoveredSessionId(`${user.id}-${session.id}`)}
                                                onMouseLeave={() => setHoveredSessionId(null)}
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  await setCurrentSession(session);
                                                  navigate('/admin');
                                                }}
                                              >
                                                {hoveredSessionId === `${user.id}-${session.id}` && (
                                                  <div className="absolute bg-blue-50 pointer-events-none z-0 rounded" 
                                                    style={{ 
                                                      left: '-0.5rem', 
                                                      right: '-13rem',
                                                      top: '-0.25rem',
                                                      bottom: '-0.25rem',
                                                      boxShadow: '0 0 0 1px rgb(191 219 254)',
                                                      outline: 'none'
                                                    }}
                                                  />
                                                )}
                                                <div className="block text-sm text-left text-gray-700 hover:text-gray-900 hover:underline relative z-10"
                                                  style={{ padding: 0, margin: 0, lineHeight: '1.25rem' }}
                                                >
                                                  <div style={{ height: '20px', lineHeight: '20px' }}>{session.title || 'Unnamed Session'}</div>
                                                  <div className="text-xs text-gray-500" style={{ height: '16px', lineHeight: '16px', marginTop: '2px' }}>
                                                    {formatSessionDateRange(session)}
                                                  </div>
                                    </div>
                                  </div>
                                ))}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 align-top w-48 relative overflow-visible">
                        <div className="space-y-2">
                          {user.roles.sessionAdminCount === 0 && user.roles.stakeholderSessionCount === 0 && (
                            <div className="flex items-center text-gray-700 whitespace-nowrap">
                              <Calendar className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                              <span>{user.created_at ? formatDate(user.created_at) : 'N/A'}</span>
                              <span className="text-gray-500 text-xs ml-2">by {((user as any).created_by_name) || 'System'}</span>
                            </div>
                          )}
                          
                          {user.adminInSessions && user.adminInSessions.length > 0 && (
                        <div>
                              {/* User creation date - positioned to align with badge */}
                              <div className="flex items-center text-gray-700 whitespace-nowrap" style={{ marginBottom: '0.5rem', height: '30px' }}>
                                <Calendar className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                <span>{user.created_at ? formatDate(user.created_at) : 'N/A'}</span>
                                <span className="text-gray-500 text-xs ml-2">by {((user as any).created_by_name) || 'System'}</span>
                          </div>
                              {(() => {
                                const mostRecentActive = getMostRecentActiveSession(user.adminInSessions);
                                const sessionToShow = mostRecentActive || user.adminInSessions[0];
                                const hasMoreSessions = user.adminInSessions.length > 1;
                                const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'admin';
                                
                                return (
                                  <>
                                    {sessionToShow && (
                                      <div 
                                        className="relative cursor-pointer"
                                        style={{ marginLeft: '1.25rem', marginTop: '0.5rem', marginBottom: '0.25rem' }}
                                        onMouseEnter={() => setHoveredSessionId(`${user.id}-${sessionToShow.id}`)}
                                        onMouseLeave={() => setHoveredSessionId(null)}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await setCurrentSession(sessionToShow);
                                          navigate('/admin');
                                        }}
                                      >
                                        <div className="relative z-10" style={{ padding: 0, margin: 0, lineHeight: '1.25rem' }}>
                                          <div className="flex items-center" style={{ height: '20px', lineHeight: '20px' }}>
                                            <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-700 whitespace-nowrap">{sessionToShow.assignedAt ? formatDate(sessionToShow.assignedAt) : 'N/A'}</span>
                          </div>
                                          <div className="text-xs text-gray-500" style={{ height: '16px', lineHeight: '16px', marginTop: '2px', marginLeft: '18px' }}>
                                            by {sessionToShow.assignedByName || 'System'}
                        </div>
                                        </div>
                                      </div>
                                    )}
                                    {isExpanded && (
                                      <div style={{ marginTop: '0.5rem' }}>
                                        {user.adminInSessions
                                          .filter(s => s.id !== sessionToShow?.id)
                                          .map((session, index) => (
                                            <div 
                                              key={session.id} 
                                              className="relative cursor-pointer"
                                              style={{ marginTop: index === 0 ? '0.75rem' : '0.75rem', marginLeft: '1.25rem', marginBottom: '0.25rem' }}
                                              onMouseEnter={() => setHoveredSessionId(`${user.id}-${session.id}`)}
                                              onMouseLeave={() => setHoveredSessionId(null)}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                await setCurrentSession(session);
                                                navigate('/admin');
                                              }}
                                            >
                                              <div className="relative z-10" style={{ padding: 0, margin: 0, lineHeight: '1.25rem' }}>
                                                <div className="flex items-center" style={{ height: '20px', lineHeight: '20px' }}>
                                                  <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                                  <span className="text-xs text-gray-700 whitespace-nowrap">{session.assignedAt ? formatDate(session.assignedAt) : 'N/A'}</span>
                                                </div>
                                                <div className="text-xs text-gray-500" style={{ height: '16px', lineHeight: '16px', marginTop: '2px', marginLeft: '18px' }}>
                                                  by {session.assignedByName || 'System'}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                          
                          {user.stakeholderInSessions && user.stakeholderInSessions.length > 0 && (
                            <div className={user.adminInSessions && user.adminInSessions.length > 0 ? 'pt-4 border-t border-gray-100 mt-4' : ''}>
                              <div>
                                {/* User creation date - only show if no admin sessions (to avoid duplication) */}
                                {(!user.adminInSessions || user.adminInSessions.length === 0) && (
                                  <div className="flex items-center text-gray-700 whitespace-nowrap" style={{ marginBottom: '0.5rem', height: '30px' }}>
                                    <Calendar className="h-4 w-4 mr-1.5 text-gray-400 flex-shrink-0" />
                                    <span>{user.created_at ? formatDate(user.created_at) : 'N/A'}</span>
                                    <span className="text-gray-500 text-xs ml-2">by {((user as any).created_by_name) || 'System'}</span>
                                  </div>
                                )}
                                {/* Invisible spacer to match Stakeholder badge height + mb-2 when admin sessions exist */}
                                {user.adminInSessions && user.adminInSessions.length > 0 && (
                                  <div style={{ height: '26px', marginBottom: '0.5rem', visibility: 'hidden' }}>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium">
                                      <UserIcon className="h-3.5 w-3.5" />
                                      <span>Stakeholder</span>
                                    </div>
                                  </div>
                                )}
                                {(() => {
                                  const mostRecentActive = getMostRecentActiveSession(user.stakeholderInSessions);
                                  const sessionToShow = mostRecentActive || user.stakeholderInSessions[0];
                                  const hasMoreSessions = user.stakeholderInSessions.length > 1;
                                  const isExpanded = expandedSessions?.userId === user.id && expandedSessions?.role === 'stakeholder';
                                  
                                  return (
                                    <>
                                      {sessionToShow && (
                                        <div 
                                          className="relative cursor-pointer"
                                          style={{ marginLeft: '1.25rem', marginTop: '0.5rem', marginBottom: '0.25rem' }}
                                          onMouseEnter={() => setHoveredSessionId(`${user.id}-${sessionToShow.id}`)}
                                          onMouseLeave={() => setHoveredSessionId(null)}
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            await setCurrentSession(sessionToShow);
                                            navigate('/admin');
                                          }}
                                        >
                                        <div className="relative z-10" style={{ padding: 0, margin: 0, lineHeight: '1.25rem' }}>
                                          <div className="flex items-center" style={{ height: '20px', lineHeight: '20px' }}>
                                            <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                            <span className="text-xs text-gray-700 whitespace-nowrap">{sessionToShow.assignedAt ? formatDate(sessionToShow.assignedAt) : 'N/A'}</span>
                                          </div>
                                          <div className="text-xs text-gray-500" style={{ height: '16px', lineHeight: '16px', marginTop: '2px', marginLeft: '18px' }}>
                                            by {sessionToShow.assignedByName || 'System'}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {isExpanded && (
                                      <div style={{ marginTop: '0.5rem' }}>
                                        {user.stakeholderInSessions
                                          .filter(s => s.id !== sessionToShow?.id)
                                          .map((session, index) => (
                                              <div 
                                                key={session.id} 
                                                className="relative cursor-pointer"
                                                style={{ marginTop: index === 0 ? '0.75rem' : '0.75rem', marginLeft: '1.25rem', marginBottom: '0.25rem' }}
                                                onMouseEnter={() => setHoveredSessionId(`${user.id}-${session.id}`)}
                                                onMouseLeave={() => setHoveredSessionId(null)}
                                                onClick={async (e) => {
                                                  e.stopPropagation();
                                                  await setCurrentSession(session);
                                                  navigate('/admin');
                                                }}
                                              >
                                                <div className="relative z-10" style={{ padding: 0, margin: 0, lineHeight: '1.25rem' }}>
                                                  <div className="flex items-center" style={{ height: '20px', lineHeight: '20px' }}>
                                                    <Calendar className="h-3 w-3 mr-1.5 text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs text-gray-700 whitespace-nowrap">{session.assignedAt ? formatDate(session.assignedAt) : 'N/A'}</span>
                                                  </div>
                                                  <div className="text-xs text-gray-500" style={{ height: '16px', lineHeight: '16px', marginTop: '2px' }}>
                                                    by {session.assignedByName || 'System'}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                        <div className="flex items-center justify-end gap-2">
                          <div 
                            className={`relative inline-block transition-all md:transition-opacity ${
                              hoveredRow === user.id 
                                ? user.id === currentUser?.id ? 'opacity-50 visible' : 'opacity-100 visible'
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
                                          className="w-full px-4 py-2 text-left flex items-center hover:bg-[#C89212]/10 text-[#C89212]"
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
                                          className="w-full px-4 py-2 text-left flex items-center hover:bg-[#576C71]/10 text-[#576C71] border-t border-gray-200"
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
                                      className="w-full px-4 py-2 text-left flex items-center hover:bg-[#8B5A4A]/10 text-[#8B5A4A] border-t border-gray-200"
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

                                  {/* User Functions header */}
                                  {((viewMode === 'system-admin') || 
                                    ((viewMode === 'session-admin' && user.roles.stakeholderSessionCount > 0 && 
                                      user.stakeholderInSessions?.some(session => allSessions.some(s => s.id === session.id)))) && 
                                     !protectedEmails.has(user.email)) && (
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-200">
                                      User Functions
                                </div>
                                  )}

                                  {/* Edit User - only for system admins - moved to bottom */}
                                  {viewMode === 'system-admin' && (
                                    <button
                                      onClick={() => {
                                        setUserToEdit(user);
                                        setEditingUserName(user.name);
                                        setEditingUserEmail(user.email);
                                        setShowEditUserModal(true);
                                        setOpenDropdown(null);
                                      }}
                                      className="w-full px-4 py-2 text-left flex items-center hover:bg-[#1E5461]/10 text-[#1E5461] border-t border-gray-200"
                                    >
                                      <Edit className="h-4 w-4 mr-3" />
                                      <div>
                                        <div className="font-medium">Edit User Profile</div>
                                        <div className="text-xs text-gray-500">Update name and email</div>
                              </div>
                                    </button>
                                  )}

                                  {/* Delete User - moved to bottom */}
                                  {(viewMode === 'system-admin' || 
                                    (viewMode === 'session-admin' && user.roles.stakeholderSessionCount > 0 && 
                                     user.stakeholderInSessions?.some(session => allSessions.some(s => s.id === session.id)))) && 
                                    !protectedEmails.has(user.email) && (
                                    <button
                                      onClick={() => {
                                        setOpenDropdown(null);
                                        handleDeleteUser(user.id, user.name);
                                      }}
                                      className={`w-full px-4 py-2 text-left flex items-center hover:bg-[#8B5A4A]/10 text-[#8B5A4A] border-t border-gray-200 ${
                                        user.id === currentUser?.id || (viewMode === 'system-admin' && protectedUserIds.has(user.id))
                                          ? 'opacity-50 cursor-not-allowed' 
                                          : ''
                                      }`}
                                      disabled={user.id === currentUser?.id || (viewMode === 'system-admin' && protectedUserIds.has(user.id))}
                                    >
                                      <Trash2 className="h-4 w-4 mr-3" />
                                      <div>
                                        <div className="font-medium">
                                          {viewMode === 'session-admin'
                                            ? 'Remove Stakeholder'
                                            : 'Delete User'}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {viewMode === 'session-admin'
                                            ? 'Remove from all your sessions'
                                            : user.id === currentUser?.id 
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
                <Crown className="h-4 w-4 mr-2 text-[#C89212]" />
                <span className="text-gray-600">System Admins: <strong>{users.filter(u => u.roles.isSystemAdmin).length}</strong></span>
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-[#576C71]" />
                <span className="text-gray-600">Session Admins: <strong>{users.filter(u => u.roles.sessionAdminCount > 0).length}</strong></span>
              </div>
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 mr-2 text-[#8B5A4A]" />
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
              <Crown className="h-5 w-5 mr-2 text-[#C89212] flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Sys Admins</div>
                <div className="text-lg font-bold text-gray-900">{users.filter(u => u.roles.isSystemAdmin).length}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-[#576C71] flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Session Admins</div>
                <div className="text-lg font-bold text-gray-900">{users.filter(u => u.roles.sessionAdminCount > 0).length}</div>
              </div>
            </div>
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-[#8B5A4A] flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">Stakeholders</div>
                <div className="text-lg font-bold text-gray-900">{users.filter(u => u.roles.stakeholderSessionCount > 0).length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* View Toggle - Session Admin vs System Admin */}
        {(isSystemAdmin || isSessionAdmin) && (
          <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={closeRoleModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-xl w-full my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 overflow-visible">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {roleModalType === 'session-admin' 
                  ? 'Add Session Admin' 
                  : roleModalType === 'remove-stakeholder'
                  ? 'Remove Stakeholder'
                  : 'Add Stakeholder'}
              </h2>
                  <p className="text-sm text-gray-600">
                {roleModalType === 'remove-stakeholder' ? (
                      <>Select sessions to remove <strong>{selectedUserForRole.name}</strong> as a stakeholder.</>
                ) : (
                      <>Select sessions to add <strong>{selectedUserForRole.name}</strong> as {roleModalType === 'session-admin' ? 'an admin' : 'a stakeholder'}.</>
                )}
              </p>
              </div>
                <button
                  onClick={closeRoleModal}
                  className="ml-4 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <ProductSessionSelector
                  products={products}
                  sessions={getAvailableSessions(roleModalType)}
                  selectedProductId={roleModalProductId}
                  onProductChange={(productId) => {
                    setRoleModalProductId(productId);
                    setRoleModalSelectedSessionIds([]);
                    setRoleModalUseAllSessions(true);
                  }}
                  useAllSessions={roleModalUseAllSessions}
                  onToggleAllSessions={(useAll) => {
                    setRoleModalUseAllSessions(useAll);
                    if (useAll) {
                      setRoleModalSelectedSessionIds([]);
                    }
                  }}
                  selectedSessionIds={roleModalSelectedSessionIds}
                  onSessionToggle={(sessionId) => {
                    if (roleModalSelectedSessionIds.includes(sessionId)) {
                      setRoleModalSelectedSessionIds(roleModalSelectedSessionIds.filter(id => id !== sessionId));
                    } else {
                      setRoleModalSelectedSessionIds([...roleModalSelectedSessionIds, sessionId]);
                    }
                  }}
                  getSessionStatus={getSessionStatus}
                  formatSessionDateRange={formatSessionDateRange}
                  filterSessions={filterSessionsForRoleModal}
                />
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleAddToSession}
                  disabled={!roleModalProductId || (!roleModalUseAllSessions && roleModalSelectedSessionIds.length === 0)}
                  className={`px-6 py-2.5 rounded-lg transition-colors ${
                    roleModalProductId && (roleModalUseAllSessions || roleModalSelectedSessionIds.length > 0)
                      ? roleModalType === 'remove-stakeholder'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-[#4f6d8e] text-white hover:bg-[#3d5670]'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {(() => {
                    const sessionCount = roleModalUseAllSessions 
                      ? (filterSessionsForRoleModal(getAvailableSessions(roleModalType), roleModalProductId || '').length)
                      : roleModalSelectedSessionIds.length;
                    const isPlural = sessionCount > 1;
                    
                    if (roleModalType === 'remove-stakeholder') {
                      return `Remove from Session${isPlural ? 's' : ''}`;
                    } else if (roleModalType === 'session-admin') {
                      return `Add to Session${isPlural ? 's' : ''} as Session Admin`;
                    } else {
                      return `Add to Session${isPlural ? 's' : ''} as a Stakeholder`;
                    }
                  })()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
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
                      <Crown className="h-4 w-4 mr-2 text-[#C89212]" />
                      <span className="text-gray-700">System Admin</span>
                    </div>
                  )}
                  {userToDelete.roles.sessionAdminCount > 0 && (
                    <div className="flex items-center text-sm">
                      <Shield className="h-4 w-4 mr-2 text-[#576C71]" />
                      <span className="text-gray-700">Session Admin in {userToDelete.roles.sessionAdminCount} session{userToDelete.roles.sessionAdminCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {userToDelete.roles.stakeholderSessionCount > 0 && (
                    <div className="flex items-center text-sm">
                      <UserIcon className="h-4 w-4 mr-2 text-[#8B5A4A]" />
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
                          <Shield className="h-3.5 w-3.5 mr-1.5 text-[#576C71]" />
                          Admin Sessions ({userToDelete.adminInSessions.length})
                        </div>
                        <div className="space-y-1 ml-5">
                          {userToDelete.adminInSessions.map(session => (
                            <div key={session.id} className="text-sm text-gray-700">
                              • {session.title || 'Unnamed Session'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {userToDelete.stakeholderInSessions && userToDelete.stakeholderInSessions.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center">
                          <UserIcon className="h-3.5 w-3.5 mr-1.5 text-[#8B5A4A]" />
                          Stakeholder Sessions ({userToDelete.stakeholderInSessions.length})
                        </div>
                        <div className="space-y-1 ml-5">
                          {userToDelete.stakeholderInSessions.map(session => (
                            <div key={session.id} className="text-sm text-gray-700">
                              • {session.title || 'Unnamed Session'}
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
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start mb-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#8B5A4A]/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-[#8B5A4A]" />
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
                {/* Azure AD User Search */}
                {showAzureSearchSection ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Company Users (Optional)
                    </label>
                    {isAzureSignedIn === false ? (
                      /* Show sign-in button if not signed in with Azure */
                      <div className="border border-gray-300 rounded-lg p-4 bg-blue-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              Sign in with Microsoft to search company users
                            </p>
                            <p className="text-xs text-gray-600">
                              You need to sign in with your Microsoft account to use the company user search feature.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAzureSignIn}
                            className="ml-4 flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                          >
                            <img 
                              src="/microsoft.svg"
                              alt="Microsoft"
                              style={{ width: '21px', height: '21px', marginRight: '8px' }}
                            />
                            <span className="text-sm font-medium text-gray-700">Sign in</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Show search input if signed in with Azure */
                      <>
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
                              <div className="mb-2">{azureUserSearch.error}</div>
                              {azureUserSearch.error.includes('User.ReadBasic.All') && (
                                <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-800">
                                  <div className="font-medium mb-1">To fix this:</div>
                                  <ol className="list-decimal list-inside space-y-1 ml-2">
                                    <li>Go to Azure Portal → App registrations → Your app</li>
                                    <li>API permissions → Add permission → Microsoft Graph → Delegated permissions</li>
                                    <li>Add "User.ReadBasic.All" or "User.Read.All"</li>
                                    <li>Click "Grant admin consent" (requires admin)</li>
                                  </ol>
                                </div>
                              )}
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
                      </>
                    )}
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
                        setAzureUserSearch(getInitialAzureSearchState());
                      }}
                    >
                      Search Company Users again
                    </button>
                  </div>
                )}

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
                  />
                </div>
                </div>

                {/* System Admin checkbox (system-admin mode only) */}
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
                        id="systemAdminCheckbox"
                            type="checkbox"
                            checked={newUserData.isSystemAdmin}
                            onChange={(e) => setNewUserData({ ...newUserData, isSystemAdmin: e.target.checked })}
                        className="sr-only"
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

                {/* Session Admin Accordion - Only for System Admins */}
                {viewMode === 'system-admin' && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="w-full flex items-center gap-2 py-2 hover:bg-gray-50 rounded-lg px-2 -ml-2 transition-colors">
                    <button
                      type="button"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700 flex-1 text-left"
                        onClick={() =>
                          setAccordionOpen(prev => ({
                            sessionAdmin: !prev.sessionAdmin,
                            stakeholder: false
                          }))
                        }
                      >
                        <span
                          className="flex items-center justify-center"
                          style={{
                            transform: sessionAdminActive ? 'scale(1.2)' : 'scale(1)'
                          }}
                        >
                          <Shield className="h-4 w-4 text-[#576C71]" />
                          </span>
                        <span>Session Admin</span>
                        {sessionAdminActive && sessionAdminSummary && (
                          <span className="ml-2 text-xs text-gray-500">{sessionAdminSummary}</span>
                        )}
                      </button>
                      {sessionAdminActive && (
                        <button
                          type="button"
                          onClick={clearSessionAdminSelections}
                          className="px-3 py-1 rounded-full border text-xs font-semibold transition-colors hover:bg-[#576C71]/10"
                          style={{
                            borderColor: '#576C71',
                            color: '#576C71',
                            backgroundColor: '#f6fbfb'
                          }}
                        >
                          Reset
                        </button>
                      )}
                      <ChevronDown 
                        className={`h-4 w-4 text-gray-500 transition-transform ${accordionOpen.sessionAdmin ? 'rotate-180' : ''}`}
                      />
                    </div>
                    
                    {accordionOpen.sessionAdmin && (
                      <div className="mt-3 ml-6 space-y-3">
                        {/* Product Selection */}
                        <div>
                          <ProductSelect
                            products={products}
                            value={selectedProductIdForSessionAdmin}
                            onChange={(productId) => {
                              setSelectedProductIdForSessionAdmin(productId);
                              setNewUserData(prev => ({ ...prev, sessionAdminIds: [] }));
                              setUseAllSessionsForSessionAdmin(true);
                            }}
                            label="Product *"
                          />
                        </div>

                        {/* Session Selection toggle */}
                        {selectedProductIdForSessionAdmin && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Session Selection *
                              </label>
                              <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
                                <button
                                  type="button"
                                  onClick={() => setUseAllSessionsForSessionAdmin(false)}
                                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                    !useAllSessionsForSessionAdmin
                                      ? 'bg-white text-[#2d4660] shadow-sm'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Select Sessions
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUseAllSessionsForSessionAdmin(true);
                                    setNewUserData(prev => ({ ...prev, sessionAdminIds: [] }));
                                  }}
                                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                    useAllSessionsForSessionAdmin
                                      ? 'bg-white text-[#2d4660] shadow-sm'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  All Sessions
                                </button>
                              </div>
                              {useAllSessionsForSessionAdmin && (
                                <p className="mt-2 text-xs text-gray-500">
                                  User will be added to all current and future sessions for this product
                                </p>
                              )}
                            </div>

                            {!useAllSessionsForSessionAdmin && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Sessions * (Current and Future)
                                </label>
                                {filteredSessionsForSessionAdmin.length === 0 ? (
                                  <p className="text-sm text-gray-500">No current or future sessions found for this product.</p>
                        ) : (
                                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                                    {filteredSessionsForSessionAdmin.map(session => (
                              <label
                                key={session.id}
                                        className="flex items-start px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={newUserData.sessionAdminIds.includes(session.id)}
                                  onChange={() => toggleSessionAdmin(session.id)}
                                          className="w-4 h-4 border-gray-300 rounded focus:ring-[#2D4660] accent-green-600 mt-1"
                                          style={{ accentColor: '#16a34a' }}
                                />
                                        <div className="ml-3 flex-1">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="text-sm font-medium text-gray-900">
                                              {session.title || 'Unnamed Session'}
                                            </div>
                                            <span className={`text-xs font-medium ${getSessionStatus(session).color}`}>
                                              {getSessionStatus(session).text}
                                </span>
                                          </div>
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {formatSessionDateRange(session)}
                                          </div>
                                        </div>
                              </label>
                            ))}
                                  </div>
                                )}
                              </div>
                            )}
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
                      <UserIcon className="h-4 w-4 mr-2 text-[#8B5A4A]" />
                      <span className="text-sm font-medium text-gray-700">Add as Stakeholder</span>
                      {newUserData.stakeholderSessionIds.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-[#8B5A4A]/10 text-[#8B5A4A] text-xs rounded-full">
                          {newUserData.stakeholderSessionIds.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {/* Product Selection */}
                      <div>
                        <ProductSelect
                          products={products}
                          value={selectedProductId}
                          onChange={(productId) => {
                            setSelectedProductId(productId);
                            // Clear selected sessions when product changes
                            setNewUserData(prev => ({ ...prev, stakeholderSessionIds: [] }));
                            setUseAllSessionsForStakeholder(true);
                          }}
                          label="Product *"
                        />
                      </div>

                      {/* Session Selection Toggle - Only show after product is selected */}
                      {selectedProductId && (
                        <div className="space-y-3">
                          {/* Toggle: All Sessions / Select Sessions */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Session Selection *
                            </label>
                            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setUseAllSessionsForStakeholder(false);
                                }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                  !useAllSessionsForStakeholder
                                    ? 'bg-white text-[#2d4660] shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                Select Sessions
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUseAllSessionsForStakeholder(true);
                                  setNewUserData(prev => ({ ...prev, stakeholderSessionIds: [] }));
                                }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                  useAllSessionsForStakeholder
                                    ? 'bg-white text-[#2d4660] shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                All Sessions
                              </button>
                            </div>
                            {useAllSessionsForStakeholder && (
                              <p className="mt-2 text-xs text-gray-500">
                                User will be added to all current and future sessions for this product
                              </p>
                            )}
                          </div>

                          {/* Session Selection List - Only show if "Select Sessions" is chosen */}
                          {!useAllSessionsForStakeholder && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sessions * (Current and Future)
                              </label>
                              {filteredSessionsForProduct.length === 0 ? (
                                <p className="text-sm text-gray-500">No current or future sessions found for this product.</p>
                      ) : (
                                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                                  {filteredSessionsForProduct.map((session) => (
                            <label
                              key={session.id}
                                      className="flex items-start px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={newUserData.stakeholderSessionIds.includes(session.id)}
                                onChange={() => toggleStakeholder(session.id)}
                                        className="w-4 h-4 border-gray-300 rounded focus:ring-[#2D4660] accent-green-600 mt-1"
                                        style={{ accentColor: '#16a34a' }}
                              />
                                      <div className="ml-3 flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {session.title || 'Unnamed Session'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {formatSessionDateRange(session)}
                                        </div>
                                        <div className="text-xs mt-0.5">
                                          <span className={`font-medium ${getSessionStatus(session).color}`}>
                                            {getSessionStatus(session).text}
                              </span>
                                        </div>
                                      </div>
                            </label>
                          ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // For System Admins: Show in accordion
                  <div className="border-t border-gray-200 pt-4">
                    <div className="w-full flex items-center gap-2 py-2 hover:bg-gray-50 rounded-lg px-2 -ml-2 transition-colors">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 flex-1 text-left"
                      onClick={() =>
                        setAccordionOpen(prev => ({
                          stakeholder: !prev.stakeholder,
                          sessionAdmin: false
                        }))
                      }
                    >
                      <span
                        className="flex items-center justify-center"
                        style={{
                          transform: stakeholderActive ? 'scale(1.2)' : 'scale(1)'
                        }}
                      >
                        <UserIcon className="h-4 w-4 text-[#8B5A4A]" />
                          </span>
                      <span>Stakeholder</span>
                      {stakeholderActive && stakeholderSummary && (
                        <span className="ml-2 text-xs text-gray-500">{stakeholderSummary}</span>
                        )}
                    </button>
                    {stakeholderActive && (
                      <button
                        type="button"
                        onClick={clearStakeholderSelections}
                        className="px-3 py-1 rounded-full border text-xs font-semibold transition-colors hover:bg-[#8B5A4A]/10"
                        style={{
                          borderColor: '#8B5A4A',
                          color: '#8B5A4A',
                          backgroundColor: '#fcf8f4'
                        }}
                      >
                        Reset
                      </button>
                    )}
                      <ChevronDown 
                        className={`h-4 w-4 text-gray-500 transition-transform ${accordionOpen.stakeholder ? 'rotate-180' : ''}`}
                      />
                  </div>
                    
                    {accordionOpen.stakeholder && (
                      <div className="mt-3 ml-6 space-y-3">
                        {/* Product Selection */}
                        <div>
                          <ProductSelect
                            products={products}
                            value={selectedProductId}
                            onChange={(productId) => {
                              setSelectedProductId(productId);
                              // Clear selected sessions when product changes
                              setNewUserData(prev => ({ ...prev, stakeholderSessionIds: [] }));
                              setUseAllSessionsForStakeholder(true);
                            }}
                            label="Product *"
                          />
                        </div>

                        {/* Session Selection Toggle - Only show after product is selected */}
                        {selectedProductId && (
                          <div className="space-y-3">
                            {/* Toggle: All Sessions / Select Sessions */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Session Selection *
                              </label>
                              <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUseAllSessionsForStakeholder(false);
                                  }}
                                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                    !useAllSessionsForStakeholder
                                      ? 'bg-white text-[#2d4660] shadow-sm'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  Select Sessions
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUseAllSessionsForStakeholder(true);
                                    setNewUserData(prev => ({ ...prev, stakeholderSessionIds: [] }));
                                  }}
                                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                                    useAllSessionsForStakeholder
                                      ? 'bg-white text-[#2d4660] shadow-sm'
                                      : 'text-gray-600 hover:text-gray-900'
                                  }`}
                                >
                                  All Sessions
                                </button>
                              </div>
                              {useAllSessionsForStakeholder && (
                                <p className="mt-2 text-xs text-gray-500">
                                  User will be added to all current and future sessions for this product
                                </p>
                              )}
                            </div>

                            {/* Session Selection List - Only show if "Select Sessions" is chosen */}
                            {!useAllSessionsForStakeholder && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Sessions * (Current and Future)
                                </label>
                                {filteredSessionsForProduct.length === 0 ? (
                                  <p className="text-sm text-gray-500">No current or future sessions found for this product.</p>
                        ) : (
                                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                                    {filteredSessionsForProduct.map((session) => (
                              <label
                                key={session.id}
                                        className="flex items-start px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={newUserData.stakeholderSessionIds.includes(session.id)}
                                  onChange={() => toggleStakeholder(session.id)}
                                          className="w-4 h-4 border-gray-300 rounded focus:ring-[#2D4660] accent-green-600 mt-1"
                                          style={{ accentColor: '#16a34a' }}
                                />
                                        <div className="ml-3 flex-1">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="text-sm font-medium text-gray-900">
                                              {session.title || 'Unnamed Session'}
                                            </div>
                                            <span className={`text-xs font-medium ${getSessionStatus(session).color}`}>
                                              {getSessionStatus(session).text}
                                </span>
                                          </div>
                                          <div className="text-xs text-gray-500 mt-0.5">
                                            {formatSessionDateRange(session)}
                                          </div>
                                        </div>
                              </label>
                            ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleAddUser}
                  disabled={Boolean(
                    isAddingUser ||
                      !newUserData.name.trim() ||
                      !newUserData.email.trim() ||
                      (viewMode === 'session-admin' &&
                        (!selectedProductId ||
                          (!useAllSessionsForStakeholder && newUserData.stakeholderSessionIds.length === 0))) ||
                      (viewMode === 'system-admin' &&
                        accordionOpen.sessionAdmin &&
                        selectedProductIdForSessionAdmin &&
                        !useAllSessionsForSessionAdmin &&
                        newUserData.sessionAdminIds.length === 0) ||
                      (viewMode === 'system-admin' &&
                        accordionOpen.stakeholder &&
                        selectedProductId &&
                        !useAllSessionsForStakeholder &&
                        newUserData.stakeholderSessionIds.length === 0)
                  )}
                  className="px-4 py-2.5 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isAddingUser ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {getRoleButtonLabel(true)}
                    </>
                  ) : (
                    getRoleButtonLabel(false)
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && userToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Edit className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    Edit User
                  </h2>
                  <p className="text-sm text-gray-600">
                    Update user name and email address
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowEditUserModal(false);
                    setUserToEdit(null);
                    setEditingUserName('');
                    setEditingUserEmail('');
                  }}
                  className="flex-shrink-0 ml-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                    value={editingUserName}
                    onChange={(e) => setEditingUserName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent"
                    placeholder="John Doe"
                    disabled={isUpdatingUser}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={editingUserEmail}
                    onChange={(e) => setEditingUserEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D4660] focus:border-transparent"
                    placeholder="john.doe@newmill.com"
                    disabled={isUpdatingUser}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditUserModal(false);
                    setUserToEdit(null);
                    setEditingUserName('');
                    setEditingUserEmail('');
                  }}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isUpdatingUser}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateUser}
                  disabled={isUpdatingUser || !editingUserName.trim() || !editingUserEmail.trim()}
                  className="px-4 py-2.5 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingUser ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4 flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {successModalData.userType} Created Successfully!
                  </h2>
                  <p className="text-sm text-gray-600">
                    The user account has been created and roles have been assigned.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessModalData(null);
                  }}
                  className="flex-shrink-0 ml-4 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</div>
                    <div className="text-sm font-medium text-gray-900">{successModalData.email}</div>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="ml-2">
                    <div className="text-sm font-semibold text-blue-800 mb-1">
                      User Authentication
                    </div>
                    <div className="text-xs text-blue-700">
                      The user will sign in using their company Azure AD credentials. No password is needed.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessModalData(null);
                  }}
                  className="px-4 py-2.5 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}