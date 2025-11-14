// ============================================
// Create Session Screen
// ============================================
// Location: src/screens/CreateSessionScreen.tsx
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import { supabase } from '../supabaseClient';
import { ChevronLeft, Calendar, Users, Vote, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import type { Product } from '../types';

export default function CreateSessionScreen() {
  const { currentUser, setCurrentSession, refreshSessions, setCurrentUser } = useSession();
  const navigate = useNavigate();
  
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
    navigate('/login', { replace: true });
  };
  
  const [formData, setFormData] = useState({
    title: '',
    goal: '',
    votesPerUser: 10,
    useAutoVotes: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newProductName, setNewProductName] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      if (!currentUser) {
        setProducts([]);
        setSelectedProductId('');
        return;
      }

      const tenantId = currentUser.tenant_id ?? currentUser.tenantId ?? null;
      if (!tenantId) {
        setProducts([]);
        setSelectedProductId('');
        setProductError('No tenant assigned. Products cannot be loaded.');
        return;
      }

      setIsLoadingProducts(true);
      setProductError(null);
      try {
        const results = await db.getProductsForTenant(tenantId);
        setProducts(results);
        setSelectedProductId(results[0]?.id ?? '');
      } catch (error) {
        console.error('Error loading products for create session:', error);
        if (db.isProductsTableMissingError?.(error)) {
          setProductError('Products are not configured yet. Please create the `products` table in Supabase.');
        } else {
          setProductError('Unable to load products. You can still create a session without a product tag.');
        }
        setProducts([]);
        setSelectedProductId('');
      } finally {
        setIsLoadingProducts(false);
      }
    };

    loadProducts();
  }, [currentUser]);

  const generateSessionCode = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Session title is required';
    }
    
    if (!formData.goal.trim()) {
      newErrors.goal = 'Session goal is required';
    }
    
    if (!formData.useAutoVotes) {
      if (formData.votesPerUser < 1) {
        newErrors.votesPerUser = 'Votes per user must be at least 1';
      }
      
      if (formData.votesPerUser > 100) {
        newErrors.votesPerUser = 'Votes per user cannot exceed 100';
      }
    }
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (end <= start) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (!productError && products.length > 0 && !selectedProductId) {
      newErrors.product = 'Please select a product for this session';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !currentUser) return;
    
    setIsSubmitting(true);
    
    try {
      // Generate unique session code
      const code = generateSessionCode();
      
      const selectedProduct = products.find(p => p.id === selectedProductId) || null;

      // Create the session
      const newSession = await db.createSession({
        title: formData.title,
        goal: formData.goal,
        votes_per_user: formData.votesPerUser,
        use_auto_votes: formData.useAutoVotes,
        start_date: formData.startDate,
        end_date: formData.endDate,
        is_active: true,
        session_code: code,
        product_id: selectedProduct?.id ?? null,
        product_name: selectedProduct?.name ?? null
      });
      
      // Add current user as admin
      await db.addSessionAdmin(newSession.id, currentUser.id);
      
      // Refresh sessions in context
      await refreshSessions();
      
      // Show success
      setSessionCreated(true);
      
      // After 3 seconds, navigate to the new session's admin page
      setTimeout(() => {
        setCurrentSession(newSession);
        navigate('/admin');
      }, 3000);
      
    } catch (error) {
      console.error('Error creating session:', error);
      setErrors({ submit: 'Failed to create session. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!currentUser) return;
    const tenantId = currentUser.tenant_id ?? currentUser.tenantId ?? null;
    if (!tenantId) {
      setProductError('Cannot create products because no tenant is associated with your account.');
      return;
    }

    const trimmedName = newProductName.trim();
    if (!trimmedName) {
      setProductError('Product name is required.');
      return;
    }

    setIsCreatingProduct(true);
    setProductError(null);
    try {
      const created = await db.createProductForTenant(tenantId, trimmedName);
      setProducts(prev => {
        const next = [...prev, created].sort((a, b) => a.name.localeCompare(b.name));
        return next;
      });
      setSelectedProductId(created.id);
      setNewProductName('');
    } catch (error) {
      console.error('Error creating product:', error);
      setProductError(error instanceof Error ? error.message : 'Unable to create product. Please try again.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'votesPerUser' ? parseInt(value) || 0 : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  if (sessionCreated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-[#2d4660] mb-2">Session Created!</h2>
          <p className="text-gray-600 mb-6">Your voting session has been created successfully.</p>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Success!</p>
            <p className="text-base text-[#2d4660] font-medium">Your session has been created.</p>
            <p className="text-xs text-gray-500 mt-2">You can now invite stakeholders from your session dashboard.</p>
          </div>
          
          <p className="text-sm text-gray-500">Redirecting to admin dashboard...</p>
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
          {/* Mobile: small logo next to back button and title */}
          <img
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px' }}
          />
          <button 
            onClick={() => navigate('/sessions')}
            className="mr-2 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Create Voting Session</h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Form */}
      <div className="relative z-10 bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Session Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Q2 2025 Product Roadmap"
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Session Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Goal *
            </label>
            <textarea
              name="goal"
              value={formData.goal}
              onChange={handleChange}
              rows={3}
              placeholder="Describe the purpose of this voting session..."
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent ${
                errors.goal ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.goal && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.goal}
              </p>
            )}
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product *
            </label>
            {isLoadingProducts ? (
              <p className="text-sm text-gray-500">Loading products...</p>
            ) : products.length > 0 ? (
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  if (errors.product) {
                    setErrors(prev => {
                      const next = { ...prev };
                      delete next.product;
                      return next;
                    });
                  }
                }}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent ${
                  errors.product ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500">
                {productError ?? 'No products found. Add a product below to associate this session.'}
              </p>
            )}
            {errors.product && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.product}
              </p>
            )}
            {productError && products.length > 0 && (
              <p className="mt-1 text-sm text-red-600">{productError}</p>
            )}

          <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Add a new product
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => {
                    setNewProductName(e.target.value);
                    if (productError) setProductError(null);
                  }}
                  placeholder="e.g., Catalyst Cloud"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleCreateProduct}
                  disabled={isCreatingProduct}
                  className="px-4 py-2 bg-[#2d4660] text-white rounded-md hover:bg-[#1d3a53] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreatingProduct ? 'Adding...' : 'Add Product'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                New products become available immediately for all session admins in your tenant.
              </p>
            </div>
          </div>

          {/* Votes Per User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Vote className="h-4 w-4 inline mr-1" />
              Votes Per User *
            </label>
            
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                id="useAutoVotes"
                checked={formData.useAutoVotes}
                onChange={(e) => setFormData(prev => ({ ...prev, useAutoVotes: e.target.checked }))}
                className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#3A9B5C] focus:outline-none focus:ring-0"
              />
              <label htmlFor="useAutoVotes" className="ml-2 text-sm text-gray-700 cursor-pointer">
                Auto-calculate votes (half of feature count, minimum 1)
              </label>
            </div>
            
            {!formData.useAutoVotes && (
              <>
                <input
                  type="number"
                  name="votesPerUser"
                  value={formData.votesPerUser}
                  onChange={handleChange}
                  min="1"
                  max="100"
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent ${
                    errors.votesPerUser ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.votesPerUser && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.votesPerUser}
                  </p>
                )}
              </>
            )}
            
            <p className="mt-2 text-sm text-gray-500">
              {formData.useAutoVotes 
                ? "Votes will automatically be set to half the number of features (1 feature = 1 vote, 2 features = 1 vote, 4 features = 2 votes, etc.)"
                : "Each stakeholder will have this many votes to distribute across features"
              }
            </p>
          </div>

          {/* Voting Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.endDate}
                </p>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Users className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Next Steps:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>After creating the session, you'll be assigned as the admin</li>
                  <li>You can add stakeholders and other admins from the admin dashboard</li>
                  <li>Use the "Email Invite" button to send stakeholders a link to join</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {errors.submit}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/sessions')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#2d4660] text-white rounded-md hover:bg-[#1d3a53] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}