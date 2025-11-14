import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { supabase } from '../supabaseClient';
import * as db from '../services/databaseService';
import { Footer, Modal, Button } from '../screens/FeatureVoting';
import { getDisplayProductName } from '../utils/productDisplay';
import { getProductColor } from '../utils/productColors';
import { isFallbackSystemAdmin } from '../utils/systemAdmins';
import type { Product } from '../types';
import {
  Calendar, Clock, Users, Vote, Settings, LogOut,
  CheckCircle, AlertCircle, Plus, Mail, List, Info, BarChart2, BadgeCheck, Shield
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
  const [viewMode, setViewMode] = useState<'admin' | 'stakeholder' | 'system-admin'>('admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const [productLookup, setProductLookup] = useState<Record<string, string>>({});
  const [productColorLookup, setProductColorLookup] = useState<Record<string, string>>({});
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [createSessionForm, setCreateSessionForm] = useState({
    title: '',
    goal: '',
    votesPerUser: 10,
    useAutoVotes: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [createSessionErrors, setCreateSessionErrors] = useState<Record<string, string>>({});
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [modalProducts, setModalProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newProductColor, setNewProductColor] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showCreateButton, setShowCreateButton] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<{ name: string; color: string | null } | null>(null);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [tempColor, setTempColor] = useState<string>('#2D4660');
  const sessionTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadModalProducts = async () => {
      if (!showCreateSessionModal || !currentUser) {
        return;
      }

      const tenantId = currentUser.tenant_id ?? currentUser.tenantId ?? null;
      if (!tenantId) {
        setModalProducts([]);
        setSelectedProductId('');
        setProductError('No tenant assigned. Products cannot be loaded.');
        return;
      }

      setIsLoadingProducts(true);
      setProductError(null);
      try {
        const results = await db.getProductsForTenant(tenantId);
        setModalProducts(results);
        setSelectedProductId(results[0]?.id ?? '');
        setProductLookup(prev => {
          const updated = { ...prev };
          results.forEach(product => {
            if (product.id && product.name) {
              updated[product.id] = product.name;
            }
          });
          return updated;
        });
        setProductColorLookup(prev => {
          const updated = { ...prev };
          results.forEach(product => {
            if (product.id && product.color_hex) {
              updated[product.id] = product.color_hex;
            }
          });
          return updated;
        });
      } catch (error) {
        console.error('Error loading products for modal:', error);
        if (db.isProductsTableMissingError?.(error)) {
          setProductError('Products are not configured yet. Please create the `products` table in Supabase.');
        } else {
          setProductError('Unable to load products. You can still create a session without a product tag.');
        }
        setModalProducts([]);
        setSelectedProductId('');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadModalProducts();
  }, [showCreateSessionModal, currentUser]);

  const generateSessionCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const resetCreateSessionForm = () => {
    setCreateSessionForm({
      title: '',
      goal: '',
      votesPerUser: 10,
      useAutoVotes: true,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setCreateSessionErrors({});
    setNewProductName('');
    setNewProductColor(null);
    setProductError(null);
    setIsCreatingNewProduct(false);
    setShowColorPicker(false);
    setShowCreateButton(false);
    setPendingProduct(null);
    setShowColorPickerModal(false);
    setTempColor('#2D4660');
  };

  const validateCreateSessionForm = () => {
    const errors: Record<string, string> = {};

    if (!createSessionForm.title.trim()) {
      errors.title = 'Session title is required';
    }
    if (!createSessionForm.goal.trim()) {
      errors.goal = 'Session goal is required';
    }
    if (!createSessionForm.useAutoVotes) {
      if (createSessionForm.votesPerUser < 1) {
        errors.votesPerUser = 'Votes per user must be at least 1';
      }
      if (createSessionForm.votesPerUser > 100) {
        errors.votesPerUser = 'Votes per user cannot exceed 100';
      }
    }
    const start = new Date(createSessionForm.startDate);
    const end = new Date(createSessionForm.endDate);
    if (end <= start) {
      errors.endDate = 'End date must be after start date';
    }
    
    // Require either a selected product or a pending product
    if (!productError && modalProducts.length > 0 && !selectedProductId && !pendingProduct && !isCreatingNewProduct) {
      errors.product = 'Please select a product or create a new one';
    }
    
    // If creating new product, ensure name is provided
    if (isCreatingNewProduct && !newProductName.trim()) {
      errors.product = 'Please enter a product name or select an existing product';
    }

    setCreateSessionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSessionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCreateSessionForm(prev => ({
      ...prev,
      [name]: name === 'votesPerUser' ? parseInt(value) || 0 : value
    }));
    if (createSessionErrors[name]) {
      setCreateSessionErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCreateProduct = async () => {
    const trimmedName = newProductName.trim();
    if (!trimmedName) {
      setProductError('Product name is required.');
      return;
    }

    // Don't actually create the product yet - just prepare it
    // It will be created when the session is submitted
    setIsCreatingProduct(true);
    
    // Simulate a brief moment for UX feedback
    setTimeout(() => {
      setIsCreatingProduct(false);
      
      // Store the pending product info
      setPendingProduct({
        name: trimmedName,
        color: newProductColor
      });
      
      // Reset creation UI state
      setIsCreatingNewProduct(false);
      setShowColorPicker(false);
      setShowCreateButton(false);
      
      // Focus on session title input
      setTimeout(() => {
        sessionTitleInputRef.current?.focus();
      }, 100);
    }, 500);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete || !currentUser) return;
    setIsDeletingProduct(true);
    try {
      await db.deleteProduct(productToDelete.id);
      setModalProducts(prev => prev.filter((product) => product.id !== productToDelete.id));
      setProductLookup(prev => {
        const next = { ...prev };
        delete next[productToDelete.id];
        return next;
      });
      setProductColorLookup(prev => {
        const next = { ...prev };
        delete next[productToDelete.id];
        return next;
      });
      if (selectedProductId === productToDelete.id) {
        setSelectedProductId('');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setIsDeletingProduct(false);
      setProductToDelete(null);
    }
  };

  const handleCreateSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!validateCreateSessionForm()) return;

    setIsCreatingSession(true);
    try {
      const code = generateSessionCode();
      let productIdToUse = selectedProductId;
      let productNameToUse = null;
      
      // If user created a pending product, create it now
      if (pendingProduct) {
        const tenantId = currentUser.tenant_id ?? currentUser.tenantId ?? null;
        if (tenantId) {
          try {
            const created = await db.createProductForTenant(
              tenantId, 
              pendingProduct.name, 
              pendingProduct.color ?? undefined
            );
            productIdToUse = created.id;
            productNameToUse = created.name;
            
            // Update local state for immediate display
            setModalProducts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setProductLookup(prev => ({ ...prev, [created.id]: created.name }));
            setProductColorLookup(prev => {
              const next = { ...prev };
              if (created.color_hex) next[created.id] = created.color_hex;
              return next;
            });
          } catch (error) {
            console.error('Error creating product during session creation:', error);
            setCreateSessionErrors(prev => ({
              ...prev,
              submit: 'Failed to create product. Please try again.'
            }));
            setIsCreatingSession(false);
            return;
          }
        }
      }

      const selectedProduct = modalProducts.find(p => p.id === productIdToUse) || null;

      const newSession = await db.createSession({
        title: createSessionForm.title,
        goal: createSessionForm.goal,
        votes_per_user: createSessionForm.votesPerUser,
        use_auto_votes: createSessionForm.useAutoVotes,
        start_date: createSessionForm.startDate,
        end_date: createSessionForm.endDate,
        is_active: true,
        session_code: code,
        access_type: 'invite-only',
        product_id: productIdToUse ?? null,
        product_name: productNameToUse ?? selectedProduct?.name ?? null
      });

      await db.addSessionAdmin(newSession.id, currentUser.id);
      await refreshSessions();
      await loadUserSessions();

      const refreshedSession = await db.getSessionById(newSession.id);
      if (refreshedSession) {
        setCurrentSession(refreshedSession);
      } else {
        setCurrentSession(newSession);
      }
      setShowCreateSessionModal(false);
      resetCreateSessionForm();
      navigate('/admin');
    } catch (error) {
      console.error('Error creating session from modal:', error);
      setCreateSessionErrors(prev => ({
        ...prev,
        submit: 'Failed to create session. Please try again.'
      }));
    } finally {
      setIsCreatingSession(false);
    }
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
      // Check if system admin (including fallback)
      const fallbackSystemAdmin = isFallbackSystemAdmin(currentUser.email);
      const sysAdmin = fallbackSystemAdmin || await db.isUserSystemAdmin(currentUser.id);
      setIsSystemAdmin(sysAdmin);

      // Get sessions - system admins see everything
      const freshSessions = sysAdmin
        ? await db.getAllSessions()
        : await db.getSessionsForUser(currentUser.id);

      // Build lookup of product_id -> product_name/color for consistent display
      const tenantId = currentUser?.tenant_id ?? currentUser?.tenantId ?? null;
      let productsMap: Record<string, string> = {};
      let productColorMap: Record<string, string> = {};
      if (tenantId) {
        try {
          const products = await db.getProductsForTenant(tenantId);
          productsMap = products.reduce((acc: Record<string, string>, product: Product) => {
            if (product.id && product.name) {
              acc[product.id] = product.name;
            }
            return acc;
          }, {});
          productColorMap = products.reduce((acc: Record<string, string>, product: Product) => {
            if (product.id && product.color_hex) {
              acc[product.id] = product.color_hex;
            }
            return acc;
          }, {});
        } catch (productError) {
          console.error('Error loading products for session selection:', productError);
        }
      }

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
      setProductLookup(productsMap);
      setProductColorLookup(productColorMap);
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

  // Sort helper: active sessions first, then upcoming, then closed.
  // Within each group, sort by end_date ascending (closest end date first).
  const sortSessions = (sessions: any[]) => {
    // Sort globally by end_date newest -> oldest (most recent close first)
    return [...sessions].sort((a, b) => {
      const dateA = a?.end_date ? Date.parse(a.end_date) : 0;
      const dateB = b?.end_date ? Date.parse(b.end_date) : 0;
      return dateB - dateA;
    });
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
    navigate('/users?filter=session-admin');
  };

  const handleManageStakeholders = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setCurrentSession(session);
    navigate('/users?filter=stakeholder');
  };

  const handleCloseCreateModal = () => {
    setShowCreateSessionModal(false);
    resetCreateSessionForm();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2D4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  // Separate sessions by role
  // System admins see ALL sessions as admin sessions
  const sortedUserSessions = sortSessions(userSessions);

  const adminSessions = isSystemAdmin
    ? sortedUserSessions // System admins see all sessions
    : sortedUserSessions.filter(s => sessionRoles[s.id]?.isAdmin);
  const stakeholderOnlySessions = isSystemAdmin
    ? [] // System admins don't have "stakeholder-only" sessions
    : sortedUserSessions.filter(s =>
        sessionRoles[s.id]?.isStakeholder && !sessionRoles[s.id]?.isAdmin
      );
  
  // Determine if user has any admin access
  const hasAdminAccess = isSystemAdmin || adminSessions.length > 0;

  const isSystemAdminView = isSystemAdmin && viewMode === 'system-admin';
  // When in stakeholder view mode, show all sessions as stakeholder cards
  const sessionsToDisplay = viewMode === 'stakeholder' ? sortedUserSessions : [];
  const adminSessionsToDisplay = (viewMode === 'admin' || viewMode === 'system-admin') ? adminSessions : [];
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
            <h1 className="text-2xl font-bold text-[#2D4660] md:text-3xl">My Voting Sessions</h1>
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
            {isSystemAdmin && (viewMode === 'admin' || viewMode === 'system-admin') && (
              <>
                <button
                  onClick={() => navigate('/users')}
                  className="flex items-center px-4 py-2 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors"
                >
                  <Users className="h-4 w-4 mr-2" />
                  User Management
                </button>
              </>
            )}
            {(isSystemAdmin || adminSessions.length > 0) && (viewMode === 'admin' || viewMode === 'system-admin') && (
              <button
                onClick={() => setShowCreateSessionModal(true)}
                className="flex items-center px-4 py-2 bg-[#C89212] text-white rounded-lg hover:bg-[#6A4234] transition-colors"
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
                {isSystemAdmin && (viewMode === 'admin' || viewMode === 'system-admin') && (
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
                {(isSystemAdmin || adminSessions.length > 0) && (viewMode === 'admin' || viewMode === 'system-admin') && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); setShowCreateSessionModal(true); }}
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
              onClick={() => setShowCreateSessionModal(true)}
              className="inline-flex items-center px-4 py-2 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors"
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
              <h2 className="text-xl font-semibold text-[#2D4660] mb-4 flex items-center">
                <Vote className="h-5 w-5 mr-2" />
                All Your Voting Sessions
              </h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sessionsToDisplay.map((session) => {
                  const status = getSessionStatus(session);
                  const isClosed = status.text === 'Closed';
                  const StatusIcon = status.icon;
                  const votesInfo = getEffectiveVotesPerUser(session);
                  const hasVoted = votingStatus[session.id];
                  const productName = getDisplayProductName(session, productLookup);
                  const productColorHex = session.product_id ? productColorLookup[session.product_id] : undefined;
                  const productColors = getProductColor(productName, productColorHex);

                  return (
                    <div
                      key={session.id}
                      className="relative z-10 bg-white overflow-visible shadow-md rounded-lg rounded-tl-none hover:shadow-lg transition-shadow cursor-pointer mt-6 border"
                      style={{ borderColor: productColors.border, borderWidth: '1px' }}
                      onClick={() => handleSelectSession(session)}
                    >
                      {/* Product Name Tab */}
                      <div
                        className="absolute left-0 px-4 py-1 rounded-t-md border-b-0 text-sm font-semibold shadow-sm z-20 flex items-center gap-2 whitespace-nowrap overflow-hidden"
                        style={{
                          top: '0',
                          left: '-1px',
                          transform: 'translateY(-100%)',
                          backgroundColor: productColors.background,
                          color: productColors.text,
                          borderColor: productColors.border,
                          borderWidth: '1px',
                          borderBottomWidth: '0',
                          boxShadow: '0 4px 8px rgba(16,24,40,0.06)',
                          borderTopLeftRadius: '0.9rem',
                          borderTopRightRadius: '0.9rem'
                        }}
                      >
                        <BadgeCheck className="h-4 w-4 flex-shrink-0" />
                        <span className="overflow-hidden text-ellipsis">{productName}</span>
                      </div>
                      <div className="p-6 flex flex-col h-full">
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
                        <h3 className="text-lg font-semibold text-[#2D4660] mb-2">
                          {session.title}
                        </h3>

                        {/* Session Goal */}
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {session.goal}
                        </p>

                        {/* Spacer */}
                        <div className="flex-1"></div>

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
                              if (!isClosed) handleSelectSession(session);
                            }}
                            disabled={isClosed}
                            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg transition-colors font-medium ${
                              isClosed
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : hasVoted
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-[#2D4660] text-white hover:bg-[#173B65]'
                            }`}
                            style={isClosed ? { cursor: 'not-allowed' } : {}}
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

          {/* Admin/System Admin View Mode - Show separated sections */}
          {(viewMode === 'admin' || viewMode === 'system-admin') && (
            <>
              {/* Stakeholder Sessions Section */}
              {viewMode === 'admin' && stakeholderSessionsToDisplay.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-[#2D4660] mb-4 flex items-center">
                    <Vote className="h-5 w-5 mr-2" />
                    Your Voting Sessions
                  </h2>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {stakeholderSessionsToDisplay.map((session) => {
                  const status = getSessionStatus(session);
                  const isClosed = status.text === 'Closed';
                  const StatusIcon = status.icon;
                  const votesInfo = getEffectiveVotesPerUser(session);
                  const hasVoted = votingStatus[session.id];
                  const productName = getDisplayProductName(session, productLookup);
                  const productColorHex = session.product_id ? productColorLookup[session.product_id] : undefined;
                  const productColors = getProductColor(productName, productColorHex);

                  return (
                    <div
                      key={session.id}
                      className="relative z-10 bg-white overflow-visible shadow-md rounded-lg rounded-tl-none hover:shadow-lg transition-shadow cursor-pointer mt-6 border"
                      style={{ borderColor: productColors.border, borderWidth: '1px' }}
                      onClick={() => handleSelectSession(session)}
                    >
                      {/* Product Name Tab */}
                      <div
                        className="absolute left-0 px-4 py-1 rounded-t-md border-b-0 text-sm font-semibold shadow-sm z-20 flex items-center gap-2 whitespace-nowrap overflow-hidden"
                        style={{
                          top: '0',
                          left: '-1px',
                          transform: 'translateY(-100%)',
                          backgroundColor: productColors.background,
                          color: productColors.text,
                          borderColor: productColors.border,
                          borderWidth: '1px',
                          borderBottomWidth: '0',
                          boxShadow: '0 4px 8px rgba(16,24,40,0.06)',
                          borderTopLeftRadius: '0.9rem',
                          borderTopRightRadius: '0.9rem'
                        }}
                      >
                        <BadgeCheck className="h-4 w-4 flex-shrink-0" />
                        <span className="overflow-hidden text-ellipsis">{productName}</span>
                      </div>
                      <div className="p-6 flex flex-col h-full">
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
                        <h3 className="text-lg font-semibold text-[#2D4660] mb-2">
                          {session.title}
                        </h3>

                        {/* Session Goal */}
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {session.goal}
                        </p>

                        {/* Spacer */}
                        <div className="flex-1"></div>

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
                              if (!isClosed) handleSelectSession(session);
                            }}
                            disabled={isClosed}
                            className={`w-full flex items-center justify-center px-4 py-2 rounded-lg transition-colors font-medium ${
                              isClosed
                                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                : hasVoted
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-[#2D4660] text-white hover:bg-[#173B65]'
                            }`}
                            style={isClosed ? { cursor: 'not-allowed' } : {}}
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h2 className="text-xl font-semibold text-[#2D4660] flex items-center">
                      <Settings className="h-5 w-5 mr-2" />
                      {isSystemAdminView ? 'All Sessions (System Admin)' : 'Sessions You Manage'}
                    </h2>
                    {isSystemAdminView && (
                      <p className="text-sm text-gray-600">
                        Showing {adminSessionsToDisplay.length} total sessions across the organization.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {adminSessionsToDisplay.map((session) => {
                  const status = getSessionStatus(session);
                  const StatusIcon = status.icon;
                  const votesInfo = getEffectiveVotesPerUser(session);
                  const isClosed = status.text === 'Closed';
                  const productName = getDisplayProductName(session, productLookup);
                  const productColorHex = session.product_id ? productColorLookup[session.product_id] : undefined;
                  const productColors = getProductColor(productName, productColorHex);

                  return (
                    <div
                      key={session.id}
                      className="relative z-10 bg-white overflow-visible shadow-md rounded-lg rounded-tl-none hover:shadow-lg transition-shadow cursor-pointer mt-6 border"
                      style={{ borderColor: productColors.border, borderWidth: '1px' }}
                      onClick={() => handleSelectSession(session)}
                    >
                      {/* Product Name Tab */}
                      <div
                        className="absolute left-0 px-4 py-1 rounded-t-md border-b-0 text-sm font-semibold shadow-sm z-20 flex items-center gap-2 whitespace-nowrap overflow-hidden"
                        style={{
                          top: '0',
                          left: '-1px',
                          transform: 'translateY(-100%)',
                          backgroundColor: productColors.background,
                          color: productColors.text,
                          borderColor: productColors.border,
                          borderWidth: '1px',
                          borderBottomWidth: '0',
                          boxShadow: '0 4px 8px rgba(16,24,40,0.06)',
                          borderTopLeftRadius: '0.9rem',
                          borderTopRightRadius: '0.9rem'
                        }}
                      >
                        <BadgeCheck className="h-4 w-4 flex-shrink-0" />
                        <span className="overflow-hidden text-ellipsis">{productName}</span>
                      </div>
                      <div className="p-6 flex flex-col h-full">
                        {/* Action Buttons */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className={`relative inline-block ${isClosed ? 'group' : ''}`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isClosed) handleSelectSession(session);
                                }}
                                disabled={isClosed}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                                  isClosed
                                    ? 'bg-gray-200 text-gray-500'
                                    : 'bg-[#576C71] text-white hover:bg-[#1E5461]'
                                }`}
                                style={isClosed ? { cursor: 'not-allowed' } : {}}
                              >
                                <Vote className="h-3 w-3 mr-1" />
                                Vote!
                              </button>
                              {isClosed && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded shadow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10 pointer-events-none">
                                  Session Closed
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-100 rotate-45 transform"></div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className={`relative inline-block ${isClosed ? 'group' : ''}`}>
                              <button
                                onClick={(e) => handleManageAdmins(e, session)}
                                disabled={isClosed}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                  isClosed
                                    ? 'bg-gray-200 text-gray-500'
                                    : 'bg-gray-100 text-[#173B65] hover:bg-gray-200'
                                }`}
                                style={isClosed ? { cursor: 'not-allowed' } : {}}
                              >
                                <Settings className="h-3 w-3 mr-1" />
                                Admins
                              </button>
                              {isClosed && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded shadow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10 pointer-events-none">
                                  Session Closed
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-100 rotate-45 transform"></div>
                                </div>
                              )}
                            </div>

                            <div className={`relative inline-block ${isClosed ? 'group' : ''}`}>
                              <button
                                onClick={(e) => handleManageStakeholders(e, session)}
                                disabled={isClosed}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                  isClosed
                                    ? 'bg-gray-200 text-gray-500'
                                    : 'bg-[#1E5461] text-white hover:bg-[#576C71]'
                                }`}
                                style={isClosed ? { cursor: 'not-allowed' } : {}}
                              >
                                <Users className="h-3 w-3 mr-1" />
                                Stakeholders
                              </button>
                              {isClosed && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded shadow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10 pointer-events-none">
                                  Session Closed
                                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-100 rotate-45 transform"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Session Title */}
                        <h3 className="text-lg font-semibold text-[#2D4660] mb-2">
                          {session.title}
                        </h3>

                        {/* Session Goal */}
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {session.goal}
                        </p>

                        {/* Spacer */}
                        <div className="flex-1"></div>

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
                                className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#C89212] text-white hover:bg-[#6A4234] transition-colors cursor-pointer flex-shrink-0"
                              >
                                <BarChart2 className="h-3 w-3 mr-1" />
                                {status.text === 'Closed' ? 'Final Results' : 'Current Results'}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Email Invite */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className={`relative inline-block w-full ${isClosed ? 'group' : ''}`}>
                            <button
                              onClick={(e) => handleEmailInvite(e, session)}
                              disabled={isClosed}
                              className={`w-full flex items-center justify-center px-3 py-2 rounded-md transition-colors ${
                                isClosed
                                  ? 'bg-gray-200 text-gray-500'
                                  : 'bg-blue-50 hover:bg-blue-100'
                              }`}
                              style={isClosed ? { cursor: 'not-allowed' } : {}}
                            >
                              <Mail className={`h-4 w-4 mr-2 ${isClosed ? 'text-gray-500' : 'text-blue-600'}`} />
                              <span className={`text-sm font-medium ${isClosed ? 'text-gray-500' : 'text-blue-600'}`}>Email Invite to Stakeholders</span>
                            </button>
                            {isClosed && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded shadow-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10 pointer-events-none">
                                Session Closed
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-100 rotate-45 transform"></div>
                              </div>
                            )}
                          </div>
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

      <Modal
        isOpen={showCreateSessionModal}
        onClose={handleCloseCreateModal}
        title="Create Voting Session"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSessionSubmit} className="space-y-6">
          {/* Product Selector with Animation */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Product *
            </label>
            
            {!isCreatingNewProduct && !pendingProduct ? (
              /* Default State: Dropdown + OR + Create Button */
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      if (createSessionErrors.product) {
                        setCreateSessionErrors(prev => {
                          const next = { ...prev };
                          delete next.product;
                          return next;
                        });
                      }
                    }}
                    disabled={isLoadingProducts}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-0 focus:border-[#2D4660] ${
                      createSessionErrors.product ? 'border-red-500' : 'border-gray-300'
                    } ${isLoadingProducts ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoadingProducts ? (
                      <option>Loading products...</option>
                    ) : modalProducts.length === 0 ? (
                      <option value="">No products available</option>
                    ) : (
                      <>
                        <option value="">Select a product</option>
                        {modalProducts.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <span className="text-gray-500 font-medium px-2">or</span>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewProduct(true)}
                  disabled={isLoadingProducts}
                  className="px-4 py-2 bg-[#1E5461] text-white rounded-md hover:bg-[#576C71] transition-colors font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  Create New Product
                </button>
              </div>
            ) : pendingProduct ? (
              /* Pending Product Display - Minimal */
              <div 
                className="flex items-center gap-3 px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:border-[#2D4660] transition-colors animate-in fade-in duration-300"
                onClick={() => {
                  setPendingProduct(null);
                  setNewProductName(pendingProduct.name);
                  setNewProductColor(pendingProduct.color);
                  setIsCreatingNewProduct(true);
                  setShowColorPicker(true);
                  setShowCreateButton(false); // Don't show create button when editing
                }}
              >
                <div 
                  className="w-6 h-6 rounded-md border flex-shrink-0"
                  style={{ 
                    backgroundColor: pendingProduct.color || '#2D4660',
                    borderColor: pendingProduct.color || '#2D4660'
                  }}
                />
                <span className="font-medium text-gray-900 flex-1">{pendingProduct.name}</span>
                <span className="text-xs text-gray-500">Click to edit</span>
              </div>
            ) : (
              /* Creating New Product State: Animated Input + Color Picker + Create Button */
              <div className="space-y-3">
                <div className="flex gap-3 items-center">
                  <div 
                    className="flex-1"
                    style={{
                      animation: 'dramaticSlideIn 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                    }}
                  >
                    <style>{`
                      @keyframes dramaticSlideIn {
                        from {
                          opacity: 0;
                          transform: translateX(150px) scale(0.9);
                        }
                        to {
                          opacity: 1;
                          transform: translateX(0) scale(1);
                        }
                      }
                    `}</style>
                    <input
                      type="text"
                      value={newProductName}
                      onChange={(e) => {
                        setNewProductName(e.target.value);
                        // Only trigger color picker slide-in if we haven't shown it yet
                        if (e.target.value.trim() && !showColorPicker) {
                          setTimeout(() => setShowColorPicker(true), 200);
                        }
                        if (productError) setProductError(null);
                      }}
                      placeholder="Enter product name..."
                      autoFocus
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-[#2D4660]"
                    />
                  </div>
                  
                  {/* Color Picker - Slides in from right */}
                  {showColorPicker && (
                    <div 
                      className="flex items-center gap-2 overflow-hidden"
                      style={{
                        animation: 'slideInFromRight 1s ease-out forwards'
                      }}
                    >
                      <style>{`
                        @keyframes slideInFromRight {
                          from {
                            opacity: 0;
                            transform: translateX(100px);
                          }
                          to {
                            opacity: 1;
                            transform: translateX(0);
                          }
                        }
                      `}</style>
                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Select a Product Color
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTempColor(newProductColor || '#2D4660');
                          setShowColorPickerModal(true);
                          // Auto-trigger color picker after modal opens
                          setTimeout(() => {
                            document.getElementById('native-color-input')?.click();
                          }, 100);
                        }}
                        className="block w-10 h-10 rounded-md border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center overflow-hidden"
                        style={newProductColor ? { backgroundColor: newProductColor } : { backgroundColor: '#ffffff' }}
                      >
                        {!newProductColor && (
                          <img 
                            src="https://icon-library.com/images/color-wheel-icon-png/color-wheel-icon-png-25.jpg" 
                            alt="Color Wheel"
                            className="w-8 h-8 object-contain"
                          />
                        )}
                      </button>
                    </div>
                  )}
                  
                  {/* Create Button - Slides in from right in same row */}
                  {showCreateButton && (
                    <button
                      type="button"
                      onClick={handleCreateProduct}
                      disabled={!newProductName.trim() || isCreatingProduct}
                      className="relative px-6 py-2 bg-[#C89212] text-white rounded-md hover:bg-[#6A4234] transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group whitespace-nowrap"
                      style={{
                        animation: 'slideInFromRight 0.8s ease-out forwards'
                      }}
                    >
                      <span className="relative z-10 flex items-center">
                        {isCreatingProduct ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Preparing...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create New Product
                          </>
                        )}
                      </span>
                      {/* Sparkle animation */}
                      {!isCreatingProduct && (
                        <>
                          <span className="absolute top-1 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '0ms', animationDuration: '1.5s' }}></span>
                          <span className="absolute top-2 right-1/3 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '300ms', animationDuration: '1.5s' }}></span>
                          <span className="absolute bottom-2 left-1/3 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '600ms', animationDuration: '1.5s' }}></span>
                          <span className="absolute bottom-1 right-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '900ms', animationDuration: '1.5s' }}></span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {createSessionErrors.product && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {createSessionErrors.product}
              </p>
            )}
            {productError && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {productError}
              </p>
            )}
            {!isCreatingNewProduct && !isLoadingProducts && modalProducts.length === 0 && !productError && (
              <p className="text-sm text-gray-500">
                No products found yet. Click "Create New Product" to add one.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Title *
              </label>
              <input
                ref={sessionTitleInputRef}
                type="text"
                name="title"
                value={createSessionForm.title}
                onChange={handleCreateSessionChange}
                placeholder="e.g., Q3 Product Priorities, Sprint 5, Sprint 5: Mobile Updates"
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-0 focus:border-[#2d4660] ${
                  createSessionErrors.title ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {createSessionErrors.title && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {createSessionErrors.title}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Goal *
              </label>
              <textarea
                name="goal"
                value={createSessionForm.goal}
                onChange={handleCreateSessionChange}
                rows={2}
                placeholder="Describe the purpose of this voting session..."
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-0 focus:border-[#2d4660] ${
                  createSessionErrors.goal ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {createSessionErrors.goal && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {createSessionErrors.goal}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Votes Per User *
              </label>
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="modalAutoVotes"
                  checked={createSessionForm.useAutoVotes}
                  onChange={(e) =>
                    setCreateSessionForm(prev => ({ ...prev, useAutoVotes: e.target.checked }))
                  }
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#3A9B5C] focus:outline-none focus:ring-0"
                />
                <label htmlFor="modalAutoVotes" className="ml-2 text-sm text-gray-700 cursor-pointer">
                  Auto-calculate votes (half of feature count, minimum 1)
                </label>
              </div>
              {!createSessionForm.useAutoVotes && (
                <>
                  <input
                    type="number"
                    name="votesPerUser"
                    value={createSessionForm.votesPerUser}
                    onChange={handleCreateSessionChange}
                    min="1"
                    max="100"
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-0 focus:border-[#2d4660] ${
                      createSessionErrors.votesPerUser ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {createSessionErrors.votesPerUser && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {createSessionErrors.votesPerUser}
                    </p>
                  )}
                </>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {createSessionForm.useAutoVotes
                  ? 'Votes will automatically be set to half the number of features (minimum 1).'
                  : 'Each stakeholder receives this many votes.'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={createSessionForm.startDate}
                  onChange={handleCreateSessionChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-[#2d4660]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={createSessionForm.endDate}
                  onChange={handleCreateSessionChange}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-0 focus:border-[#2d4660] ${
                    createSessionErrors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {createSessionErrors.endDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {createSessionErrors.endDate}
                  </p>
                )}
              </div>
            </div>
          </div>

          {createSessionErrors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {createSessionErrors.submit}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseCreateModal}
              disabled={isCreatingSession}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isCreatingSession}
            >
              {isCreatingSession ? 'Creating...' : 'Create Session'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Color Picker Modal - No Header */}
      {showColorPickerModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowColorPickerModal(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl px-3 py-2 w-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3 items-stretch">
              {/* Color input on the left - will trigger native picker */}
              <div className="flex-shrink-0" style={{ width: '240px', height: '260px' }}>
                <input
                  id="native-color-input"
                  type="color"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  ref={(input) => {
                    if (input && showColorPickerModal) {
                      // Auto-click to open native picker immediately
                      setTimeout(() => input.click(), 50);
                    }
                  }}
                  className="opacity-0 absolute"
                  style={{ width: '1px', height: '1px' }}
                />
                {/* Placeholder space for where native picker will appear */}
                <div className="w-full h-full"></div>
              </div>
              
              {/* Looks Good Button on the right - same height as picker */}
              <button
                type="button"
                onClick={() => {
                  setNewProductColor(tempColor);
                  setShowColorPickerModal(false);
                  if (!showCreateButton && newProductName.trim()) {
                    setTimeout(() => setShowCreateButton(true), 300);
                  }
                }}
                className="px-6 rounded-lg text-white font-bold shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-3 text-lg flex-shrink-0"
                style={{ backgroundColor: tempColor, height: '260px', minWidth: '100px' }}
              >
                <CheckCircle className="h-8 w-8" />
                <div className="text-center leading-tight">
                  <div>Looks</div>
                  <div>Good</div>
                </div>
              </button>
            </div>
          </div>
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

      {viewMode === 'system-admin' && (
        <div className="relative z-10 mt-8 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
            <div className="text-sm text-purple-900">
              <p className="font-medium mb-1">System Admin Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use this view to audit every session across the tenant without switching teams.</li>
                <li>Jump into any card to open the admin dashboard and assist local admins.</li>
                <li>Need a quick rollout? Click Create Session above to spin up a new voting round for any product.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer with role toggle (uses Footer component from FeatureVoting) */}
      <Footer
        currentRole={isSystemAdmin && viewMode === 'system-admin' ? 'system-admin' : viewMode === 'admin' ? 'session-admin' : 'stakeholder'}
        onSelectStakeholder={() => setViewMode('stakeholder')}
        onSelectSessionAdmin={() => setViewMode('admin')}
        onSelectSystemAdmin={isSystemAdmin ? () => setViewMode('system-admin') : undefined}
        showRoleToggle={hasAdminAccess || isSystemAdmin}
      />

      {productToDelete && (
        <Modal
          isOpen
          onClose={() => setProductToDelete(null)}
          title="Delete Product"
        >
          <p className="text-sm text-gray-700 mb-4">
            Are you sure you want to delete <span className="font-semibold">{productToDelete.name}</span>?
            This will remove it for everyone in your tenant.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setProductToDelete(null)} disabled={isDeletingProduct}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteProduct} disabled={isDeletingProduct}>
              {isDeletingProduct ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}