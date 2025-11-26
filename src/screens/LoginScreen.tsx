// ============================================
// Login Screen
// ============================================
// Location: src/screens/LoginScreen.tsx
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import { sendInvitationEmail } from '../services/emailService';
import { LogIn, Mail, CheckCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import desktopLogo from '../assets/New-Millennium-color-logo.svg';
import microsoftLogo from '../assets/microsoft.svg';
import { Modal, Button } from './FeatureVoting';
import type { Product } from '../types';
import { getProductColor } from '../utils/productColors';
import { generateGrantAccessToken } from '../utils/grantAccessToken';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [grantAccessSuccess, setGrantAccessSuccess] = useState<{ roleName: string; productName: string; requesterName: string; requesterEmail: string } | null>(null);
  const { currentUser, setCurrentUser, setCurrentSession } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for OAuth errors in URL parameters or sessionStorage
  useEffect(() => {
    // Check sessionStorage first (for errors redirected from /sessions)
    const storedError = sessionStorage.getItem('oauth_error');
    if (storedError) {
      setError(storedError);
      sessionStorage.removeItem('oauth_error');
    }
    
    // Check URL parameters
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');
    
    if (errorParam) {
      // Decode the error description (it's URL encoded)
      const decodedError = errorDescription 
        ? decodeURIComponent(errorDescription) 
        : 'An authentication error occurred.';
      
      // Check for specific errors
      if (errorParam === 'invalid_request' && decodedError.includes('AADSTS9002325')) {
        setError('Azure AD authentication requires PKCE. Please ensure your Azure AD app is configured correctly. The redirect URI must be registered under the "Web" platform in Azure AD.');
      } else if (errorCode === 'unexpected_failure' && decodedError.includes('email')) {
        setError('Azure AD did not return your email address. Please ensure your Azure AD app has the correct API permissions (User.Read or email) and that your account has an email address.');
      } else {
        setError(`Authentication failed: ${decodedError}`);
      }
      
      // Clean up the URL - React Router handles basename automatically
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  // Handle grant access actions from email buttons
  useEffect(() => {
    const token = searchParams.get('token');
    const action = searchParams.get('action');
    const email = searchParams.get('email');
    const productId = searchParams.get('product');

    if (token && action && email && productId && (action === 'grant-admin' || action === 'grant-stakeholder')) {
      const grantAccess = async () => {
        try {
          setIsLoading(true);
          setError('');

          // Get Supabase URL for Edge Function
          const supabaseUrl = (supabase as any).supabaseUrl;
          const grantAccessUrl = `${supabaseUrl}/functions/v1/grant-access`;

          // Call Edge Function to grant access (bypasses RLS)
          let response;
          try {
            response = await fetch(grantAccessUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(supabase as any).supabaseKey}`,
              },
              body: JSON.stringify({
                token,
                action,
                email,
                productId
              })
            });
          } catch (fetchError: any) {
            // Handle CORS or network errors
            if (fetchError.message?.includes('CORS') || fetchError.message?.includes('Failed to fetch')) {
              throw new Error('The grant access function is not available. Please ensure the Edge Function is deployed. Error: ' + fetchError.message);
            }
            throw fetchError;
          }

          if (!response.ok) {
            let errorMessage = 'Failed to grant access';
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch {
              errorMessage = `Server returned ${response.status}: ${response.statusText}`;
            }
            throw new Error(errorMessage);
          }

          const result = await response.json();

          // Extract name from email (fallback)
          const fallbackName = email.split('@')[0].replace(/\./g, ' ');
          const productName = result.productName || 'the product';
          const roleName = action === 'grant-admin' ? 'Session Admin' : 'Stakeholder';

          // Get requester name (try to get from user, otherwise use fallback)
          let requesterName = fallbackName;
          try {
            const user = await db.getUserByEmail(email);
            if (user) {
              requesterName = user.name;
            }
          } catch (err) {
            // Use fallback name if user lookup fails
          }

          // Send email to requester
          const basename = window.location.pathname.startsWith('/feature-voting-app') ? '/feature-voting-app' : '';
          const loginUrl = `${window.location.origin}${basename}/login`;
          const logoUrl = 'https://dcchoffman.github.io/feature-voting-app/New-Millennium-color-logo1.png';
          const curveImageUrl = 'https://dcchoffman.github.io/feature-voting-app/bottom-left-curve.png';

          const requesterEmailHtml = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; font-family: Arial, sans-serif;">
  <tr>
    <td align="center" style="padding: 48px 20px;">
      <div style="position: relative; display: inline-block;">
        <div style="position: absolute; bottom: 0; left: 0; width: 300px; height: 200px; background-image: url('${curveImageUrl}'); background-position: bottom left; background-repeat: no-repeat; background-size: contain; opacity: 0.2; z-index: 0; pointer-events: none;"></div>
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); position: relative; z-index: 1;">
        <!-- Logo Header -->
        <tr>
          <td style="background-color: #ffffff; padding: 32px 40px 24px 40px; text-align: center;">
            <img src="${logoUrl}" alt="New Millennium Building Systems" width="300" height="96" style="height: 96px; width: auto; max-width: 300px; display: block; margin: 0 auto; border: 0;" />
            <div style="font-size: 24px; font-weight: bold; color: #2d4660; margin-top: 16px;">Access Granted</div>
          </td>
        </tr>
        
        <!-- Main Content -->
        <tr>
          <td style="background-color: #ffffff; padding: 40px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #333;">Hello ${requesterName},</p>
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #333; line-height: 1.6;">Your access request has been approved! You have been granted <strong style="color: #2d4660;">${roleName}</strong> access to all voting sessions for <strong style="color: #2d4660;">${productName}</strong>.</p>
            
            <p style="margin: 24px 0; font-size: 16px; color: #333; line-height: 1.6;">You can now log in to the Feature Voting System to access your sessions.</p>
            
            <!-- Login Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
              <tr>
                <td align="center">
                  <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2d4660; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">Log In to Feature Voting System</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; position: relative;">
            <p style="margin: 0 0 8px 0;">This is an automated message from the Feature Voting System.</p>
            <p style="margin: 0; color: #9ca3af;">© ${new Date().getFullYear()} New Millennium Building Systems</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

          const requesterEmailText = `
Access Granted - Feature Voting System

Hello ${requesterName},

Your access request has been approved! You have been granted ${roleName} access to all voting sessions for ${productName}.

You can now log in to the Feature Voting System to access your sessions.

Login: ${loginUrl}

This is an automated message from the Feature Voting System.
          `;

          // Get all session admins for this product to send confirmation emails
          let adminEmails: string[] = [];
          try {
            const sessionAdmins = await db.getSessionAdminsForProduct(productId);
            adminEmails = Array.from(new Set(
              sessionAdmins
                .map(admin => admin.user?.email)
                .filter((email): email is string => !!email)
                .map(email => email.toLowerCase())
            ));
          } catch (err) {
            console.error('Error getting session admins for product:', err);
            // Fallback to current user email if available
            if (currentUser?.email) {
              adminEmails = [currentUser.email.toLowerCase()];
            }
          }
          
          const adminConfirmationHtml = adminEmails.length > 0 ? `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; font-family: Arial, sans-serif;">
  <tr>
    <td align="center" style="padding: 48px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
        <!-- Logo Header -->
        <tr>
          <td style="background-color: #ffffff; padding: 32px 40px 24px 40px; text-align: center;">
            <img src="${logoUrl}" alt="New Millennium Building Systems" width="300" height="96" style="height: 96px; width: auto; max-width: 300px; display: block; margin: 0 auto; border: 0;" />
            <div style="font-size: 24px; font-weight: bold; color: #2d4660; margin-top: 16px;">Access Granted Confirmation</div>
          </td>
        </tr>
        
        <!-- Main Content -->
        <tr>
          <td style="background-color: #ffffff; padding: 40px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #333;">Hello,</p>
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #333; line-height: 1.6;">You have successfully granted <strong style="color: #2d4660;">${roleName}</strong> access to <strong style="color: #2d4660;">${requesterName}</strong> (${email}) for all sessions in <strong style="color: #2d4660;">${productName}</strong>.</p>
            
            <!-- Status Box -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px; margin: 20px 0;">
              <tr>
                <td style="padding: 20px;">
                  <div style="margin: 10px 0;">
                    <strong style="color: #166534; font-size: 14px;">✓ Access Granted</strong>
                  </div>
                  <div style="margin: 10px 0; color: #166534; font-size: 13px;">
                    Role: <strong>${roleName}</strong>
                  </div>
                  <div style="margin: 10px 0; color: #166534; font-size: 13px;">
                    User: <strong>${requesterName}</strong> (${email})
                  </div>
                  <div style="margin: 10px 0; color: #166534; font-size: 13px;">
                    Product: <strong>${productName}</strong>
                  </div>
                  <div style="margin: 10px 0; color: #166534; font-size: 13px;">
                    Status: <strong>Email notification sent to requester</strong>
                  </div>
                </td>
              </tr>
            </table>

            <p style="margin: 24px 0; font-size: 16px; color: #333; line-height: 1.6;">The requester has been notified and can now access all voting sessions for this product.</p>
            
            <!-- Go to System Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
              <tr>
                <td align="center">
                  <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2d4660; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">Go to Feature Voting System</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 8px 0;">This is an automated message from the Feature Voting System.</p>
            <p style="margin: 0; color: #9ca3af;">© ${new Date().getFullYear()} New Millennium Building Systems</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>` : null;

          const adminConfirmationText = adminEmails.length > 0 ? `
Access Granted Confirmation - Feature Voting System

Hello,

You have successfully granted ${roleName} access to ${requesterName} (${email}) for all sessions in ${productName}.

Status: Access Granted
Role: ${roleName}
User: ${requesterName} (${email})
Product: ${productName}
Email notification sent to requester: Yes

The requester has been notified and can now access all voting sessions for this product.

Login: ${loginUrl}

This is an automated message from the Feature Voting System.
          ` : null;

          // Send both emails in parallel - requester and all admin confirmations
          const emailPromises = [
            sendInvitationEmail({
              to: email,
              subject: `Access Granted - ${productName} - Feature Voting System`,
              text: requesterEmailText,
              html: requesterEmailHtml
            })
          ];

          // Send confirmation email to all session admins for this product
          if (adminEmails.length > 0 && adminConfirmationHtml && adminConfirmationText) {
            adminEmails.forEach(adminEmail => {
              emailPromises.push(
                sendInvitationEmail({
                  to: adminEmail,
                  subject: `Access Granted: ${requesterName} - ${productName} - Feature Voting System`,
                  text: adminConfirmationText,
                  html: adminConfirmationHtml
                })
              );
            });
          }

          try {
            await Promise.all(emailPromises);
          } catch (emailError) {
            console.error('Error sending emails:', emailError);
            // Don't fail the whole operation if email fails
          }

          // Show success modal
          setGrantAccessSuccess({ roleName, productName, requesterName, requesterEmail: email });
          
          // Clean up URL
          navigate('/login', { replace: true });
        } catch (err: any) {
          console.error('Error granting access:', err);
          setError(err.message || 'Failed to grant access. Please try again.');
          navigate('/login', { replace: true });
        } finally {
          setIsLoading(false);
        }
      };

      grantAccess();
    }
  }, [searchParams, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    console.log('[LoginScreen] ⚡ handleLogin called!', { email, name });
    e.preventDefault();
    console.log('[LoginScreen] Form prevented default');
    setError('');
    setIsLoading(true);
    console.log('[LoginScreen] Set loading state');

    try {
      console.log('[LoginScreen] Starting login process...');
      // Get or create user
      console.log('[LoginScreen] Getting or creating user...');
      const user = await db.getOrCreateUser(email.trim().toLowerCase(), name.trim());
      console.log('[LoginScreen] User created/retrieved:', user);
      setCurrentUser(user);

      // Check if there's a session code in the URL
      const sessionCode = searchParams.get('session');
      if (sessionCode) {
        console.log('[LoginScreen] Session code found, loading session...');
        // Try to load the session by code
        const session = await db.getSessionByCode(sessionCode);
        if (session) {
          setCurrentSession(session);
          
          // Check if user is system admin, session admin, or stakeholder
          console.log('[LoginScreen] Checking user roles...');
          const [isSysAdmin, isAdmin, isStakeholder] = await Promise.all([
            db.isUserSystemAdmin(user.id),
            db.isUserSessionAdmin(session.id, user.id),
            db.isUserSessionStakeholder(session.id, user.email)
          ]);

          // System admins have full access to all sessions
          if (isSysAdmin || isAdmin) {
            navigate('/admin');
          } else if (isStakeholder) {
            navigate('/vote');
          } else {
            // User not authorized for this session
            setError('You are not authorized to access this voting session.');
            setIsLoading(false);
            return;
          }
        } else {
          setError('Invalid session code.');
          setIsLoading(false);
          return;
        }
      } else {
        // No session code, go to session list
        console.log('[LoginScreen] No session code, navigating to /sessions');
        navigate('/sessions');
      }
    } catch (err) {
      console.error('[LoginScreen] Login error:', err);
      setError(`Failed to log in: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`);
      setIsLoading(false);
    }
  };

  const handleAzureLogin = async () => {
    setError('');
    setIsLoading(true);
    
    try {
      // Get the basename from the current pathname or default to '/feature-voting-app'
      const basename = window.location.pathname.startsWith('/feature-voting-app') 
        ? '/feature-voting-app' 
        : '';
      
      // Construct the full redirect URL
      const redirectTo = `${window.location.origin}${basename}/sessions`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectTo,
          scopes: 'email openid profile User.ReadBasic.All',
          queryParams: {
            // Force the redirect_to parameter to be the production URL
            redirect_to: redirectTo
          }
        }
      });
      
      if (error) {
        setError('Failed to sign in with Azure AD. Please try again.');
        setIsLoading(false);
      }
      // If successful, user will be redirected to Azure, then back to /sessions
    } catch (err) {
      console.error('Azure login error:', err);
      setError('Failed to sign in with Azure AD. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white shadow-lg sm:rounded-lg overflow-hidden relative z-10">
          {/* Logo with gradient fade */}
          <div className="relative">
              <div className="px-10 pt-8 pb-6 text-center">
        <img
                  src={desktopLogo}
          alt="New Millennium Building Systems Logo"
          className="mx-auto h-24 w-auto"
        />
              </div>
            {/* Gradient overlay at bottom of logo section */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 1))'
              }}
            />
          </div>

          <div className="px-4 sm:px-10 pb-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-[#2d4660]">
          Feature Voting System
        </h2>
              <p className="mt-2 text-sm text-gray-600">
          Sign in to access your voting sessions
        </p>
      </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-lpignore="true"
                  data-form-type="other"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2d4660] focus:border-[#2d4660]"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-lpignore="true"
                  data-form-type="other"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#2d4660] focus:border-[#2d4660]"
                  placeholder="your.email@company.com"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#2d4660] hover:bg-[#1d3a53] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2d4660] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleAzureLogin}
              disabled={isLoading}
              className="microsoft-signin-button"
              style={{
                width: '100%',
                height: '41px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                paddingLeft: '12px',
                paddingRight: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }
              }}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#5E5E5E', marginRight: '12px' }}></div>
                  <span style={{ color: '#5E5E5E' }}>Signing in...</span>
                </>
              ) : (
                <>
                  <img 
                    src={microsoftLogo}
                    alt="Microsoft"
                    style={{ width: '21px', height: '21px', marginRight: '12px', flexShrink: 0 }}
                  />
                  <span style={{ color: '#5E5E5E', fontFamily: '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Roboto", "Helvetica Neue", Arial, sans-serif', fontSize: '15px', fontWeight: 600 }}>Sign in with Microsoft</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  No registration required
                </span>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-gray-500">
              <p>Simply enter your name and email to access</p>
              <p>voting sessions you've been invited to</p>
            </div>
            
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowRequestAccessModal(true)}
                className="w-full text-sm text-[#2d4660] hover:text-[#1d3a53] underline"
              >
                Request Access
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>
      
      <RequestAccessModal
        isOpen={showRequestAccessModal}
        onClose={React.useCallback(() => setShowRequestAccessModal(false), [])}
      />

      {/* Grant Access Success Modal */}
      {grantAccessSuccess && (
        <Modal
          isOpen={true}
          onClose={() => setGrantAccessSuccess(null)}
          title=""
          maxWidth="max-w-md"
          hideHeader={true}
          hideCloseButton={false}
        >
          <div className="text-center pb-6">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Granted Successfully!</h3>
            <p className="text-sm text-gray-600 mb-1">
              Successfully granted <span className="font-semibold text-green-700">{grantAccessSuccess.roleName}</span> access to
            </p>
            <p className="text-base font-semibold text-gray-900 mb-1">{grantAccessSuccess.requesterName}</p>
            <p className="text-xs text-gray-500 mb-3">{grantAccessSuccess.requesterEmail}</p>
            <p className="text-sm text-gray-600 mb-1">
              for all sessions in
            </p>
            <p className="text-lg font-semibold text-green-700 mb-4">{grantAccessSuccess.productName}</p>
            <p className="text-sm text-gray-600">
              Emails have been sent to both the requester and admin.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================
// REQUEST ACCESS MODAL
// ============================================

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RequestAccessModal = React.memo(function RequestAccessModal({ isOpen, onClose }: RequestAccessModalProps) {
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productDropdownRef = React.useRef<HTMLDivElement>(null);
  const hasLoadedProducts = React.useRef(false);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  // Load products when modal opens (only once)
  useEffect(() => {
    if (isOpen && !hasLoadedProducts.current) {
      const loadProducts = async () => {
        setIsLoadingProducts(true);
        try {
          const allProducts = await db.getProducts();
          setProducts(allProducts);
          hasLoadedProducts.current = true;
        } catch (error) {
          console.error('Error loading products:', error);
          setError('Failed to load products. Please try again.');
        } finally {
          setIsLoadingProducts(false);
        }
      };
      loadProducts();
    } else if (!isOpen) {
      // Reset form when modal closes
      setRequestName('');
      setRequestEmail('');
      setSelectedProductId('');
      setIsSubmitted(false);
      setError('');
      hasLoadedProducts.current = false;
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setProductDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRequestName(e.target.value);
  }, []);

  const handleEmailChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRequestEmail(e.target.value);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!requestName.trim()) {
      setError('Name is required');
      return;
    }
    if (!requestEmail.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get session admins for the selected product
      const admins = await db.getSessionAdminsForProduct(selectedProductId);
      
      if (admins.length === 0) {
        setError('No administrators found for this product. Please contact your system administrator.');
        setIsSubmitting(false);
        return;
      }

      const selectedProduct = products.find(p => p.id === selectedProductId);
      const productName = selectedProduct?.name || 'the selected product';

      // Get unique admin emails
      const adminEmails = Array.from(new Set(admins.map(admin => admin.user?.email).filter(Boolean) as string[]));

      // Include basename for GitHub Pages
      const basename = window.location.pathname.startsWith('/feature-voting-app') ? '/feature-voting-app' : '';
      const loginUrl = `${window.location.origin}${basename}/login`;

      // Generate secure tokens for grant access links
      const adminToken = await generateGrantAccessToken(requestEmail, selectedProductId, 'grant-admin');
      const stakeholderToken = await generateGrantAccessToken(requestEmail, selectedProductId, 'grant-stakeholder');
      
      // Get Supabase URL for Edge Function
      const supabaseUrl = (supabase as any).supabaseUrl;
      const grantAccessUrl = `${supabaseUrl}/functions/v1/grant-access`;

      // Create HTML email content with inline styles (matching EmailJS template format)
      // Using table-based layout for better email client compatibility
      // Use GitHub Pages URL for images to ensure they're accessible in emails
      const logoUrl = 'https://dcchoffman.github.io/feature-voting-app/New-Millennium-color-logo1.png';
      
      const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; font-family: Arial, sans-serif;">
  <tr>
    <td align="center" style="padding: 48px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
        <!-- Logo Header - Matching Login Page -->
        <tr>
          <td style="background-color: #ffffff; padding: 32px 40px 24px 40px; text-align: center;">
            <img src="${logoUrl}" alt="New Millennium Building Systems" width="300" height="96" style="height: 96px; width: auto; max-width: 300px; display: block; margin: 0 auto; border: 0;" />
            <div style="font-size: 20px; font-weight: bold; color: #2d4660; margin-top: 16px; margin-bottom: 4px;">Feature Voting System</div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">has a</div>
            <div style="font-size: 25px; font-weight: bold; color: #2d4660; margin-bottom: 2px;">Access Request Notification</div>
            <div style="font-size: 11px; color: #6b7280; margin-bottom: 2px;">for the</div>
            <div style="font-size: 30px; font-weight: bold; color: #2d4660; margin-bottom: 8px;">${productName}</div>
          </td>
        </tr>
        
        <!-- Main Content -->
        <tr>
          <td style="background-color: #ffffff; padding: 40px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #333;">Hello,</p>
            <p style="margin: 0 0 24px 0; font-size: 16px; color: #333;">A new access request has been submitted for <strong style="color: #2d4660;">${productName}</strong>.</p>
            
            <!-- User Details - Labels less prominent, values emphasized -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: white; border-left: 4px solid #2d4660; border-radius: 4px; margin: 20px 0;">
              <tr>
                <td style="padding: 20px;">
                  <div style="margin: 10px 0;">
                    <span style="font-weight: normal; color: #6b7280; font-size: 13px;">Requester Name:</span> <span style="color: #1f2937; font-weight: 600; font-size: 15px;">${requestName}</span>
                  </div>
                  <div style="margin: 10px 0;">
                    <span style="font-weight: normal; color: #6b7280; font-size: 13px;">Requester Email:</span> <span style="color: #1f2937; font-weight: 600; font-size: 15px;">${requestEmail}</span>
                  </div>
                  <div style="margin: 10px 0;">
                    <span style="font-weight: normal; color: #6b7280; font-size: 13px;">Product:</span> <span style="color: #1f2937; font-weight: 600; font-size: 15px;">${productName}</span>
                  </div>
                </td>
              </tr>
            </table>

            <p style="margin: 24px 0; font-size: 16px; color: #333; line-height: 1.6;">To grant access, click one of the buttons below.<br />Access will be granted <b>immediately</b> to all sessions for this product,<br /><b>and an email notification will be sent to the requester.</b></p>
            
            <!-- Action Buttons - Gold buttons for granting access (same size) -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
              <tr>
                <td width="50%" align="left" valign="top" style="padding-right: 10px;">
                  <a href="${loginUrl}?token=${adminToken}&action=grant-admin&email=${encodeURIComponent(requestEmail)}&product=${encodeURIComponent(selectedProductId)}" style="display: inline-block; padding: 12px 20px; background-color: #C89212; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); text-align: center; line-height: 1.5; width: 100%; max-width: 240px; min-width: 240px;">
                    Grant Access as<br /><span style="font-size: 18px; font-weight: 700;">Session Admin</span>
                  </a>
                </td>
                <td width="50%" align="right" valign="top" style="padding-left: 10px;">
                  <a href="${loginUrl}?token=${stakeholderToken}&action=grant-stakeholder&email=${encodeURIComponent(requestEmail)}&product=${encodeURIComponent(selectedProductId)}" style="display: inline-block; padding: 12px 20px; background-color: #C89212; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); text-align: center; line-height: 1.5; width: 100%; max-width: 240px; min-width: 240px;">
                    Grant Access as<br /><span style="font-size: 18px; font-weight: 700;">Stakeholder</span>
                  </a>
                </td>
              </tr>
            </table>
            
            <!-- Helpful Text -->
            <p style="margin: 24px 0 16px 0; font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
              Click either button above to quickly grant access,<br />or use the link below to manage sessions and users in the system.
            </p>
            
            <!-- Go to System Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
              <tr>
                <td align="center">
                  <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2d4660; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">Go to Feature Voting System</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 8px 0;">This is an automated message from the Feature Voting System.</p>
            <p style="margin: 0; color: #9ca3af;">© ${new Date().getFullYear()} New Millennium Building Systems</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

      const textContent = `
Access Request - Feature Voting System

Hello,

A new access request has been submitted for ${productName}.

Requester Name: ${requestName}
Requester Email: ${requestEmail}
Product: ${productName}

To grant access, please add this user as a stakeholder or admin to the relevant voting sessions for this product.

Login: ${loginUrl}

This is an automated message from the Feature Voting System.
      `;

      // Try to send email to all admins via Edge Function
      try {
        const emailPromises = adminEmails.map(adminEmail =>
          sendInvitationEmail({
            to: adminEmail,
            subject: `Access Request for ${productName} - Feature Voting System`,
            text: textContent,
            html: htmlContent
          })
        );
        await Promise.all(emailPromises);
        setIsSubmitted(true);
      } catch (emailError: any) {
        console.error('Email service failed:', emailError);
        // Show the actual error to help debug
        let errorMessage = 'Failed to send email through the system.';
        if (emailError instanceof Error) {
          errorMessage = emailError.message;
        } else if (emailError?.message) {
          errorMessage = emailError.message;
        } else if (typeof emailError === 'string') {
          errorMessage = emailError;
        }
        
        // Check for common Resend errors
        if (errorMessage.includes('validation_error') || errorMessage.includes('403')) {
          errorMessage = 'Domain verification required. Please verify your domain in Resend and update FROM_EMAIL in Supabase secrets.';
        }
        
        setError(`Failed to send access request: ${errorMessage}. Please check the Supabase Edge Function logs for details.`);
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.error('Error sending access request:', error);
      setError('Failed to send access request. Please try again or contact your administrator.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const productColors = selectedProduct ? getProductColor(selectedProduct.name, selectedProduct.color_hex ?? null) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSubmitted ? "" : "Request Access"}
      maxWidth="max-w-lg"
      hideHeader={isSubmitted}
    >
      {isSubmitted ? (
        <div className="text-center pb-6">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Thank You!</h3>
          <p className="text-sm text-gray-600 mb-2">
            Your access request has been sent to the administrators for
          </p>
          <p className="text-xl font-semibold text-[#2d4660] mb-4">
            {selectedProduct?.name}
          </p>
          <p className="text-sm text-gray-600">
            You will be notified once your access has been granted.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="requestName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              ref={nameInputRef}
              id="requestName"
              type="text"
              required
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              value={requestName}
              onChange={handleNameChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#2d4660] focus:border-[#2d4660]"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="requestEmail" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              ref={emailInputRef}
              id="requestEmail"
              type="email"
              required
              autoComplete="off"
              data-lpignore="true"
              data-form-type="other"
              value={requestEmail}
              onChange={handleEmailChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#2d4660] focus:border-[#2d4660]"
              placeholder="your.email@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product *
            </label>
            <div ref={productDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-[#2d4660] focus:border-[#2d4660]"
              >
                <div className="flex items-center gap-2">
                  {selectedProduct && productColors && (
                    <div
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ backgroundColor: productColors.background }}
                    />
                  )}
                  <span className={selectedProduct ? 'text-gray-900' : 'text-gray-400'}>
                    {selectedProduct ? selectedProduct.name : 'Select a product...'}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${productDropdownOpen ? 'transform rotate-180' : ''}`} />
              </button>

              {productDropdownOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
                  {isLoadingProducts ? (
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">Loading products...</div>
                  ) : products.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 text-center">No products available</div>
                  ) : (
                    products.map(product => {
                      const colors = getProductColor(product.name, product.color_hex ?? null);
                      const isSelected = selectedProductId === product.id;
                      return (
                        <div
                          key={product.id}
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setProductDropdownOpen(false);
                          }}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center gap-2 ${
                            isSelected ? 'bg-[#2d4660]/5' : ''
                          }`}
                        >
                          {colors && (
                            <div
                              className="w-4 h-4 rounded flex-shrink-0"
                              style={{ backgroundColor: colors.background }}
                            />
                          )}
                          <span className="text-sm text-gray-900">{product.name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting} className="flex items-center">
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
});