// ============================================
// Admin Management Screen
// ============================================
// Location: src/screens/AdminManagementScreen.tsx
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import type { User, SessionAdmin } from '../types';
import { 
  ChevronLeft, UserPlus, Trash2, X, AlertCircle,
  Mail, User as UserIcon, Shield, Settings
} from 'lucide-react';

export default function AdminManagementScreen() {
  const { currentSession, currentUser } = useSession();
  const navigate = useNavigate();
  
  const [admins, setAdmins] = useState<SessionAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // First, get or create the user
      const user = await db.getUserByEmail(formData.email);
      
      if (!user) {
        setErrors({ email: 'User not found. They must log in first before being added as an admin.' });
        setIsSubmitting(false);
        return;
      }
      
      // Add as admin
      await db.addSessionAdmin(currentSession.id, user.id);
      
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
            onClick={() => navigate('/admin')}
            className="mr-2 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Session Admins</h1>
        </div>
        
        <div className="flex space-x-2">
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
            <span className="hidden sm:inline">Add Admin</span>
            <span className="sm:hidden">Add</span>
          </button>
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
                <p className="mt-1 text-xs text-gray-500">
                  The user must have logged in at least once before being added as an admin.
                </p>
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