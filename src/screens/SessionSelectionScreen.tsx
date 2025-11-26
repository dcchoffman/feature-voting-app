import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import { supabase } from '../supabaseClient';
import * as db from '../services/databaseService';
import { Footer, Modal, Button } from '../screens/FeatureVoting';
import { getDisplayProductName } from '../utils/productDisplay';
import { getProductColor } from '../utils/productColors';
import { isFallbackSystemAdmin } from '../utils/systemAdmins';
import type { Product, SessionStakeholder } from '../types';
import ProductPicker from '../components/ProductPicker';
import {
  Calendar, Clock, Users, Vote, Settings, LogOut,
  CheckCircle, AlertCircle, Plus, Mail, List, Info, BarChart2, BadgeCheck, Shield, ChevronDown, Pencil, Sparkles, Star
} from 'lucide-react';
import mobileLogo from '../assets/New-Millennium-Icon-gold-on-blue-rounded-square.svg';
import desktopLogo from '../assets/New-Millennium-color-logo.svg';
import colorPickerIcon from '../assets/colorpicker.png';
import { sendInvitationEmail } from '../services/emailService';

export default function SessionSelectionScreen() {
  const { currentUser, setCurrentSession, refreshSessions, setCurrentUser, isLoading: contextLoading } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const sessionsLoadedRef = useRef(false);
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
  const [allowCreateProduct, setAllowCreateProduct] = useState(true);
  const [createSessionForm, setCreateSessionForm] = useState({
    title: '',
    goal: '',
    votesPerUser: 10,
    useAutoVotes: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
  const [expandedProductGroups, setExpandedProductGroups] = useState<Set<string>>(new Set());
  const [pendingProductName, setPendingProductName] = useState<string | null>(null);
  const [hoveredPlusButton, setHoveredPlusButton] = useState<string | null>(null);
  const [modalOpenedFromCirclePlus, setModalOpenedFromCirclePlus] = useState(false);
  const [hoveredThirdCard, setHoveredThirdCard] = useState<string | null>(null);
  const [hoveredProductTab, setHoveredProductTab] = useState<string | null>(null);
  const [hoveredSessionCard, setHoveredSessionCard] = useState<string | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductColor, setEditingProductColor] = useState<string | null>(null);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [showEditProductColorPicker, setShowEditProductColorPicker] = useState(false);
  const [editTempColor, setEditTempColor] = useState<string>('#2D4660');
  const [showStakeholderInviteModal, setShowStakeholderInviteModal] = useState(false);
  const [inviteStakeholders, setInviteStakeholders] = useState<SessionStakeholder[]>([]);
  const [selectedStakeholderEmails, setSelectedStakeholderEmails] = useState<string[]>([]);
  const [inviteEmailSubject, setInviteEmailSubject] = useState('');
  const [inviteEmailBody, setInviteEmailBody] = useState('');
  const [inviteSessionLink, setInviteSessionLink] = useState('');
  const [inviteModalLoading, setInviteModalLoading] = useState(false);
  const [inviteModalError, setInviteModalError] = useState('');
  const [inviteSessionDetails, setInviteSessionDetails] = useState<any | null>(null);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [inviteSuccessSummary, setInviteSuccessSummary] = useState<{ sessionTitle: string; count: number } | null>(null);
  const closeInviteSuccessModal = () => setInviteSuccessSummary(null);
  const inviteStakeholderEmails = inviteStakeholders.map((stakeholder) => stakeholder.user_email.toLowerCase());
  const allStakeholdersSelected = inviteStakeholderEmails.length > 0 && inviteStakeholderEmails.every((email) => selectedStakeholderEmails.includes(email));

  // Handle OAuth errors from Azure AD redirect
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');
    
    if (errorParam) {
      // Redirect to login with error message
      // React Router handles basename automatically
      let errorMessage = 'Authentication failed.';
      if (errorCode === 'unexpected_failure' && errorDescription?.includes('email')) {
        errorMessage = 'Azure AD did not return your email address. Please ensure your Azure AD app has the correct API permissions (User.Read or email) and that your account has an email address.';
      } else if (errorDescription) {
        errorMessage = decodeURIComponent(errorDescription);
      }
      
      // Store error in sessionStorage to show on login page
      sessionStorage.setItem('oauth_error', errorMessage);
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

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
        // Get ALL products from the products table for this tenant
        // This is the single source of truth for products
        const results = await db.getProductsForTenant(tenantId);
        
        // Log for debugging - ensure we're getting all products
        
        // Use all products from the database - they should all be included in the dropdown
        // No filtering, no additional logic - just use what's in the products table
        const uniqueProducts = results;
        
        setModalProducts(uniqueProducts);
        // Only set default product if modal was opened from circle+ button
        // If opened from top button, always start with empty selection
        setSelectedProductId(prev => {
          // If modal was opened from circle+ button, preserve the pre-selected product
          if (modalOpenedFromCirclePlus && prev) {
            // Verify it exists in the loaded products
            const exists = uniqueProducts.some(p => p.id === prev);
            if (exists) {
              return prev;
            }
          }
          
          // If we have a pending product name (from button click), try to find it by name
          if (pendingProductName) {
            const foundByName = uniqueProducts.find(p => 
              p.name?.toLowerCase().trim() === pendingProductName.toLowerCase().trim()
            );
            if (foundByName?.id) {
              setPendingProductName(null); // Clear after use
              return foundByName.id;
            }
          }
          
          // If opened from top button, don't pre-select any product
          // If opened from circle+, use the pre-selected product (already handled above)
          return modalOpenedFromCirclePlus ? (prev || '') : '';
        });
        // Update productLookup with ALL products from the products table
        // This ensures session cards use product names from the products table (single source of truth)
        setProductLookup(prev => {
          const updated = { ...prev };
          uniqueProducts.forEach(product => {
            if (product.id && product.name) {
              updated[product.id] = product.name;
            }
          });
          return updated;
        });
        setProductColorLookup(prev => {
          const updated = { ...prev };
          uniqueProducts.forEach(product => {
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

  // Helper function to parse date string as local date (avoiding timezone issues)
  // Handles both "2025-12-10" and "2025-12-10T23:59:59.000Z" formats
  const parseLocalDate = (dateString: string): Date => {
    // Date strings like "2025-12-10" are parsed as UTC by default
    // We need to parse them as local dates to avoid timezone shifts
    if (!dateString || typeof dateString !== 'string') {
      console.error('[parseLocalDate] Invalid date string:', dateString);
      return new Date(); // Fallback to today
    }
    
    // Extract just the date part (YYYY-MM-DD) if there's a time component
    const dateOnly = dateString.split('T')[0].split(' ')[0];
    const parts = dateOnly.split('-');
    if (parts.length !== 3) {
      console.error('[parseLocalDate] Invalid date format:', dateString);
      return new Date(); // Fallback to today
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('[parseLocalDate] Invalid date components:', { year, month, day });
      return new Date(); // Fallback to today
    }
    
    // Create date at midnight in local timezone to ensure clean day boundaries
    const date = new Date(year, month - 1, day, 0, 0, 0, 0); // month is 0-indexed in Date constructor
    
    // Validate the date is valid
    if (isNaN(date.getTime())) {
      console.error('[parseLocalDate] Invalid date created:', { year, month, day, dateString });
      return new Date(); // Fallback to today
    }
    
    return date;
  };

  // Helper function to safely format a date to YYYY-MM-DD string
  const formatDateToISO = (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
      console.error('[formatDateToISO] Invalid date:', date);
      // Return today's date as fallback
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    // Format as YYYY-MM-DD in local timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to add days to a date safely (working with local date components)
  // This ensures that if end_date is Dec 10 at 11:59 PM, the next session starts Dec 11 at midnight
  const addDaysToLocalDate = (date: Date, days: number): Date => {
    // Get local date components to avoid timezone issues
    // We always work with the date at midnight to ensure clean day boundaries
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    // Create new date at midnight with added days (ensures we're at the start of the day)
    const newDate = new Date(year, month, day + days, 0, 0, 0, 0);
    return newDate;
  };

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
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
    setPendingProductName(null);
    setAllowCreateProduct(true);
    setModalOpenedFromCirclePlus(false);
    setSelectedProductId(''); // Always reset to no selection
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
    // Parse dates using local date parsing to avoid timezone issues
    const start = parseLocalDate(createSessionForm.startDate);
    const end = parseLocalDate(createSessionForm.endDate);
    if (end <= start) {
      errors.endDate = 'End date must be after start date';
    }
    
    // Require either a selected product, a pending product, or a new product name entered
    const hasNewProductName = newProductName.trim().length > 0;
    if (!productError && modalProducts.length > 0 && !selectedProductId && !pendingProduct && !isCreatingNewProduct && !hasNewProductName) {
      errors.product = 'Please select a product or enter a new product name';
    }
    
    // If user is in "creating new product" mode but hasn't entered a name, show error
    if (isCreatingNewProduct && !hasNewProductName) {
      errors.product = 'Please enter a product name or select an existing product';
    }

    setCreateSessionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateSessionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCreateSessionForm(prev => {
      const updated = {
      ...prev,
      [name]: name === 'votesPerUser' ? parseInt(value) || 0 : value
      };
      
      // If start date is changed, automatically update end date to be 2 weeks (14 days) later
      if (name === 'startDate' && value) {
        const startDate = parseLocalDate(value);
        const endDate = addDaysToLocalDate(startDate, 14);
        updated.endDate = formatDateToISO(endDate);
      }
      
      return updated;
    });
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
      const tenantId = currentUser.tenant_id ?? currentUser.tenantId ?? null;
      // Start with selectedProductId, but will be overridden if we create a new product
      let productIdToUse = selectedProductId && selectedProductId.trim() !== '' ? selectedProductId : null;
      
      // Auto-create product if user has entered a new product name
      // Priority: 1. pendingProduct (from "Create New Product" button), 2. newProductName (from simple input)
      const trimmedNewProductName = newProductName.trim();
      const hasNewProductName = trimmedNewProductName.length > 0;
      const hasSelectedProduct = selectedProductId && selectedProductId.trim() !== '';
      
      
      // Determine product name and color to use
      let productNameToCreate: string | null = null;
      let productColorToUse: string | null = null;
      
      if (pendingProduct) {
        // User clicked "Create New Product" button
        productNameToCreate = pendingProduct.name;
        productColorToUse = pendingProduct.color;
      } else if (hasNewProductName) {
        // User typed a new product name - create it regardless of selectedProductId
        // (selectedProductId should be cleared when typing, but we'll create anyway if name is entered)
        productNameToCreate = trimmedNewProductName;
        productColorToUse = newProductColor;
      }
      
      // Create product if we have a name to create
      if (productNameToCreate) {
        // Check if product name already exists
        const existingProduct = modalProducts.find(p => 
          p.name.toLowerCase().trim() === productNameToCreate.toLowerCase().trim()
        );
        
        if (existingProduct) {
          // Product already exists, use it
          productIdToUse = existingProduct.id;
        } else if (tenantId) {
          // Create the new product automatically
          try {
            const created = await db.createProductForTenant(
              tenantId, 
              productNameToCreate, 
              productColorToUse || undefined
            );
            productIdToUse = created.id;
            
            // Update local state for immediate display
            setModalProducts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setProductLookup(prev => ({ ...prev, [created.id]: created.name }));
            setProductColorLookup(prev => {
              const next = { ...prev };
              if (created.color_hex) next[created.id] = created.color_hex as string;
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
        } else {
          console.error('No tenantId available to create product');
          setCreateSessionErrors(prev => ({
            ...prev,
            submit: 'Unable to create product: No tenant assigned.'
          }));
          setIsCreatingSession(false);
          return;
        }
      }

      // Check for duplicate sessions and active session conflicts
      if (productIdToUse) {
        // First, check if there's already a session with the exact same dates for this product
        // Compare date parts only (ignore time components)
        const allSessionsForProduct = userSessions.filter(s => s.product_id === productIdToUse);
        const newStartDateOnly = createSessionForm.startDate.split('T')[0];
        const newEndDateOnly = createSessionForm.endDate.split('T')[0];
        const duplicateSession = allSessionsForProduct.find(s => {
          const existingStartDateOnly = s.start_date.split('T')[0];
          const existingEndDateOnly = s.end_date.split('T')[0];
          return existingStartDateOnly === newStartDateOnly && existingEndDateOnly === newEndDateOnly;
        });
        
        if (duplicateSession) {
          const productName = productLookup[productIdToUse] || 'this product';
          setCreateSessionErrors(prev => ({
            ...prev,
            submit: `A session with the same dates (${formatDate(createSessionForm.startDate)} - ${formatDate(createSessionForm.endDate)}) already exists for ${productName}. Please choose different dates.`
          }));
          setIsCreatingSession(false);
          return;
        }
        
        // Check if there's already an active session for this product
        // Allow creating a new session if it starts after the active session ends
        const existingActiveSession = await db.getActiveSessionByProduct(productIdToUse);
        if (existingActiveSession) {
          // Parse dates using local date parsing to avoid timezone issues
          const activeSessionEndDate = parseLocalDate(existingActiveSession.end_date);
          const newSessionStartDate = parseLocalDate(createSessionForm.startDate);
          
          // Only block if the new session starts before or on the active session's end date
          if (newSessionStartDate <= activeSessionEndDate) {
            const productName = productLookup[productIdToUse] || 'this product';
            setCreateSessionErrors(prev => ({
              ...prev,
              submit: `There is already an active session for ${productName}. The new session must start after ${formatDate(existingActiveSession.end_date)}.`
            }));
            setIsCreatingSession(false);
            return;
          }
          // If new session starts after active session ends, allow it (it will be an upcoming session)
        }
      }

      // Products table is the single source of truth - only use product_id
      // product_name will be looked up from products table when needed
      // Format dates with times: start at midnight (00:00:00), end at 11:59:59 PM (23:59:59)
      const startDateWithTime = `${createSessionForm.startDate}T00:00:00`;
      const endDateWithTime = `${createSessionForm.endDate}T23:59:59`;
      
      const newSession = await db.createSession({
        title: createSessionForm.title,
        goal: createSessionForm.goal,
        votes_per_user: createSessionForm.votesPerUser,
        use_auto_votes: createSessionForm.useAutoVotes,
        start_date: startDateWithTime,
        end_date: endDateWithTime,
        is_active: true,
        session_code: code,
        access_type: 'invite-only',
        product_id: productIdToUse ?? null,
        product_name: null // Products table is single source of truth - don't store product_name
      });

      // Add session admin - if this fails, log it but don't block session creation
      // The session was created successfully, so we continue
      try {
      await db.addSessionAdmin(newSession.id, currentUser.id);
      } catch (adminError: any) {
        console.error('Error adding session admin (session was created successfully):', adminError);
        // Log the error but don't throw - the session was created successfully
        // The user can manually add themselves as admin if needed
        if (adminError?.code === '42501') {
          console.warn('RLS policy violation when adding session admin. The session was created but admin assignment failed.');
          console.warn('This may require updating RLS policies for the session_admins table.');
        }
      }
      
      // Get the session with product information before refreshing
      const refreshedSession = await db.getSessionById(newSession.id);
      const sessionToUse = refreshedSession || newSession;
      
      // Update product lookup if the session has a product_id and we have tenantId
      if (sessionToUse.product_id && tenantId) {
        try {
          const products = await db.getProductsForTenant(tenantId);
          const product = products.find(p => p.id === sessionToUse.product_id);
          if (product) {
            setProductLookup(prev => ({ ...prev, [product.id]: product.name }));
            if (product.color_hex && product.color_hex.trim() !== '') {
              setProductColorLookup(prev => ({ ...prev, [product.id]: product.color_hex as string }));
            }
          }
        } catch (error) {
          console.error('Error loading product for lookup:', error);
          // Continue even if product lookup fails
        }
      }
      
      // Set current session FIRST so refreshSessions can find it
      setCurrentSession(sessionToUse);
      
      // Now refresh sessions - this will update the session list and preserve currentSession
      await refreshSessions();
      
      // Load user sessions after setting current session
      await loadUserSessions();
      
      setShowCreateSessionModal(false);
      resetCreateSessionForm();
      
      // Small delay to ensure state is updated before navigation
      setTimeout(() => {
        navigate('/admin');
      }, 100);
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

  const loadUserSessions = useCallback(async () => {
    if (!currentUser) {
      console.log('[SessionSelectionScreen] No current user, skipping loadUserSessions');
      return;
    }
    if (sessionsLoadedRef.current) {
      console.log('[SessionSelectionScreen] Sessions already loading, skipping duplicate call');
      return; // Already loaded or currently loading
    }

    sessionsLoadedRef.current = true; // Mark as loading to prevent duplicate calls
    setIsLoading(true);
    try {
      // Check if system admin (including fallback)
      const fallbackSystemAdmin = isFallbackSystemAdmin(currentUser.email);
      const sysAdmin = fallbackSystemAdmin || await db.isUserSystemAdmin(currentUser.id);
      setIsSystemAdmin(sysAdmin);

      // Get sessions - system admins see everything
      let freshSessions;
      if (sysAdmin) {
        freshSessions = await db.getAllSessions();
      } else {
        freshSessions = await db.getSessionsForUser(currentUser.id);
      }

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

      for (let i = 0; i < freshSessions.length; i++) {
        const session = freshSessions[i];
        try {
        const [isAdmin, isStakeholder, features, votes] = await Promise.all([
          // System admins have admin access to all sessions
          sysAdmin ? Promise.resolve(true) : db.isUserSessionAdmin(session.id, currentUser.id),
          db.isUserSessionStakeholder(session.id, currentUser.email),
          db.getFeatures(session.id),
            db.getVotes(session.id).catch(err => {
              // If votes fail to load, just return empty array
              console.warn(`Failed to load votes for session ${session.id}:`, err);
              return [];
            })
        ]);


        roles[session.id] = { isAdmin, isStakeholder };
        counts[session.id] = features.length;
        
        // Check if user has voted in this session
        const hasVoted = votes.some((v: any) => v.user_id === currentUser.id);
        votedStatus[session.id] = hasVoted;
        } catch (sessionError) {
          // If one session fails, log it but continue with others
          console.warn(`Error loading data for session ${session.id}:`, sessionError);
          // Set default values for this session
          roles[session.id] = { isAdmin: false, isStakeholder: false };
          counts[session.id] = 0;
          votedStatus[session.id] = false;
        }
      }

      // Refresh the context with fresh sessions
      await refreshSessions();

      setUserSessions(freshSessions);
      setSessionRoles(roles);
      setFeatureCounts(counts);
      setVotingStatus(votedStatus);
      setProductLookup(productsMap);
      setProductColorLookup(productColorMap);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      // Don't redirect on network errors - just show empty state
      // Network errors are usually temporary (connection issues, CORS, etc.)
      if (error?.message?.includes('Failed to fetch') || error?.code === 'ERR_FAILED') {
        console.warn('Network error loading sessions - will retry. This is usually temporary.');
        // Set empty arrays so UI can still render
        setUserSessions([]);
        setSessionRoles({});
        setFeatureCounts({});
        setVotingStatus({});
      } else {
        // For other errors, still set empty state but log it
        setUserSessions([]);
        setSessionRoles({});
        setFeatureCounts({});
        setVotingStatus({});
      }
      // Reset the ref on error so we can retry
      sessionsLoadedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, refreshSessions]);

  useEffect(() => {
    // Wait for context to finish loading before checking for user
    if (contextLoading) {
      return;
    }
    
    // Check if we're coming from an OAuth redirect
    const isOAuthCallback = window.location.search.includes('code=') || 
                            window.location.hash.includes('access_token') ||
                            window.location.search.includes('error=');
    
    // If OAuth callback and no user yet, wait for auth state change
    if (isOAuthCallback && !currentUser && !waitingForAuth) {
      setWaitingForAuth(true);
      // Give Supabase time to process the OAuth callback (onAuthStateChange will fire)
      const timeout = setTimeout(() => {
        setWaitingForAuth(false);
        if (!currentUser) {
          // React Router handles basename automatically
          navigate('/login', { replace: true });
        }
      }, 3000); // Wait 3 seconds for OAuth processing
      
      return () => clearTimeout(timeout);
    }
    
    // If we were waiting and now have a user, clear the waiting state
    if (waitingForAuth && currentUser) {
      setWaitingForAuth(false);
    }
    
    // Don't redirect if we're waiting for auth
    if (waitingForAuth) {
      return;
    }
    
    // Only redirect if we're sure there's no user AND we're not loading
    // Don't redirect on network errors - user might be authenticated but network is down
    if (!currentUser && !contextLoading) {
      // React Router handles basename automatically
      navigate('/login', { replace: true });
      return;
    }

    // Only load sessions if we have a user and context is ready, and we haven't loaded yet
    if (currentUser && !contextLoading && !sessionsLoadedRef.current) {
      loadUserSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, contextLoading, navigate, waitingForAuth]);

  const getEffectiveVotesPerUser = (session: any): { votes: number; displayText: string; isAuto: boolean; formula: string } => {
    const featureCount = featureCounts[session.id] || 0;

    if (session.use_auto_votes) {
      const calculatedVotes = Math.max(1, Math.floor(featureCount / 2));
      return {
        votes: calculatedVotes,
        displayText: `${calculatedVotes} votes/user`,
        isAuto: true,
        formula: `Auto: ${featureCount} ${featureCount === 1 ? 'feature' : 'features'} ÷ 2 = ${calculatedVotes}`
      };
    } else {
      return {
        votes: session.votes_per_user,
        displayText: `${session.votes_per_user} votes/user`,
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
    // React Router handles basename automatically - use navigate instead of window.location
    navigate('/login', { replace: true });
  };

  const formatDate = (dateString: string): string => {
    // Parse as local date to avoid timezone issues
    // Extract just the date part (YYYY-MM-DD) if there's a time component
    const dateOnly = dateString.split('T')[0].split(' ')[0];
    const parts = dateOnly.split('-');
    
    if (parts.length !== 3) {
      // Fallback to original behavior if format is unexpected
    const date = new Date(dateString);
      const formatted = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      return formatted.replace(/\b(\d{4})\b/g, (match) => `'${match.slice(-2)}`);
    }
    
    // Parse as local date (month is 0-indexed)
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    const formatted = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    // Replace full year with abbreviated year (e.g., "2024" -> "'24")
    return formatted.replace(/\b(\d{4})\b/g, (match) => `'${match.slice(-2)}`);
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

  const escapeHtml = (value: string) => {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const convertTextToHtml = (value: string) => {
    return escapeHtml(value).replace(/\n/g, '<br />');
  };

  const getDefaultInviteSubject = (session: any) => {
    return `You're invited to vote: ${session.title}`;
  };

  const getDefaultInviteBody = (session: any, inviteUrl: string) => {
    return (
      `Hello,\n\n` +
      `You're invited to participate in the "${session.title}" feature voting session.\n\n` +
      (session.goal ? `Goal: ${session.goal}\n\n` : '') +
      `Voting Period: ${formatDate(session.start_date)} - ${formatDate(session.end_date)}\n\n` +
      `Click the link below to sign in and cast your votes:\n${inviteUrl}\n\n` +
      `Need help? Reach out to the session admin team.\n\n` +
      `Thanks,\n${currentUser?.name || 'Feature Voting System'}`
    );
  };

  const handleEmailInvite = async (e: React.MouseEvent, session: any) => {
    e.stopPropagation();

    const basename = window.location.pathname.startsWith('/feature-voting-app') ? '/feature-voting-app' : '';
    const inviteUrl = `${window.location.origin}${basename}/login?session=${session.session_code}`;

    setInviteModalError('');
    setInviteSessionDetails(session);
    setInviteSessionLink(inviteUrl);
    setInviteEmailSubject(getDefaultInviteSubject(session));
    setInviteEmailBody(getDefaultInviteBody(session, inviteUrl));
    setShowStakeholderInviteModal(true);
    setInviteModalLoading(true);
    setInviteStakeholders([]);
    setSelectedStakeholderEmails([]);

    try {
      const stakeholders = await db.getSessionStakeholders(session.id);
      const validStakeholders = stakeholders.filter((stakeholder) => !!stakeholder.user_email);
      setInviteStakeholders(validStakeholders);
      setSelectedStakeholderEmails(validStakeholders.map((stakeholder) => stakeholder.user_email.toLowerCase()));
      if (validStakeholders.length === 0) {
        setInviteModalError('No stakeholders found for this session. Add stakeholders first, then send invites.');
      }
    } catch (error: any) {
      console.error('Error loading stakeholders:', error);
      setInviteModalError(error.message || 'Failed to load stakeholders for this session.');
    } finally {
      setInviteModalLoading(false);
    }
  };

  const handleViewResults = (e: React.MouseEvent, session: any) => {
    e.stopPropagation();
    setCurrentSession(session);
    navigate('/results');
  };

  const closeStakeholderInviteModal = () => {
    setShowStakeholderInviteModal(false);
    setInviteStakeholders([]);
    setSelectedStakeholderEmails([]);
    setInviteSessionDetails(null);
    setInviteModalError('');
  };

  const toggleStakeholderSelection = (email: string) => {
    setSelectedStakeholderEmails((prev) => {
      const normalized = email.toLowerCase();
      if (prev.includes(normalized)) {
        return prev.filter((value) => value !== normalized);
      }
      return [...prev, normalized];
    });
  };

  const toggleAllStakeholders = () => {
    if (allStakeholdersSelected) {
      setSelectedStakeholderEmails([]);
    } else {
      setSelectedStakeholderEmails(inviteStakeholderEmails);
    }
  };

  const handleSendStakeholderInvites = async () => {
    if (!inviteSessionDetails) return;

    if (selectedStakeholderEmails.length === 0) {
      setInviteModalError('Select at least one stakeholder to email.');
      return;
    }

    setInviteModalError('');
    setIsSendingInvites(true);
    const recipientCount = selectedStakeholderEmails.length;
    const sessionTitle = inviteSessionDetails.title;

    const baseBody = inviteEmailBody || getDefaultInviteBody(inviteSessionDetails, inviteSessionLink);
    const htmlBody = convertTextToHtml(baseBody);
    const subject = inviteEmailSubject || getDefaultInviteSubject(inviteSessionDetails);

    try {
      await Promise.all(
        selectedStakeholderEmails.map((email) =>
          sendInvitationEmail({
            to: email,
            subject,
            text: baseBody,
            html: `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #111827; line-height: 1.6;">${htmlBody}</div>`
          })
        )
      );

      closeStakeholderInviteModal();
      setInviteSuccessSummary({
        sessionTitle,
        count: recipientCount
      });
    } catch (error: any) {
      console.error('Error sending stakeholder invites:', error);
      setInviteModalError(error.message || 'Failed to send invites. Please try again.');
    } finally {
      setIsSendingInvites(false);
    }
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
    setModalOpenedFromCirclePlus(false);
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
  // When in stakeholder view mode, show only active sessions (excluding upcoming and closed sessions)
  const sessionsToDisplay = viewMode === 'stakeholder' 
    ? sortedUserSessions.filter(s => {
        const status = getSessionStatus(s);
        return status.text === 'Active';
      })
    : [];
  const adminSessionsToDisplay = (viewMode === 'admin' || viewMode === 'system-admin') ? adminSessions : [];
  const stakeholderSessionsToDisplay = viewMode === 'admin' ? stakeholderOnlySessions : [];

  // Group sessions by product name (display name), not product_id
  // This ensures sessions with the same product name are grouped together
  const groupSessionsByProduct = (sessions: any[], lookup: Record<string, string>) => {
  const groups: Record<string, any[]> = {};
  sessions.forEach(session => {
    // Get the display product name (handles both product_id and product_name)
    const productName = getDisplayProductName(session, lookup);
    
    // Skip only if there's truly no product information at all
    if (!productName || productName === 'No Product' || productName.trim() === '') {
      return;
    }
    
    // Normalize: lowercase and trim for consistent grouping
    const normalizedName = productName.toLowerCase().trim();
    
    if (!groups[normalizedName]) {
      groups[normalizedName] = [];
    }
    groups[normalizedName].push(session);
  });
  
  return groups;
};

  const toggleProductGroup = (productId: string) => {
    setExpandedProductGroups(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Development function to create placeholder sessions
  const createPlaceholderSessions = async () => {
    if (!currentUser) return;
    
    const tenantId = currentUser.tenant_id ?? currentUser.tenantId ?? null;
    if (!tenantId) {
      alert('No tenant assigned. Cannot create placeholder sessions.');
      return;
    }

    try {
      // Get existing products
      const products = await db.getProductsForTenant(tenantId);
      if (products.length === 0) {
        alert('No products found. Please create products first.');
        return;
      }

      // Create multiple sessions for the first few products
      const productsToUse = products.slice(0, 3); // Use first 3 products
      const sessionTitles = [
        ['Q1 2025 Roadmap', 'Sprint Planning - January', 'Feature Prioritization'],
        ['Q2 Planning Session', 'Backlog Review', 'Sprint 10 Planning'],
        ['Product Review', 'Feature Requests', 'Technical Debt Assessment']
      ];

      let createdCount = 0;
      for (let i = 0; i < productsToUse.length; i++) {
        const product = productsToUse[i];
        const titles = sessionTitles[i] || ['Session 1', 'Session 2', 'Session 3'];
        
        for (let j = 0; j < titles.length; j++) {
          const title = titles[j];
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + (j * 7)); // Stagger by weeks
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 7); // 7 days duration

          const code = generateSessionCode();
          await db.createSession({
            title: title,
            goal: `This is a placeholder session for ${product.name}. Use this to test the grouping functionality.`,
            votes_per_user: 10,
            use_auto_votes: false,
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            is_active: true,
            session_code: code,
            access_type: 'invite-only',
            product_id: product.id,
            product_name: null // Products table is single source of truth - don't store product_name
          });

          // Add current user as admin
          const session = await db.getSessionByCode(code);
          if (session) {
            await db.addSessionAdmin(session.id, currentUser.id);
          }
          createdCount++;
        }
      }

      alert(`Created ${createdCount} placeholder sessions across ${productsToUse.length} products.`);
      await refreshSessions();
      await loadUserSessions();
    } catch (error) {
      console.error('Error creating placeholder sessions:', error);
      alert('Failed to create placeholder sessions. Check console for details.');
    }
  };

  // Helper function to render product tab with edit pencil
  const renderProductTab = (
    productName: string,
    productColors: any,
    productId?: string | null,
    tabKey?: string
  ) => {
    const key = tabKey || productId || productName;
    const handleTabClick = async (e: React.MouseEvent) => {
      if (!productId) return;
      e.stopPropagation();
      // Load product if not already in modalProducts
      let product = modalProducts.find(p => p.id === productId);
      if (!product) {
        const tenantId = currentUser?.tenant_id ?? currentUser?.tenantId;
        if (tenantId) {
          try {
            const products = await db.getProductsForTenant(tenantId);
            product = products.find(p => p.id === productId);
            if (product) {
              setModalProducts(prev => {
                const exists = prev.find(p => p.id === productId);
                if (exists) return prev;
                return [...prev, product!].sort((a, b) => a.name.localeCompare(b.name));
              });
            }
          } catch (error) {
            console.error('Error loading product for edit:', error);
          }
        }
      }
      if (product) {
        setProductToEdit(product);
        setEditingProductName(product.name || '');
        setEditingProductColor(product.color_hex || null);
        setEditTempColor(product.color_hex || '#2D4660');
      }
    };

    return (
          <div
        className="absolute left-0 px-4 py-1 pr-8 rounded-t-md border-b-0 text-sm font-semibold shadow-sm z-20 flex items-center gap-2 whitespace-nowrap group cursor-pointer"
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
          borderTopRightRadius: '0.9rem',
          overflow: 'visible'
        }}
        onMouseEnter={() => {
          if (productId && viewMode !== 'stakeholder' && hasAdminAccess) {
            setHoveredProductTab(key);
          }
        }}
        onMouseLeave={() => setHoveredProductTab(null)}
        onClick={viewMode !== 'stakeholder' && hasAdminAccess ? handleTabClick : undefined}
          >
            <BadgeCheck className="h-4 w-4 flex-shrink-0" />
        <span className="overflow-hidden text-ellipsis flex-1 min-w-0">{productName}</span>
        {productId && hoveredProductTab === key && viewMode !== 'stakeholder' && hasAdminAccess && (
          <div className="absolute right-2 flex-shrink-0 opacity-80">
            <Pencil className="h-4 w-4" style={{ color: productColors.text }} />
          </div>
        )}
      </div>
    );
  };

  // Helper function to render a session card
  const renderSessionCard = (
    session: any,
    productName: string,
    productColors: any,
    status: any,
    StatusIcon: any,
    votesInfo: any,
    isClosed: boolean,
    showTab: boolean = true,
    productId?: string | null
  ) => {
    return (
      <>
        {/* Product Name Tab */}
        {showTab && renderProductTab(productName, productColors, productId)}
        <div className="p-6 flex flex-col h-full">
          {/* Action Buttons */}
          <div className="flex justify-between items-start mb-4">
            <div>
              {/* Only show Vote! button for Active sessions (not Upcoming or Closed) */}
              {status.text === 'Active' && (
                <div className="relative inline-block" style={{ marginLeft: '-10px', marginTop: '-10px', marginRight: '10px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                      handleSelectSession(session);
                  }}
                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold transition-colors text-white shadow-md"
                    style={{ backgroundColor: '#1E6154' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1E6154'}
                >
                    <Vote className="h-4 w-4 mr-1.5" />
                  Vote!
                </button>
                  </div>
                )}
            </div>

            <div className="flex items-center gap-1">
              <div className={`relative inline-block ${isClosed ? 'group' : ''}`}>
                <button
                  onClick={(e) => handleManageAdmins(e, session)}
                  disabled={isClosed}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isClosed
                      ? 'bg-gray-200 text-gray-500'
                      : 'bg-[#2D4660] text-white hover:bg-[#1D3144]'
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
              <span className={`inline-flex items-center ${status.text === 'Active' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} rounded-full font-medium ${status.color}`}>
                <StatusIcon className={`${status.text === 'Active' ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                {status.text}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <List className="h-4 w-4 mr-2" />
                <span>{featureCounts[session.id] || 0} {featureCounts[session.id] === 1 ? 'feature' : 'features'}</span>
              </div>
              <span className="text-sm font-medium text-[#2D4660]">{productName}</span>
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
                {status.text !== 'Upcoming' && (
                <button
                  onClick={(e) => handleViewResults(e, session)}
                    className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#C89212] text-white hover:bg-[#E0A814] transition-colors cursor-pointer flex-shrink-0"
                >
                  <BarChart2 className="h-3 w-3 mr-1" />
                  {status.text === 'Closed' ? 'Final Results' : 'Current Results'}
                </button>
                )}
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
      </>
    );
  };

  // Show loading screen during OAuth callback or initial load
  if (contextLoading || waitingForAuth || (isLoading && !currentUser)) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen pb-8">
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

      {/* Title and buttons - same row on mobile with menu */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {/* Mobile: small logo next to title */}
          <img
            src={mobileLogo}
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden cursor-pointer hover:opacity-80 transition-opacity"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            onClick={() => navigate('/sessions')}
          />
          <div>
            <h1 className="text-2xl font-bold text-[#2D4660] md:text-3xl">My Voting Sessions</h1>
            <p className="text-sm text-gray-600">
              Welcome, {currentUser?.name}
              {isSystemAdmin && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#C89212] text-white">
                  System Admin
                </span>
              )}
              {!isSystemAdmin && adminSessions.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#576C71] text-white">
                  Session Admin
                </span>
              )}
              {!isSystemAdmin && adminSessions.length === 0 && stakeholderOnlySessions.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#8B5A4A] text-white">
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
              <>
                <button
                  onClick={() => {
                    setModalOpenedFromCirclePlus(false);
                    setAllowCreateProduct(true);
                    setSelectedProductId(''); // Always start with no product selected
                    setShowCreateSessionModal(true);
                  }}
                  className="flex items-center px-4 py-2 bg-[#C89212] text-white rounded-lg hover:bg-[#6A4234] transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Create Session</span>
                  <span className="sm:hidden">Create</span>
                </button>
              </>
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
                  <>
                    <button
                      onClick={() => { 
                        setMobileMenuOpen(false);
                        setAllowCreateProduct(true);
                        setShowCreateSessionModal(true);
                      }}
                      className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4 mr-2 text-gray-700" />
                      Create Session
                    </button>
                  </>
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
              onClick={() => {
                setAllowCreateProduct(true);
                setShowCreateSessionModal(true);
              }}
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
              {(() => {
                // Separate sessions with and without products
                const sessionsWithProducts = sessionsToDisplay.filter(s => {
                  const productName = getDisplayProductName(s, productLookup);
                  return productName && productName !== 'No Product' && productName.trim() !== '';
                });
                const sessionsWithoutProducts = sessionsToDisplay.filter(s => {
                  const productName = getDisplayProductName(s, productLookup);
                  return !productName || productName === 'No Product' || productName.trim() === '';
                });
                
                const productGroups = groupSessionsByProduct(sessionsWithProducts, productLookup);
                
                // Separate multi-session products from single-session products
                const multiSessionProducts: Array<{ key: string; sessions: any[] }> = [];
                const singleSessionProducts: any[] = [];
                
                Object.entries(productGroups).forEach(([normalizedProductName, sessions]) => {
                  if (sessions.length >= 2) {
                    multiSessionProducts.push({ key: normalizedProductName, sessions });
                  } else {
                    singleSessionProducts.push(...sessions);
                  }
                });
                
                return (
                  <div className="space-y-8">
                    {/* Multi-session product groups at the top */}
                    {multiSessionProducts.map(({ key: normalizedProductName, sessions }) => {
                      // Use normalized product name for expanded state tracking
                      const isExpanded = expandedProductGroups.has(normalizedProductName);
                      const sessionsToShow = !isExpanded ? sessions.slice(0, 3) : sessions;
                      const remainingCount = sessions.length > 3 ? sessions.length - 3 : 0;
                      // Get display name from first session (all sessions in group have same display name)
                      const productName = getDisplayProductName(sessions[0], productLookup);
                      // Use first session's product_id for color lookup (if available)
                      const productColorHex = sessions[0]?.product_id ? productColorLookup[sessions[0].product_id] : undefined;
                      const productColors = getProductColor(productName, productColorHex);

                      // Multiple sessions - render with wrapper
                      // Helper to create light tint background from hex color
                      const hexToRgba = (hex: string, alpha: number) => {
                        const normalized = hex.replace('#', '');
                        const r = parseInt(normalized.substring(0, 2), 16);
                        const g = parseInt(normalized.substring(2, 4), 16);
                        const b = parseInt(normalized.substring(4, 6), 16);
                        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                      };
                      const lightTintBackground = productColors.background 
                        ? hexToRgba(productColors.background, 0.1)
                        : '#F9FAFB';

                      return (
                        <div key={normalizedProductName} className="relative" style={{ marginTop: '50px' }}>
                          {/* Wrapper Container */}
                          <div 
                            className="rounded-lg rounded-tl-none border border-gray-200 pt-2 px-6 pb-6 relative overflow-visible"
                            style={{ 
                              backgroundColor: lightTintBackground,
                              borderColor: productColors.border || '#E5E7EB'
                            }}
                          >
                            {/* Product Name Tab - On Top */}
                            {renderProductTab(productName, productColors, sessions[0]?.product_id, normalizedProductName)}
                            
                            {/* Show More text - Same row as tab (desktop only) */}
                            {remainingCount > 0 && (
                              <div
                                className="absolute right-0 z-20 hidden md:block"
                                style={{
                                  top: '0',
                                  transform: 'translateY(calc(-100% - 3px))'
                                }}
                              >
                                <button
                                  onClick={() => toggleProductGroup(normalizedProductName)}
                                  className="flex items-center gap-1 text-sm text-[#2D4660] hover:text-[#173B65] transition-colors cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      Show Less
                                      <ChevronDown className="h-4 w-4 rotate-180" />
                                    </>
                                  ) : (
                                    <>
                                      Show More ({remainingCount})
                                      <ChevronDown className="h-4 w-4" />
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                            
                            {/* Create Session Button - Circle + button on far right (desktop), bottom center (mobile) */}
                            {hasAdminAccess && viewMode !== 'stakeholder' && (
                              <div
                                className="absolute z-20 bottom-[-20px] left-1/2 -translate-x-1/2 md:bottom-auto md:left-auto md:translate-x-0 md:right-[-20px] md:top-1/2 md:-translate-y-1/2"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Pre-select the product for this group
                                    const productId = sessions[0]?.product_id;
                                    const productName = getDisplayProductName(sessions[0], productLookup);
                                    if (productId) {
                                      setSelectedProductId(productId);
                                    }
                                    // Store product name for lookup if product_id doesn't match
                                    if (productName && productName !== 'No Product') {
                                      setPendingProductName(productName);
                                    }
                                    
                                    // Calculate dates: start after the furthest out end_date
                                    // Initialize with first session's end date to ensure we find the actual latest
                                    let latestEndDate = sessions.length > 0 
                                      ? parseLocalDate(sessions[0].end_date) 
                                      : new Date();
                                    sessions.forEach(session => {
                                      const sessionEndDate = parseLocalDate(session.end_date);
                                      if (sessionEndDate > latestEndDate) {
                                        latestEndDate = sessionEndDate;
                                      }
                                    });
                                    
                                    // Start date should ALWAYS be the NEXT day after the latest end date (at midnight)
                                    // (if end date is Dec 11 at 11:59 PM, next session starts Dec 12 at midnight)
                                    const newStartDate = addDaysToLocalDate(latestEndDate, 1);
                                    
                                    // End date is 14 days (2 weeks) after start date
                                    const newEndDate = addDaysToLocalDate(newStartDate, 14);
                                    
                                    // Update form with calculated dates
                                    setCreateSessionForm(prev => ({
                                      ...prev,
                                      startDate: formatDateToISO(newStartDate),
                                      endDate: formatDateToISO(newEndDate)
                                    }));
                                    
                                    setModalOpenedFromCirclePlus(true);
                                    setAllowCreateProduct(false);
                                    setShowCreateSessionModal(true);
                                  }}
                                  onMouseEnter={() => setHoveredPlusButton(normalizedProductName)}
                                  onMouseLeave={() => setHoveredPlusButton(null)}
                                  className="flex items-center justify-center w-10 h-10 rounded-full shadow-md"
                                  style={{
                                    backgroundColor: productColors.background || '#C89212',
                                    color: productColors.text || '#FFFFFF'
                                  }}
                                  title={`Create new session for ${productName}`}
                                >
                                  <Plus className="h-5 w-5" />
                                </button>
                              </div>
                            )}
                            
                            {/* Sessions Grid */}
                            <div className="grid grid-cols-1 gap-0 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                              {sessionsToShow.map((session) => {
                                const status = getSessionStatus(session);
                                const isClosed = status.text === 'Closed';
                                const StatusIcon = status.icon;
                                const votesInfo = getEffectiveVotesPerUser(session);
                                const hasVoted = votingStatus[session.id];
                                const sessionProductName = getDisplayProductName(session, productLookup);
                                const sessionProductColorHex = session.product_id ? productColorLookup[session.product_id] : undefined;
                                const sessionProductColors = getProductColor(sessionProductName, sessionProductColorHex);

                                return (
                                  <div
                                    key={session.id}
                                    className="relative z-10 bg-white overflow-visible shadow-md rounded-lg hover:shadow-lg transition-shadow cursor-pointer mt-6 border"
                                    style={{ 
                                      borderColor: sessionProductColors.border, 
                                      borderWidth: '1px',
                                      opacity: isClosed && hoveredSessionCard !== session.id ? 0.75 : 1
                                    }}
                                    onMouseEnter={() => setHoveredSessionCard(session.id)}
                                    onMouseLeave={() => setHoveredSessionCard(null)}
                                    onClick={() => handleSelectSession(session)}
                                  >
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
                                          <span className={`inline-flex items-center ${status.text === 'Active' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} rounded-full font-medium ${status.color}`}>
                                            <StatusIcon className={`${status.text === 'Active' ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                                            {status.text}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center">
                                            <List className="h-4 w-4 mr-2" />
                                            <span>{featureCounts[session.id] || 0} {featureCounts[session.id] === 1 ? 'feature' : 'features'} to vote on</span>
                                          </div>
                                          <span className="text-sm font-medium text-[#2D4660]">{sessionProductName}</span>
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

                            {/* Show More button for mobile */}
                            {remainingCount > 0 && (
                              <div className="mt-4 md:hidden">
                                <button
                                  onClick={() => toggleProductGroup(normalizedProductName)}
                                  className="w-full flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium text-[#2D4660] bg-white hover:bg-gray-50 rounded-md border border-gray-300 transition-colors"
                                >
                                  {isExpanded ? (
                                    <>
                                      Show Less
                                      <ChevronDown className="h-4 w-4 rotate-180" />
                                    </>
                                  ) : (
                                    <>
                                      Show More ({remainingCount})
                                      <ChevronDown className="h-4 w-4" />
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Single sessions (both single-product sessions and no-product sessions) in one grid at bottom */}
                    {(singleSessionProducts.length > 0 || sessionsWithoutProducts.length > 0) && (
                      <div className="grid grid-cols-1 gap-0 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {[...singleSessionProducts, ...sessionsWithoutProducts].map((session) => {
                          const status = getSessionStatus(session);
                          const isClosed = status.text === 'Closed';
                          const StatusIcon = status.icon;
                          const votesInfo = getEffectiveVotesPerUser(session);
                          const hasVoted = votingStatus[session.id];
                          const sessionProductName = getDisplayProductName(session, productLookup);
                          const sessionProductColorHex = session.product_id ? productColorLookup[session.product_id] : undefined;
                          const sessionProductColors = getProductColor(sessionProductName, sessionProductColorHex);
                          // Check if this is a single-session product (has product, not in sessionsWithoutProducts)
                          const isSingleSessionProduct = singleSessionProducts.includes(session);

                          return (
                            <div
                              key={session.id}
                              className="relative z-10 bg-white overflow-visible shadow-md rounded-lg rounded-tl-none hover:shadow-lg transition-shadow cursor-pointer mt-6 border"
                              style={{ 
                                borderColor: sessionProductColors.border, 
                                borderWidth: '1px',
                                opacity: isClosed && hoveredSessionCard !== session.id ? 0.75 : 1
                              }}
                              onMouseEnter={() => setHoveredSessionCard(session.id)}
                              onMouseLeave={() => setHoveredSessionCard(null)}
                              onClick={() => handleSelectSession(session)}
                            >
                              {/* Product Name Tab */}
                              {renderProductTab(sessionProductName, sessionProductColors, session.product_id)}
                              
                              {/* Create Session Button - Circle + button on far right (desktop), bottom center (mobile) (only for single-session products) */}
                              {isSingleSessionProduct && hasAdminAccess && viewMode !== 'stakeholder' && (
                              <div
                                  className="absolute z-20 bottom-[-20px] left-1/2 -translate-x-1/2 md:bottom-auto md:left-auto md:translate-x-0 md:right-[-20px] md:top-1/2 md:-translate-y-1/2"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Pre-select the product for this session
                                      const productId = session.product_id;
                                      const productName = getDisplayProductName(session, productLookup);
                                      if (productId) {
                                        setSelectedProductId(productId);
                                      }
                                      // Store product name for lookup if product_id doesn't match
                                      if (productName && productName !== 'No Product') {
                                        setPendingProductName(productName);
                                      }
                                      
                                      // Calculate dates: start on the NEXT day after end_date (at midnight)
                                      const sessionEndDate = parseLocalDate(session.end_date);
                                      // Start date should ALWAYS be the NEXT day after the end date (at midnight)
                                      // (if end date is Dec 11 at 11:59 PM, next session starts Dec 12 at midnight)
                                      const newStartDate = addDaysToLocalDate(sessionEndDate, 1);
                                      
                                      // End date is 14 days (2 weeks) after start date
                                      const newEndDate = addDaysToLocalDate(newStartDate, 14);
                                      
                                      // Update form with calculated dates
                                      setCreateSessionForm(prev => ({
                                        ...prev,
                                        startDate: formatDateToISO(newStartDate),
                                        endDate: formatDateToISO(newEndDate)
                                      }));
                                      
                                      setModalOpenedFromCirclePlus(true);
                                      setAllowCreateProduct(false);
                                      setShowCreateSessionModal(true);
                                    }}
                                    className="flex items-center justify-center w-10 h-10 rounded-full transition-colors shadow-md hover:shadow-lg"
                                style={{
                                      backgroundColor: sessionProductColors.background || '#C89212',
                                      color: sessionProductColors.text || '#FFFFFF'
                                    }}
                                    onMouseEnter={(e) => {
                                      // Darken the color on hover
                                      const currentBg = sessionProductColors.background || '#C89212';
                                      e.currentTarget.style.backgroundColor = currentBg;
                                      e.currentTarget.style.filter = 'brightness(0.8)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = sessionProductColors.background || '#C89212';
                                      e.currentTarget.style.filter = 'brightness(1)';
                                    }}
                                    title={`Create new session for ${sessionProductName}`}
                                  >
                                    <Plus className="h-5 w-5" />
                                  </button>
                              </div>
                              )}
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
                                    <span className={`inline-flex items-center ${status.text === 'Active' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} rounded-full font-medium ${status.color}`}>
                                      <StatusIcon className={`${status.text === 'Active' ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                                      {status.text}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                      <List className="h-4 w-4 mr-2" />
                                      <span>{featureCounts[session.id] || 0} {featureCounts[session.id] === 1 ? 'feature' : 'features'} to vote on</span>
                                    </div>
                                    <span className="text-sm font-medium text-[#2D4660]">{sessionProductName}</span>
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
                    )}
                  </div>
                );
              })()}
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
                      style={{ 
                        borderColor: productColors.border, 
                        borderWidth: '1px',
                        opacity: isClosed && hoveredSessionCard !== session.id ? 0.75 : 1
                      }}
                      onMouseEnter={() => setHoveredSessionCard(session.id)}
                      onMouseLeave={() => setHoveredSessionCard(null)}
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
                            <span className={`inline-flex items-center ${status.text === 'Active' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} rounded-full font-medium ${status.color}`}>
                              <StatusIcon className={`${status.text === 'Active' ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
                              {status.text}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <List className="h-4 w-4 mr-2" />
                              <span>{featureCounts[session.id] || 0} {featureCounts[session.id] === 1 ? 'feature' : 'features'} to vote on</span>
                            </div>
                            <span className="text-sm font-medium text-[#2D4660]">{productName}</span>
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
                  {(() => {
                    
                    // Separate sessions with and without products
                    const sessionsWithProducts = adminSessionsToDisplay.filter(s => {
                      const productName = getDisplayProductName(s, productLookup);
                      return productName && productName !== 'No Product' && productName.trim() !== '';
                    });
                    const sessionsWithoutProducts = adminSessionsToDisplay.filter(s => {
                      const productName = getDisplayProductName(s, productLookup);
                      return !productName || productName === 'No Product' || productName.trim() === '';
                    });
                    
                    const productGroups = groupSessionsByProduct(sessionsWithProducts, productLookup);
                    
                    // Separate multi-session products from single-session products
                    const multiSessionProducts: Array<{ key: string; sessions: any[] }> = [];
                    const singleSessionProducts: any[] = [];
                    
                    Object.entries(productGroups).forEach(([normalizedProductName, sessions]) => {
                      if (sessions.length >= 2) {
                        multiSessionProducts.push({ key: normalizedProductName, sessions });
                      } else {
                        singleSessionProducts.push(...sessions);
                      }
                    });
                    
                    return (
                      <div className="space-y-8">
                        {/* Multi-session product groups at the top */}
                        {multiSessionProducts.map(({ key: normalizedProductName, sessions }) => {
                          // Use normalized product name for expanded state tracking
                          const isExpanded = expandedProductGroups.has(normalizedProductName);
                          const sessionsToShow = !isExpanded ? sessions.slice(0, 3) : sessions;
                          const remainingCount = sessions.length > 3 ? sessions.length - 3 : 0;
                          // Get display name from first session (all sessions in group have same display name)
                          const productName = getDisplayProductName(sessions[0], productLookup);
                          // Use first session's product_id for color lookup (if available)
                          const productColorHex = sessions[0]?.product_id ? productColorLookup[sessions[0].product_id] : undefined;
                          const productColors = getProductColor(productName, productColorHex);

                          // Multiple sessions - render with wrapper
                          // Helper to create light tint background from hex color
                          const hexToRgba = (hex: string, alpha: number) => {
                            const normalized = hex.replace('#', '');
                            const r = parseInt(normalized.substring(0, 2), 16);
                            const g = parseInt(normalized.substring(2, 4), 16);
                            const b = parseInt(normalized.substring(4, 6), 16);
                            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                          };
                          const lightTintBackground = productColors.background 
                            ? hexToRgba(productColors.background, 0.1)
                            : '#F9FAFB';

                          return (
                            <div key={normalizedProductName} className="relative" style={{ marginTop: '50px' }}>
                              {/* Wrapper Container */}
                              <div 
                                className="rounded-lg rounded-tl-none border border-gray-200 pt-2 px-6 pb-6 relative overflow-visible"
                                style={{ 
                                  backgroundColor: lightTintBackground,
                                  borderColor: productColors.border || '#E5E7EB'
                                }}
                              >
                                {/* Product Name Tab - On Top */}
                                {renderProductTab(productName, productColors, sessions[0]?.product_id, normalizedProductName)}
                                
                                {/* Show More text - Same row as tab (desktop only) */}
                                {remainingCount > 0 && (
                                  <div
                                    className="absolute right-0 z-20 hidden md:block"
                                    style={{
                                      top: '0',
                                      transform: 'translateY(calc(-100% - 3px))'
                                    }}
                                  >
                                    <button
                                      onClick={() => toggleProductGroup(normalizedProductName)}
                                      className="flex items-center gap-1 text-sm text-[#2D4660] hover:text-[#173B65] transition-colors cursor-pointer"
                                    >
                                      {isExpanded ? (
                                        <>
                                          Show Less
                                          <ChevronDown className="h-4 w-4 rotate-180" />
                                        </>
                                      ) : (
                                        <>
                                          Show More ({remainingCount})
                                          <ChevronDown className="h-4 w-4" />
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                                
                                {/* Create Session Button - Circle + button on far right (desktop), bottom center (mobile) */}
                                {(isSystemAdmin || viewMode === 'admin' || viewMode === 'system-admin') && (
                                  <div
                                    className="absolute z-20 bottom-[-20px] left-1/2 -translate-x-1/2 md:bottom-auto md:left-auto md:translate-x-0 md:right-[-20px] md:top-1/2 md:-translate-y-1/2"
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Pre-select the product for this group
                                        const productId = sessions[0]?.product_id;
                                        const productName = getDisplayProductName(sessions[0], productLookup);
                                        if (productId) {
                                          setSelectedProductId(productId);
                                        }
                                        // Store product name for lookup if product_id doesn't match
                                        if (productName && productName !== 'No Product') {
                                          setPendingProductName(productName);
                                        }
                                        
                                        // Calculate dates: start after the furthest out end_date
                                        // Initialize with first session's end date to ensure we find the actual latest
                                        let latestEndDate = sessions.length > 0 
                                          ? parseLocalDate(sessions[0].end_date) 
                                          : new Date();
                                        sessions.forEach(session => {
                                          const sessionEndDate = parseLocalDate(session.end_date);
                                          if (sessionEndDate > latestEndDate) {
                                            latestEndDate = sessionEndDate;
                                          }
                                        });
                                        
                                        // Start date should ALWAYS be the NEXT day after the latest end date (at midnight)
                                        // (if end date is Dec 11 at 11:59 PM, next session starts Dec 12 at midnight)
                                        const newStartDate = addDaysToLocalDate(latestEndDate, 1);
                                        
                                        // End date is 14 days (2 weeks) after start date
                                        const newEndDate = addDaysToLocalDate(newStartDate, 14);
                                        
                                        // Update form with calculated dates
                                        setCreateSessionForm(prev => ({
                                          ...prev,
                                          startDate: formatDateToISO(newStartDate),
                                          endDate: formatDateToISO(newEndDate)
                                        }));
                                        
                                        setAllowCreateProduct(false);
                                        setShowCreateSessionModal(true);
                                      }}
                                      onMouseEnter={() => setHoveredPlusButton(normalizedProductName)}
                                      onMouseLeave={() => setHoveredPlusButton(null)}
                                      className="flex items-center justify-center w-10 h-10 rounded-full shadow-md"
                                      style={{
                                        backgroundColor: productColors.background || '#C89212',
                                        color: productColors.text || '#FFFFFF'
                                      }}
                                      title={`Create new session for ${productName}`}
                                    >
                                      <Plus className="h-5 w-5" />
                                    </button>
                                  </div>
                                )}
                                
                                {/* Sessions Grid */}
                                <div className="grid grid-cols-1 gap-0 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                  {sessionsToShow.map((session) => {
                                    const status = getSessionStatus(session);
                                    const StatusIcon = status.icon;
                                    const votesInfo = getEffectiveVotesPerUser(session);
                                    const isClosed = status.text === 'Closed';
                                    const sessionProductName = getDisplayProductName(session, productLookup);
                                    const sessionProductColorHex = session.product_id ? productColorLookup[session.product_id] : undefined;
                                    const sessionProductColors = getProductColor(sessionProductName, sessionProductColorHex);

                                    return (
                                      <div
                                        key={session.id}
                                        className="relative z-10 bg-white overflow-visible shadow-md rounded-lg hover:shadow-lg transition-shadow cursor-pointer mt-6 border"
                                        style={{ 
                                          borderColor: sessionProductColors.border, 
                                          borderWidth: '1px',
                                          opacity: isClosed && hoveredSessionCard !== session.id ? 0.75 : 1
                                        }}
                                        onMouseEnter={() => setHoveredSessionCard(session.id)}
                                        onMouseLeave={() => setHoveredSessionCard(null)}
                                        onClick={() => handleSelectSession(session)}
                                      >
                                        {renderSessionCard(session, sessionProductName, sessionProductColors, status, StatusIcon, votesInfo, isClosed, false, session.product_id)}
                                      </div>
                                    );
                                  })}
                                  {/* Create Session Button - Only show when there are exactly 2 sessions in the group (desktop only) */}
                                  {sessions.length === 2 && (
                                    <>
                                      <style>{`
                                        @keyframes growFromCenter {
                                          from {
                                            opacity: 0;
                                            transform: scale(0.3);
                                          }
                                          to {
                                            opacity: 1;
                                            transform: scale(1);
                                          }
                                        }
                                        @keyframes sparkle {
                                          0%, 100% {
                                            opacity: 0.1;
                                            transform: scale(0.7) rotate(0deg);
                                          }
                                          50% {
                                            opacity: 0.25;
                                            transform: scale(1.3) rotate(180deg);
                                          }
                                        }
                                        @keyframes sparkleSlow {
                                          0%, 100% {
                                            opacity: 0.08;
                                            transform: scale(0.6);
                                          }
                                          50% {
                                            opacity: 0.2;
                                            transform: scale(1.4);
                                          }
                                        }
                                        @keyframes starTwinkle {
                                          0%, 100% {
                                            opacity: 0.12;
                                            transform: scale(0.8) rotate(0deg);
                                          }
                                          25% {
                                            opacity: 0.22;
                                            transform: scale(1.1) rotate(90deg);
                                          }
                                          50% {
                                            opacity: 0.18;
                                            transform: scale(1.3) rotate(180deg);
                                          }
                                          75% {
                                            opacity: 0.22;
                                            transform: scale(1.1) rotate(270deg);
                                          }
                                        }
                                      `}</style>
                                      <div 
                                        className="hidden lg:block relative z-10 overflow-hidden shadow-md rounded-lg mt-6 border cursor-pointer transition-all" 
                                        style={{ 
                                          borderColor: productColors.border || '#E5E7EB', 
                                          borderWidth: '1px',
                                          backgroundColor: 'rgba(255, 255, 255, 0.7)'
                                        }}
                                        onMouseEnter={() => setHoveredThirdCard(normalizedProductName)}
                                        onMouseLeave={() => setHoveredThirdCard(null)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                            const productId = sessions[0]?.product_id;
                                            const productName = getDisplayProductName(sessions[0], productLookup);
                                            if (productId) {
                                              setSelectedProductId(productId);
                                            }
                                            if (productName && productName !== 'No Product') {
                                              setPendingProductName(productName);
                                            }
                                            
                                            // Calculate dates: start after the furthest out end_date
                                            // Initialize with first session's end date to ensure we find the actual latest
                                            let latestEndDate = sessions.length > 0 
                                              ? parseLocalDate(sessions[0].end_date) 
                                              : new Date();
                                            sessions.forEach(session => {
                                              const sessionEndDate = parseLocalDate(session.end_date);
                                              if (sessionEndDate > latestEndDate) {
                                                latestEndDate = sessionEndDate;
                                              }
                                            });
                                            
                                            // Start date should ALWAYS be the NEXT day after the latest end date (at midnight)
                                            // (if end date is Dec 11 at 11:59 PM, next session starts Dec 12 at midnight)
                                            const newStartDate = addDaysToLocalDate(latestEndDate, 1);
                                            
                                            // End date is 14 days (2 weeks) after start date
                                            const newEndDate = addDaysToLocalDate(newStartDate, 14);
                                            
                                            // Update form with calculated dates
                                            setCreateSessionForm(prev => ({
                                              ...prev,
                                              startDate: formatDateToISO(newStartDate),
                                              endDate: formatDateToISO(newEndDate)
                                            }));
                                            
                                            
                                            setModalOpenedFromCirclePlus(true);
                                            
                                          setAllowCreateProduct(false);
                                            setShowCreateSessionModal(true);
                                          }}
                                      >
                                        <div 
                                          className="p-6 flex flex-col h-full items-center justify-center min-h-[200px] relative rounded-lg transition-all duration-300" 
                                          style={{
                                          backgroundColor: 'transparent',
                                          backgroundImage: (hoveredPlusButton === normalizedProductName || hoveredThirdCard === normalizedProductName)
                                            ? `radial-gradient(circle at center, ${productColors.badgeBackground || 'rgba(200, 146, 18, 0.15)'}, transparent 70%)`
                                            : 'none'
                                        }}
                                      >
                                        {/* Sparkles and Stars - many with variation, all dim */}
                                        {(hoveredPlusButton === normalizedProductName || hoveredThirdCard === normalizedProductName) && (
                                          <>
                                            {/* Round sparkles */}
                                            <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkle 1.8s ease-in-out infinite', animationDelay: '0ms', opacity: 0.12 }} />
                                            <div className="absolute top-5 left-8 w-1 h-1 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkleSlow 2.5s ease-in-out infinite', animationDelay: '200ms', opacity: 0.1 }} />
                                            <div className="absolute top-8 left-5 w-2 h-2 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkle 2.2s ease-in-out infinite', animationDelay: '400ms', opacity: 0.15 }} />
                                            <div className="absolute top-4 right-6 w-1 h-1 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkleSlow 2.8s ease-in-out infinite', animationDelay: '600ms', opacity: 0.1 }} />
                                            <div className="absolute top-7 right-4 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkle 2s ease-in-out infinite', animationDelay: '800ms', opacity: 0.12 }} />
                                            <div className="absolute top-10 right-9 w-1 h-1 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkleSlow 2.3s ease-in-out infinite', animationDelay: '1000ms', opacity: 0.1 }} />
                                            <div className="absolute bottom-5 left-4 w-2 h-2 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkle 2.1s ease-in-out infinite', animationDelay: '1200ms', opacity: 0.15 }} />
                                            <div className="absolute bottom-7 left-9 w-1 h-1 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkleSlow 2.6s ease-in-out infinite', animationDelay: '1400ms', opacity: 0.1 }} />
                                            <div className="absolute bottom-4 left-12 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkle 1.9s ease-in-out infinite', animationDelay: '1600ms', opacity: 0.12 }} />
                                            <div className="absolute bottom-8 right-5 w-1 h-1 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkleSlow 2.4s ease-in-out infinite', animationDelay: '1800ms', opacity: 0.1 }} />
                                            <div className="absolute bottom-6 right-10 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkle 2.2s ease-in-out infinite', animationDelay: '2000ms', opacity: 0.12 }} />
                                            <div className="absolute bottom-3 right-7 w-1 h-1 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkleSlow 2.7s ease-in-out infinite', animationDelay: '2200ms', opacity: 0.1 }} />
                                            
                                            {/* Star icons */}
                                            <Star className="absolute top-6 left-12" size={8} style={{ color: productColors.background || '#C89212', animation: 'starTwinkle 3s ease-in-out infinite', animationDelay: '300ms', opacity: 0.15 }} />
                                            <Star className="absolute top-9 right-12" size={6} style={{ color: productColors.background || '#C89212', animation: 'starTwinkle 3.5s ease-in-out infinite', animationDelay: '700ms', opacity: 0.12 }} />
                                            <Star className="absolute bottom-9 left-6" size={7} style={{ color: productColors.background || '#C89212', animation: 'starTwinkle 2.8s ease-in-out infinite', animationDelay: '1100ms', opacity: 0.13 }} />
                                            <Star className="absolute bottom-5 right-12" size={5} style={{ color: productColors.background || '#C89212', animation: 'starTwinkle 3.2s ease-in-out infinite', animationDelay: '1500ms', opacity: 0.1 }} />
                                            <Star className="absolute top-12 left-1/2 -translate-x-1/2" size={6} style={{ color: productColors.background || '#C89212', animation: 'starTwinkle 2.9s ease-in-out infinite', animationDelay: '500ms', opacity: 0.12 }} />
                                            <Star className="absolute bottom-12 left-1/2 -translate-x-1/2" size={7} style={{ color: productColors.background || '#C89212', animation: 'starTwinkle 3.3s ease-in-out infinite', animationDelay: '1300ms', opacity: 0.13 }} />
                                            
                                            {/* Sparkles icons */}
                                            <Sparkles className="absolute top-2 left-6" size={6} style={{ color: productColors.background || '#C89212', animation: 'sparkle 2.1s ease-in-out infinite', animationDelay: '250ms', opacity: 0.12 }} />
                                            <Sparkles className="absolute top-11 right-6" size={5} style={{ color: productColors.background || '#C89212', animation: 'sparkleSlow 2.7s ease-in-out infinite', animationDelay: '750ms', opacity: 0.1 }} />
                                            <Sparkles className="absolute bottom-10 left-10" size={7} style={{ color: productColors.background || '#C89212', animation: 'sparkle 2.4s ease-in-out infinite', animationDelay: '1150ms', opacity: 0.13 }} />
                                            <Sparkles className="absolute bottom-2 right-8" size={6} style={{ color: productColors.background || '#C89212', animation: 'sparkleSlow 2.9s ease-in-out infinite', animationDelay: '1550ms', opacity: 0.11 }} />
                                            <Sparkles className="absolute top-1/2 left-2" size={5} style={{ color: productColors.background || '#C89212', animation: 'sparkle 2.6s ease-in-out infinite', animationDelay: '450ms', opacity: 0.1 }} />
                                            <Sparkles className="absolute top-1/2 right-2" size={6} style={{ color: productColors.background || '#C89212', animation: 'sparkleSlow 2.8s ease-in-out infinite', animationDelay: '950ms', opacity: 0.12 }} />
                                            
                                            {/* More scattered sparkles */}
                                            <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkleSlow 2.2s ease-in-out infinite', animationDelay: '300ms', opacity: 0.1 }} />
                                            <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkle 2.3s ease-in-out infinite', animationDelay: '900ms', opacity: 0.12 }} />
                                            <div className="absolute bottom-1/4 left-1/3 w-1 h-1 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkleSlow 2.5s ease-in-out infinite', animationDelay: '1500ms', opacity: 0.1 }} />
                                            <div className="absolute bottom-1/3 right-1/3 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: productColors.background || '#C89212', animation: 'sparkle 2.1s ease-in-out infinite', animationDelay: '600ms', opacity: 0.12 }} />
                                          </>
                                        )}
                                        {/* Create New Session text - always centered, grow from small to full size */}
                                        <div 
                                          className="flex flex-col items-center justify-center gap-2 z-10"
                                          style={{
                                            opacity: (hoveredPlusButton === normalizedProductName || hoveredThirdCard === normalizedProductName) ? 1 : 0,
                                            transformOrigin: 'center center',
                                            animation: (hoveredPlusButton === normalizedProductName || hoveredThirdCard === normalizedProductName)
                                              ? 'growFromCenter 0.3s ease-out forwards'
                                              : 'none'
                                          }}
                                        >
                                          <Plus className="h-8 w-8" style={{ color: productColors.background || '#C89212' }} />
                                          <div className="flex flex-col items-center justify-center text-base font-semibold" style={{ color: productColors.background || '#C89212' }}>
                                            <span>Create</span>
                                            <span>New Session</span>
                                          </div>
                                      </div>
                                    </div>
                                    </div>
                                    </>
                                  )}
                                </div>

                                {/* Show More button for mobile */}
                                {remainingCount > 0 && (
                                  <div className="mt-4 md:hidden">
                                    <button
                                      onClick={() => toggleProductGroup(normalizedProductName)}
                                      className="w-full flex items-center justify-center gap-1 px-4 py-2 text-sm font-medium text-[#2D4660] bg-white hover:bg-gray-50 rounded-md border border-gray-300 transition-colors"
                                    >
                                      {isExpanded ? (
                                        <>
                                          Show Less
                                          <ChevronDown className="h-4 w-4 rotate-180" />
                                        </>
                                      ) : (
                                        <>
                                          Show More ({remainingCount})
                                          <ChevronDown className="h-4 w-4" />
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Single sessions (both single-product sessions and no-product sessions) in one grid at bottom */}
                        {(singleSessionProducts.length > 0 || sessionsWithoutProducts.length > 0) && (
                          <div className="grid grid-cols-1 gap-0 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {[...singleSessionProducts, ...sessionsWithoutProducts].map((session) => {
                              const status = getSessionStatus(session);
                              const StatusIcon = status.icon;
                              const votesInfo = getEffectiveVotesPerUser(session);
                              const isClosed = status.text === 'Closed';
                              const sessionProductName = getDisplayProductName(session, productLookup);
                              const sessionProductColorHex = session.product_id ? productColorLookup[session.product_id] : undefined;
                              const sessionProductColors = getProductColor(sessionProductName, sessionProductColorHex);
                              // Check if this is a single-session product (has product, not in sessionsWithoutProducts)
                              const isSingleSessionProduct = singleSessionProducts.includes(session);

                              return (
                                <div
                                  key={session.id}
                                  className="relative z-10 bg-white overflow-visible shadow-md rounded-lg rounded-tl-none hover:shadow-lg transition-shadow cursor-pointer mt-6 border"
                                  style={{ 
                                    borderColor: sessionProductColors.border, 
                                    borderWidth: '1px',
                                    opacity: isClosed && hoveredSessionCard !== session.id ? 0.75 : 1
                                  }}
                                  onMouseEnter={() => setHoveredSessionCard(session.id)}
                                  onMouseLeave={() => setHoveredSessionCard(null)}
                                  onClick={() => handleSelectSession(session)}
                                >
                                  {/* Create Session Button - Circle + button on far right (desktop), bottom center (mobile) (only for single-session products) */}
                                  {isSingleSessionProduct && (isSystemAdmin || viewMode === 'admin' || viewMode === 'system-admin') && (
                                    <div
                                      className="absolute z-20 bottom-[-20px] left-1/2 -translate-x-1/2 md:bottom-auto md:left-auto md:translate-x-0 md:right-[-20px] md:top-1/2 md:-translate-y-1/2"
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Pre-select the product for this session
                                          const productId = session.product_id;
                                          const productName = getDisplayProductName(session, productLookup);
                                          if (productId) {
                                            setSelectedProductId(productId);
                                          }
                                          // Store product name for lookup if product_id doesn't match
                                          if (productName && productName !== 'No Product') {
                                            setPendingProductName(productName);
                                          }
                                          
                                          // Calculate dates: start after this session's end_date
                                          // Use the actual stored end_date from the database as the source of truth
                                          const sessionEndDate = parseLocalDate(session.end_date);
                                          // Start date should ALWAYS be the NEXT day after the end date (at midnight)
                                          // (if end date is Dec 11 at 11:59 PM, next session starts Dec 12 at midnight)
                                          const newStartDate = addDaysToLocalDate(sessionEndDate, 1);
                                          
                                          // End date is 14 days (2 weeks) after start date
                                          const newEndDate = addDaysToLocalDate(newStartDate, 14);
                                          
                                          // Update form with calculated dates
                                          setCreateSessionForm(prev => ({
                                            ...prev,
                                            startDate: formatDateToISO(newStartDate),
                                            endDate: formatDateToISO(newEndDate)
                                          }));
                                          
                                          setModalOpenedFromCirclePlus(true);
                                          setAllowCreateProduct(false);
                                          setShowCreateSessionModal(true);
                                        }}
                                        className="flex items-center justify-center w-10 h-10 rounded-full transition-colors shadow-md hover:shadow-lg"
                                        style={{
                                          backgroundColor: sessionProductColors.background || '#C89212',
                                          color: sessionProductColors.text || '#FFFFFF'
                                        }}
                                        onMouseEnter={(e) => {
                                          // Darken the color on hover
                                          const currentBg = sessionProductColors.background || '#C89212';
                                          e.currentTarget.style.backgroundColor = currentBg;
                                          e.currentTarget.style.filter = 'brightness(0.8)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.backgroundColor = sessionProductColors.background || '#C89212';
                                          e.currentTarget.style.filter = 'brightness(1)';
                                        }}
                                        title={`Create new session for ${sessionProductName}`}
                                      >
                                        <Plus className="h-5 w-5" />
                                      </button>
                                    </div>
                                  )}
                                  {renderSessionCard(session, sessionProductName, sessionProductColors, status, StatusIcon, votesInfo, isClosed, true, session.product_id)}
                                </div>
                              );
                            })}
                            {/* Create Session Card - Only show on desktop when there are exactly 2 admin sessions total and single sessions are displayed */}
                            {adminSessionsToDisplay.length === 2 && (singleSessionProducts.length + sessionsWithoutProducts.length) > 0 && (
                              <div className="hidden lg:block relative z-10 bg-white overflow-visible shadow-md rounded-lg hover:shadow-lg transition-shadow mt-6 border border-gray-200">
                                <div className="p-6 flex flex-col h-full items-end justify-center min-h-[200px]">
                                  <button
                                    onClick={() => {
                                      setAllowCreateProduct(true);
                                      setShowCreateSessionModal(true);
                                    }}
                                    className="flex items-center px-6 py-3 bg-[#C89212] text-white rounded-lg hover:bg-[#6A4234] transition-colors font-semibold"
                                  >
                                    <Plus className="h-5 w-5 mr-2" />
                                    Create Session
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
              /* Default State: Dropdown OR Read-only product display (if opened from circle+) */
              modalOpenedFromCirclePlus && selectedProductId ? (
                /* Read-only product display when opened from circle+ button */
                <div className="flex items-center gap-3 px-4 py-2 border border-gray-300 rounded-md bg-gray-50">
                  {(() => {
                    const product = modalProducts.find(p => p.id === selectedProductId);
                    const productName = product?.name || productLookup[selectedProductId] || 'Unknown Product';
                    const productColorHex = product?.color_hex || productColorLookup[selectedProductId];
                    const productColors = getProductColor(productName, productColorHex);
                    return (
                      <>
                        <div 
                          className="w-6 h-6 rounded-md border flex-shrink-0"
                          style={{ 
                            backgroundColor: productColors.background || '#2D4660',
                            borderColor: productColors.border || '#2D4660'
                          }}
                        />
                        <span className="font-medium text-gray-900 flex-1">{productName}</span>
                      </>
                    );
                  })()}
                </div>
              ) : (
                /* Dropdown when opened from top button */
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1 w-full">
                    <ProductPicker
                      label=""
                      products={modalProducts}
                      value={selectedProductId}
                      onChange={async (value) => {
                        setSelectedProductId(value);
                        // Clear new product name if an existing product is selected
                        if (value) {
                          setNewProductName('');
                          
                          // Update dates based on selected product's existing sessions
                          try {
                            // Get all sessions for this product
                            const productSessions = userSessions.filter(s => s.product_id === value);
                            
                            if (productSessions.length > 0) {
                              // Find the latest end date
                              let latestEndDate = parseLocalDate(productSessions[0].end_date);
                              productSessions.forEach(session => {
                                const sessionEndDate = parseLocalDate(session.end_date);
                                if (sessionEndDate > latestEndDate) {
                                  latestEndDate = sessionEndDate;
                                }
                              });
                              
                              // Start date should be the NEXT day after the latest end date
                              const newStartDate = addDaysToLocalDate(latestEndDate, 1);
                              // End date is 14 days (2 weeks) after start date
                              const newEndDate = addDaysToLocalDate(newStartDate, 14);
                              
                              setCreateSessionForm(prev => ({
                                ...prev,
                                startDate: formatDateToISO(newStartDate),
                                endDate: formatDateToISO(newEndDate)
                              }));
                            } else {
                              // No existing sessions - use default dates (today + 14 days)
                              const today = new Date();
                              const defaultEndDate = addDaysToLocalDate(today, 14);
                              setCreateSessionForm(prev => ({
                                ...prev,
                                startDate: formatDateToISO(today),
                                endDate: formatDateToISO(defaultEndDate)
                              }));
                            }
                          } catch (error) {
                            console.error('Error calculating dates for selected product:', error);
                            // On error, just use default dates
                            const today = new Date();
                            const defaultEndDate = addDaysToLocalDate(today, 14);
                            setCreateSessionForm(prev => ({
                              ...prev,
                              startDate: formatDateToISO(today),
                              endDate: formatDateToISO(defaultEndDate)
                            }));
                          }
                        }
                        if (createSessionErrors.product) {
                          setCreateSessionErrors(prev => {
                            const next = { ...prev };
                            delete next.product;
                            return next;
                          });
                        }
                      }}
                      isLoading={isLoadingProducts}
                      error={productError}
                      disabled={isLoadingProducts || modalProducts.length === 0}
                      placeholder="Select a product"
                      helperText={
                          !isLoadingProducts && modalProducts.length === 0 && !productError && allowCreateProduct
                          ? 'No products found yet. Enter a product name below to create one.'
                          : undefined
                      }
                        allowDelete={allowCreateProduct}
                        onRequestDeleteProduct={allowCreateProduct ? ((product) => {
                        setProductToDelete(product);
                        }) : undefined}
                      className="w-full"
                    />
                  </div>
                    {allowCreateProduct && (
                  <div className="flex items-center gap-2 sm:flex-none">
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
                    )}
                  </div>
                </div>
              )
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
            ) : allowCreateProduct && isCreatingNewProduct ? (
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
                        Product Color
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
                            src={colorPickerIcon} 
                            alt="Color Picker"
                            className="w-8 h-8 object-contain"
                          />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            
            {createSessionErrors.product && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {createSessionErrors.product}
              </p>
            )}
            {productError && (isCreatingNewProduct || Boolean(pendingProduct)) && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {productError}
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
              variant={isCreatingNewProduct && newProductName.trim() && newProductColor ? 'gold' : 'primary'}
              disabled={isCreatingSession}
              className={`transition-all duration-500 ease-in-out ${isCreatingNewProduct && newProductName.trim() && newProductColor ? 'relative overflow-hidden' : ''}`}
            >
              {isCreatingSession ? (
                'Creating...'
              ) : isCreatingNewProduct && newProductName.trim() && newProductColor ? (
                <>
                  <span className="relative z-10 flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Product and Session
                  </span>
                  {/* Sparkle animation */}
                  <span className="absolute top-1 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '0ms', animationDuration: '1.5s' }}></span>
                  <span className="absolute top-2 right-1/3 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '300ms', animationDuration: '1.5s' }}></span>
                  <span className="absolute bottom-2 left-1/3 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '600ms', animationDuration: '1.5s' }}></span>
                  <span className="absolute bottom-1 right-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '900ms', animationDuration: '1.5s' }}></span>
                </>
              ) : (
                'Create Session'
              )}
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
                  // Auto-focus Session title field after color selection
                  setTimeout(() => {
                    sessionTitleInputRef.current?.focus();
                  }, 100);
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

      <Modal
        isOpen={showStakeholderInviteModal}
        onClose={() => {
          if (!isSendingInvites) {
            closeStakeholderInviteModal();
          }
        }}
        title={inviteSessionDetails ? `Email Stakeholders • ${inviteSessionDetails.title}` : 'Email Stakeholders'}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          {inviteModalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {inviteModalError}
            </div>
          )}

          {inviteModalLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-600">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2D4660] mb-3"></div>
              Loading stakeholders...
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Stakeholders ({inviteStakeholders.length})
                  </h4>
                  {inviteStakeholders.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleAllStakeholders}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      {allStakeholdersSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {inviteStakeholders.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      No stakeholders are assigned to this session yet.
                    </div>
                  ) : (
                    inviteStakeholders.map((stakeholder) => {
                      const normalizedEmail = stakeholder.user_email.toLowerCase();
                      const isChecked = selectedStakeholderEmails.includes(normalizedEmail);
                      return (
                        <label
                          key={stakeholder.id}
                          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {stakeholder.user_name || 'Unnamed Stakeholder'}
                            </p>
                            <p className="text-xs text-gray-500">{stakeholder.user_email}</p>
                          </div>
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-[#2D4660] border-gray-300 rounded focus:ring-[#2D4660]"
                            checked={isChecked}
                            onChange={() => toggleStakeholderSelection(stakeholder.user_email)}
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={inviteEmailSubject}
                    onChange={(e) => setInviteEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2D4660]"
                    placeholder="Email subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                  <textarea
                    value={inviteEmailBody}
                    onChange={(e) => setInviteEmailBody(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2D4660]"
                    rows={10}
                  />
                  {inviteSessionLink && (
                    <p className="text-xs text-gray-500 mt-2 break-words">
                      Invite link:&nbsp;
                      <a href={inviteSessionLink} target="_blank" rel="noreferrer" className="text-blue-600">
                        {inviteSessionLink}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Button variant="secondary" onClick={closeStakeholderInviteModal} disabled={isSendingInvites}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSendStakeholderInvites}
            disabled={isSendingInvites || inviteStakeholders.length === 0 || selectedStakeholderEmails.length === 0}
          >
            {isSendingInvites
              ? 'Sending...'
              : `Send to ${selectedStakeholderEmails.length} Stakeholder${selectedStakeholderEmails.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!inviteSuccessSummary}
        onClose={closeInviteSuccessModal}
        title=""
        hideHeader
        maxWidth="max-w-md"
      >
        <div className="text-center py-6 px-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Invites Sent!</h3>
          <p className="text-sm text-gray-600">
            Successfully emailed {inviteSuccessSummary?.count ?? 0} stakeholder
            {inviteSuccessSummary?.count === 1 ? '' : 's'} for{' '}
            <span className="font-semibold text-gray-900">{inviteSuccessSummary?.sessionTitle}</span>.
          </p>
          <div className="mt-6">
            <Button variant="primary" onClick={closeInviteSuccessModal}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

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

      {/* Edit Product Modal */}
      {productToEdit && (
        <Modal
          isOpen
          onClose={() => {
            setProductToEdit(null);
            setEditingProductName('');
            setEditingProductColor(null);
            setShowEditProductColorPicker(false);
          }}
          title="Edit Product"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={editingProductName}
                onChange={(e) => setEditingProductName(e.target.value)}
                placeholder="Enter product name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-[#2D4660]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Color
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditTempColor(editingProductColor || '#2D4660');
                    setShowEditProductColorPicker(true);
                  }}
                  className="block w-12 h-12 rounded-md border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center overflow-hidden"
                  style={editingProductColor ? { backgroundColor: editingProductColor } : { backgroundColor: '#ffffff' }}
                >
                  {!editingProductColor && (
                    <img 
                      src="/colorpicker.png" 
                      alt="Color Picker"
                      className="w-8 h-8 object-contain"
                    />
                  )}
                </button>
                <span className="text-sm text-gray-600">
                  {editingProductColor || 'No color selected'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setProductToEdit(null);
                  setEditingProductName('');
                  setEditingProductColor(null);
                  setShowEditProductColorPicker(false);
                }}
                disabled={isUpdatingProduct}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!productToEdit?.id || !editingProductName.trim()) {
                    return;
                  }
                  setIsUpdatingProduct(true);
                  try {
                    await db.updateProduct(productToEdit.id, {
                      name: editingProductName.trim(),
                      color_hex: editingProductColor
                    });
                    // Refresh products
                    const tenantId = currentUser?.tenant_id ?? currentUser?.tenantId;
                    if (tenantId) {
                      const updatedProducts = await db.getProductsForTenant(tenantId);
                      setModalProducts(updatedProducts.sort((a, b) => a.name.localeCompare(b.name)));
                      // Update lookups
                      const newLookup: Record<string, string> = {};
                      const newColorLookup: Record<string, string> = {};
                      updatedProducts.forEach(p => {
                        newLookup[p.id] = p.name || '';
                        if (p.color_hex) newColorLookup[p.id] = p.color_hex as string;
                      });
                      setProductLookup(newLookup);
                      setProductColorLookup(newColorLookup);
                    }
                    setProductToEdit(null);
                    setEditingProductName('');
                    setEditingProductColor(null);
                    setShowEditProductColorPicker(false);
                    await refreshSessions();
                    await loadUserSessions();
                  } catch (error) {
                    console.error('Error updating product:', error);
                    alert('Failed to update product. Please try again.');
                  } finally {
                    setIsUpdatingProduct(false);
                  }
                }}
                disabled={isUpdatingProduct || !editingProductName.trim()}
              >
                {isUpdatingProduct ? 'Updating...' : 'Update Product'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Product Color Picker Modal */}
      {showEditProductColorPicker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowEditProductColorPicker(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl px-3 py-2 w-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3 items-stretch">
              <div className="flex-shrink-0" style={{ width: '240px', height: '260px' }}>
                <input
                  id="edit-native-color-input"
                  type="color"
                  value={editTempColor}
                  onChange={(e) => setEditTempColor(e.target.value)}
                  ref={(input) => {
                    if (input && showEditProductColorPicker) {
                      setTimeout(() => input.click(), 50);
                    }
                  }}
                  className="opacity-0 absolute"
                  style={{ width: '1px', height: '1px' }}
                />
                <div className="w-full h-full"></div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setEditingProductColor(editTempColor);
                  setShowEditProductColorPicker(false);
                }}
                className="px-6 rounded-lg text-white font-bold shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-3 text-lg flex-shrink-0"
                style={{ backgroundColor: editTempColor, height: '260px', minWidth: '100px' }}
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
    </div>
  );
}