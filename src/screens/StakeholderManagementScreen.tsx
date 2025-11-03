// ============================================
// Stakeholder Management Screen
// ============================================
// Location: src/screens/StakeholderManagementScreen.tsx
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import { sendInvitationEmail } from '../services/emailService';
import { 
  ChevronLeft, UserPlus, Trash2, CheckCircle, X, AlertCircle,
  Mail, User, Clock, Settings, List, LogOut
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Stakeholder {
  id: string;
  session_id: string;
  user_name: string;
  user_email: string;
  has_voted: boolean;
  voted_at: string | null;
  created_at: string;
}

export default function StakeholderManagementScreen() {
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
  
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
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
    loadStakeholders();
  }, [currentSession, navigate]);

  const loadStakeholders = async () => {
    if (!currentSession) return;
    
    setIsLoading(true);
    try {
      const data = await db.getSessionStakeholders(currentSession.id);
      setStakeholders(data);
    } catch (error) {
      console.error('Error loading stakeholders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleAddStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    // Check for duplicate email
    if (stakeholders.some(s => s.user_email.toLowerCase() === formData.email.toLowerCase())) {
      newErrors.email = 'This stakeholder is already added';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return;
    
    if (!currentSession) return;
    
    setIsSubmitting(true);
    try {
      await db.addSessionStakeholder({
        session_id: currentSession.id,
        user_name: formData.name,
        user_email: formData.email,
        has_voted: false
      });
      // Send invite email via Edge Function (fallback to mailto)
      try {
        const inviteUrl = `${window.location.origin}/login?session=${currentSession.session_code}`;
        await sendInvitationEmail({
          to: formData.email,
          subject: `You're invited to vote: ${currentSession.title}`,
          text: `Hi,\n\nYou've been invited to vote in \"${currentSession.title}\".\n\nOpen: ${inviteUrl}\n\nBest regards,\n${currentUser?.name || ''}`,
          html: `<p>Hi,</p><p>You've been invited to vote in <strong>${currentSession.title}</strong>.</p><p><a href="${inviteUrl}">Open the Feature Voting System</a></p><p>Best regards,<br/>${currentUser?.name || ''}</p>`
        });
      } catch {
        try {
          const mailto = db.buildSessionInviteMailto(currentSession as any, formData.email, currentUser?.name || '');
          window.location.href = mailto;
        } catch {}
      }
      
      await loadStakeholders();
      setFormData({ name: '', email: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding stakeholder:', error);
      setErrors({ submit: 'Failed to add stakeholder. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStakeholder = async (email: string) => {
    if (!currentSession) return;
    
    if (!confirm('Are you sure you want to remove this stakeholder?')) return;
    
    try {
      await db.removeSessionStakeholder(currentSession.id, email);
      await loadStakeholders();
    } catch (error) {
      console.error('Error removing stakeholder:', error);
      alert('Failed to remove stakeholder');
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
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
          <p className="text-gray-600">Loading stakeholders...</p>
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
      
      {/* Title and buttons - mobile menu in same row */}
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
            onClick={() => navigate('/admin')}
            className="mr-2 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Manage Stakeholders</h1>
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
              Add Stakeholder
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
                  Add Stakeholder
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
            <p className="text-sm text-gray-600">Total Stakeholders</p>
            <p className="text-2xl font-bold text-[#2d4660]">{stakeholders.length}</p>
          </div>
        </div>
      </div>

      {/* Stakeholders Table */}
      <div className="relative z-10 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#2d4660]">
            Stakeholders ({stakeholders.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage who can vote in this session
          </p>
        </div>

        {stakeholders.length === 0 ? (
          <div className="p-12 text-center">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stakeholders</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding stakeholders to this voting session.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 bg-[#2d4660] text-white rounded-md hover:bg-[#1d3a53] transition-colors"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Add First Stakeholder
              </button>
            </div>
          </div>
        ) : (
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
                    Voting Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stakeholders.map((stakeholder) => (
                  <tr key={stakeholder.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {stakeholder.user_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Mail className="h-4 w-4 mr-2" />
                        {stakeholder.user_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {stakeholder.has_voted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Voted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(stakeholder.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveStakeholder(stakeholder.user_email)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Stakeholder Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-[#2d4660]">Add Stakeholder</h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', email: '' });
                  setErrors({});
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddStakeholder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John Doe"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="john@example.com"
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
                    setFormData({ name: '', email: '' });
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
                  {isSubmitting ? 'Adding...' : 'Add Stakeholder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}