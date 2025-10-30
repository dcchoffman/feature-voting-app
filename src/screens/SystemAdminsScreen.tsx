// ============================================
// System Admins Management Screen
// ============================================
// Location: src/screens/SystemAdminsScreen.tsx
// ============================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import type { User } from '../types';
import { 
  ChevronLeft, UserPlus, Trash2, X, AlertCircle,
  Mail, Shield, Settings, Crown
} from 'lucide-react';

interface SystemAdmin {
  id: string;
  user_id: string;
  created_at: string;
  user: User;
}

export default function SystemAdminsScreen() {
  const { currentUser } = useSession();
  const navigate = useNavigate();
  
  const [admins, setAdmins] = useState<SystemAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSystemAdmins();
  }, []);

  const loadSystemAdmins = async () => {
    setIsLoading(true);
    try {
      let data = await db.getSystemAdmins();
      
      // If there are no system admins and we have a current user, 
      // automatically add them as the first system admin
      if (data.length === 0 && currentUser) {
        console.log('No system admins found. Adding current user as first system admin...');
        await db.addSystemAdmin(currentUser.id);
        data = await db.getSystemAdmins();
      }
      
      setAdmins(data);
    } catch (error) {
      console.error('Error loading system admins:', error);
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
      newErrors.email = 'This user is already a system admin';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) return;
    
    setIsSubmitting(true);
    try {
      // First, get or create the user
      const user = await db.getUserByEmail(formData.email);
      
      if (!user) {
        setErrors({ email: 'User not found. They must log in first before being added as a system admin.' });
        setIsSubmitting(false);
        return;
      }
      
      // Add as system admin
      await db.addSystemAdmin(user.id);
      
      await loadSystemAdmins();
      setFormData({ email: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding system admin:', error);
      setErrors({ submit: 'Failed to add system admin. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    // Find the first admin (earliest created_at)
    const firstAdmin = admins.reduce((earliest, admin) => 
      new Date(admin.created_at) < new Date(earliest.created_at) ? admin : earliest
    );
    
    // Prevent removing the first/original admin
    if (userId === firstAdmin.user_id) {
      alert('Cannot remove the original system admin. This protects against accidentally locking everyone out of the system.');
      return;
    }
    
    // Prevent removing the last admin
    if (admins.length === 1) {
      alert('Cannot remove the last system admin. The system must have at least one admin.');
      return;
    }
    
    // Prevent removing yourself
    if (userId === currentUser?.id) {
      alert('You cannot remove yourself as a system admin.');
      return;
    }
    
    if (!confirm('Are you sure you want to remove this system admin?')) return;
    
    try {
      await db.removeSystemAdmin(userId);
      await loadSystemAdmins();
    } catch (error) {
      console.error('Error removing system admin:', error);
      alert('Failed to remove system admin');
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

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system admins...</p>
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
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">System Admins</h1>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => navigate('/sessions')}
            className="flex items-center px-4 py-2 bg-[#4f6d8e] text-white rounded-lg hover:bg-[#3d5670] transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">My Sessions</span>
            <span className="sm:hidden">Sessions</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-[#c59f2d] text-white rounded-lg hover:bg-[#a88a26] transition-colors"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add System Admin</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* System Info */}
      <div className="relative z-10 bg-gradient-to-r from-[#2d4660] to-[#1d3a53] rounded-lg shadow-md p-6 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Crown className="h-8 w-8 mr-3" />
            <div>
              <h2 className="text-xl font-semibold">Feature Voting System</h2>
              <p className="text-blue-100 mt-1">Global administrator management</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Total System Admins</p>
            <p className="text-3xl font-bold">{admins.length}</p>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="relative z-10 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#2d4660]">
            System Administrators ({admins.length})
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage who has full access to the Feature Voting System
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
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => {
                // Find the first admin (earliest created_at)
                const firstAdmin = admins.reduce((earliest, current) => 
                  new Date(current.created_at) < new Date(earliest.created_at) ? current : earliest
                );
                const isFirstAdmin = admin.user_id === firstAdmin.user_id;
                
                return (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Crown className="h-5 w-5 text-[#c59f2d] mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {admin.user.name}
                          {admin.user.id === currentUser?.id && (
                            <span className="ml-2 text-xs text-gray-500">(You)</span>
                          )}
                          {isFirstAdmin && (
                            <span className="ml-2 text-xs text-[#c59f2d] font-semibold">(Original Admin)</span>
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
                          admin.user.id === currentUser?.id || admins.length === 1 || isFirstAdmin
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        disabled={admin.user.id === currentUser?.id || admins.length === 1 || isFirstAdmin}
                        title={
                          isFirstAdmin
                            ? 'Cannot remove the original system admin'
                            : admin.user.id === currentUser?.id
                            ? 'You cannot remove yourself'
                            : admins.length === 1
                            ? 'Cannot remove the last system admin'
                            : 'Remove system admin'
                        }
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="relative z-10 mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <Crown className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">System Admin Permissions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Full access to all voting sessions across the system</li>
              <li>Create and manage any voting session</li>
              <li>Add and remove other system administrators</li>
              <li>Manage session admins and stakeholders for any session</li>
              <li>View all results and analytics system-wide</li>
            </ul>
            <p className="mt-3 text-xs font-medium">
              Note: The original system admin (first person to access this page) cannot be removed to prevent system lockout.
            </p>
          </div>
        </div>
      </div>

      {/* Add Admin Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-[#2d4660]">Add System Admin</h3>
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
                  The user must have logged in at least once before being added as a system admin.
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
                  {isSubmitting ? 'Adding...' : 'Add System Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}