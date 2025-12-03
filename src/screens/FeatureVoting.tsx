// ============================================
// FeatureVoting.tsx - Feature Voting Screen
// ============================================
// Location: src/screens/FeatureVoting.tsx
// ============================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { 
  Plus, Edit, Trash2, X, ChevronLeft, BarChart2, Settings, 
  Vote, LogOut, Users, ChevronUp, ChevronDown, Calendar, Clock, 
  Shuffle, CheckCircle, AlertTriangle, AlertCircle, Tag, RefreshCw, 
  Cloud, Database, Search, Shield, List, Lightbulb, Crown, Image, Paperclip, Trophy, User as UserIcon, Minus, ArrowRightLeft, Bug, BookOpen, FlaskConical, CircleAlert, CheckSquare
} from "lucide-react";
import mobileLogo from '../assets/New-Millennium-Icon-gold-on-blue-rounded-square.svg';
import desktopLogo from '../assets/New-Millennium-color-logo.svg';

// Import services
import * as db from '../services/databaseService';
import * as azureService from '../services/azureDevOpsService';
import { getNewMillProjects } from '../utils/azureProjects';
import { formatDate, isPastDate } from '../utils/date';
import { sendInvitationEmail } from '../services/emailService';

// Import context
import { useSession } from '../contexts/SessionContext';

// Import types
import type { AzureDevOpsConfig, Feature, FeatureSuggestion, VoterInfo } from '../types/azure';

// Import screens
import AdminDashboard from '../screens/AdminDashboard';

// ============================================
// TYPES & INTERFACES
// ============================================

interface User {
  id: string;
  name: string;
  email: string;
  totalVotes: number;
  usedVotes: number;
  votesPerFeature: Record<string, number>;
}

interface VotingSession {
  title: string;
  goal: string;
  votesPerUser: number;
  useAutoVotes: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
  originalEndDate?: string | null;
  endedEarlyBy?: string | null;
  endedEarlyReason?: string | null;
  endedEarlyDetails?: string | null;
  reopenReason?: string | null;
  reopenDetails?: string | null;
  reopenedBy?: string | null;
  reopenedAt?: string | null;
  productId?: string | null;
  productName?: string | null;
  product_id?: string | null;
  product_name?: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const AVAILABLE_EPICS = [
  "User Experience",
  "Vendor Management",
  "Analytics & Reporting",
  "Operational Efficiency",
  "Compliance & Risk",
  "Mobile Access",
  "Integration",
  "Sustainability",
  "Budget Management"
];

const initialVotingSession: VotingSession = {
  title: "Q2 Product Roadmap",
  goal: "Prioritize features for the Purchasing Dashboard redesign",
  votesPerUser: 10,
  useAutoVotes: true,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true,
  originalEndDate: null,
  endedEarlyBy: null,
  endedEarlyReason: null,
  endedEarlyDetails: null,
  reopenReason: null,
  reopenDetails: null,
  reopenedBy: null,
  reopenedAt: null,
  productId: null,
  productName: null,
  product_id: null,
  product_name: null
};

const initialAzureDevOpsConfig: AzureDevOpsConfig = {
  organization: "newmill",
  project: "Product",
  enabled: false,
  workItemType: "Feature",
};

const initialUsers: User[] = [
  { 
    id: "u1", 
    name: "John Doe", 
    email: "john@example.com", 
    totalVotes: 10, 
    usedVotes: 0, 
    votesPerFeature: {} 
  },
  { 
    id: "u2", 
    name: "Jane Smith", 
    email: "jane@example.com", 
    totalVotes: 10, 
    usedVotes: 0, 
    votesPerFeature: {} 
  },
  { 
    id: "u3", 
    name: "Robert Johnson", 
    email: "robert@example.com", 
    totalVotes: 10, 
    usedVotes: 0, 
    votesPerFeature: {} 
  }
];

interface RoleBadgeInfo {
  label: string;
  className: string;
  icon: React.ReactNode;
}

const getRoleBadgeInfo = (
  isSystemAdmin: boolean,
  isSessionAdmin: boolean,
  isStakeholder: boolean
): RoleBadgeInfo | null => {
  if (isSystemAdmin) {
    return { 
      label: 'System Admin', 
      className: 'text-[#C89212]',
      icon: <Crown className="h-3.5 w-3.5" />
    };
  }
  if (isSessionAdmin) {
    return { 
      label: 'Session Admin', 
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

// Helper function to get badge info from currentRole (view mode)
const getRoleBadgeInfoFromCurrentRole = (
  currentRole: 'stakeholder' | 'session-admin' | 'system-admin'
): RoleBadgeInfo | null => {
  switch (currentRole) {
    case 'system-admin':
      return { 
        label: 'System Admin', 
        className: 'text-[#C89212]',
        icon: <Crown className="h-3.5 w-3.5" />
      };
    case 'session-admin':
      return { 
        label: 'Session Admin', 
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

// Helper function to get primary role based on actual user roles
const getPrimaryRole = (
  isSystemAdmin: boolean,
  isSessionAdmin: boolean,
  isStakeholder: boolean
): 'stakeholder' | 'session-admin' | 'system-admin' => {
  if (isSystemAdmin) return 'system-admin';
  if (isSessionAdmin) return 'session-admin';
  return 'stakeholder';
};

// Helper function to get role badge display with primary role and "viewing as" if different
const getRoleBadgeDisplay = (
  isSystemAdmin: boolean,
  isSessionAdmin: boolean,
  isStakeholder: boolean,
  currentRole: 'stakeholder' | 'session-admin' | 'system-admin'
): React.ReactNode => {
  const primaryRole = getPrimaryRole(isSystemAdmin, isSessionAdmin, isStakeholder);
  const primaryBadge = getRoleBadgeInfo(isSystemAdmin, isSessionAdmin, isStakeholder);
  
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

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getDaysRemaining = (dateString: string): number => {
  const targetDate = new Date(dateString);
  const currentDate = new Date();
  
  targetDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate.getTime() - currentDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getDeadlineColor = (daysRemaining: number): string => {
  if (daysRemaining <= 0) return 'text-[#591D0F]';
  if (daysRemaining <= 2) return 'text-[#6A4234]';
  if (daysRemaining <= 4) return 'text-[#C89212]';
  return 'text-[#1E5461]';
};

const getDeadlineBgColor = (daysRemaining: number): string => {
  if (daysRemaining <= 0) return 'bg-[#591D0F]/10';
  if (daysRemaining <= 2) return 'bg-[#6A4234]/10';
  if (daysRemaining <= 4) return 'bg-[#C89212]/10';
  return 'bg-[#1E5461]/10';
};

const getDeadlineBgColorSolid = (daysRemaining: number): string => {
  // Calculate solid color equivalent of 10% opacity over white
  if (daysRemaining <= 0) return 'bg-[#EEE8E7]'; // #591D0F/10 over white
  if (daysRemaining <= 2) return 'bg-[#F0ECEB]'; // #6A4234/10 over white
  if (daysRemaining <= 4) return 'bg-[#FAF4E7]'; // #C89212/10 over white
  return 'bg-[#E9EEEF]'; // #1E5461/10 over white
};

const isDateInRange = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  return start <= now && now <= end;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  return text.length > maxLength ? `${text.substring(0, maxLength - 3)}...` : text;
};

const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  
  let text = tmp.textContent || tmp.innerText || '';
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
};

const randomizeText = (text: string): string => {
  const arr = text.split('');
  for (let i = 0; i < 3; i++) {
    const j = Math.floor(Math.random() * arr.length);
    const k = Math.floor(Math.random() * arr.length);
    if (j !== k) {
      [arr[j], arr[k]] = [arr[k], arr[j]];
    }
  }
  return arr.join('');
};

// ============================================
// EXPORTS FOR USE IN OTHER COMPONENTS
// ============================================

export { 
  Button, 
  Modal, 
  EpicTag, 
  AzureDevOpsBadge, 
  ImageWithFallback, 
  FeatureForm, 
  AzureDevOpsForm,
  AlreadyVotedScreen,
  Footer,
  formatDate,
  getDaysRemaining,
  getDeadlineColor,
  isPastDate
};

// ============================================
// BASIC UI COMPONENTS
// ============================================

function ImageWithFallback({ 
  src, 
  alt, 
  style, 
  className, 
  ...rest 
}: React.ImgHTMLAttributes<HTMLImageElement> & { style?: React.CSSProperties }) {
  const [didError, setDidError] = useState(false);

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img 
          src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==" 
          alt="Error loading image" 
          {...rest} 
          data-original-url={src} 
        />
      </div>
    </div>
  ) : (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      style={style} 
      {...rest} 
      onError={() => setDidError(true)} 
    />
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold' | 'blue' | 'gray';
  children: React.ReactNode;
}

const Button = React.memo(function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses = "py-2 px-4 rounded-lg flex items-center transition-colors cursor-pointer";
  
  const variantClasses = {
    primary: "bg-[#2d4660] text-white hover:bg-[#173B65]",
    secondary: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-[#591D0F] text-white hover:bg-[#492434]",
    gold: "bg-[#C89212] text-white hover:bg-[#E0A814]",
    blue: "bg-[#173B65] text-white hover:bg-[#1D2C49]",
    gray: "bg-[#576C71] text-white hover:bg-[#1E5461]"
  };
  
  const disabledClasses = "opacity-60 cursor-not-allowed";
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  hideCloseButton?: boolean;
  hideHeader?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = "max-w-2xl", hideCloseButton = false, hideHeader = false }) => {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save the current scroll position
      const scrollY = window.scrollY;
      // Prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scrolling when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen p-4 text-center pt-8 sm:pt-16">
        {/* Always show backdrop for lightbox effect */}
        <div 
          className="fixed inset-0 transition-opacity bg-black/50"
          onClick={hideCloseButton ? undefined : onClose}
          aria-hidden="true"
        ></div>
        
        <div className={`inline-block w-full ${maxWidth} ${hideHeader ? 'p-6' : 'p-6'} mb-8 overflow-visible text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative z-10`}>
          {!hideHeader ? (
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3 bg-[#FFF7E2] border border-[#C89212]/40 rounded-xl px-6 py-3 shadow-sm w-full mr-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#C89212]/15 text-[#C89212]">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#2d4660] tracking-tight">{title}</h3>
                  <p className="text-xs text-[#8A6D3B] font-medium mt-1 uppercase tracking-widest">
                    Spark the roadmap with your ideas
                  </p>
                </div>
              </div>
              {!hideCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-3 text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          ) : (
            // Show only close button when header is hidden (unless hideCloseButton is true)
            !hideCloseButton && (
              <div className="flex justify-end -mt-2 -mr-2">
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )
          )}
          
          <div className={hideHeader ? "-mt-4" : "mt-2 overflow-visible"}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

interface EpicTagProps {
  name: string;
  epicId?: string | number | null;
  description?: string | null;
  truncateAt?: number | null;
  className?: string;
}

const EpicTag = React.memo(function EpicTag({ name, epicId, description, truncateAt = null, className }: EpicTagProps) {
  if (!name) return null;
  
  const displayName = truncateAt === null ? name : truncateText(name, truncateAt);
  const combinedClassName = ['flex items-center text-xs text-gray-600', className].filter(Boolean).join(' ');
  const hasTooltip = description; // Only show tooltip if there's a description

  return (
    <div className={`${combinedClassName} relative group/epic`}>
      <div className="flex items-start gap-1.5 min-w-0">
        <Crown className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(51, 153, 71, 0.6)' }} />
        <span className="font-normal leading-tight break-words min-w-0 text-gray-600">
          {displayName}
          {epicId && <span className="text-gray-500 ml-1">#{epicId}</span>}
        </span>
      </div>
      {hasTooltip && (
        <div className="absolute left-0 bottom-full mb-2 opacity-0 group-hover/epic:opacity-100 transition-opacity z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none">
          <div className="font-semibold mb-1">{name}</div>
          {description && (
            <div className="text-gray-300 mt-2 line-clamp-4">
              {description.replace(/<[^>]*>/g, '').trim()}
            </div>
          )}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
});

// Helper function to get Azure DevOps work item type icon and color
function getWorkItemTypeIcon(workItemType: string | undefined): { icon: React.ComponentType<any>; color: string } | null {
  if (!workItemType) return null;
  
  const type = workItemType.toLowerCase();
  
  // Azure DevOps standard icons and colors
  if (type === 'epic') {
    return { icon: Crown, color: 'rgb(51, 153, 71)' }; // Green
  } else if (type === 'feature') {
    return { icon: Trophy, color: 'rgb(119, 59, 147)' }; // Purple
  } else if (type === 'user story' || type === 'story') {
    return { icon: BookOpen, color: '#007acc' }; // Blue
  } else if (type === 'bug') {
    return { icon: Bug, color: '#cc293d' }; // Red
  } else if (type === 'task') {
    return { icon: CheckSquare, color: '#007acc' }; // Blue
  } else if (type === 'change request') {
    return { icon: ArrowRightLeft, color: '#ff8c00' }; // Orange
  } else if (type === 'test case' || type === 'test') {
    return { icon: FlaskConical, color: '#007acc' }; // Blue
  } else if (type === 'issue') {
    return { icon: CircleAlert, color: '#cc293d' }; // Red
  }
  
  return null;
}

interface AzureDevOpsBadgeProps {
  id: string;
  url: string;
  workItemType?: string;
}

const AzureDevOpsBadge = React.memo(function AzureDevOpsBadge({ id, url, workItemType }: AzureDevOpsBadgeProps) {
  if (!id) return null;
  
  const typeInfo = getWorkItemTypeIcon(workItemType);
  const IconComponent = typeInfo?.icon || Database;
  const iconColor = typeInfo?.color || '#007acc';
  
  // Convert RGB color to RGBA for opacity, or use hex with opacity
  const getRgbaColor = (color: string, opacity: number): string => {
    // If it's already in rgb format, convert to rgba
    if (color.startsWith('rgb(')) {
      const rgb = color.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
      }
    }
    // If it's hex, convert to rgba
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };
  
  const bgColor = typeInfo ? getRgbaColor(iconColor, 0.2) : 'rgb(219, 234, 254)';
  const borderColor = typeInfo ? getRgbaColor(iconColor, 0.6) : 'rgb(147, 197, 254)';
  const hoverBgColor = typeInfo ? getRgbaColor(iconColor, 0.3) : 'rgb(191, 219, 254)';
  const hoverBorderColor = typeInfo ? getRgbaColor(iconColor, 0.8) : 'rgb(147, 197, 254)';
  
  return (
    <a 
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md text-xs font-semibold border-2 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200`}
      style={{ 
        backgroundColor: bgColor, 
        color: iconColor,
        borderColor: borderColor
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBgColor;
        e.currentTarget.style.borderColor = hoverBorderColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = bgColor;
        e.currentTarget.style.borderColor = borderColor;
      }}
      title="View in Azure DevOps"
    >
      <IconComponent className="h-3.5 w-3.5 flex-shrink-0" style={typeInfo ? { color: iconColor } : {}} />
      <span className="font-mono">#{id}</span>
    </a>
  );
});

interface DeadlineDisplayProps {
  endDate: string;
}

const DeadlineDisplay = React.memo(function DeadlineDisplay({ endDate }: DeadlineDisplayProps) {
  const daysRemaining = getDaysRemaining(endDate);
  const deadlineColor = getDeadlineColor(daysRemaining);
  const deadlineBgColor = getDeadlineBgColor(daysRemaining);
  
  return (
    <div className={`${deadlineBgColor} rounded-md p-3 border ${
      daysRemaining <= 2 ? 'border-[#6A4234]/20' : 
      daysRemaining <= 4 ? 'border-[#C89212]/20' : 
      'border-[#1E5461]/20'
    }`}>
      <div className="flex items-center">
        <Calendar className={`h-5 w-5 mr-2 ${deadlineColor}`} />
        <div>
          <span className={`font-medium ${deadlineColor}`}>
            Voting ends: {formatDate(endDate)}
          </span>
          <div className="text-sm mt-1">
            {daysRemaining <= 0 ? (
              <span className="text-red-600 font-medium">Voting ends today!</span>
            ) : (
              <span className={`${deadlineColor}`}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

interface ShuffleButtonProps {
  isShuffling: boolean;
  onShuffle: () => void;
}

function ShuffleButton({ isShuffling, onShuffle }: ShuffleButtonProps) {
  const [displayText, setDisplayText] = useState('Shuffle Features');
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isShuffling) {
      intervalRef.current = window.setInterval(() => {
        setDisplayText(randomizeText('Shuffle Features'));
      }, 100);
    } else {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        setDisplayText('Shuffle Features');
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isShuffling]);

  return (
    <button
      onClick={onShuffle}
      className={`py-2 px-4 rounded-lg flex items-center justify-center transition-all duration-300 w-full md:w-auto ${
        isShuffling 
          ? 'bg-[#C89212] text-white scale-95' 
          : 'bg-[#C89212] hover:bg-[#A67810] text-white hover:scale-105'
      }`}
      disabled={isShuffling}
    >
      <span className={`transition-transform duration-500 ${isShuffling ? "mr-2 animate-spin" : "mr-2"}`}>
        <Shuffle className="h-4 w-4" />
      </span>
      <span className="font-medium tracking-wide whitespace-nowrap">{displayText}</span>
    </button>
  );
}

interface ConfirmDialogProps {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'delete' | 'reset';
}

const ConfirmDialog = React.memo(function ConfirmDialog({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "delete"
}: ConfirmDialogProps) {
  if (!show) return null;
  
  const bgColor = type === "delete" ? "bg-[#591D0F]/10" : "bg-[#C89212]/10";
  const iconColor = type === "delete" ? "text-[#591D0F]" : "text-[#C89212]";
  const buttonColor = type === "delete" ? "bg-[#591D0F] hover:bg-[#492434]" : "bg-[#C89212] hover:bg-[#A67810]";
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden">
        <div className={`${bgColor} p-4 flex items-start space-x-4`}>
          <div className={iconColor}>
            {type === "delete" ? (
              <Trash2 className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
        
        <div className="p-4 bg-white space-y-4">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onCancel();
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${buttonColor} cursor-pointer`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

interface FeatureCardProps {
  feature: Feature;
  userVoteCount?: number;
  remainingVotes?: number;
  votingIsActive?: boolean;
  onVote?: (featureId: string, increment: boolean) => void;
  isShuffling?: boolean;
  shuffleStage?: 'idle' | 'fadeOut' | 'rearranging' | 'fadeIn';
  currentUser?: any;
  onRequestInfo?: (featureId: string) => void;
}

const FeatureCard = React.memo(function FeatureCard({
  feature,
  userVoteCount = 0,
  remainingVotes = 0,
  votingIsActive = false,
  onVote,
  isShuffling = false,
  shuffleStage = 'idle',
  currentUser,
  onRequestInfo
}: FeatureCardProps) {
  const [infoRequested, setInfoRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestClick = async () => {
    if (!onRequestInfo || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onRequestInfo(feature.id);
      setInfoRequested(true);
    } catch (error) {
      console.error('Error requesting info:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShuffleClasses = () => {
    switch (shuffleStage) {
      case 'fadeOut':
        return 'opacity-0 scale-95 blur-sm';
      case 'rearranging':
        return 'opacity-0 scale-90';
      case 'fadeIn':
        return 'opacity-100 scale-100 blur-0';
      default:
        return 'opacity-100 scale-100 blur-0';
    }
  };

  return (
    <div 
      className={`relative z-10 bg-white rounded-lg shadow-md overflow-hidden transition-all duration-400 ease-in-out ${
        userVoteCount > 0 ? 'border-2 border-[#1E5461]' : ''
      } ${getShuffleClasses()}`}
    >
      <div className="p-6 flex flex-col h-full">
        <h3 className="text-lg font-semibold mb-2 text-[#2d4660]">{feature.title}</h3>

        <div className="flex items-center justify-between mb-4">
          {feature.areaPath && (
            <span className="text-sm text-gray-600">
              {feature.areaPath}
            </span>
          )}
          {feature.azureDevOpsId && (
            <div className="mt-2">
              <AzureDevOpsBadge 
                id={feature.azureDevOpsId} 
                url={feature.azureDevOpsUrl || ''} 
                workItemType={feature.workItemType}
              />
            </div>
          )}
        </div>

        {feature.description ? (
          <p className="text-gray-600 mb-4 flex-grow">{feature.description}</p>
        ) : (
          <div className="mb-4 flex-grow">
            <p className="text-gray-400 italic mb-3">No description provided</p>
            {currentUser && onRequestInfo && (
              <div className="transition-all duration-300">
                {!infoRequested ? (
                  <button
                    onClick={handleRequestClick}
                    disabled={isSubmitting}
                    className="text-sm px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#2d4660] rounded-md font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{isSubmitting ? 'Sending...' : 'Ask Product Owner for more info'}</span>
                  </button>
                ) : (
                  <div className="text-sm px-3 py-2 bg-green-50 text-green-700 rounded-md font-medium flex items-center animate-fadeIn">
                    <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Thank you! Your request has been sent.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {onVote && (
          <div className="mt-auto pt-3">
            <div
              className={`flex items-center mb-3 gap-2 ${
                feature.epic ? 'justify-between' : 'justify-end'
              }`}
            >
              {feature.epic && feature.epic.trim() && (
                <EpicTag
                  name={feature.epic}
                  epicId={feature.epicId}
                  truncateAt={null}
                  className="text-sm bg-gray-100 px-2 py-1 rounded-md"
                />
              )}
              <div className="flex items-center space-x-2">
                {userVoteCount === 0 ? (
                  <button
                    onClick={() => onVote(feature.id, true)}
                    className={`px-6 py-2.5 rounded-lg text-base font-semibold cursor-pointer transition-colors flex items-center ${
                      votingIsActive && remainingVotes > 0
                        ? 'bg-[#2d4660] text-white hover:bg-[#C89212]'
                        : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    }`}
                    disabled={!votingIsActive || remainingVotes <= 0}
                  >
                    <Vote className="h-6 w-6 mr-2" />
                    Vote
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onVote(feature.id, false)}
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer transition-colors"
                      aria-label="Remove vote"
                      disabled={!votingIsActive}
                    >
                      <Minus className="h-6 w-6" />
                    </button>
                    <span className="px-4 py-2 bg-[#1E5461]/10 text-[#1E5461] rounded-full font-semibold text-base min-w-[3rem] text-center">
                      {userVoteCount}
                    </span>
                    <button
                      onClick={() => onVote(feature.id, true)}
                      className={`p-2 rounded-full cursor-pointer transition-colors ${
                        votingIsActive && remainingVotes > 0 
                          ? 'bg-[#2d4660]/10 hover:bg-[#C89212]/30 text-[#2d4660]' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      disabled={!votingIsActive || remainingVotes <= 0}
                      aria-label="Add vote"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

interface VotersListModalProps {
  feature: Feature;
  onClose: () => void;
}

function VotersListModal({ feature, onClose }: VotersListModalProps) {
  // Prevent body scrolling when modal is open
  useEffect(() => {
    // Save the current scroll position
    const scrollY = window.scrollY;
    // Prevent scrolling
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore scrolling when modal closes
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative z-10 bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-[#2d4660]">Voters for "{feature.title}"</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {feature.voters.length === 0 ? (
          <p className="text-gray-500">No votes yet</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {feature.voters.map(voter => (
              <li key={voter.userId} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{voter.name}</p>
                  <p className="text-sm text-gray-500">{voter.email}</p>
                </div>
                <div className="bg-[#2d4660]/10 text-[#2d4660] rounded-full px-3 py-1">
                  {voter.voteCount} {voter.voteCount === 1 ? 'vote' : 'votes'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface ResultsScreenProps {
  features: Feature[];
  onResetVotes: (id: string) => void;
  onResetAllVotes: () => void;
  onBack: () => void;
  showVotersList: string | null;
  setShowVotersList: (id: string | null) => void;
  votingSession: VotingSession;
  effectiveVotesPerUser: number;
  onLogout: () => void;
  currentUser?: any;
  isSystemAdmin: boolean;
  isSessionAdmin: boolean;
  isStakeholder: boolean;
  currentRole?: 'stakeholder' | 'session-admin' | 'system-admin';
}

function ResultsScreen({ 
  features, 
  onResetVotes,
  onResetAllVotes,
  onBack,
  showVotersList,
  setShowVotersList,
  votingSession,
  effectiveVotesPerUser,
  onLogout,
  currentUser,
  isSystemAdmin,
  isSessionAdmin,
  isStakeholder,
  currentRole = isSystemAdmin ? 'system-admin' : isSessionAdmin ? 'session-admin' : 'stakeholder'
}: ResultsScreenProps) {
  const navigate = useNavigate();
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

  const sortedFeatures = useMemo(() => {
    return [...features].sort((a, b) => b.votes - a.votes);
  }, [features]);
  
  const chartData = useMemo(() => {
    return sortedFeatures.slice(0, 10).map(feature => ({
      name: feature.title,
      votes: feature.votes,
      id: feature.id
    }));
  }, [sortedFeatures]);

  const daysRemaining = getDaysRemaining(votingSession.endDate);
  const deadlineColor = getDeadlineColor(daysRemaining);

  return (
    <div className="container mx-auto p-4 max-w-6xl pb-8">
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
      
      {/* Title with user info - mobile menu in same row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {/* Mobile: small logo next to title */}
          <ImageWithFallback
            src={mobileLogo}
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden cursor-pointer hover:opacity-80 transition-opacity"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
            onClick={() => navigate('/sessions')}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">
              {isPastDate(votingSession.endDate) ? 'Final Voting Results' : 'Current Voting Results'}
            </h1>
            {currentUser && (
              <p className="text-sm text-gray-600 mt-1">
                {currentUser.name}
                {getRoleBadgeDisplay(isSystemAdmin, isSessionAdmin, isStakeholder, currentRole)}
              </p>
            )}
          </div>
        </div>
        <div ref={mobileMenuRef} className="relative z-40">
          {/* Desktop buttons */}
          <div className="hidden md:flex space-x-2">
            <Button 
              variant="primary"
              onClick={onBack}
              className="flex items-center"
            >
              <Settings className="mr-2 h-4 w-4" />
              Admin Dashboard
            </Button>
            <Button 
              variant="danger"
              onClick={onResetAllVotes}
            >
              Reset All Votes
            </Button>
            <button 
              onClick={onLogout}
              className={`flex items-center justify-center bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ${
                currentRole === 'stakeholder' ? 'px-4 py-2' : 'p-2 w-10 h-10'
              }`}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              {currentRole === 'stakeholder' && <span className="ml-2">Logout</span>}
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
                  onClick={() => { setMobileMenuOpen(false); onBack(); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 mr-2 text-gray-700" />
                  Admin Dashboard
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onResetAllVotes(); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50 text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset All Votes
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className={`w-full px-3 py-2 flex items-center hover:bg-gray-50 ${
                    currentRole === 'stakeholder' ? 'text-left' : 'justify-center'
                  }`}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4 text-gray-700" />
                  {currentRole === 'stakeholder' && <span className="ml-2 text-base text-gray-700">Logout</span>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#2D4660]">
              Current Session: {votingSession.product_name && <span className="text-[#1E5461]">{votingSession.product_name} - </span>}<span className="text-[#1E5461]">{votingSession.title}</span>
            </h2>
          </div>
          {votingSession.isActive && (
            <div className={`${getDeadlineBgColor(daysRemaining)} relative z-10 rounded-md p-3 inline-block border ${daysRemaining <= 2 ? 'border-[#6A4234]/20' : daysRemaining <= 4 ? 'border-[#C89212]/20' : 'border-[#1E5461]/20'}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center">
                  <Calendar className={`h-4 w-4 mr-2 ${deadlineColor}`} />
                  <span className={`${deadlineColor} font-medium`}>
                    {daysRemaining <= 0 
                      ? "Voting ends today!" 
                      : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining until ${formatDate(votingSession.endDate)}`
                    }
                  </span>
                </div>
                <span className={`${deadlineColor} font-medium`}>Voting Active</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-600 mb-4">
          <span>Votes per user: {effectiveVotesPerUser}</span>
        </div>
        
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="votes" fill="#3B82F6">
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2d4660' : '#4f6d8e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="relative z-10 bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-semibold mb-4 text-[#2d4660]">Feature Details</h2>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th scope="col" className="w-1/2 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Epic</th>
                <th scope="col" className="w-14 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                <th scope="col" className="hidden md:table-cell w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voters</th>
                <th scope="col" className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedFeatures.map((feature, index) => (
                <tr key={feature.id} className="align-top group">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">{index + 1}</td>
                  <td className="px-4 py-4 whitespace-normal break-words text-sm font-medium">
                    {feature.title}
                  </td>
                  <td className={`hidden sm:table-cell px-4 py-4 text-sm ${feature.epic || (feature.workItemType && feature.workItemType.toLowerCase() === 'epic') ? 'w-64' : 'w-32'}`}>
                    {feature.workItemType && feature.workItemType.toLowerCase() === 'epic' ? (
                      <span className="text-xs text-gray-600 italic">This Work Item is an Epic</span>
                    ) : feature.epic ? (
                      <EpicTag 
                        name={feature.epic} 
                        epicId={feature.epicId}
                        description={feature.description}
                      />
                    ) : null}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{feature.votes}</td>
                  <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setShowVotersList(feature.id)}
                      className="text-[#2d4660] hover:text-[#C89212] flex items-center cursor-pointer"
                      disabled={feature.voters.length === 0}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {feature.voters.length} {feature.voters.length === 1 ? 'user' : 'users'}
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onResetVotes(feature.id)}
                      className="text-[#591D0F] hover:text-[#492434] cursor-pointer"
                      disabled={feature.votes === 0}
                    >
                      Reset Votes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showVotersList && (
        <VotersListModal
          feature={features.find(f => f.id === showVotersList) as Feature}
          onClose={() => setShowVotersList(null)}
        />
      )}
    </div>
  );
}

interface ThankYouScreenProps {
  navigate: any;
  votingSession: VotingSession;
}

function ThankYouScreen({ navigate, votingSession }: ThankYouScreenProps) {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] p-6">
      <div className="relative z-10 w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
        <img
          src={desktopLogo}
          alt="New Millennium Building Systems Logo"
          className="mx-auto mb-6"
          style={{ maxWidth: '200px', height: 'auto' }}
        />
        
        <div className="w-20 h-20 bg-[#1E5461]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-12 w-12 text-[#1E5461]" />
        </div>
        
        <h1 className="text-3xl font-bold text-[#1E5461] mb-4">Thank You!</h1>
        
        <p className="text-gray-700 text-lg mb-6">
          Your votes for <span className="font-semibold">{votingSession.title}</span> have been submitted successfully.
        </p>
        
        <p className="text-gray-600 mb-8">
          We appreciate your input in helping prioritize features for our product roadmap.
        </p>
        
        <Button variant="primary" onClick={() => navigate('/sessions')} className="mx-auto">
          View All Voting Sessions
        </Button>
      </div>
    </div>
  );
}

// ============================================
// FOOTER COMPONENT
// ============================================

interface FooterProps {
  currentRole?: 'stakeholder' | 'session-admin' | 'system-admin';
  onSelectStakeholder?: () => void;
  onSelectSessionAdmin?: () => void;
  onSelectSystemAdmin?: () => void;
  showRoleToggle?: boolean;
}

function Footer({
  currentRole = 'stakeholder',
  onSelectStakeholder,
  onSelectSessionAdmin,
  onSelectSystemAdmin,
  showRoleToggle = true
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const roleButtons: Array<{
    key: 'stakeholder' | 'session-admin' | 'system-admin';
    label: string;
    icon: React.ReactNode;
    onClick?: () => void;
  }> = [];

  // Always include Stakeholder View button
  roleButtons.push({
    key: 'stakeholder',
    label: 'Stakeholder View',
    icon: <Users className="h-4 w-4 inline mr-2" />,
    onClick: onSelectStakeholder
  });

  if (onSelectSessionAdmin || currentRole === 'session-admin') {
    roleButtons.push({
      key: 'session-admin',
      label: 'Session Admin',
      icon: <Shield className="h-4 w-4 inline mr-2" />,
      onClick: onSelectSessionAdmin
    });
  }

  if (onSelectSystemAdmin || currentRole === 'system-admin') {
    roleButtons.push({
      key: 'system-admin',
      label: 'System Admin',
      icon: <Crown className="h-4 w-4 inline mr-2" />,
      onClick: onSelectSystemAdmin
    });
  }

  // Ensure buttons are in the correct order: Stakeholder (if present), Session Admin, System Admin (rightmost)
  const buttonOrder: Array<'stakeholder' | 'session-admin' | 'system-admin'> = ['stakeholder', 'session-admin', 'system-admin'];
  roleButtons.sort((a, b) => {
    const aIndex = buttonOrder.indexOf(a.key);
    const bIndex = buttonOrder.indexOf(b.key);
    return aIndex - bIndex;
  });

  const hasToggle = showRoleToggle && roleButtons.length > 0;
  
  return (
    <footer className="mt-auto bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {hasToggle && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
              {roleButtons.map(({ key, label, icon, onClick }) => {
                const isActive = currentRole === key;
                const isDisabled = !onClick;

                return (
                  <button
                    key={key}
                    onClick={onClick}
                    disabled={isDisabled}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                      isActive
                        ? 'bg-white text-[#2d4660] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    } ${isDisabled && !isActive ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
          {/* Company Info */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">New Millennium Building Systems</h3>
            <p className="text-xs leading-relaxed">
              A Steel Dynamics Company<br />
              Innovation in structural steel manufacturing
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Quick Links</h3>
            <ul className="space-y-1 text-xs">
              <li>
                <a href="https://www.steeldynamics.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#2d4660] transition-colors">
                  Steel Dynamics Inc.
                </a>
              </li>
              <li>
                <a href="https://www.newmill.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#2d4660] transition-colors">
                  New Millennium
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-xs">
              Contact your Product Owner or session administrator for assistance with voting.
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          <p>&copy; {currentYear} New Millennium Building Systems, LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// FORM COMPONENTS
// ============================================

interface AzureDevOpsFormProps {
  config: AzureDevOpsConfig;
  onUpdate: (config: AzureDevOpsConfig) => void;
  onPreview: () => Promise<void>;
  onCancel: () => void;
  isFetching: boolean;
  error: string | null;
  onInitiateOAuth: (action?: 'preview' | 'sync') => void;
  availableStates: string[];
  availableAreaPaths: string[];
  availableTags: string[];
}

function AzureDevOpsForm({
  config,
  onUpdate,
  onPreview,
  onCancel,
  isFetching,
  error,
  onInitiateOAuth,
  availableStates,
  availableAreaPaths,
  availableTags
}: AzureDevOpsFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const projectOptions = useMemo(() => getNewMillProjects(), []);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      organization: config.organization || 'newmill',
      project: config.project || (projectOptions.length > 0 ? projectOptions[0] : 'Product'),
      workItemType: config.workItemType || 'Feature',
      quickFilter: config.query ? 'custom' : 'all',
      query: config.query || '',
      states: config.states || [],
      areaPath: config.areaPath || '',
      tags: config.tags || []
    }
  });
  
  const isAuthenticated = config.accessToken && config.enabled;
  
  const onFormSubmit = async (data: any) => {
    let finalQuery = undefined;
    const queryParts: string[] = [];
    
    if (data.states && data.states.length > 0) {
      if (data.states.length === 1) {
        queryParts.push(`[System.State] = '${data.states[0]}'`);
      } else {
        const statesList = data.states.map((s: string) => `'${s}'`).join(', ');
        queryParts.push(`[System.State] IN (${statesList})`);
      }
    }
    
    if (data.areaPath) {
      queryParts.push(`[System.AreaPath] UNDER '${data.areaPath}'`);
    }
    
    if (data.tags && data.tags.length > 0) {
      const tagFilters = data.tags.map((tag: string) => 
        `[System.Tags] CONTAINS '${tag}'`
      );
      queryParts.push(`(${tagFilters.join(' OR ')})`);
    }
    
    if (showAdvanced && data.query) {
      queryParts.push(`(${data.query})`);
    }
    
    if (queryParts.length > 0) {
      finalQuery = queryParts.join(' AND ');
    }
    
    const updatedConfig = {
      ...config,
      organization: data.organization,
      project: data.project,
      workItemType: data.workItemType,
      query: finalQuery,
      states: data.states && data.states.length > 0 ? data.states : undefined,
      areaPath: data.areaPath || undefined,
      tags: data.tags && data.tags.length > 0 ? data.tags : undefined
    };
    
    onUpdate(updatedConfig);
    
    if (isAuthenticated) {
      await onPreview();
    } else {
      onInitiateOAuth('preview');
    }
  };
  
  return (
    <form 
      onSubmit={handleSubmit(onFormSubmit)}
      className="bg-blue-50 p-4 rounded-lg mb-6"
    >
      <h3 className="text-lg font-medium mb-4 text-[#2d4660] flex items-center">
        <Cloud className="h-5 w-5 mr-2" />
        Azure DevOps Configuration
      </h3>
      
      {isAuthenticated && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center text-green-700">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">Authenticated with Azure DevOps</span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
          <input
            {...register('organization', { required: 'Organization name is required' })}
            placeholder="your-organization"
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
            readOnly
          />
          {errors.organization && <p className="mt-1 text-sm text-red-600">{errors.organization.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <select
            {...register('project', { required: 'Project name is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
          >
            {projectOptions.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          {errors.project && <p className="mt-1 text-sm text-red-600">{errors.project.message}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Item Type</label>
          <select
            {...register('workItemType', { required: 'Work Item Type is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
          >
            <option value="Feature">Feature</option>
            <option value="User Story">User Story</option>
            <option value="Product Backlog Item">Product Backlog Item</option>
            <option value="Epic">Epic</option>
            <option value="Issue">Issue</option>
          </select>
          {errors.workItemType && <p className="mt-1 text-sm text-red-600">{errors.workItemType.message}</p>}
        </div>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Filters
            </label>
            <button 
              type="button" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {showAdvanced ? '← Hide Advanced' : 'Show Advanced WIQL →'}
            </button>
          </div>
          
          {isAuthenticated && (availableStates.length > 0 || availableAreaPaths.length > 0 || availableTags.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              {availableStates.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    State (Optional)
                  </label>
                  <select
                    {...register('states')}
                    multiple
                    size={4}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-white"
                  >
                    {availableStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Hold Ctrl/Cmd for multiple
                  </p>
                </div>
              )}
              
              {availableAreaPaths.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Area Path (Optional)
                  </label>
                  <select
                    {...register('areaPath')}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-white"
                  >
                    <option value="">All areas</option>
                    {availableAreaPaths.map(path => (
                      <option key={path} value={path}>{path}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Includes sub-areas
                  </p>
                </div>
              )}
              
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tags (Optional)
                  </label>
                  <select
                    {...register('tags')}
                    multiple
                    size={4}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md bg-white"
                  >
                    {availableTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Hold Ctrl/Cmd for multiple
                  </p>
                </div>
              )}
            </div>
          )}
          
          {showAdvanced && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Advanced WIQL Query (Optional)
              </label>
              <input
                {...register('query')}
                placeholder="e.g., [System.Priority] = 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Will be combined with above filters using AND.{' '}
                <a 
                  href="https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  WIQL syntax reference ↗
                </a>
              </p>
            </div>
          )}
          
          {!isAuthenticated && (
            <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600 border border-gray-200">
              Filter options will appear after connecting to Azure DevOps
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          <p className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </p>
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <Button 
          variant="secondary" 
          onClick={onCancel} 
          disabled={isFetching}
        >
          Cancel
        </Button>
        <Button 
          variant="primary"
          type="submit" 
          disabled={isFetching}
          className="flex items-center"
        >
          {isFetching && <RefreshCw className="animate-spin h-4 w-4 mr-2" />}
          {isFetching ? 'Connecting...' : isAuthenticated ? 'Preview Features' : 'Connect with Azure DevOps'}
        </Button>
      </div>
    </form>
  );
}

interface FeatureFormProps {
  feature?: Feature;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

function FeatureForm({ feature, onSubmit, onCancel }: FeatureFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: feature ? {
      title: feature.title,
      description: feature.description,
      epic: feature.epic
    } : {
      epic: AVAILABLE_EPICS[0]
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          {...register('title', { required: 'Title is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description', { required: 'Description is required' })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Epic</label>
        <select
          {...register('epic', { required: 'Epic is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
        >
          {AVAILABLE_EPICS.map(epic => (
            <option key={epic} value={epic}>{epic}</option>
          ))}
        </select>
        {errors.epic && <p className="mt-1 text-sm text-red-600">{errors.epic.message}</p>}
      </div>
      
      <div className="flex justify-end space-x-2 mt-6">
        <Button 
          variant="secondary"
          type="button" 
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button 
          variant="primary"
          type="submit"
        >
          {feature ? 'Update' : 'Add'} Feature
        </Button>
      </div>
    </form>
  );
}

// ============================================
// ALREADY VOTED SCREEN
// ============================================

interface AlreadyVotedScreenProps {
  currentUser: any;
  votingSession: VotingSession;
  onChangeVotes: () => void;
  onToggleAdmin: () => void;
  isAdmin: boolean;
  navigate: any;
  userVotes: Record<string, number>;
  features: Feature[];
  isSystemAdmin: boolean;
  isSessionAdmin: boolean;
  isStakeholder: boolean;
  currentRole?: 'stakeholder' | 'session-admin' | 'system-admin';
}

function AlreadyVotedScreen({
  currentUser,
  votingSession,
  onChangeVotes,
  onToggleAdmin,
  isAdmin,
  navigate,
  userVotes,
  features,
  isSystemAdmin,
  isSessionAdmin,
  isStakeholder,
  currentRole = isSystemAdmin ? 'system-admin' : isSessionAdmin ? 'session-admin' : 'stakeholder'
}: AlreadyVotedScreenProps) {
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  
  const totalVotes = Object.values(userVotes).reduce((sum, count) => sum + count, 0);
  const votedFeatures = features.filter(f => userVotes[f.id] > 0);
  
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
      
      {/* Title and buttons - stack on mobile */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div className="flex items-start md:items-center">
          {/* Mobile: small logo next to title */}
          <ImageWithFallback
            src={mobileLogo}
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          />
          <div>
            <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Feature Voting</h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome, {currentUser?.name}
              {getRoleBadgeDisplay(isSystemAdmin, isSessionAdmin, isStakeholder, currentRole)}
            </p>
          </div>
        </div>
        <div className="relative z-10 flex items-center space-x-2 mt-3 md:mt-0 md:justify-end">
          {isAdmin && (
            <Button 
              variant="primary"
              onClick={onToggleAdmin}
              className="flex items-center"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span className="hidden md:inline">Admin Dashboard</span>
              <span className="md:hidden">Admin</span>
            </Button>
          )}
          <Button 
            variant="gray"
            onClick={() => navigate('/sessions')}
            className="flex items-center"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">All Sessions</span>
            <span className="md:hidden">Sessions</span>
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="relative z-10 bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-[#1E5461]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-[#1E5461]" />
          </div>
          
          <h2 className="text-3xl font-bold text-[#1E5461] mb-4">Votes Already Submitted</h2>
          
          <p className="text-gray-700 text-lg mb-2">
            Welcome back, <span className="font-semibold">{currentUser.name}</span>!
          </p>
          
          <p className="text-gray-600 mb-6">
            You have already submitted your votes for <span className="font-semibold">{votingSession.title}</span>.
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-[#2d4660] mb-4">Your Current Votes</h3>
            <div className="space-y-3">
              {votedFeatures.map(feature => (
                <div key={feature.id} className="flex justify-between items-start gap-4">
                  <div>
                    <span className="block text-gray-700 font-medium">{feature.title}</span>
                    {feature.epic && (
                      <div className="mt-1">
                        <EpicTag
                          name={feature.epic}
                          truncateAt={null}
                          className="text-xs bg-[#1E5461]/10 px-2 py-0.5 rounded"
                        />
                      </div>
                    )}
                  </div>
                  <span className="bg-[#1E5461]/10 text-[#1E5461] rounded-full px-3 py-1 font-medium self-center">
                    {userVotes[feature.id]} {userVotes[feature.id] === 1 ? 'vote' : 'votes'}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-[#2d4660]">Total Votes</span>
                  <span className="text-[#2d4660]">{totalVotes}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#C89212]/10 border border-[#C89212]/20 rounded-lg p-4 mb-6">
            <div className="flex items-start text-left">
              <AlertTriangle className="h-5 w-5 text-[#C89212] mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700">
                  If you'd like to change your votes, you can do so below. However, please note that this will 
                  <span className="font-semibold"> permanently remove your previous votes</span> and allow you to vote again. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <Button 
            variant="gold"
            onClick={() => setShowChangeConfirm(true)}
            className="mx-auto text-lg py-3 px-8"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Change My Votes
          </Button>
        </div>
      </div>

      <ConfirmDialog
        show={showChangeConfirm}
        title="Change Your Votes?"
        message="This will permanently remove all your previous votes for this session and allow you to vote again. This action cannot be undone. Are you sure you want to continue?"
        onConfirm={onChangeVotes}
        onCancel={() => setShowChangeConfirm(false)}
        confirmText="Yes, Change My Votes"
        cancelText="Cancel"
        type="reset"
      />
    </div>
  );
}

// ============================================
// VOTING SCREEN
// ============================================

interface VotingScreenProps {
  features: Feature[];
  currentUser: any;
  pendingVotes: Record<string, number>;
  pendingUsedVotes: number;
  onVote: (featureId: string, increment: boolean) => void;
  onSubmitVotes: () => void;
  onToggleAdmin: () => void;
  isAdmin: boolean;
  votingSession: VotingSession;
  navigate: any;
  effectiveVotesPerUser: number;
  sessionId: string;
  onLogout: () => void;
  onSuggestionSubmitted?: (suggestion: FeatureSuggestion) => void;
  isSystemAdmin: boolean;
  isSessionAdmin: boolean;
  isStakeholder: boolean;
  currentRole?: 'stakeholder' | 'session-admin' | 'system-admin';
}

const VotingScreen = React.memo(function VotingScreen({ 
  features,
  currentUser, 
  pendingVotes,
  pendingUsedVotes,
  onVote,
  onSubmitVotes,
  onToggleAdmin,
  isAdmin,
  votingSession,
  navigate,
  effectiveVotesPerUser,
  sessionId,
  onLogout,
  onSuggestionSubmitted,
  isSystemAdmin,
  isSessionAdmin,
  isStakeholder,
  currentRole = isSystemAdmin ? 'system-admin' : isSessionAdmin ? 'session-admin' : 'stakeholder'
}: VotingScreenProps) {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY RETURNS
  const [displayFeatures, setDisplayFeatures] = useState([...features]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleStage, setShuffleStage] = useState<'idle' | 'fadeOut' | 'rearranging' | 'fadeIn'>('idle');
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);
  const [existingVotes, setExistingVotes] = useState<Record<string, number>>({});
  const [isCheckingVotes, setIsCheckingVotes] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionDetails, setSuggestionDetails] = useState('');
  const [suggestionWhatWouldItDo, setSuggestionWhatWouldItDo] = useState('');
  const [suggestionHowWouldItWork, setSuggestionHowWouldItWork] = useState('');
  const [suggestionSubmitting, setSuggestionSubmitting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggestionSuccess, setSuggestionSuccess] = useState(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [suggestionAttachments, setSuggestionAttachments] = useState<File[]>([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    setDisplayFeatures([...features]);
  }, [features]);

  // Check if user has already voted
  useEffect(() => {
    async function checkExistingVotes() {
      if (!currentUser || !sessionId) {
        setIsCheckingVotes(false);
        return;
      }

      try {
        const votes = await db.getVotes(sessionId);
        const userVotes = votes.filter(v => v.user_id === currentUser.id);
        
        if (userVotes.length > 0) {
          const votesMap: Record<string, number> = {};
          userVotes.forEach(v => {
            votesMap[v.feature_id] = v.vote_count;
          });
          setExistingVotes(votesMap);
          setHasAlreadyVoted(true);
        } else {
          setHasAlreadyVoted(false);
          setExistingVotes({});
        }
      } catch (error) {
        console.error('Error checking existing votes:', error);
        setHasAlreadyVoted(false);
      } finally {
        setIsCheckingVotes(false);
      }
    }

    checkExistingVotes();
  }, [currentUser, sessionId]);

  const handleChangeVotes = useCallback(async () => {
    if (!currentUser || !sessionId) return;

    try {
      // Delete all existing votes for this user in this session with one query
      await db.deleteVotesByUser(sessionId, currentUser.id);
      
      // Reset the state to allow voting again
      setHasAlreadyVoted(false);
      setExistingVotes({});
    } catch (error) {
      console.error('Error changing votes:', error);
      alert('Failed to reset votes. Please try again.');
    }
  }, [currentUser, sessionId]);

  const handleShuffle = useCallback(() => {
    if (isShuffling) return;
    setIsShuffling(true);
    setShuffleStage('fadeOut');
    
    // Stage 1: Fade out (400ms)
    setTimeout(() => {
      setShuffleStage('rearranging');
      // Stage 2: Rearrange while invisible (200ms)
      setTimeout(() => {
        setDisplayFeatures(shuffleArray(features));
        setShuffleStage('fadeIn');
        // Stage 3: Fade in (400ms)
        setTimeout(() => {
          setShuffleStage('idle');
          setIsShuffling(false);
        }, 400);
      }, 200);
    }, 400);
  }, [features, isShuffling]);

  const handleRequestInfo = useCallback(async (featureId: string) => {
    const feature = features.find(f => f.id === featureId);
    if (!feature || !currentUser || !sessionId) return;

    try {
      // Call the Edge Function to create the info request (bypasses RLS)
      const supabaseUrl = (supabase as any).supabaseUrl;
      const anonKey = (supabase as any).supabaseKey; // This is the anon key when used from client
      const response = await fetch(`${supabaseUrl}/functions/v1/create-info-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          feature_id: featureId,
          feature_title: feature.title,
          requester_id: currentUser.id,
          requester_name: currentUser.name || '',
          requester_email: currentUser.email || '',
          session_name: votingSession.title,
          feature_description: feature.description
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('Info request created successfully:', result);

      // Send emails to session admins from client-side (EmailJS requires browser context)
      if (result.adminEmails && result.adminEmails.length > 0 && result.emailContent) {
        // Construct the admin dashboard URL with session and feature IDs
        const basename = window.location.pathname.startsWith('/feature-voting-app') ? '/feature-voting-app' : '';
        const adminUrl = `${window.location.origin}${basename}/admin?session=${result.emailContent.sessionId}&feature=${result.emailContent.featureId}`;
        
        // Replace the placeholder URL in the email content
        const emailHtml = result.emailContent.html.replace('{{ADMIN_DASHBOARD_URL}}', adminUrl);
        const emailText = result.emailContent.text.replace('{{ADMIN_DASHBOARD_URL}}', adminUrl);
        
        const emailPromises = result.adminEmails.map((adminEmail: string) => {
          return sendInvitationEmail({
            to: adminEmail,
            subject: result.emailContent.subject,
            html: emailHtml,
            text: emailText
          }).catch((err) => {
            console.error(`Failed to send email to ${adminEmail}:`, err);
            // Don't throw - continue sending to other admins
            return null;
          });
        });

        // Wait for all emails to be sent (or fail gracefully)
        await Promise.all(emailPromises);
        console.log(`Emails sent to ${result.adminEmails.length} session admin(s)`);
      }
    } catch (error: any) {
      console.error('Error submitting info request:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Full error details:', error);
      alert(`Failed to submit request: ${errorMessage}. Please try again.`);
      throw error; // Re-throw so the component knows it failed
    }
  }, [features, currentUser, sessionId, votingSession]);

  const openSuggestModal = useCallback(() => {
    setSuggestionError(null);
    setSuggestionSuccess(false);
    setShowSuggestModal(true);
  }, []);

  const closeSuggestModal = useCallback(() => {
    if (!suggestionSubmitting) {
      // Clean up preview URLs
      attachmentPreviewUrls.forEach(url => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
      setShowSuggestModal(false);
      setSuggestionError(null);
      setSuggestionSuccess(false);
      setSuggestionTitle('');
      setSuggestionDetails('');
      setSuggestionWhatWouldItDo('');
      setSuggestionHowWouldItWork('');
      setSuggestionAttachments([]);
      setAttachmentPreviewUrls([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [suggestionSubmitting, attachmentPreviewUrls]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const previewUrls: string[] = [];
    
    // Filter valid file types (images and PDFs)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    
    files.forEach(file => {
      if (validTypes.includes(file.type)) {
        validFiles.push(file);
        // Create preview URL for images only
        if (file.type.startsWith('image/')) {
          previewUrls.push(URL.createObjectURL(file));
        } else {
          previewUrls.push(''); // Empty string for PDFs
        }
      }
    });

    // Limit to 3 total files
    const remainingSlots = 3 - suggestionAttachments.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);
    const urlsToAdd = previewUrls.slice(0, remainingSlots);
    
    setSuggestionAttachments(prev => [...prev, ...filesToAdd]);
    setAttachmentPreviewUrls(prev => [...prev, ...urlsToAdd]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [suggestionAttachments]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setSuggestionAttachments(prev => {
      const fileToRemove = prev[index];
      // Clean up object URL if it's an image
      if (fileToRemove && fileToRemove.type.startsWith('image/')) {
        setAttachmentPreviewUrls(prevUrls => {
          const urlToRevoke = prevUrls[index];
          if (urlToRevoke) {
            URL.revokeObjectURL(urlToRevoke);
          }
          return prevUrls.filter((_, i) => i !== index);
        });
      } else {
        setAttachmentPreviewUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Cleanup object URLs when component unmounts or modal closes
  useEffect(() => {
    return () => {
      attachmentPreviewUrls.forEach(url => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [attachmentPreviewUrls]);

  const handleSubmitSuggestion = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedTitle = suggestionTitle.trim();
    const trimmedDetails = suggestionDetails.trim();
    const trimmedWhatWouldItDo = suggestionWhatWouldItDo.trim();
    const trimmedHowWouldItWork = suggestionHowWouldItWork.trim();

    if (!trimmedTitle) {
      setSuggestionError('Please provide a brief title for your suggestion.');
      return;
    }

    if (!sessionId) {
      setSuggestionError('Unable to link this suggestion to the current session.');
      return;
    }

    try {
      setSuggestionSubmitting(true);
      setSuggestionError(null);

      // Upload attachments to Supabase storage
      const attachmentUrls: string[] = [];
      if (suggestionAttachments.length > 0) {
        for (let i = 0; i < suggestionAttachments.length; i++) {
          const file = suggestionAttachments[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${i}.${fileExt}`;
          const filePath = `suggestions/${sessionId}/${fileName}`;

          try {
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('feature-attachments')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Error uploading file:', uploadError);
              // If bucket doesn't exist, show a warning but continue
              if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
                console.warn('Storage bucket "feature-attachments" not found. Please create it in Supabase Storage.');
              }
              // Continue with other files even if one fails
            } else {
              const { data: { publicUrl } } = supabase.storage
                .from('feature-attachments')
                .getPublicUrl(filePath);
              attachmentUrls.push(publicUrl);
            }
          } catch (error: any) {
            console.error('Error uploading file:', error);
            // Continue with submission even if attachments fail
          }
        }
      }

      const savedSuggestion = await db.createFeatureSuggestion({
        session_id: sessionId,
        title: trimmedTitle,
        description: trimmedDetails || null,
        requester_id: currentUser?.id ?? null,
        requester_name: currentUser?.name ?? null,
        requester_email: currentUser?.email ?? null,
        whatWouldItDo: trimmedWhatWouldItDo || null,
        howWouldItWork: trimmedHowWouldItWork || null,
        attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : null
      });

      // Get session admins and send emails
      try {
        const sessionAdmins = await db.getSessionAdmins(sessionId);
        const adminEmails = sessionAdmins
          .map(admin => admin.user?.email)
          .filter((email): email is string => Boolean(email));

        if (adminEmails.length > 0) {
          const sessionName = votingSession?.title || 'this session';
          const requesterName = currentUser?.name || 'A user';
          const requesterEmail = currentUser?.email || '';
          const logoUrl = 'https://dcchoffman.github.io/feature-voting-app/New-Millennium-color-logo1.png';
          const basename = window.location.pathname.startsWith('/feature-voting-app') ? '/feature-voting-app' : '';
          const adminUrl = `${window.location.origin}${basename}/admin`;
          
          // Escape HTML to prevent XSS
          const escapeHtml = (text: string) => {
            return text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          };
          
          const convertTextToHtml = (text: string) => {
            return escapeHtml(text).replace(/\n/g, '<br />');
          };
          
          const emailHtml = `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; font-family: Arial, sans-serif;">
  <tr>
    <td align="center" style="padding: 48px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
        <!-- Logo Header -->
        <tr>
          <td style="background-color: #ffffff; padding: 32px 40px 24px 40px; text-align: center;">
            <img src="${logoUrl}" alt="New Millennium Building Systems" width="300" height="96" style="height: 96px; width: auto; max-width: 300px; display: block; margin: 0 auto; border: 0;" />
            <div style="font-size: 20px; font-weight: bold; color: #2d4660; margin-top: 16px;">Feature Voting System</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">has a</div>
            <div style="font-size: 25px; font-weight: bold; color: #2d4660; margin-top: 4px;">New Feature Suggestion</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">for the</div>
            <div style="font-size: 30px; font-weight: bold; color: #2d4660; margin-top: 4px;">${escapeHtml(sessionName)}</div>
          </td>
        </tr>
        
        <!-- Main Content -->
        <tr>
          <td style="background-color: #ffffff; padding: 40px;">
            <p style="margin: 0 0 16px 0; font-size: 16px; color: #333; line-height: 1.6;">
              <strong style="color: #2d4660;">${escapeHtml(requesterName)}</strong>${requesterEmail ? ` (${escapeHtml(requesterEmail)})` : ''} has submitted a new feature suggestion.
            </p>
            
            <!-- Suggestion Details Box -->
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 24px 0; border-left: 4px solid #C89212;">
              <h3 style="color: #2d4660; margin: 0 0 16px 0; font-size: 18px; font-weight: bold;">${escapeHtml(trimmedTitle)}</h3>
              
              ${trimmedDetails ? `
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #111827; line-height: 1.6;">
                <strong style="color: #2d4660;">Problem it solves:</strong><br />
                <span style="color: #374151;">${convertTextToHtml(trimmedDetails)}</span>
              </p>
              ` : ''}
              
              ${trimmedWhatWouldItDo ? `
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #111827; line-height: 1.6;">
                <strong style="color: #2d4660;">What it would do:</strong><br />
                <span style="color: #374151;">${convertTextToHtml(trimmedWhatWouldItDo)}</span>
              </p>
              ` : ''}
              
              ${trimmedHowWouldItWork ? `
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #111827; line-height: 1.6;">
                <strong style="color: #2d4660;">How it would work:</strong><br />
                <span style="color: #374151;">${convertTextToHtml(trimmedHowWouldItWork)}</span>
              </p>
              ` : ''}
              
              ${attachmentUrls.length > 0 ? `
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #111827; line-height: 1.6;">
                <strong style="color: #2d4660;">Attachments:</strong> ${attachmentUrls.length} file(s) - View on admin page
              </p>
              ` : ''}
            </div>
            
            <!-- Go to Admin Dashboard Button -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
              <tr>
                <td align="center">
                  <a href="${adminUrl}" style="display: inline-block; padding: 12px 24px; background-color: #C89212; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">Go to Admin Dashboard</a>
                </td>
              </tr>
            </table>
            
            <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
              You can review and manage this suggestion from the admin dashboard.
            </p>
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

          // Send emails to all admins
          await Promise.all(
            adminEmails.map(email =>
              sendInvitationEmail({
                to: email,
                subject: `New Feature Suggestion: ${trimmedTitle}`,
                html: emailHtml
              }).catch(err => {
                console.error(`Failed to send email to ${email}:`, err);
                // Don't fail the whole submission if email fails
              })
            )
          );
        }
      } catch (emailError) {
        console.error('Error sending admin emails:', emailError);
        // Don't fail the submission if email fails
      }

      onSuggestionSubmitted?.(savedSuggestion);

      // Close the suggest modal and show thank you modal
      setShowSuggestModal(false);
      setSuggestionTitle('');
      setSuggestionDetails('');
      setSuggestionWhatWouldItDo('');
      setSuggestionHowWouldItWork('');
      setSuggestionAttachments([]);
      setAttachmentPreviewUrls([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowThankYouModal(true);
    } catch (error) {
      console.error('Error submitting feature suggestion:', error);
      setSuggestionError('We were unable to submit your suggestion. Please try again in a moment.');
    } finally {
      setSuggestionSubmitting(false);
    }
  }, [
    suggestionDetails,
    suggestionTitle,
    suggestionWhatWouldItDo,
    suggestionHowWouldItWork,
    suggestionAttachments,
    currentUser,
    sessionId,
    votingSession,
    onSuggestionSubmitted
  ]);
  
  // NOW CHECK CONDITIONS AND RETURN EARLY IF NEEDED
  if (!currentUser) return null;

  // Show loading state while checking
  if (isCheckingVotes) {
    return (
      <div className="container mx-auto p-4 max-w-6xl min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your voting status...</p>
        </div>
      </div>
    );
  }

  // Show "already voted" screen if user has submitted votes
  if (hasAlreadyVoted) {
    return (
      <AlreadyVotedScreen
        currentUser={currentUser}
        votingSession={votingSession}
        onChangeVotes={handleChangeVotes}
        onToggleAdmin={onToggleAdmin}
        isAdmin={isAdmin}
        navigate={navigate}
        userVotes={existingVotes}
        features={features}
        isSystemAdmin={isSystemAdmin}
        isSessionAdmin={isSessionAdmin}
        isStakeholder={isStakeholder}
        currentRole={currentRole}
      />
    );
  }

  const remainingVotes = effectiveVotesPerUser - pendingUsedVotes;
  const allVotesUsed = remainingVotes === 0;
  const votingIsActive = votingSession.isActive;
  
  return (
    <div className="container mx-auto p-4 max-w-6xl pb-8">
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
      <div className="flex justify-between items-start md:items-center mb-6">
        <div className="flex items-start md:items-center">
          {/* Mobile: small logo next to title */}
          <ImageWithFallback
            src={mobileLogo}
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          />
          <div>
            <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Feature Voting</h1>
            <p className="text-sm text-gray-600 mt-1">
              Welcome, {currentUser?.name}
              {getRoleBadgeDisplay(isSystemAdmin, isSessionAdmin, isStakeholder, currentRole)}
            </p>
          </div>
        </div>
        <div ref={mobileMenuRef} className="relative z-40 flex items-start md:items-center">
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center space-x-2">
            {isAdmin && (
              <Button 
                variant="primary"
                onClick={onToggleAdmin}
                className="flex items-center"
              >
                <Settings className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Button>
            )}
            <Button 
              variant="gray"
              onClick={() => navigate('/sessions')}
              className="flex items-center"
            >
              All Sessions
            </Button>
            <button 
              onClick={onLogout}
              className={`flex items-center justify-center bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ${
                currentRole === 'stakeholder' ? 'px-4 py-2' : 'p-2 w-10 h-10'
              }`}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              {currentRole === 'stakeholder' && <span className="ml-2">Logout</span>}
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
                {isAdmin && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); onToggleAdmin(); }}
                    className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4 mr-2 text-gray-700" />
                    Admin Dashboard
                  </button>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/sessions'); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  All Sessions
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  className={`w-full px-3 py-2 flex items-center hover:bg-gray-50 ${
                    currentRole === 'stakeholder' ? 'text-left' : 'justify-center'
                  }`}
                  title="Logout"
                >
                  <LogOut className="h-4 w-4 text-gray-700" />
                  {currentRole === 'stakeholder' && <span className="ml-2 text-base text-gray-700">Logout</span>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#2D4660]">
              Current Session: {votingSession.product_name && <span className="text-[#1E5461]">{votingSession.product_name} - </span>}<span className="text-[#1E5461]">{votingSession.title}</span>
            </h2>
          </div>
        </div>
        
        {votingSession.goal && votingSession.goal.trim() && (
          <div className="pt-3 border-t border-gray-200 mb-4">
            <div className="relative overflow-hidden rounded-2xl border border-[#C89212]/30 bg-gradient-to-r from-[#FFF6E3] via-[#FFF9ED] to-white shadow-sm p-5 md:p-6">
              <span className="pointer-events-none absolute -top-10 left-4 h-32 w-32 rounded-full bg-[#C89212]/25 blur-3xl" />
              <span className="pointer-events-none absolute -bottom-16 right-6 h-40 w-40 rounded-full bg-[#F4C66C]/20 blur-3xl" />
              <span className="pointer-events-none absolute top-6 right-10 text-[#F4B400] text-xl animate-ping">✶</span>
              <span className="pointer-events-none absolute bottom-8 left-10 text-[#C89212] text-lg animate-pulse">✦</span>

              <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-5 md:pr-8 lg:pr-12">
                  <div className="relative">
                    <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-white shadow-lg shadow-[#C89212]/30 border border-[#C89212]/40 flex items-center justify-center text-[#C89212]">
                      <Trophy className="h-8 w-8 md:h-10 md:w-10" />
                    </div>
                    <span className="pointer-events-none absolute -top-3 -left-2 text-[#C89212] text-base animate-ping">✧</span>
                    <span className="pointer-events-none absolute bottom-0 -right-3 text-[#F5D79E] text-xl animate-pulse">✺</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C89212]/80 mb-1">Session Goal</p>
                    <h3 className="text-lg md:text-xl font-semibold text-[#2D4660] leading-relaxed">
                      {votingSession.goal}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {(() => {
          const daysRemaining = getDaysRemaining(votingSession.endDate);
          const deadlineColor = getDeadlineColor(daysRemaining);
          const deadlineBgColor = getDeadlineBgColor(daysRemaining);
          
          return (
            <div className={`${deadlineBgColor} rounded-md p-3 md:p-4 border ${
              daysRemaining <= 2 ? 'border-[#6A4234]/20' : 
              daysRemaining <= 4 ? 'border-[#C89212]/20' : 
              'border-[#1E5461]/20'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
                <div className="flex items-center flex-shrink-0">
                  <Calendar className={`h-5 w-5 mr-2 ${deadlineColor}`} />
                  <div className="leading-tight" style={{ marginTop: '10px' }}>
                    <span className={`font-medium ${deadlineColor}`}>
                      Voting ends: {formatDate(votingSession.endDate)}
                    </span>
                    <div className="text-sm -mt-0.5" style={{ marginLeft: '100px', marginTop: '-6px' }}>
                      {daysRemaining <= 0 ? (
                        <span className="text-red-600 font-medium">Voting ends today!</span>
                      ) : (
                        <span className={`${deadlineColor}`}>
                          <span className="font-semibold text-lg">{daysRemaining}</span> {daysRemaining === 1 ? 'day' : 'days'} remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center md:justify-end flex-1 min-w-0">
                  <div className="leading-tight">
                    <div className="flex items-center justify-center md:justify-start">
                      <Vote className={`h-[30px] w-[30px] mr-2 ${deadlineColor}`} />
                      <div className="text-sm -mt-0.5 leading-none">
                        <div className="flex items-baseline justify-center md:justify-start" style={{ marginRight: '60px' }}>
                          <span className={`${deadlineColor} mr-1`} style={{ fontSize: '14px' }}>You have</span>
                          <span className={`${deadlineColor} font-semibold text-2xl`}>
                            {remainingVotes}
                          </span>
                          <span className={`${deadlineColor} font-semibold text-lg ml-1`}>
                            / {effectiveVotesPerUser}
                          </span>
                        </div>
                        <span className={`${deadlineColor} block -mt-0.5 text-center`} style={{ fontSize: '14px' }}>votes remaining</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {!votingIsActive && (
        <div className="mb-6 bg-[#C89212]/10 p-4 rounded-lg border border-[#C89212]/20">
          <div className="flex items-center text-[#6A4234]">
            <Clock className="h-5 w-5 mr-2" />
            <span className="font-medium">
              Voting is currently {isPastDate(votingSession.endDate) ? 'closed' : 'not yet open'}.
              {isPastDate(votingSession.endDate) 
                ? ` Voting ended on ${formatDate(votingSession.endDate)}.`
                : ` Voting will open on ${formatDate(votingSession.startDate)}.`}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-3">
        <h2 className="text-xl font-semibold text-[#2d4660]">Available Features</h2>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <Button 
            variant="gold" 
            onClick={openSuggestModal}
            className="flex items-center justify-center w-full md:w-auto"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Suggest a Feature
          </Button>
          {features.length > 6 && (
            <ShuffleButton isShuffling={isShuffling} onShuffle={handleShuffle} />
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${pendingUsedVotes > 0 ? 'mb-32' : ''}`}>
        {displayFeatures.map((feature) => {
          const userVoteCount = pendingVotes[feature.id] || 0;
          
          return (
            <FeatureCard
              key={feature.id}
              feature={feature}
              userVoteCount={userVoteCount}
              remainingVotes={remainingVotes}
              votingIsActive={votingIsActive}
              onVote={onVote}
              isShuffling={isShuffling}
              shuffleStage={shuffleStage}
              currentUser={currentUser}
              onRequestInfo={handleRequestInfo}
            />
          );
        })}
      </div>
      
      {pendingUsedVotes > 0 && (() => {
        const daysRemaining = getDaysRemaining(votingSession.endDate);
        const deadlineColor = getDeadlineColor(daysRemaining);
        const deadlineBgColorSolid = getDeadlineBgColorSolid(daysRemaining);
        
        return (
          <div className={`fixed bottom-0 left-0 right-0 ${deadlineBgColorSolid} rounded-t-md border-t ${
            daysRemaining <= 2 ? 'border-[#6A4234]/20' : 
            daysRemaining <= 4 ? 'border-[#C89212]/20' : 
            'border-[#1E5461]/20'
          } p-3 md:p-4 z-50`}>
            <div className="container mx-auto max-w-6xl flex items-center justify-center">
              <div className="flex items-center flex-1 min-w-0 justify-center" style={{ paddingLeft: '60px', width: '100px' }}>
                <div className="leading-tight w-full" style={{ width: '120px' }}>
                  <div className="flex items-center">
                    <Vote className={`h-[30px] w-[30px] mr-2 ${deadlineColor}`} style={{ marginLeft: '-88px' }} />
                    <div className="text-sm -mt-0.5 leading-none flex-1">
                      <div className="flex items-baseline justify-center" style={{ marginLeft: '-12px' }}>
                        <span className={`${deadlineColor} mr-1`} style={{ fontSize: '14px', marginLeft: '-48px' }}>You have</span>
                        <span className={`${deadlineColor} font-semibold text-2xl`}>
                          {remainingVotes}
                        </span>
                        <span className={`${deadlineColor} font-semibold text-lg ml-1`}>
                          / {effectiveVotesPerUser}
                        </span>
                      </div>
                      <span className={`${deadlineColor} block -mt-0.5 text-center`} style={{ fontSize: '14px' }}>votes remaining</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onSubmitVotes}
                className={`py-3 px-6 rounded-lg font-medium cursor-pointer ${
                  allVotesUsed
                    ? 'bg-[#1E5461] hover:bg-[#173B65] text-white'
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
                disabled={!allVotesUsed}
              >
                Submit Votes
              </button>
            </div>
          </div>
        );
      })()}

      <Modal
        isOpen={showSuggestModal}
        onClose={closeSuggestModal}
        title="Suggest a Feature"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitSuggestion} className="space-y-4">
          <div className="bg-[#1E5461]/10 border border-[#1E5461]/30 text-sm text-[#1E5461] rounded-md px-3 py-2">
            All suggested features will be reviewed for <strong>future sessions</strong>.<br />
            Suggestions will not be added to the current session.
          </div>

          {suggestionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              {suggestionError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feature title
            </label>
            <input
              type="text"
              value={suggestionTitle}
              onChange={(e) => setSuggestionTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Give your feature a name"
              disabled={suggestionSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What problem would this solve? (optional)
            </label>
            <textarea
              value={suggestionDetails}
              onChange={(e) => setSuggestionDetails(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={4}
              placeholder="Share a few details so we understand the request."
              disabled={suggestionSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What would it do? (optional)
            </label>
            <textarea
              value={suggestionWhatWouldItDo}
              onChange={(e) => setSuggestionWhatWouldItDo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Describe the functionality or outcome users would experience."
              disabled={suggestionSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              How would it work? (optional)
            </label>
            <textarea
              value={suggestionHowWouldItWork}
              onChange={(e) => setSuggestionHowWouldItWork(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Share any ideas on workflow, technical approach, or integration."
              disabled={suggestionSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach Images or PDFs (optional, up to 3)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileSelect}
              disabled={suggestionSubmitting || suggestionAttachments.length >= 3}
              className="hidden"
              id="suggestion-file-input"
            />
            <label
              htmlFor="suggestion-file-input"
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer ${
                suggestionSubmitting || suggestionAttachments.length >= 3
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              {suggestionAttachments.length >= 3 ? 'Maximum 3 files' : 'Attach Files'}
            </label>
            
            {suggestionAttachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {suggestionAttachments.map((file, index) => {
                  const isImage = file.type.startsWith('image/');
                  const isPDF = file.type === 'application/pdf';
                  const previewUrl = attachmentPreviewUrls[index] || null;
                  
                  return (
                    <div
                      key={index}
                      className="relative group border border-gray-300 rounded-md overflow-hidden"
                      style={{ width: '100px', height: '100px' }}
                    >
                      {isImage && previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : isPDF ? (
                        <div className="w-full h-full flex items-center justify-center bg-red-50">
                          <Paperclip className="h-8 w-8 text-red-600" />
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        style={{ width: '20px', height: '20px' }}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                        {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeSuggestModal}
              disabled={suggestionSubmitting}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={suggestionSubmitting}
              className="flex items-center"
            >
              {suggestionSubmitting && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
              Submit Suggestion
            </Button>
          </div>
        </form>
      </Modal>

      {/* Thank You Modal */}
      <Modal
        isOpen={showThankYouModal}
        onClose={() => setShowThankYouModal(false)}
        title=""
        maxWidth="max-w-md"
        hideHeader={true}
      >
        <div className="text-center py-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
          <p className="text-gray-600 mb-1">
            Your feature suggestion has been submitted successfully.
          </p>
          <p className="text-sm text-gray-500">
            The session admins have been notified and will review your suggestion.
          </p>
        </div>
      </Modal>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

interface FeatureVotingSystemProps {
  defaultVotesPerUser?: number;
  adminMode?: boolean;
  resultsMode?: boolean;
}

function FeatureVotingSystem({ 
  defaultVotesPerUser = 10, 
  adminMode = false,
  resultsMode = false
}: FeatureVotingSystemProps) {
  
  // Session context integration
  const { 
    currentSession, 
    currentUser, 
    setCurrentUser, 
    setCurrentSession, 
    refreshSessions,
    isSystemAdmin,
    isAdmin: sessionAdminRole,
    isStakeholder
  } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
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
  
  // Redirect if no session selected (but not during OAuth callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthCallback = urlParams.has('code') || urlParams.has('error');
    
    // Check if there's a stored session ID that's still loading
    const storedSessionId = localStorage.getItem('voting_system_current_session');
    
    // Don't redirect if:
    // 1. OAuth callback in progress
    // 2. Session is still loading from storage
    if (!currentSession && !isOAuthCallback && !storedSessionId) {
      navigate('/sessions');
    }
  }, [currentSession, navigate]);
  
  const isOAuthCallback = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('code') || urlParams.has('error');
  }, []);
  
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState(initialUsers);
  const [view, setView] = useState<'voting' | 'admin' | 'thankyou' | 'results'>(
    resultsMode ? 'results' :
    adminMode || isOAuthCallback ? 'admin' : 'voting'
  );
  const [isAdmin, setIsAdmin] = useState(adminMode || isOAuthCallback || resultsMode);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVotersList, setShowVotersList] = useState<string | null>(null);
  const [votingSession, setVotingSession] = useState({
    ...initialVotingSession,
    votesPerUser: defaultVotesPerUser
  });
  
  const [azureDevOpsConfig, setAzureDevOpsConfig] = useState(initialAzureDevOpsConfig);
  const [availableProjects, setAvailableProjects] = useState<string[]>(getNewMillProjects());
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableAreaPaths, setAvailableAreaPaths] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isFetchingAzureDevOps, setIsFetchingAzureDevOps] = useState(false);
  const [azureFetchError, setAzureFetchError] = useState<string | null>(null);
  const [previewFeatures, setPreviewFeatures] = useState<Feature[] | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [suggestedFeatures, setSuggestedFeatures] = useState<FeatureSuggestion[]>([]);
  const [futureSessions, setFutureSessions] = useState<Array<{ id: string; title: string; startDate: string }>>([]);
  // Initialize adminPerspective from URL params, sessionStorage, or default to primary role
  const getDefaultAdminPerspective = (): 'session' | 'system' => {
    // Check URL params first
    const urlPerspective = searchParams.get('perspective') as 'session' | 'system' | null;
    if (urlPerspective) {
      sessionStorage.setItem('adminPerspective', urlPerspective);
      return urlPerspective;
    }
    // Then check sessionStorage for adminPerspective
    const saved = sessionStorage.getItem('adminPerspective') as 'session' | 'system' | null;
    if (saved) return saved;
    // Also check viewMode in sessionStorage and convert it
    const viewMode = sessionStorage.getItem('viewMode') as 'admin' | 'stakeholder' | 'system-admin' | null;
    if (viewMode === 'system-admin') {
      sessionStorage.setItem('adminPerspective', 'system');
      return 'system';
    } else if (viewMode === 'admin') {
      sessionStorage.setItem('adminPerspective', 'session');
      return 'session';
    }
    // Finally default to primary role
    return isSystemAdmin ? 'system' : 'session';
  };
  const [adminPerspective, setAdminPerspective] = useState<'session' | 'system'>(getDefaultAdminPerspective());
  
  // Update adminPerspective when URL params change
  useEffect(() => {
    const urlPerspective = searchParams.get('perspective') as 'session' | 'system' | null;
    if (urlPerspective && urlPerspective !== adminPerspective) {
      setAdminPerspective(urlPerspective);
      sessionStorage.setItem('adminPerspective', urlPerspective);
    }
  }, [searchParams, adminPerspective]);
  
  const [pendingVotes, setPendingVotes] = useState<Record<string, number>>({});
  const [pendingUsedVotes, setPendingUsedVotes] = useState(0);

  const [confirmState, setConfirmState] = useState<{
    showReset: boolean;
    showResetAll: boolean;
    showDeleteSession: boolean;
    targetId: string | null;
  }>({
    showReset: false,
    showResetAll: false,
    showDeleteSession: false,
    targetId: null
  });

  const [isDeletingSession, setIsDeletingSession] = useState(false);

  const hasProcessedCallback = useRef(false);
  const isLoadingDataRef = useRef(false);
  const lastLoadedSessionIdRef = useRef<string | null>(null);

  // Calculate effective votes per user based on auto-votes setting
  const effectiveVotesPerUser = useMemo(() => {
    return votingSession.useAutoVotes 
      ? Math.max(1, Math.floor(features.length / 2))
      : votingSession.votesPerUser;
  }, [votingSession.useAutoVotes, votingSession.votesPerUser, features.length]);

const isProcessingOAuthRef = useRef(false); // Add this at the top with your other refs

useEffect(() => {
    // Prevent double execution in React StrictMode
    if (isProcessingOAuthRef.current) {
      console.log('OAuth processing already in progress, skipping...');
      return;
    }

    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hasOAuthParams = urlParams.has('code') || urlParams.has('error');
      
      // If we have OAuth params but no session yet, try to restore it
      if (hasOAuthParams && !currentSession) {
        console.log('OAuth callback detected, waiting for session to load...');
        
        // Try to get session from localStorage
        const storedSessionId = localStorage.getItem('voting_system_current_session');
        if (storedSessionId) {
          console.log('Found stored session ID, waiting for SessionContext to restore it...');
        }
        return;
      }
      
      const authInProgress = localStorage.getItem('azureDevOpsAuthInProgress');
      if (authInProgress) {
        localStorage.removeItem('azureDevOpsAuthInProgress');
      }
      
      if (!hasOAuthParams || hasProcessedCallback.current) {
        return;
      }
      
      if (!currentSession) {
        console.log('No session available yet, waiting...');
        return; // Wait for session
      }
      
      // Set both flags to prevent double execution
      isProcessingOAuthRef.current = true;
      hasProcessedCallback.current = true;
      console.log('Processing OAuth callback with session:', currentSession.id);
      
      try {
        const tokens = await azureService.handleOAuthCallback();
        
        if (tokens) {
          const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
          
          const updatedConfig = {
            ...azureDevOpsConfig,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: expiresAt,
            enabled: true,
            clientId: azureService.AZURE_AD_CONFIG.clientId,
            tenantId: azureService.AZURE_AD_CONFIG.tenantId
          };
          
          await db.saveAzureDevOpsConfig(currentSession.id, updatedConfig);
          setAzureDevOpsConfig(updatedConfig);
          
          const returnPath = sessionStorage.getItem('oauth_return_path') || '/admin';
          sessionStorage.removeItem('oauth_return_path');

          console.log('OAuth successful, navigating to:', returnPath);

          // Navigate to return path (React Router will handle the URL)
          navigate(returnPath, { replace: true });
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setAzureFetchError('Failed to authenticate with Azure DevOps');
        
        // Navigate back to admin on error
        const returnPath = '/admin';  // React Router will add basename automatically
        sessionStorage.removeItem('oauth_return_path');
        navigate(returnPath, { replace: true });
      } finally {
        // Reset the flag after processing completes
        isProcessingOAuthRef.current = false;
      }
    };
    
    handleCallback();
  }, [currentSession, navigate, azureDevOpsConfig]);

  // Ensure view is set correctly based on adminMode and resultsMode
  useEffect(() => {
    if (resultsMode && view !== 'results') {
      setView('results');
    } else if (adminMode && view !== 'admin') {
      setView('admin');
    } else if (!adminMode && !resultsMode && view === 'admin') {
      setView('voting');
    }
  }, [adminMode, resultsMode, view]);

  const handleInitiateOAuth = useCallback((action?: 'preview' | 'sync') => {
    localStorage.setItem('azureDevOpsAuthInProgress', 'true');
    if (action) {
      sessionStorage.setItem('oauth_action', action);
    }
    // Store return path so we land back in admin area
    if (!sessionStorage.getItem('oauth_return_path')) {
      sessionStorage.setItem('oauth_return_path', '/admin');
    }
    azureService.initiateOAuthFlow();
  }, []);

  const ensureValidToken = useCallback(async (config: AzureDevOpsConfig): Promise<string> => {
    if (!config.accessToken || !config.refreshToken || !config.tokenExpiresAt) {
      throw new Error('Not authenticated');
    }
    
    if (azureService.isTokenExpired(config.tokenExpiresAt)) {
      const tokens = await azureService.refreshAccessToken(config.refreshToken);
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
      
      const updatedConfig = {
        ...config,
        accessToken: tokens.accessToken,
        tokenExpiresAt: expiresAt
      };
      
      if (currentSession) {
        await db.saveAzureDevOpsConfig(currentSession.id, updatedConfig);
        setAzureDevOpsConfig(updatedConfig);
      }
      
      return tokens.accessToken;
    }
    
    return config.accessToken;
  }, [currentSession]);

  const buildFeaturesWithVotes = useCallback(async (): Promise<Feature[]> => {
    if (!currentSession) return [];

    const [featuresData, votesData] = await Promise.all([
      db.getFeatures(currentSession.id),
      db.getVotes(currentSession.id)
    ]);

    return featuresData.map(feature => {
      const featureVotes = votesData.filter(v => v.feature_id === feature.id);
      const voters = featureVotes.map(v => ({
        userId: v.user_id,
        name: v.user_name,
        email: v.user_email,
        voteCount: v.vote_count
      }));
      const totalVotes = voters.reduce((sum, v) => sum + v.voteCount, 0);

      return {
        id: feature.id,
        title: feature.title,
        description: feature.description,
        epic: feature.epic || null,
        epicId: feature.epic_id || feature.epicId || null,
        state: feature.state,
        areaPath: feature.area_path || feature.areaPath || null,
        tags: feature.tags || [],
        azureDevOpsId: feature.azure_devops_id || feature.azureDevOpsId || null,
        azureDevOpsUrl: feature.azure_devops_url || feature.azureDevOpsUrl || null,
        workItemType: feature.workItemType || feature.work_item_type || null,
        votes: totalVotes,
        voters
      };
    });
  }, [currentSession]);

  const loadFeatureSuggestions = useCallback(async () => {
    if (!currentSession) return;
    
    try {
      const suggestions = await db.getFeatureSuggestions(currentSession.id);
      setSuggestedFeatures(suggestions);
    } catch (error) {
      console.error('Error loading feature suggestions:', error);
    }
  }, [currentSession]);

  const loadFutureSessions = useCallback(async () => {
    if (!currentSession) return;

    try {
      const sessions = await db.getAllSessions();
      const now = new Date();
      
      // Filter and verify sessions exist
      const validOptions = [];
      for (const session of sessions) {
        // Skip current session
        if (session.id === currentSession.id) continue;
        
        // Only include future sessions
        const startDate = new Date(session.start_date);
        if (startDate <= now) continue;
        
        // Verify session still exists in database
        try {
          const verifiedSession = await db.getSessionById(session.id);
          if (verifiedSession) {
            validOptions.push({
              id: session.id,
              title: session.title,
              startDate: session.start_date
            });
          }
        } catch (verifyError) {
          // Session doesn't exist, skip it
          console.warn(`Session ${session.id} no longer exists, skipping from future sessions list`);
        }
      }
      
      setFutureSessions(validOptions);
    } catch (error) {
      console.error('Error loading future sessions:', error);
      setFutureSessions([]); // Set empty array on error
    }
  }, [currentSession]);

  const handleSuggestionSubmitted = useCallback((suggestion: FeatureSuggestion) => {
    setSuggestedFeatures(prev => [suggestion, ...prev]);
    loadFeatureSuggestions();
    loadFutureSessions();
  }, [loadFeatureSuggestions, loadFutureSessions]);

  const handleUpdateSuggestion = useCallback(async (id: string, updates: {
    title?: string;
    summary?: string | null;
    whatWouldItDo?: string | null;
    howWouldItWork?: string | null;
    attachment_urls?: string[] | null;
  }) => {
    await db.updateFeatureSuggestion(id, updates);
    await loadFeatureSuggestions();
  }, [loadFeatureSuggestions]);

  const handleDeleteSuggestion = useCallback(async (id: string) => {
    await db.deleteFeatureSuggestion(id);
    await loadFeatureSuggestions();
  }, [loadFeatureSuggestions]);

  const handleMoveSuggestion = useCallback(async (id: string, targetSessionId: string) => {
    await db.moveFeatureSuggestionToSession(id, targetSessionId);
    await loadFeatureSuggestions();
  }, [loadFeatureSuggestions]);

  const handlePromoteSuggestion = useCallback(async (id: string) => {
    await db.promoteSuggestionToFeature(id);
    const refreshed = await buildFeaturesWithVotes();
    setFeatures(refreshed);
    await loadFeatureSuggestions();
  }, [buildFeaturesWithVotes, loadFeatureSuggestions]);

  useEffect(() => {
    async function loadData() {
      if (!currentSession) return;
      
      if (isLoadingDataRef.current && lastLoadedSessionIdRef.current === currentSession.id) {
        // Data load already in progress, skip duplicate call
        return;
      }

      lastLoadedSessionIdRef.current = currentSession.id;
      isLoadingDataRef.current = true;

      try {
        setIsLoading(true);
        
        // Build features with votes inline
        const [featuresData, votesData] = await Promise.all([
          db.getFeatures(currentSession.id),
          db.getVotes(currentSession.id)
        ]);

        const featuresWithVotes = featuresData.map(feature => {
          const featureVotes = votesData.filter(v => v.feature_id === feature.id);
          const voters = featureVotes.map(v => ({
            userId: v.user_id,
            name: v.user_name,
            email: v.user_email,
            voteCount: v.vote_count
          }));
          const totalVotes = voters.reduce((sum, v) => sum + v.voteCount, 0);

          return {
            id: feature.id,
            title: feature.title,
            description: feature.description,
            epic: feature.epic || null,
            epicId: feature.epic_id || feature.epicId || null,
            state: feature.state,
            areaPath: feature.area_path || feature.areaPath || null,
            tags: feature.tags || [],
            azureDevOpsId: feature.azure_devops_id || feature.azureDevOpsId || null,
            azureDevOpsUrl: feature.azure_devops_url || feature.azureDevOpsUrl || null,
            workItemType: feature.workItemType || feature.work_item_type || null,
            votes: totalVotes,
            voters
          };
        });
        
        setFeatures(featuresWithVotes);
        
        setVotingSession({
          title: currentSession.title,
          goal: currentSession.goal,
          votesPerUser: currentSession.votes_per_user,
          useAutoVotes: currentSession.use_auto_votes || false,
          startDate: currentSession.start_date,
          endDate: currentSession.end_date,
          isActive: currentSession.is_active,
          originalEndDate: currentSession.original_end_date ?? undefined,
          endedEarlyBy: currentSession.ended_early_by ?? undefined,
          endedEarlyReason: currentSession.ended_early_reason ?? undefined,
          endedEarlyDetails: currentSession.ended_early_details ?? undefined,
          reopenReason: currentSession.reopen_reason ?? undefined,
          reopenDetails: currentSession.reopen_details ?? undefined,
          reopenedBy: currentSession.reopened_by ?? undefined,
          reopenedAt: currentSession.reopened_at ?? undefined,
          productId: currentSession.product_id ?? null,
          productName: currentSession.product_name ?? null,
          product_id: currentSession.product_id ?? null,
          product_name: currentSession.product_name ?? null
        });
        
        const azureConfig = await db.getAzureDevOpsConfig(currentSession.id);
        if (azureConfig) {
          setAzureDevOpsConfig({
            organization: azureConfig.organization || 'newmill',
            project: azureConfig.project || 'Product',
            accessToken: azureConfig.access_token,
            refreshToken: azureConfig.refresh_token,
            tokenExpiresAt: azureConfig.token_expires_at,
            tenantId: azureConfig.tenant_id,
            clientId: azureConfig.client_id,
            enabled: azureConfig.enabled,
            workItemType: azureConfig.work_item_type || 'Feature',
            query: azureConfig.query,
            lastSyncTime: azureConfig.last_sync_time
          });
        } else {
          setAzureDevOpsConfig({
            organization: 'newmill',
            project: 'Product',
            enabled: false,
            workItemType: 'Feature'
          });
        }

        // Load feature suggestions inline
        try {
          const suggestions = await db.getFeatureSuggestions(currentSession.id);
          setSuggestedFeatures(suggestions);
        } catch (error) {
          console.error('Error loading feature suggestions:', error);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setFeatures([]);
      } finally {
        setIsLoading(false);
        isLoadingDataRef.current = false;
      }
    }
    
    loadData();
  }, [currentSession?.id]);

  useEffect(() => {
    async function loadFilterOptions() {
      const fallbackProjects = getNewMillProjects();
      const currentProject = azureDevOpsConfig.project;
      
      // Immediately clear all filter options when project changes
      setAvailableProjects(fallbackProjects);
      setAvailableStates([]);
      setAvailableAreaPaths([]);
      setAvailableTags([]);

      if (azureDevOpsConfig.enabled && azureDevOpsConfig.accessToken && currentProject) {
        try {
          const validToken = await ensureValidToken(azureDevOpsConfig);
          const configWithValidToken = {
            ...azureDevOpsConfig,
            accessToken: validToken,
            project: currentProject // Ensure we use the current project
          };

          const [projects, states, areaPaths, tags] = await Promise.all([
            azureService.fetchProjects(configWithValidToken).catch(error => {
              console.error('Error loading Azure DevOps projects:', error);
              return fallbackProjects;
            }),
            azureService.fetchAllStates(configWithValidToken),
            azureService.fetchAreaPaths(configWithValidToken),
            azureService.fetchTags(configWithValidToken)
          ]);

          // Only set options if project hasn't changed during the fetch
          // This prevents race conditions where old fetches complete after project change
          if (azureDevOpsConfig.project === currentProject) {
            setAvailableProjects(projects.length > 0 ? projects : fallbackProjects);
            setAvailableStates(states);
            setAvailableAreaPaths(areaPaths);
            setAvailableTags(tags);
          }
        } catch (error) {
          console.error('Error loading filter options:', error);
          // Only set fallback projects if project hasn't changed
          if (azureDevOpsConfig.project === currentProject) {
            setAvailableProjects(fallbackProjects);
          }
        }
      }
    }

    loadFilterOptions();
  }, [azureDevOpsConfig.enabled, azureDevOpsConfig.accessToken, azureDevOpsConfig.project, ensureValidToken]);

  

  // Add this callback to dynamically fetch states for a specific work item type
  const handleFetchStatesForType = useCallback(async (workItemType?: string, areaPaths?: string[]) => {
    if (!azureDevOpsConfig.enabled || !azureDevOpsConfig.accessToken) return;
    
    try {
      const validToken = await ensureValidToken(azureDevOpsConfig);
      const configWithValidToken = {
        ...azureDevOpsConfig,
        accessToken: validToken
      };
      const states = workItemType
        ? await azureService.fetchStates(configWithValidToken, workItemType)
        : await azureService.fetchAllStates(configWithValidToken);
      setAvailableStates(states);
    } catch (error) {
      console.error('Error loading states for work item type:', error);
    }
  }, [azureDevOpsConfig, ensureValidToken]);

  // Fetch types and states for area paths (bidirectional filtering)
  const handleFetchTypesAndStatesForAreaPath = useCallback(async (areaPaths: string[]): Promise<{ types: string[]; states: string[] }> => {
    if (!azureDevOpsConfig.enabled || !azureDevOpsConfig.accessToken) {
      return { types: [], states: [] };
    }
    
    try {
      const validToken = await ensureValidToken(azureDevOpsConfig);
      const configWithValidToken = {
        ...azureDevOpsConfig,
        accessToken: validToken
      };

      const result = await azureService.fetchTypesAndStatesForAreaPath(configWithValidToken, areaPaths);
      return result;
    } catch (error) {
      console.error('Error fetching types and states for area path:', error);
      return { types: [], states: [] };
    }
  }, [azureDevOpsConfig, ensureValidToken]);

  const handleFetchTypesAndAreaPathsForStates = useCallback(async (states: string[]): Promise<{ types: string[]; areaPaths: string[] }> => {
    if (!azureDevOpsConfig.enabled || !azureDevOpsConfig.accessToken) {
      return { types: [], areaPaths: [] };
    }

    try {
      const validToken = await ensureValidToken(azureDevOpsConfig);
      const configWithValidToken = {
        ...azureDevOpsConfig,
        accessToken: validToken
      };

      const result = await azureService.fetchTypesAndAreaPathsForStates(configWithValidToken, states);

      if (result.areaPaths.length > 0) {
        setAvailableAreaPaths(result.areaPaths);
      }

      return result;
    } catch (error) {
      console.error('Error fetching types and area paths for states:', error);
      return { types: [], areaPaths: [] };
    }
  }, [azureDevOpsConfig, ensureValidToken]);

  // Fetch types, states, and area paths for tags (bidirectional filtering)
  const handleFetchTypesAndStatesForTags = useCallback(async (tags: string[]): Promise<{ types: string[]; states: string[]; areaPaths: string[] }> => {
    if (!azureDevOpsConfig.enabled || !azureDevOpsConfig.accessToken) {
      return { types: [], states: [], areaPaths: [] };
    }
    
    try {
      const validToken = await ensureValidToken(azureDevOpsConfig);
      const configWithValidToken = {
        ...azureDevOpsConfig,
        accessToken: validToken
      };

      const result = await azureService.fetchTypesAndStatesForTags(configWithValidToken, tags);

      if (result.states.length > 0) {
        setAvailableStates(result.states);
      }
      if (result.areaPaths.length > 0) {
        setAvailableAreaPaths(result.areaPaths);
      }
      return result;
    } catch (error) {
      console.error('Error fetching types, states, and area paths for tags:', error);
      return { types: [], states: [], areaPaths: [] };
    }
  }, [azureDevOpsConfig, ensureValidToken]);

  // Fetch tags filtered by work item type, states, and area paths
  const handleFetchTagsForTypeStateAndAreaPath = useCallback(async (workItemType?: string, states: string[] = [], areaPaths: string[] = []) => {
    if (!azureDevOpsConfig.enabled || !azureDevOpsConfig.accessToken) return;
    
    try {
      const validToken = await ensureValidToken(azureDevOpsConfig);
      const configWithValidToken = {
        ...azureDevOpsConfig,
        accessToken: validToken
      };

      const tags = workItemType
        ? await azureService.fetchTagsForTypeStateAndAreaPath(configWithValidToken, workItemType, states, areaPaths)
        : await azureService.fetchTags(configWithValidToken);
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags for type, state, and area path:', error);
    }
  }, [azureDevOpsConfig, ensureValidToken]);

  // Fetch area paths filtered by work item type and states
  const handleFetchAreaPathsForTypeAndState = useCallback(async (workItemType?: string, states: string[] = []) => {
    if (!azureDevOpsConfig.enabled || !azureDevOpsConfig.accessToken) return;
    
    try {
      const validToken = await ensureValidToken(azureDevOpsConfig);
      const configWithValidToken = {
        ...azureDevOpsConfig,
        accessToken: validToken
      };

      const areaPaths = workItemType
        ? await azureService.fetchAreaPathsForTypeAndStates(configWithValidToken, workItemType, states)
        : await azureService.fetchAreaPaths(configWithValidToken);

      setAvailableAreaPaths(areaPaths);
    } catch (error) {
      console.error('Error loading area paths for type and state:', error);
    }
  }, [azureDevOpsConfig, ensureValidToken]);

  useEffect(() => {
    const checkVotingStatus = async () => {
      const isInVotingPeriod = isDateInRange(votingSession.startDate, votingSession.endDate);
      if (votingSession.isActive !== isInVotingPeriod) {
    const updatedSession = {
          ...votingSession,
          isActive: isInVotingPeriod
        };
        
        setVotingSession(updatedSession);
        
        try {
      if (currentSession?.id) {
        await db.updateVotingSessionById(currentSession.id, {
            title: updatedSession.title,
            goal: updatedSession.goal,
            votes_per_user: updatedSession.votesPerUser,
            start_date: updatedSession.startDate,
            end_date: updatedSession.endDate,
            is_active: updatedSession.isActive
        });
      }
        } catch (error) {
          console.error('Error updating voting session status:', error);
        }
      }
    };
    
    checkVotingStatus();
    const intervalId = setInterval(checkVotingStatus, 600000);
    return () => clearInterval(intervalId);
}, [votingSession, currentSession?.id]);

useEffect(() => {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';

  if (view === 'admin') {
    loadFeatureSuggestions();
    loadFutureSessions();
  }
}, [view, loadFeatureSuggestions, loadFutureSessions]);

  useEffect(() => {
    document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleFetchAzureDevOpsFeatures = useCallback(async (config = azureDevOpsConfig) => {
    if (!config.organization || !config.project || !currentSession) {
      setAzureFetchError("Organization and project name are required");
      return;
    }
    
    try {
      setIsFetchingAzureDevOps(true);
      setAzureFetchError(null);
      
      const validToken = await ensureValidToken(config);
      
      const configWithValidToken = {
        ...config,
        accessToken: validToken
      };
      
      const workItems = await azureService.fetchAzureDevOpsWorkItems(configWithValidToken);
      const newFeatures = azureService.convertWorkItemsToFeatures(workItems);
      
      for (const feature of newFeatures) {
        const existingFeatures = await db.getFeatures(currentSession.id);
        const existing = existingFeatures.find(f => f.azure_devops_id === feature.azureDevOpsId);
        
        const plainTextDescription = stripHtmlTags(feature.description);
        const truncatedDescription = truncateText(plainTextDescription, 300);
        
        if (existing) {
          await db.updateFeature(existing.id, {
            title: feature.title,
            description: truncatedDescription,
            epic: feature.epic || null,
            epicId: feature.epicId || null,
            state: feature.state,
            areaPath: feature.areaPath,
            tags: feature.tags,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl,
            workItemType: feature.workItemType || null
          });
        } else {
          await db.createFeature({
            session_id: currentSession.id,
            title: feature.title,
            description: truncatedDescription,
            epic: feature.epic || null,
            epicId: feature.epicId || null,
            state: feature.state,
            areaPath: feature.areaPath,
            tags: feature.tags,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl,
            workItemType: feature.workItemType || null
          });
        }
      }
      
      const allFeatures = await db.getFeatures(currentSession.id);
      const votesData = await db.getVotes(currentSession.id);
      
      const featuresWithVotes = allFeatures.map(feature => {
        const featureVotes = votesData.filter(v => v.feature_id === feature.id);
        const voters = featureVotes.map(v => ({
          userId: v.user_id,
          name: v.user_name,
          email: v.user_email,
          voteCount: v.vote_count
        }));
        const totalVotes = voters.reduce((sum, v) => sum + v.voteCount, 0);
        
        return {
          id: feature.id,
          title: feature.title,
          description: feature.description,
          epic: feature.epic || null,
          epicId: feature.epic_id || feature.epicId || null,
          state: feature.state,
          areaPath: feature.area_path || feature.areaPath || null,
          tags: feature.tags || [],
          azureDevOpsId: feature.azure_devops_id || feature.azureDevOpsId || null,
          azureDevOpsUrl: feature.azure_devops_url || feature.azureDevOpsUrl || null,
          workItemType: feature.workItemType || feature.work_item_type || null,
          votes: totalVotes,
          voters
        };
      });
      
      setFeatures(featuresWithVotes);
      
      const updatedConfig = {
        ...configWithValidToken,
        lastSyncTime: new Date().toISOString()
      };
      
      await db.saveAzureDevOpsConfig(currentSession.id, updatedConfig);
      setAzureDevOpsConfig(updatedConfig);
      
    } catch (error) {
      console.error('Azure DevOps sync error:', error);
      
      if (error instanceof Error && error.message === 'Not authenticated') {
        setAzureFetchError('Please authenticate with Azure DevOps');
        handleInitiateOAuth();
      } else {
        setAzureFetchError("Failed to fetch features from Azure DevOps. Please try reconnecting.");
      }
    } finally {
      setIsFetchingAzureDevOps(false);
    }
  }, [azureDevOpsConfig, currentSession, ensureValidToken, handleInitiateOAuth]);

  const handlePreviewAzureDevOpsFeatures = useCallback(async () => {
    if (!azureDevOpsConfig.organization || !azureDevOpsConfig.project) {
      setAzureFetchError("Organization and project name are required");
      return;
    }
    
    try {
      setIsFetchingAzureDevOps(true);
      setAzureFetchError(null);
      
      const validToken = await ensureValidToken(azureDevOpsConfig);
      
      const configWithValidToken = {
        ...azureDevOpsConfig,
        accessToken: validToken
      };
      
      const workItems = await azureService.fetchAzureDevOpsWorkItems(configWithValidToken);
      const newFeatures = azureService.convertWorkItemsToFeatures(workItems);
      
      const featuresWithTruncatedDescriptions = newFeatures.map(feature => {
        console.log(`[Preview] Feature ${feature.id} "${feature.title}": epic="${feature.epic}", epicId="${feature.epicId}"`);
        return {
          ...feature,
          description: truncateText(stripHtmlTags(feature.description), 300)
        };
      });
      
      console.log(`[Preview] Setting ${featuresWithTruncatedDescriptions.length} preview features`);
      setPreviewFeatures(featuresWithTruncatedDescriptions);
      setShowPreviewModal(true);
      
    } catch (error) {
      console.error('Azure DevOps preview error:', error);
      
      if (error instanceof Error && error.message === 'Not authenticated') {
        setAzureFetchError('Please authenticate with Azure DevOps');
        handleInitiateOAuth();
      } else {
        setAzureFetchError("Failed to fetch features from Azure DevOps. Please try reconnecting.");
      }
    } finally {
      setIsFetchingAzureDevOps(false);
    }
  }, [azureDevOpsConfig, ensureValidToken, handleInitiateOAuth]);

  const handleReplaceAll = useCallback(async () => {
    if (!previewFeatures || !currentSession) return;
    
    try {
      setIsFetchingAzureDevOps(true);
      
      // Delete all existing features
      const existingFeatures = await db.getFeatures(currentSession.id);
      for (const feature of existingFeatures) {
        await db.deleteFeature(feature.id);
      }
      
      // Add all preview features
      for (const feature of previewFeatures) {
        const plainTextDescription = stripHtmlTags(feature.description);
        const truncatedDescription = truncateText(plainTextDescription, 300);
        
        await db.createFeature({
          session_id: currentSession.id,
          title: feature.title,
          description: truncatedDescription,
          epic: feature.epic || null,
          state: feature.state,
          areaPath: feature.areaPath,
          tags: feature.tags,
          azure_devops_id: feature.azureDevOpsId,
          azure_devops_url: feature.azureDevOpsUrl
        });
      }
      
      const allFeatures = await db.getFeatures(currentSession.id);
      const votesData = await db.getVotes(currentSession.id);
      
      const featuresWithVotes = allFeatures.map(feature => {
        const featureVotes = votesData.filter(v => v.feature_id === feature.id);
        const voters = featureVotes.map(v => ({
          userId: v.user_id,
          name: v.user_name,
          email: v.user_email,
          voteCount: v.vote_count
        }));
        const totalVotes = voters.reduce((sum, v) => sum + v.voteCount, 0);
        
        return {
          id: feature.id,
          title: feature.title,
          description: feature.description,
          epic: feature.epic || null,
          epicId: feature.epic_id || feature.epicId || null,
          state: feature.state,
          areaPath: feature.area_path || feature.areaPath || null,
          tags: feature.tags || [],
          azureDevOpsId: feature.azure_devops_id || feature.azureDevOpsId || null,
          azureDevOpsUrl: feature.azure_devops_url || feature.azureDevOpsUrl || null,
          workItemType: feature.workItemType || feature.work_item_type || null,
          votes: totalVotes,
          voters
        };
      });
      
      setFeatures(featuresWithVotes);
      
      const updatedConfig = {
        ...azureDevOpsConfig,
        lastSyncTime: new Date().toISOString()
      };
      
      await db.saveAzureDevOpsConfig(currentSession.id, updatedConfig);
      setAzureDevOpsConfig(updatedConfig);
      
    } catch (error) {
      console.error('Azure DevOps replace all error:', error);
      setAzureFetchError("Failed to replace all features from Azure DevOps.");
    } finally {
      setIsFetchingAzureDevOps(false);
      setPreviewFeatures(null);
    }
  }, [previewFeatures, currentSession, azureDevOpsConfig]);

  // Conflict resolution state
  const [conflictModal, setConflictModal] = useState<{
    isOpen: boolean;
    feature: Feature | null;
    existingFeature: any | null;
    onResolve: (action: 'replace' | 'skip' | 'cancel' | 'replace-all') => void;
  }>({
    isOpen: false,
    feature: null,
    existingFeature: null,
    onResolve: () => {}
  });

  const handleConfirmSync = useCallback(async (selectedFeatures: Feature[]) => {
    if (!selectedFeatures || selectedFeatures.length === 0 || !currentSession) {
      console.error('handleConfirmSync: Invalid input', { selectedFeatures, currentSession });
      return;
    }
    
    try {
      setIsFetchingAzureDevOps(true);
      console.log('handleConfirmSync: Starting sync for', selectedFeatures.length, 'features');
      
      // Get all existing features once at the start
      const existingFeatures = await db.getFeatures(currentSession.id);
      
      const processedFeatures: Feature[] = [];
      let cancelled = false;
      let replaceAll = false;
      
      for (let i = 0; i < selectedFeatures.length; i++) {
        const feature = selectedFeatures[i];
        
        try {
          // Compare using both camelCase and snake_case fields
          const existing = existingFeatures.find(f => {
            const fId = f.azureDevOpsId || f.azure_devops_id;
            const featureId = feature.azureDevOpsId;
            return fId && featureId && (fId.toString() === featureId.toString());
          });
          
          const plainTextDescription = stripHtmlTags(feature.description);
          const truncatedDescription = truncateText(plainTextDescription, 300);
          
          if (existing) {
            // If replaceAll is true, skip the modal and replace automatically
            if (replaceAll) {
              console.log('handleConfirmSync: Auto-replacing existing feature (replace-all)', existing.id, feature.title);
              await db.updateFeature(existing.id, {
                title: feature.title,
                description: truncatedDescription,
                epic: feature.epic || null,
                epicId: feature.epicId || null,
                state: feature.state,
                areaPath: feature.areaPath,
                tags: feature.tags,
                azure_devops_id: feature.azureDevOpsId,
                azure_devops_url: feature.azureDevOpsUrl,
                workItemType: feature.workItemType || null
              });
              processedFeatures.push(feature);
              continue;
            }
            
            // Show conflict resolution modal
            const userAction = await new Promise<'replace' | 'skip' | 'cancel' | 'replace-all'>((resolve) => {
              setConflictModal({
                isOpen: true,
                feature: feature,
                existingFeature: existing,
                onResolve: (action) => {
                  setConflictModal({
                    isOpen: false,
                    feature: null,
                    existingFeature: null,
                    onResolve: () => {}
                  });
                  resolve(action);
                }
              });
            });
            
            if (userAction === 'cancel') {
              cancelled = true;
              break;
            } else if (userAction === 'skip') {
              console.log('handleConfirmSync: Skipping existing feature', existing.id, feature.title);
              continue;
            } else if (userAction === 'replace-all') {
              replaceAll = true;
              console.log('handleConfirmSync: Replace-all selected, replacing current and all future conflicts');
              await db.updateFeature(existing.id, {
                title: feature.title,
                description: truncatedDescription,
                epic: feature.epic || null,
                epicId: feature.epicId || null,
                state: feature.state,
                areaPath: feature.areaPath,
                tags: feature.tags,
                azure_devops_id: feature.azureDevOpsId,
                azure_devops_url: feature.azureDevOpsUrl,
                workItemType: feature.workItemType || null
              });
              processedFeatures.push(feature);
            } else if (userAction === 'replace') {
              console.log('handleConfirmSync: Replacing existing feature', existing.id, feature.title);
              await db.updateFeature(existing.id, {
                title: feature.title,
                description: truncatedDescription,
                epic: feature.epic || null,
                epicId: feature.epicId || null,
                state: feature.state,
                areaPath: feature.areaPath,
                tags: feature.tags,
                azure_devops_id: feature.azureDevOpsId,
                azure_devops_url: feature.azureDevOpsUrl,
                workItemType: feature.workItemType || null
              });
              processedFeatures.push(feature);
            }
          } else {
            console.log('handleConfirmSync: Creating new feature', feature.title, feature.azureDevOpsId);
            const created = await db.createFeature({
              session_id: currentSession.id,
              title: feature.title,
              description: truncatedDescription,
              epic: feature.epic || null,
              epicId: feature.epicId || null,
              state: feature.state,
              areaPath: feature.areaPath,
              tags: feature.tags,
              azure_devops_id: feature.azureDevOpsId,
              azure_devops_url: feature.azureDevOpsUrl,
              workItemType: feature.workItemType || null
            });
            console.log('handleConfirmSync: Created feature', created);
            processedFeatures.push(feature);
          }
        } catch (featureError) {
          console.error('handleConfirmSync: Error processing feature', feature.title, featureError);
          throw featureError;
        }
      }
      
      if (cancelled) {
        console.log('handleConfirmSync: Sync cancelled by user');
        return;
      }
      
      console.log('handleConfirmSync: Fetching all features after sync');
      // Add a small delay to ensure database writes are committed
      await new Promise(resolve => setTimeout(resolve, 200));
      const allFeatures = await db.getFeatures(currentSession.id);
      console.log('handleConfirmSync: Retrieved', allFeatures.length, 'features from database');
      console.log('handleConfirmSync: Feature IDs:', allFeatures.map(f => ({ id: f.id, title: f.title, azureId: f.azure_devops_id || f.azureDevOpsId })));
      const votesData = await db.getVotes(currentSession.id);
      
      const featuresWithVotes = allFeatures.map(feature => {
        const featureVotes = votesData.filter(v => v.feature_id === feature.id);
        const voters = featureVotes.map(v => ({
          userId: v.user_id,
          name: v.user_name,
          email: v.user_email,
          voteCount: v.vote_count
        }));
        const totalVotes = voters.reduce((sum, v) => sum + v.voteCount, 0);
        
        return {
          id: feature.id,
          title: feature.title,
          description: feature.description,
          epic: feature.epic || null,
          epicId: feature.epic_id || feature.epicId || null,
          state: feature.state,
          areaPath: feature.area_path || feature.areaPath || null,
          tags: feature.tags || [],
          azureDevOpsId: feature.azure_devops_id || feature.azureDevOpsId || null,
          azureDevOpsUrl: feature.azure_devops_url || feature.azureDevOpsUrl || null,
          workItemType: feature.workItemType || feature.work_item_type || null,
          votes: totalVotes,
          voters
        };
      });
      
      console.log('handleConfirmSync: Setting features with votes', featuresWithVotes.length);
      // Use functional update to ensure we're working with latest state
      setFeatures(() => featuresWithVotes);
      
      // Force a small delay to ensure state update propagates and React re-renders
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const updatedConfig = {
        ...azureDevOpsConfig,
        lastSyncTime: new Date().toISOString()
      };
      
      await db.saveAzureDevOpsConfig(currentSession.id, updatedConfig);
      setAzureDevOpsConfig(updatedConfig);
      
      console.log('handleConfirmSync: Sync completed successfully');
      
    } catch (error) {
      console.error('Azure DevOps sync error:', error);
      setAzureFetchError("Failed to sync features from Azure DevOps.");
      throw error; // Re-throw so modal can handle it
    } finally {
      setIsFetchingAzureDevOps(false);
      setPreviewFeatures(null);
    }
  }, [currentSession, azureDevOpsConfig]);

  const handleDisconnectAzureDevOps = useCallback(async () => {
    if (!currentSession) return;
    
    try {
      const updatedConfig = {
        organization: azureDevOpsConfig.organization || 'newmill',
        project: azureDevOpsConfig.project || 'Product',
        workItemType: azureDevOpsConfig.workItemType || 'Feature',
        query: azureDevOpsConfig.query,
        accessToken: undefined,
        refreshToken: undefined,
        tokenExpiresAt: undefined,
        enabled: false
      };
      
      await db.saveAzureDevOpsConfig(currentSession.id, updatedConfig);
      setAzureDevOpsConfig(updatedConfig);
      setAzureFetchError(null);
      
    } catch (error) {
      console.error('Error disconnecting Azure DevOps:', error);
      setAzureFetchError("Failed to disconnect from Azure DevOps");
    }
  }, [azureDevOpsConfig, currentSession]);

  // After OAuth completes and tokens are present, automatically resume intended action
  useEffect(() => {
    const maybeResumePostOAuth = async () => {
      const action = sessionStorage.getItem('oauth_action');
      if (!action) return;
      if (!azureDevOpsConfig.enabled || !azureDevOpsConfig.accessToken) return;
      try {
        if (action === 'preview') {
          await handlePreviewAzureDevOpsFeatures();
        } else if (action === 'sync') {
          await handleFetchAzureDevOpsFeatures();
        }
      } finally {
        sessionStorage.removeItem('oauth_action');
      }
    };
    maybeResumePostOAuth();
  }, [azureDevOpsConfig.enabled, azureDevOpsConfig.accessToken, handlePreviewAzureDevOpsFeatures, handleFetchAzureDevOpsFeatures]);

  const handleToggleAdmin = useCallback(() => {
    navigate('/admin');
  }, [navigate]);

  const handleShowVoting = useCallback(() => {
    // If we're on the admin page, navigate to /vote instead of changing view state
    if (adminMode) {
      navigate('/vote');
      return;
    }
    setIsAdmin(false);
    // Reset to primary role perspective when switching to voting view
    const primaryPerspective = isSystemAdmin ? 'system' : 'session';
    setAdminPerspective(primaryPerspective);
    sessionStorage.setItem('adminPerspective', primaryPerspective);
    // Also update viewMode for consistency
    sessionStorage.setItem('viewMode', 'stakeholder');
    setView('voting');
  }, [isSystemAdmin, adminMode, navigate]);

  const handleSelectSessionPerspective = useCallback(() => {
    setIsAdmin(true);
    setAdminPerspective('session');
    sessionStorage.setItem('adminPerspective', 'session');
    // Also update viewMode for consistency
    sessionStorage.setItem('viewMode', 'admin');
    if (adminMode) {
      if (view !== 'admin') {
        setView('admin');
      }
    } else if (view !== 'voting') {
      setView('voting');
    }
  }, [adminMode, view]);

  const handleSelectSystemPerspective = useCallback(() => {
    if (!isSystemAdmin) return;
    setIsAdmin(true);
    setAdminPerspective('system');
    sessionStorage.setItem('adminPerspective', 'system');
    // Also update viewMode for consistency
    sessionStorage.setItem('viewMode', 'system-admin');
    if (adminMode) {
      if (view !== 'admin') {
        setView('admin');
      }
    } else if (view !== 'voting') {
      setView('voting');
    }
  }, [view, isSystemAdmin, adminMode]);

  const handleAddFeature = useCallback(async (feature: any) => {
    if (!currentSession) return;
    
    try {
      const newFeature = await db.createFeature({
        session_id: currentSession.id,
        title: feature.title,
        description: feature.description,
        epic: feature.epic
      });
      
      setFeatures(prev => [...prev, {
        id: newFeature.id,
        title: newFeature.title,
        description: newFeature.description,
        epic: newFeature.epic,
        votes: 0,
        voters: []
      }]);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding feature:', error);
      alert('Failed to add feature');
    }
  }, [currentSession]);

  const handleUpdateFeature = useCallback(async (updatedFeature: Feature) => {
    try {
      await db.updateFeature(updatedFeature.id, {
        title: updatedFeature.title,
        description: updatedFeature.description,
        epic: updatedFeature.epic,
        epicId: updatedFeature.epicId || null
      });
      
      setFeatures(prev => prev.map(f => f.id === updatedFeature.id ? updatedFeature : f));
      setEditingFeature(null);
    } catch (error) {
      console.error('Error updating feature:', error);
      alert('Failed to update feature');
    }
  }, []);

  const handleDeleteFeature = useCallback(async (id: string) => {
    try {
      await db.deleteFeature(id);
      setFeatures(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Error deleting feature:', error);
      alert('Failed to delete feature');
    }
  }, []);

  const initiateResetVotes = useCallback((id: string) => {
    setConfirmState(prev => ({
      ...prev,
      showReset: true,
      showResetAll: false,
      showDeleteSession: false,
      targetId: id
    }));
  }, []);

  const handleResetVotes = useCallback(async () => {
    const id = confirmState.targetId;
    if (!id || !currentSession) return;
    
    try {
      await db.deleteVotesForFeature(currentSession.id, id);
      const refreshed = await buildFeaturesWithVotes();
      setFeatures(refreshed);
    } catch (error) {
      console.error('Error resetting votes:', error);
      alert('Failed to reset votes');
    }
  }, [confirmState.targetId, currentSession, buildFeaturesWithVotes]);

  const initiateResetAllVotes = useCallback(() => {
    setConfirmState(prev => ({
      ...prev,
      showReset: false,
      showResetAll: true,
      showDeleteSession: false,
      targetId: null
    }));
  }, []);

const handleRequestDeleteSession = useCallback(() => {
  setConfirmState(prev => ({
    ...prev,
    showReset: false,
    showResetAll: false,
    showDeleteSession: true,
    targetId: null
  }));
}, []);

const handleDeleteSession = useCallback(async () => {
  if (!currentSession) return;
  
  setIsDeletingSession(true);
  
  try {
    // Delete the session
    await db.deleteSession(currentSession.id);
    
    // Clear local state
    setCurrentSession(null as any);
    
    // Clear localStorage
    try {
      localStorage.removeItem('voting_system_current_session');
    } catch {}
    
    // Refresh sessions list
    await refreshSessions();
    
    // Navigate to sessions page
    navigate('/sessions', { replace: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    alert('Failed to delete session. Please try again.');
  } finally {
    setIsDeletingSession(false);
    setConfirmState(prev => ({ ...prev, showDeleteSession: false }));
  }
}, [currentSession, navigate, setCurrentSession, refreshSessions]);

  
  const handleResetAllVotes = useCallback(async () => {
    if (!currentSession) return;
    
    try {
      await db.deleteAllVotes(currentSession.id);
      const refreshed = await buildFeaturesWithVotes();
      setFeatures(refreshed);
    } catch (error) {
      console.error('Error resetting all votes:', error);
      alert('Failed to reset all votes');
    }
  }, [currentSession, buildFeaturesWithVotes]);

  const handlePendingVote = useCallback((featureId: string, increment: boolean) => {
    if (!currentUser || !votingSession.isActive) return;
    
    const currentVoteCount = pendingVotes[featureId] || 0;
    let newVoteCount = currentVoteCount;
    
    if (increment) {
      if (pendingUsedVotes < effectiveVotesPerUser) {
        newVoteCount = currentVoteCount + 1;
      } else {
        return;
      }
    } else {
      if (currentVoteCount > 0) {
        newVoteCount = currentVoteCount - 1;
      } else {
        return;
      }
    }
    
    setPendingVotes(prev => {
      const updated = { ...prev };
      if (newVoteCount === 0) {
        delete updated[featureId];
      } else {
        updated[featureId] = newVoteCount;
      }
      return updated;
    });
    
    setPendingUsedVotes(prev => increment ? prev + 1 : prev - 1);
  }, [currentUser, pendingVotes, pendingUsedVotes, votingSession.isActive, effectiveVotesPerUser]);

  const handleSubmitVotes = useCallback(async () => {
    if (!currentUser || !votingSession.isActive || !currentSession) return;
    if (pendingUsedVotes < effectiveVotesPerUser) return;
    
    try {
      for (const [featureId, voteCount] of Object.entries(pendingVotes)) {
        if (voteCount > 0) {
          await db.saveVote({
            session_id: currentSession.id,
            feature_id: featureId,
            user_id: currentUser.id,
            user_name: currentUser.name,
            user_email: currentUser.email,
            vote_count: voteCount
          });
        }
      }
      
      const featuresData = await db.getFeatures(currentSession.id);
      const votesData = await db.getVotes(currentSession.id);
      
      const featuresWithVotes = featuresData.map(feature => {
        const featureVotes = votesData.filter(v => v.feature_id === feature.id);
        const voters = featureVotes.map(v => ({
          userId: v.user_id,
          name: v.user_name,
          email: v.user_email,
          voteCount: v.vote_count
        }));
        const totalVotes = voters.reduce((sum, v) => sum + v.voteCount, 0);
        
        return {
          id: feature.id,
          title: feature.title,
          description: feature.description,
          epic: feature.epic,
          state: feature.state,
          areaPath: feature.area_path,
          tags: feature.tags || [],
          azureDevOpsId: feature.azure_devops_id,
          azureDevOpsUrl: feature.azure_devops_url,
          votes: totalVotes,
          voters
        };
      });
      
      setFeatures(featuresWithVotes);
      setView('thankyou');
    } catch (error) {
      console.error('Error submitting votes:', error);
      alert('Failed to submit votes. Please try again.');
    }
  }, [currentUser, currentSession, pendingUsedVotes, pendingVotes, votingSession.isActive, effectiveVotesPerUser]);

  const handleUpdateVotingSession = useCallback(async (updatedSession: VotingSession) => {
    const baseUpdates: Record<string, any> = {
      title: updatedSession.title,
      goal: updatedSession.goal,
      votes_per_user: updatedSession.votesPerUser,
      start_date: updatedSession.startDate,
      end_date: updatedSession.endDate,
      is_active: updatedSession.isActive,
      use_auto_votes: updatedSession.useAutoVotes,
      product_id: updatedSession.product_id ?? null,
      product_name: null // Products table is single source of truth - don't store product_name
    };

    const metadataUpdates: Record<string, string | null> = {};

    const assignField = (
      value: string | null | undefined,
      columnName: keyof typeof metadataUpdates
    ) => {
      if (value !== undefined) {
        metadataUpdates[columnName] = value;
      }
    };

    assignField(updatedSession.originalEndDate, 'original_end_date');
    assignField(updatedSession.endedEarlyBy, 'ended_early_by');
    assignField(updatedSession.endedEarlyReason, 'ended_early_reason');
    assignField(updatedSession.endedEarlyDetails, 'ended_early_details');
    assignField(updatedSession.reopenReason, 'reopen_reason');
    assignField(updatedSession.reopenDetails, 'reopen_details');
    assignField(updatedSession.reopenedBy, 'reopened_by');
    assignField(updatedSession.reopenedAt, 'reopened_at');

    const fullUpdates = { ...baseUpdates, ...metadataUpdates };

    const runUpdate = async (updates: Record<string, any>) => {
      if (currentSession?.id) {
        await db.updateVotingSessionById(currentSession.id, updates);
      } else {
        await db.updateVotingSession(updates);
      }
    };

    try {
      await runUpdate(fullUpdates);

      setVotingSession(updatedSession);

      if (currentSession?.id) {
        setCurrentSession({
          ...currentSession,
          title: baseUpdates.title ?? currentSession.title,
          goal: baseUpdates.goal ?? currentSession.goal,
          votes_per_user: baseUpdates.votes_per_user ?? currentSession.votes_per_user,
          use_auto_votes: baseUpdates.use_auto_votes ?? currentSession.use_auto_votes,
          start_date: baseUpdates.start_date ?? currentSession.start_date,
          end_date: baseUpdates.end_date ?? currentSession.end_date,
          is_active: baseUpdates.is_active ?? currentSession.is_active,
          product_id:
            baseUpdates.product_id !== undefined
              ? baseUpdates.product_id ?? null
              : updatedSession.product_id ?? currentSession.product_id ?? null,
          product_name: null, // Products table is single source of truth - don't store product_name
          original_end_date:
            metadataUpdates.original_end_date ?? currentSession.original_end_date ?? null,
          ended_early_by:
            metadataUpdates.ended_early_by ?? currentSession.ended_early_by ?? null,
          ended_early_reason:
            metadataUpdates.ended_early_reason ?? currentSession.ended_early_reason ?? null,
          ended_early_details:
            metadataUpdates.ended_early_details ?? currentSession.ended_early_details ?? null,
          reopen_reason:
            metadataUpdates.reopen_reason ?? currentSession.reopen_reason ?? null,
          reopen_details:
            metadataUpdates.reopen_details ?? currentSession.reopen_details ?? null,
          reopened_by:
            metadataUpdates.reopened_by ?? currentSession.reopened_by ?? null,
          reopened_at:
            metadataUpdates.reopened_at ?? currentSession.reopened_at ?? null,
        });
      }
    } catch (error: any) {
      const message = error?.message?.toLowerCase?.() ?? '';
      const missingColumn =
        message.includes('column') &&
        (message.includes('reopen_reason') ||
          message.includes('reopen_details') ||
          message.includes('reopened_by') ||
          message.includes('reopened_at') ||
          message.includes('original_end_date') ||
          message.includes('ended_early_by') ||
          message.includes('ended_early_reason') ||
          message.includes('ended_early_details'));
      const missingProductName =
        message.includes('product_name') || message.includes('"product_name"');
      const missingProductId =
        message.includes('product_id') || message.includes('"product_id"');

      if (missingColumn || missingProductName || missingProductId) {
        console.warn(
          '[FeatureVoting] Voting session metadata/product columns missing, falling back to basic update.',
          error
        );

        try {
          const sanitizedBaseUpdates = { ...baseUpdates };
          if (missingProductName) {
            delete sanitizedBaseUpdates.product_name;
          }
          if (missingProductId) {
            delete sanitizedBaseUpdates.product_id;
          }

          await runUpdate(sanitizedBaseUpdates);

          setVotingSession(updatedSession);

          if (currentSession?.id) {
            setCurrentSession({
              ...currentSession,
              title: sanitizedBaseUpdates.title ?? currentSession.title,
              goal: sanitizedBaseUpdates.goal ?? currentSession.goal,
              votes_per_user:
                sanitizedBaseUpdates.votes_per_user ?? currentSession.votes_per_user,
              use_auto_votes:
                sanitizedBaseUpdates.use_auto_votes ?? currentSession.use_auto_votes,
              start_date: sanitizedBaseUpdates.start_date ?? currentSession.start_date,
              end_date: sanitizedBaseUpdates.end_date ?? currentSession.end_date,
              is_active: sanitizedBaseUpdates.is_active ?? currentSession.is_active,
              product_id:
                sanitizedBaseUpdates.product_id !== undefined
                  ? sanitizedBaseUpdates.product_id ?? null
                  : updatedSession.productId ?? currentSession.product_id ?? null,
              product_name: null, // Products table is single source of truth - don't store product_name
              original_end_date:
                updatedSession.originalEndDate ?? currentSession.original_end_date ?? null,
              ended_early_by:
                updatedSession.endedEarlyBy ?? currentSession.ended_early_by ?? null,
              ended_early_reason:
                updatedSession.endedEarlyReason ?? currentSession.ended_early_reason ?? null,
              ended_early_details:
                updatedSession.endedEarlyDetails ?? currentSession.ended_early_details ?? null,
              reopen_reason:
                updatedSession.reopenReason ?? currentSession.reopen_reason ?? null,
              reopen_details:
                updatedSession.reopenDetails ?? currentSession.reopen_details ?? null,
              reopened_by:
                updatedSession.reopenedBy ?? currentSession.reopened_by ?? null,
              reopened_at:
                updatedSession.reopenedAt ?? currentSession.reopened_at ?? null
            });
          }
        } catch (fallbackError) {
          console.error('Error updating voting session (fallback):', fallbackError);
          alert('Failed to update voting session settings');
        }
      } else {
        console.error('Error updating voting session:', error);
        alert('Failed to update voting session settings');
      }
    }
  }, [currentSession, setCurrentSession]);

  const handleUpdateAzureDevOpsConfig = useCallback(async (config: AzureDevOpsConfig) => {
    if (!currentSession) return;
    
    setAzureDevOpsConfig(config);
    
    try {
      await db.saveAzureDevOpsConfig(currentSession.id, {
        organization: config.organization,
        project: config.project,
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        tokenExpiresAt: config.tokenExpiresAt,
        tenantId: config.tenantId,
        clientId: config.clientId,
        enabled: config.enabled,
        workItemType: config.workItemType,
        query: config.query,
        lastSyncTime: config.lastSyncTime
      });
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }, [currentSession]);

  const handleShowResultsPage = useCallback(() => {
    // When on /admin route, always navigate to /results
    if (adminMode) {
      navigate('/results');
    } else if (currentSession) {
      navigate('/results');
    } else {
      setView('results');
    }
  }, [adminMode, currentSession, navigate]);

  const renderContent = useMemo(() => {
    // When adminMode is true, always render AdminDashboard regardless of view state
    if (adminMode) {
      return (
        <AdminDashboard 
              features={features} 
              onAddFeature={handleAddFeature} 
              onUpdateFeature={handleUpdateFeature} 
              onDeleteFeature={handleDeleteFeature}
              onShowResults={handleShowResultsPage}
              onRequestDeleteSession={handleRequestDeleteSession}
              isDeletingSession={isDeletingSession}
              showAddForm={showAddForm}
              setShowAddForm={setShowAddForm}
              editingFeature={editingFeature}
              setEditingFeature={setEditingFeature}
              onLogout={handleLogout}
              onShowVoterView={handleShowVoting}
              votingSession={votingSession}
              azureDevOpsConfig={azureDevOpsConfig}
              onUpdateAzureDevOpsConfig={handleUpdateAzureDevOpsConfig}
              onPreviewAzureDevOpsFeatures={handlePreviewAzureDevOpsFeatures}
              onDisconnectAzureDevOps={handleDisconnectAzureDevOps}
              isFetchingAzureDevOps={isFetchingAzureDevOps}
              azureFetchError={azureFetchError}
              onInitiateOAuth={handleInitiateOAuth}
              availableStates={availableStates}
              availableAreaPaths={availableAreaPaths}
              availableTags={availableTags}
              previewFeatures={previewFeatures}
              showPreviewModal={showPreviewModal}
              setShowPreviewModal={setShowPreviewModal}
              onConfirmSync={handleConfirmSync}
              onReplaceAll={handleReplaceAll}
              onUpdateVotingSession={handleUpdateVotingSession}
              onFetchStatesForType={handleFetchStatesForType}
              onFetchAreaPathsForTypeAndState={handleFetchAreaPathsForTypeAndState}
              onFetchTagsForTypeStateAndAreaPath={handleFetchTagsForTypeStateAndAreaPath}
              onFetchTypesAndStatesForAreaPath={handleFetchTypesAndStatesForAreaPath}
              onFetchTypesAndStatesForTags={handleFetchTypesAndStatesForTags}
              onFetchTypesAndAreaPathsForStates={handleFetchTypesAndAreaPathsForStates}
              suggestedFeatures={suggestedFeatures}
              otherSessions={futureSessions}
              onPromoteSuggestion={handlePromoteSuggestion}
              onMoveSuggestion={handleMoveSuggestion}
              onEditSuggestion={handleUpdateSuggestion}
              onDeleteSuggestion={handleDeleteSuggestion}
              adminPerspective={adminPerspective}
              projectOptions={availableProjects}
            />
      );
    }

    // For non-admin mode, use the switch statement based on view
    // If view is 'admin' but we're not in adminMode, default to 'voting'
    const effectiveView = (view === 'admin' && !adminMode) ? 'voting' : view;
    
    switch (effectiveView) {
      case 'voting':
        return (
          <VotingScreen 
            features={features} 
            currentUser={currentUser} 
            pendingVotes={pendingVotes}
            pendingUsedVotes={pendingUsedVotes}
            onVote={handlePendingVote}
            onSubmitVotes={handleSubmitVotes}
            onToggleAdmin={handleToggleAdmin}
            isAdmin={isAdmin}
            votingSession={votingSession}
            navigate={navigate}
            effectiveVotesPerUser={effectiveVotesPerUser}
            sessionId={currentSession?.id || ''}
            onLogout={handleLogout}
            onSuggestionSubmitted={handleSuggestionSubmitted}
            isSystemAdmin={isSystemAdmin}
            isSessionAdmin={sessionAdminRole}
            isStakeholder={isStakeholder}
            currentRole={isAdmin ? (adminPerspective === 'system' ? 'system-admin' : 'session-admin') : 'stakeholder'}
          />
        );
      case 'results':
        return (
          <ResultsScreen 
            features={features} 
            onResetVotes={initiateResetVotes}
            onResetAllVotes={initiateResetAllVotes}
            onBack={resultsMode ? () => navigate('../admin') : () => setView('admin')}
            showVotersList={showVotersList}
            setShowVotersList={setShowVotersList}
            votingSession={votingSession}
            effectiveVotesPerUser={effectiveVotesPerUser}
            onLogout={handleLogout}
            currentUser={currentUser}
            isSystemAdmin={isSystemAdmin}
            isSessionAdmin={sessionAdminRole}
            isStakeholder={isStakeholder}
            currentRole={isAdmin ? (adminPerspective === 'system' ? 'system-admin' : 'session-admin') : 'stakeholder'}
          />
        );
      case 'thankyou':
        return (
          <ThankYouScreen
            navigate={navigate}
            votingSession={votingSession}
          />
        );
      default:
        // This should never happen, but fallback to voting screen
        return (
          <VotingScreen 
            features={features} 
            currentUser={currentUser} 
            pendingVotes={pendingVotes}
            pendingUsedVotes={pendingUsedVotes}
            onVote={handlePendingVote}
            onSubmitVotes={handleSubmitVotes}
            onToggleAdmin={handleToggleAdmin}
            isAdmin={isAdmin}
            votingSession={votingSession}
            navigate={navigate}
            effectiveVotesPerUser={effectiveVotesPerUser}
            sessionId={currentSession?.id || ''}
            onLogout={handleLogout}
            onSuggestionSubmitted={handleSuggestionSubmitted}
            isSystemAdmin={isSystemAdmin}
            isSessionAdmin={sessionAdminRole}
            isStakeholder={isStakeholder}
            currentRole={isAdmin ? (adminPerspective === 'system' ? 'system-admin' : 'session-admin') : 'stakeholder'}
          />
        );
    }
  }, [
    view, features, currentUser, pendingVotes, pendingUsedVotes, 
    handlePendingVote, handleSubmitVotes, handleToggleAdmin, isAdmin, 
    votingSession, initiateResetVotes, initiateResetAllVotes, showVotersList,
    setShowVotersList, handleAddFeature, handleUpdateFeature,
    handleDeleteFeature, showAddForm, setShowAddForm, editingFeature,
    setEditingFeature, azureDevOpsConfig, handleUpdateAzureDevOpsConfig,
    handleFetchAzureDevOpsFeatures, handlePreviewAzureDevOpsFeatures,
    handleDisconnectAzureDevOps, isFetchingAzureDevOps, azureFetchError, handleInitiateOAuth,
    previewFeatures, showPreviewModal, setShowPreviewModal, handleConfirmSync,
    navigate, effectiveVotesPerUser, adminMode,
    availableStates, availableAreaPaths, availableTags, handleFetchStatesForType, currentSession,
    handleShowVoting, handleSuggestionSubmitted, suggestedFeatures,
    futureSessions, handlePromoteSuggestion, handleMoveSuggestion, handleUpdateSuggestion, handleDeleteSuggestion, adminPerspective,
    availableProjects, handleShowResultsPage
  ]);

  // Conflict Resolution Modal Component
  const ConflictResolutionModal = () => {
    const { feature, existingFeature } = conflictModal;
    
    // Prevent body scrolling when modal is open
    useEffect(() => {
      if (conflictModal.isOpen) {
        // Save the current scroll position
        const scrollY = window.scrollY;
        // Prevent scrolling
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        
        return () => {
          // Restore scrolling when modal closes
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          document.body.style.overflow = '';
          window.scrollTo(0, scrollY);
        };
      }
    }, [conflictModal.isOpen]);
    
    if (!conflictModal.isOpen || !feature || !existingFeature) {
      return null;
    }

    return (
      <div className="fixed inset-0 z-[60] overflow-y-auto">
        <div className="flex items-start justify-center min-h-screen p-4 text-center pt-8 sm:pt-16">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 transition-opacity bg-black/50"
            onClick={() => conflictModal.onResolve('cancel')}
            aria-hidden="true"
          ></div>
          
          <div className="inline-block w-full max-w-2xl mb-8 overflow-visible text-left align-middle transition-all transform bg-white shadow-xl rounded-lg relative z-10">
            <div className="flex items-start justify-between mb-5 p-6 pb-0">
              <div className="flex items-center gap-3 bg-[#FFF7E2] border border-[#C89212]/40 rounded-xl px-6 py-3 shadow-sm w-full mr-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#C89212]/15 text-[#C89212]">
                  <Lightbulb className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#2d4660] tracking-tight">Work Item Already Exists</h3>
                  <p className="text-xs text-[#8A6D3B] font-medium mt-1 uppercase tracking-widest">
                    Spark the roadmap with your ideas
                  </p>
                </div>
              </div>
              <button
                onClick={() => conflictModal.onResolve('cancel')}
                className="ml-3 text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    This work item already exists in your voting session. What would you like to do?
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Existing Work Item:</h4>
                    <p className="text-sm text-gray-700">{existingFeature.title}</p>
                    {existingFeature.azureDevOpsId && (
                      <p className="text-xs text-gray-500 mt-1">Azure DevOps ID: {existingFeature.azureDevOpsId}</p>
                    )}
                  </div>

                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h4 className="font-semibold text-blue-900 mb-2">New Work Item:</h4>
                    <p className="text-sm text-blue-700">{feature.title}</p>
                    {feature.azureDevOpsId && (
                      <p className="text-xs text-blue-600 mt-1">Azure DevOps ID: {feature.azureDevOpsId}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button
                    variant="primary"
                    onClick={() => conflictModal.onResolve('replace-all')}
                  >
                    Replace All Selected
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => conflictModal.onResolve('cancel')}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => conflictModal.onResolve('skip')}
                    >
                      Skip
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => conflictModal.onResolve('replace')}
                    >
                      Replace
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // IMPORTANT: Return loading check AFTER all hooks
  if (!currentSession) {
    return (
      <>
        <ConflictResolutionModal />
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading session...</p>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && view !== 'voting' && view !== 'thankyou') {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading voting experience...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConflictResolutionModal />
      <div className="w-full bg-gray-50 text-gray-900 font-sans min-h-screen flex flex-col">
        <div className="flex-grow">
          {renderContent}
        </div>
        
        <Footer 
        currentRole={isAdmin ? (adminPerspective === 'system' ? 'system-admin' : 'session-admin') : 'stakeholder'}
        onSelectStakeholder={handleShowVoting}
        onSelectSessionAdmin={isAdmin || isSystemAdmin ? handleSelectSessionPerspective : undefined}
        onSelectSystemAdmin={isSystemAdmin ? handleSelectSystemPerspective : undefined}
        showRoleToggle={isSystemAdmin || sessionAdminRole}
      />
      
      <ConfirmDialog
        show={confirmState.showReset}
        title="Reset Votes"
        message="Are you sure you want to reset all votes for this feature? This will remove all voting data for this feature."
        onConfirm={handleResetVotes}
        onCancel={() => setConfirmState(prev => ({ ...prev, showReset: false }))}
        confirmText="Reset"
        type="reset"
      />
      
      <ConfirmDialog
        show={confirmState.showResetAll}
        title="Reset All Votes"
        message="Are you sure you want to reset all votes for all features? This will remove all voting data and cannot be undone."
        onConfirm={handleResetAllVotes}
        onCancel={() => setConfirmState(prev => ({ ...prev, showResetAll: false }))}
        confirmText="Reset All"
        type="reset"
      />

      <ConfirmDialog
        show={confirmState.showDeleteSession}
        title="Delete Voting Session"
        message="This will permanently delete the current voting session for all admins and stakeholders. Votes, notes, and settings for this session will be removed. This action cannot be undone."
        onConfirm={handleDeleteSession}
        onCancel={() => setConfirmState(prev => ({ ...prev, showDeleteSession: false }))}
        confirmText={isDeletingSession ? 'Deleting…' : 'Delete Session'}
        type="delete"
      />
      </div>
    </>
  );
}

export default FeatureVotingSystem;

// ============================================
// END OF FILE
// ============================================