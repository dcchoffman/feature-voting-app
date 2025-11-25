// ============================================
// Admin Management Screen
// ============================================
// Location: src/screens/AdminManagementScreen.tsx
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import { sendInvitationEmail } from '../services/emailService';
import type { User, SessionAdmin } from '../types';
import { 
  ChevronLeft, UserPlus, Trash2, X, AlertCircle,
  Mail, User as UserIcon, Shield, Settings, List, LogOut
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import mobileLogo from '../assets/New-Millennium-Icon-gold-on-blue-rounded-square.svg';
import desktopLogo from '../assets/New-Millennium-color-logo.svg';

export default function AdminManagementScreen() {
  const { currentSession, currentUser, setCurrentUser, setCurrentSession } = useSession();
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
    setMobileMenuOpen(false);
    navigate('/login', { replace: true });
  };
  
  const [admins, setAdmins] = useState<SessionAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (!currentSession) {
      navigate('/sessions');
      return;
    }
    loadAdmins();
  }, [currentSession, navigate]);

  const loadAdmins = async () => {
    if (!currentSession) return;
    
    setIsLoading(true);
    try {
      const data = await db.getSessionAdmins(currentSession.id);
      setAdmins(data);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    // Check for duplicate email
    if (admins.some(a => a.user.email.toLowerCase() === formData.email.toLowerCase())) {
      newErrors.email = 'This user is already an admin';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return;
    
    if (!currentSession) return;
    
    setIsSubmitting(true);
    try {
      // Add as admin by email (auto-create user if needed)
      const fallbackName = formData.email.split('@')[0].replace(/\./g, ' ');
      await db.addSessionAdminByEmail(currentSession.id, formData.email, fallbackName);
      // Send invite email via Edge Function (fallback to mailto)
      try {
        // Include basename for GitHub Pages
        const basename = window.location.pathname.startsWith('/feature-voting-app') ? '/feature-voting-app' : '';
        const inviteUrl = `${window.location.origin}${basename}/login?session=${currentSession.session_code}`;
        await sendInvitationEmail({
          to: formData.email,
          subject: `You're invited to administer: ${currentSession.title}`,
          text: `Hi,\n\nYou've been added as an admin for \"${currentSession.title}\".\n\nOpen: ${inviteUrl}\n\nBest regards,\n${currentUser?.name || ''}`,
          html: `<p>Hi,</p><p>You've been added as an admin for <strong>${currentSession.title}</strong>.</p><p><a href="${inviteUrl}">Open the Feature Voting System</a></p><p>Best regards,<br/>${currentUser?.name || ''}</p>`
        });
      } catch {
        try {
          const mailto = db.buildSessionInviteMailto(currentSession as any, formData.email, currentUser?.name || '');
          window.location.href = mailto;
        } catch {}
      }
      
      await loadAdmins();
      setFormData({ email: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding admin:', error);
      setErrors({ submit: 'Failed to add admin. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!currentSession) return;
    
    // Prevent removing the last admin
    if (admins.length === 1) {
      alert('Cannot remove the last admin. Sessions must have at least one admin.');
      return;
    }
    
    // Prevent removing yourself
    if (userId === currentUser?.id) {
      alert('You cannot remove yourself as an admin.');
      return;
    }
    
    if (!confirm('Are you sure you want to remove this admin?')) return;
    
    try {
      await db.removeSessionAdmin(currentSession.id, userId);
      await loadAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      alert('Failed to remove admin');
    }
  };

  const formatDate = (dateString: string): string => {
    // Parse as local date to avoid timezone issues
    // Extract just the date part (YYYY-MM-DD) if there's a time component
    const dateOnly = dateString.split('T')[0].split(' ')[0];
    const parts = dateOnly.split('-');
    
    let date: Date;
    if (parts.length === 3) {
      // Parse as local date (month is 0-indexed)
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      date = new Date(year, month, day);
      
      // If there's a time component, add it back
      const timeMatch = dateString.match(/T(\d{2}):(\d{2}):(\d{2})/);
      if (timeMatch) {
        date.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), parseInt(timeMatch[3], 10));
      }
    } else {
      // Fallback to original behavior if format is unexpected
      date = new Date(dateString);
    }
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentSession) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admins...</p>
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
      
      {/* Title and buttons - mobile menu in same row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {/* Mobile: small logo next to back button and title */}
          <img
            src={mobileLogo}
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          />
          <button 
            onClick={() => navigate('/admin')}
            className="mr-2 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Session Admins</h1>
        </div>
        
        <div ref={mobileMenuRef} className="relative z-40">
          {/* Desktop buttons */}
          <div className="hidden md:flex space-x-2">
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center px-4 py-2 bg-[#4f6d8e] text-white rounded-lg hover:bg-[#3d5670] transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin Dashboard
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-[#c59f2d] text-white rounded-lg hover:bg-[#a88a26] transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Admin
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
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/admin'); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 mr-2 text-gray-700" />
                  Admin Dashboard
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setShowAddForm(true); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  <UserPlus className="h-4 w-4 mr-2 text-gray-700" />
                  Add Admin
                </button>
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

      {/* Session Info */}
      <div className="relative z-10 bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#2d4660]">Current Session</h2>
            <p className="text-gray-600 mt-1">{currentSession.title}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Total Admins</p>
            <p className="text-2xl font-bold text-[#2d4660]">{admins.length}</p>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="relative z-10 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#2d4660]">
            Session Admins ({admins.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage who can administer this voting session
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="relative z-10 bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {admin.user.name}
                        {admin.user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-gray-500">(You)</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="h-4 w-4 mr-2" />
                      {admin.user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(admin.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRemoveAdmin(admin.user_id)}
                      className={`text-red-600 hover:text-red-900 ${
                        admin.user.id === currentUser?.id || admins.length === 1
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                      disabled={admin.user.id === currentUser?.id || admins.length === 1}
                      title={
                        admin.user.id === currentUser?.id
                          ? 'You cannot remove yourself'
                          : admins.length === 1
                          ? 'Cannot remove the last admin'
                          : 'Remove admin'
                      }
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="relative z-10 mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Session Admin Permissions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Manage features and voting settings for this session</li>
              <li>Add and remove stakeholders for this session</li>
              <li>View voting results and analytics for this session</li>
              <li>Add and remove other session admins</li>
            </ul>
            <p className="mt-2 text-xs italic">
              Note: System Admins have full admin access to all sessions in the system.
            </p>
          </div>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-[#2d4660]">Add Session Admin</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ email: '' });
                  setErrors({});
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="admin@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email}
                  </p>
                )}
                
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {errors.submit}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ email: '' });
                    setErrors({});
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2d4660] text-white rounded-md hover:bg-[#1d3a53] disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}