// ============================================
// FeatureVotingSystem.tsx - Complete Component
// ============================================
// Location: src/components/FeatureVotingSystem.tsx
// ============================================

import React, { useState, useEffect, useRef, useMemo, useCallback, Component } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { 
  Plus, Edit, Trash2, X, ChevronLeft, BarChart2, Settings, 
  Vote, LogOut, Users, ChevronUp, ChevronDown, Calendar, Clock, 
  Shuffle, CheckCircle, AlertTriangle, AlertCircle, Tag, RefreshCw, 
  Cloud, Database, Search, Shield, List
} from "lucide-react";

// Import services
import * as db from '../services/databaseService';
import * as azureService from '../services/azureDevOpsService';

// Import context
import { useSession } from '../contexts/SessionContext';

// Import types
import type { AzureDevOpsConfig, Feature, VoterInfo } from '../types/azure';

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
  isActive: true
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

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

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

const isPastDate = (dateString: string): boolean => {
  return new Date(dateString) < new Date();
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
    gold: "bg-[#C89212] text-white hover:bg-[#A67810]",
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
}

class Modal extends Component<ModalProps> {
  render() {
    const { isOpen, onClose, title, children, maxWidth = "max-w-2xl" } = this.props;
    
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen p-4 text-center">
          <div 
            className="fixed inset-0 transition-opacity bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          ></div>
          
          <div className={`inline-block w-full ${maxWidth} p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-[#2d4660]">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

interface EpicTagProps {
  name: string;
}

const EpicTag = React.memo(function EpicTag({ name }: EpicTagProps) {
  if (!name) return null;
  
  return (
    <div className="flex items-center text-xs text-[#2d4660]">
      <Tag className="h-3 w-3 mr-1 text-[#2d4660]" />
      <span className="font-medium">{truncateText(name, 30)}</span>
    </div>
  );
});

interface AzureDevOpsBadgeProps {
  id: string;
  url: string;
}

const AzureDevOpsBadge = React.memo(function AzureDevOpsBadge({ id, url }: AzureDevOpsBadgeProps) {
  if (!id) return null;
  
  return (
    <a 
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
      title="View in Azure DevOps"
    >
      <Database className="h-3 w-3 mr-1" />
      #{id}
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
      className={`py-2 px-4 rounded-lg flex items-center transition-all duration-300 ${
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
        
        <div className="flex items-center justify-between mb-3">
          {feature.epic && <EpicTag name={feature.epic} />}
          
          {feature.azureDevOpsId && (
            <div className="flex items-center text-xs">
              <AzureDevOpsBadge id={feature.azureDevOpsId} url={feature.azureDevOpsUrl || ''} />
            </div>
          )}
        </div>
        
        {onVote && (
          <div className="flex justify-end items-center">
            <div className="flex items-center space-x-2">
              {userVoteCount === 0 ? (
                <button
                  onClick={() => onVote(feature.id, true)}
                  className={`px-6 py-2.5 rounded-lg text-base font-semibold cursor-pointer transition-colors ${
                    votingIsActive && remainingVotes > 0
                      ? 'bg-[#2d4660] text-white hover:bg-[#C89212]'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                  disabled={!votingIsActive || remainingVotes <= 0}
                >
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
                    <ChevronDown className="h-6 w-6" />
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
                    <ChevronUp className="h-6 w-6" />
                  </button>
                </>
              )}
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
  onLogout
}: ResultsScreenProps) {
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
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
          alt="New Millennium Building Systems Logo"
          className="-mt-4"
          style={{ height: '96px', width: 'auto' }}
        />
      </div>
      
      {/* Title with back button - mobile menu in same row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {/* Mobile: small logo next to back button and title */}
          <ImageWithFallback
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px' }}
          />
          <button 
            onClick={onBack}
            className="mr-2 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">
            {isPastDate(votingSession.endDate) ? 'Final Voting Results' : 'Current Voting Results'}
          </h1>
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
            <Button 
              variant="gray"
              onClick={onLogout}
              className="flex items-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
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

      <div className="relative z-10 bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#2d4660]">{votingSession.title}</h2>
          <div className="text-sm text-gray-600">
            <span className="mr-2">Votes per user: {effectiveVotesPerUser}</span>
            {votingSession.isActive ? (
              <span className="text-[#1E5461] font-medium">Voting Active</span>
            ) : isPastDate(votingSession.endDate) ? (
              <span className="text-[#591D0F] font-medium">Voting Closed</span>
            ) : (
              <span className="text-[#C89212] font-medium">Voting Upcoming</span>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 mb-4">{votingSession.goal}</p>
        
        {votingSession.isActive && (
          <div className={`${getDeadlineBgColor(daysRemaining)} relative z-10 rounded-md p-3 mb-4 inline-block border ${daysRemaining <= 2 ? 'border-[#6A4234]/20' : daysRemaining <= 4 ? 'border-[#C89212]/20' : 'border-[#1E5461]/20'}`}>
            <div className="flex items-center">
              <Calendar className={`h-4 w-4 mr-2 ${deadlineColor}`} />
              <span className={`${deadlineColor} font-medium`}>
                {daysRemaining <= 0 
                  ? "Voting ends today!" 
                  : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining until ${formatDate(votingSession.endDate)}`
                }
              </span>
            </div>
          </div>
        )}
        
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
                <th scope="col" className="hidden sm:table-cell w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Epic</th>
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
                    {feature.azureDevOpsId && (
                      <div className="mt-1">
                        <AzureDevOpsBadge id={feature.azureDevOpsId} url={feature.azureDevOpsUrl || ''} />
                      </div>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap text-sm">
                    {feature.epic && <EpicTag name={feature.epic} />}
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
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
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
  isAdmin: boolean;
  viewMode?: 'voting' | 'admin';
  onToggleView?: () => void;
}

function Footer({ isAdmin, viewMode = 'voting', onToggleView }: FooterProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-auto bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* View Toggle - Only show for admins */}
        {isAdmin && onToggleView && (
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => viewMode !== 'voting' && onToggleView()}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'voting'
                    ? 'bg-white text-[#2d4660] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Vote className="h-4 w-4 inline mr-2" />
                Voter View
              </button>
              <button
                onClick={() => viewMode !== 'admin' && onToggleView()}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'admin'
                    ? 'bg-white text-[#2d4660] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Admin View
              </button>
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
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      organization: config.organization || 'newmill',
      project: config.project || 'Product',
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.organization && <p className="mt-1 text-sm text-red-600">{errors.organization.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input
            {...register('project', { required: 'Project name is required' })}
            placeholder="your-project"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
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
}

function AlreadyVotedScreen({
  currentUser,
  votingSession,
  onChangeVotes,
  onToggleAdmin,
  isAdmin,
  navigate,
  userVotes,
  features
}: AlreadyVotedScreenProps) {
  const [showChangeConfirm, setShowChangeConfirm] = useState(false);
  
  const totalVotes = Object.values(userVotes).reduce((sum, count) => sum + count, 0);
  const votedFeatures = features.filter(f => userVotes[f.id] > 0);
  
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
      
      {/* Title and buttons - stack on mobile */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <div className="flex items-center">
          {/* Mobile: small logo next to title */}
          <ImageWithFallback
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px' }}
          />
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Feature Voting</h1>
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
                <div key={feature.id} className="flex justify-between items-center">
                  <span className="text-gray-700">{feature.title}</span>
                  <span className="bg-[#1E5461]/10 text-[#1E5461] rounded-full px-3 py-1 font-medium">
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
  onLogout
}: VotingScreenProps) {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY RETURNS
  const [displayFeatures, setDisplayFeatures] = useState([...features]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleStage, setShuffleStage] = useState<'idle' | 'fadeOut' | 'rearranging' | 'fadeIn'>('idle');
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);
  const [existingVotes, setExistingVotes] = useState<Record<string, number>>({});
  const [isCheckingVotes, setIsCheckingVotes] = useState(true);
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
    if (!feature || !currentUser) return;

    try {
      // Store the request in the database
      await db.createInfoRequest({
        session_id: sessionId,
        feature_id: featureId,
        feature_title: feature.title,
        requester_id: currentUser.id,
        requester_name: currentUser.name,
        requester_email: currentUser.email,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error submitting info request:', error);
      alert('Failed to submit request. Please try again.');
      throw error; // Re-throw so the component knows it failed
    }
  }, [features, currentUser, sessionId]);

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
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
          alt="New Millennium Building Systems Logo"
          className="-mt-4"
          style={{ height: '96px', width: 'auto' }}
        />
      </div>
      
      {/* Title and buttons - mobile menu in same row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {/* Mobile: small logo next to title */}
          <ImageWithFallback
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px' }}
          />
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Feature Voting</h1>
        </div>
        <div ref={mobileMenuRef} className="relative z-40">
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
            <Button 
              variant="gray"
              onClick={onLogout}
              className="flex items-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
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

      <div className="relative z-10 mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <h2 className="text-xl font-semibold text-[#2d4660] mb-2">{votingSession.title}</h2>
            <p className="text-gray-600">{votingSession.goal}</p>
          </div>
          
          <div className="flex flex-col justify-center">
            <DeadlineDisplay endDate={votingSession.endDate} />
            
            <div className="flex items-center mt-3">
              <Vote className="h-4 w-4 mr-2 text-[#2d4660]" />
              <p className="text-gray-700">
                You have <span className="font-bold text-[#2d4660]">{remainingVotes} / {effectiveVotesPerUser}</span> votes remaining
              </p>
            </div>
          </div>
        </div>
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

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#2d4660]">Available Features</h2>
        {features.length > 6 && (
          <ShuffleButton isShuffling={isShuffling} onShuffle={handleShuffle} />
        )}
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
      
      {pendingUsedVotes > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 p-4">
          <div className="container mx-auto max-w-6xl flex items-center justify-between">
            <div>
              {!allVotesUsed && (
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-[#C89212] mr-2" />
                  <span className="text-gray-700">
                    You still have <span className="font-semibold text-[#C89212]">{remainingVotes}</span> votes remaining.
                  </span>
                </div>
              )}
              {allVotesUsed && (
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#1E5461] mr-2" />
                  <span className="text-gray-700">
                    All votes allocated! You can now submit your votes.
                  </span>
                </div>
              )}
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
      )}
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
  const [showAzureDevOpsForm, setShowAzureDevOpsForm] = useState(false);
  const [votingSession, setVotingSession] = useState({
    ...initialVotingSession,
    votesPerUser: defaultVotesPerUser
  });
  
  const [azureDevOpsConfig, setAzureDevOpsConfig] = useState(initialAzureDevOpsConfig);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableAreaPaths, setAvailableAreaPaths] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isFetchingAzureDevOps, setIsFetchingAzureDevOps] = useState(false);
  const [azureFetchError, setAzureFetchError] = useState<string | null>(null);
  const [previewFeatures, setPreviewFeatures] = useState<Feature[] | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [hasImportedFeatures, setHasImportedFeatures] = useState(false);
  
  const [pendingVotes, setPendingVotes] = useState<Record<string, number>>({});
  const [pendingUsedVotes, setPendingUsedVotes] = useState(0);

  const [confirmState, setConfirmState] = useState<{
    showReset: boolean;
    showResetAll: boolean;
    targetId: string | null;
  }>({
    showReset: false,
    showResetAll: false,
    targetId: null
  });

  const hasProcessedCallback = useRef(false);

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

  useEffect(() => {
    async function loadData() {
      if (!currentSession) return;
      
      try {
        console.log('Loading data from Supabase for session:', currentSession.id);
        setIsLoading(true);
        
        const featuresData = await db.getFeatures(currentSession.id);
        console.log(`Loaded ${featuresData.length} features from database`);
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
        console.log(`Features with votes loaded:`, featuresWithVotes.map(f => f.title));
        
        setVotingSession({
          title: currentSession.title,
          goal: currentSession.goal,
          votesPerUser: currentSession.votes_per_user,
          useAutoVotes: currentSession.use_auto_votes || false,
          startDate: currentSession.start_date,
          endDate: currentSession.end_date,
          isActive: currentSession.is_active
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
      } catch (error) {
        console.error('Error loading data:', error);
        setFeatures([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [currentSession?.id]);

  useEffect(() => {
    async function loadFilterOptions() {
      if (azureDevOpsConfig.enabled && azureDevOpsConfig.accessToken) {
        try {
          const validToken = await ensureValidToken(azureDevOpsConfig);
          const configWithValidToken = {
            ...azureDevOpsConfig,
            accessToken: validToken
          };

          const [states, areaPaths, tags] = await Promise.all([
            azureService.fetchStates(configWithValidToken),
            azureService.fetchAreaPaths(configWithValidToken),
            azureService.fetchTags(configWithValidToken)
          ]);

          setAvailableStates(states);
          setAvailableAreaPaths(areaPaths);
          setAvailableTags(tags);
        } catch (error) {
          console.error('Error loading filter options:', error);
        }
      } else {
        setAvailableStates([]);
        setAvailableAreaPaths([]);
        setAvailableTags([]);
      }
    }

    loadFilterOptions();
  }, [azureDevOpsConfig.enabled, azureDevOpsConfig.accessToken, azureDevOpsConfig.workItemType, ensureValidToken]);

  

  // Add this callback to dynamically fetch states for a specific work item type
  const handleFetchStatesForType = useCallback(async (workItemType: string) => {
    if (!azureDevOpsConfig.enabled || !azureDevOpsConfig.accessToken) return;
    
    try {
      const validToken = await ensureValidToken(azureDevOpsConfig);
      const configWithValidToken = {
        ...azureDevOpsConfig,
        accessToken: validToken,
        workItemType: workItemType
      };

      const states = await azureService.fetchStates(configWithValidToken);
      setAvailableStates(states);
    } catch (error) {
      console.error('Error loading states for work item type:', error);
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
          await db.updateVotingSession({
            title: updatedSession.title,
            goal: updatedSession.goal,
            votes_per_user: updatedSession.votesPerUser,
            start_date: updatedSession.startDate,
            end_date: updatedSession.endDate,
            is_active: updatedSession.isActive
          });
        } catch (error) {
          console.error('Error updating voting session status:', error);
        }
      }
    };
    
    checkVotingStatus();
    const intervalId = setInterval(checkVotingStatus, 600000);
    return () => clearInterval(intervalId);
  }, [votingSession]);

  useEffect(() => {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }, [view]);

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
            epic: feature.epic,
            state: feature.state,
            area_path: feature.areaPath,
            tags: feature.tags,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl
          });
        } else {
          await db.createFeature({
            session_id: currentSession.id,
            title: feature.title,
            description: truncatedDescription,
            epic: feature.epic,
            state: feature.state,
            area_path: feature.areaPath,
            tags: feature.tags,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl
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
      
      const updatedConfig = {
        ...configWithValidToken,
        lastSyncTime: new Date().toISOString()
      };
      
      await db.saveAzureDevOpsConfig(currentSession.id, updatedConfig);
      setAzureDevOpsConfig(updatedConfig);
      setShowAzureDevOpsForm(false);
      
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
      
      const featuresWithTruncatedDescriptions = newFeatures.map(feature => ({
        ...feature,
        description: truncateText(stripHtmlTags(feature.description), 300)
      }));
      
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

  const handleConfirmSync = useCallback(async (replaceAll: boolean = false) => {
    if (!previewFeatures || !currentSession) return;
    
    try {
      setIsFetchingAzureDevOps(true);
      
      if (replaceAll) {
        const existingFeatures = await db.getFeatures(currentSession.id);
        for (const feature of existingFeatures) {
          await db.deleteFeature(feature.id);
        }
      }
      
      for (const feature of previewFeatures) {
        const existingFeatures = await db.getFeatures(currentSession.id);
        const existing = existingFeatures.find(f => f.azure_devops_id === feature.azureDevOpsId);
        
        const plainTextDescription = stripHtmlTags(feature.description);
        const truncatedDescription = truncateText(plainTextDescription, 300);
        
        if (existing) {
          await db.updateFeature(existing.id, {
            title: feature.title,
            description: truncatedDescription,
            epic: feature.epic,
            state: feature.state,
            area_path: feature.areaPath,
            tags: feature.tags,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl
          });
        } else {
          await db.createFeature({
            session_id: currentSession.id,
            title: feature.title,
            description: truncatedDescription,
            epic: feature.epic,
            state: feature.state,
            area_path: feature.areaPath,
            tags: feature.tags,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl
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
      
      const updatedConfig = {
        ...azureDevOpsConfig,
        lastSyncTime: new Date().toISOString()
      };
      
      await db.saveAzureDevOpsConfig(currentSession.id, updatedConfig);
      setAzureDevOpsConfig(updatedConfig);
      setHasImportedFeatures(true);
      
    } catch (error) {
      console.error('Azure DevOps sync error:', error);
      setAzureFetchError("Failed to sync features from Azure DevOps.");
    } finally {
      setIsFetchingAzureDevOps(false);
      setPreviewFeatures(null);
    }
  }, [previewFeatures, currentSession, azureDevOpsConfig]);

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
      setHasImportedFeatures(false);
      
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
    setIsAdmin(true);
    setView('admin');
  }, []);

  const handleShowVoting = useCallback(() => {
    setIsAdmin(false);
    setView('voting');
  }, []);

  const handleToggleViewMode = useCallback(() => {
    if (view === 'voting') {
      setIsAdmin(true);
      setView('admin');
    } else if (view === 'admin') {
      setIsAdmin(false);
      setView('voting');
    }
  }, [view]);

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
        epic: updatedFeature.epic
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
    setConfirmState({
      showReset: true,
      showResetAll: false,
      targetId: id
    });
  }, []);

  const handleResetVotes = useCallback(async () => {
    const id = confirmState.targetId;
    if (!id || !currentSession) return;
    
    try {
      await db.deleteVotesForFeature(id);
      
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
    } catch (error) {
      console.error('Error resetting votes:', error);
      alert('Failed to reset votes');
    }
  }, [confirmState.targetId, currentSession]);

  const initiateResetAllVotes = useCallback(() => {
    setConfirmState({
      showReset: false,
      showResetAll: true,
      targetId: null
    });
  }, []);

  const handleResetAllVotes = useCallback(async () => {
    if (!currentSession) return;
    
    try {
      await db.deleteAllVotes(currentSession.id);
      setFeatures(prev => prev.map(feature => ({ ...feature, votes: 0, voters: [] })));
    } catch (error) {
      console.error('Error resetting all votes:', error);
      alert('Failed to reset all votes');
    }
  }, [currentSession]);

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
    try {
      await db.updateVotingSession({
        title: updatedSession.title,
        goal: updatedSession.goal,
        votes_per_user: updatedSession.votesPerUser,
        start_date: updatedSession.startDate,
        end_date: updatedSession.endDate,
        is_active: updatedSession.isActive
      });
      
      setVotingSession(updatedSession);
    } catch (error) {
      console.error('Error updating voting session:', error);
      alert('Failed to update voting session settings');
    }
  }, []);

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



  const renderContent = useMemo(() => {
    switch (view) {
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
          />
        );
      case 'results':
        return (
          <ResultsScreen 
            features={features} 
            onResetVotes={initiateResetVotes}
            onResetAllVotes={initiateResetAllVotes}
            onBack={() => setView('admin')}
            showVotersList={showVotersList}
            setShowVotersList={setShowVotersList}
            votingSession={votingSession}
            effectiveVotesPerUser={effectiveVotesPerUser}
            onLogout={handleLogout}
          />
        );
      case 'thankyou':
        return (
          <ThankYouScreen
            navigate={navigate}
            votingSession={votingSession}
          />
        );
      case 'admin':
      default:
        return (
          <AdminDashboard 
            features={features} 
            onAddFeature={handleAddFeature} 
            onUpdateFeature={handleUpdateFeature} 
            onDeleteFeature={handleDeleteFeature}
            onShowResults={() => setView('results')}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            editingFeature={editingFeature}
            setEditingFeature={setEditingFeature}
            onLogout={handleShowVoting}
            votingSession={votingSession}
            azureDevOpsConfig={azureDevOpsConfig}
            onUpdateAzureDevOpsConfig={handleUpdateAzureDevOpsConfig}
            showAzureDevOpsForm={showAzureDevOpsForm}
            setShowAzureDevOpsForm={setShowAzureDevOpsForm}
            onFetchAzureDevOpsFeatures={handleFetchAzureDevOpsFeatures}
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
            hasImportedFeatures={hasImportedFeatures}
            setHasImportedFeatures={setHasImportedFeatures}
            onShowVoterView={handleShowVoting}
            onUpdateVotingSession={handleUpdateVotingSession}
            onFetchStatesForType={handleFetchStatesForType}
          />
        );
    }
  }, [
    view, features, currentUser, pendingVotes, pendingUsedVotes, 
    handlePendingVote, handleSubmitVotes, handleToggleAdmin, handleShowVoting, isAdmin, 
    votingSession, initiateResetVotes, initiateResetAllVotes, showVotersList,
    setShowVotersList, handleAddFeature, handleUpdateFeature,
    handleDeleteFeature, showAddForm, setShowAddForm, editingFeature,
    setEditingFeature, azureDevOpsConfig, handleUpdateAzureDevOpsConfig, showAzureDevOpsForm,
    setShowAzureDevOpsForm, handleFetchAzureDevOpsFeatures, handlePreviewAzureDevOpsFeatures,
    handleDisconnectAzureDevOps, isFetchingAzureDevOps, azureFetchError, handleInitiateOAuth,
    previewFeatures, showPreviewModal, setShowPreviewModal, handleConfirmSync,
    hasImportedFeatures, setHasImportedFeatures, navigate, effectiveVotesPerUser,
    availableStates, availableAreaPaths, availableTags, handleFetchStatesForType, currentSession,
    handleToggleViewMode
  ]);

  // IMPORTANT: Return loading check AFTER all hooks
  if (!currentSession) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
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

  return (
    <div className="w-full bg-gray-50 text-gray-900 font-sans min-h-screen flex flex-col">
      <div className="flex-grow">
        {renderContent}
      </div>
      
      <Footer 
        isAdmin={isAdmin} 
        viewMode={view === 'admin' ? 'admin' : 'voting'}
        onToggleView={handleToggleViewMode}
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
    </div>
  );
}

export default FeatureVotingSystem;

// ============================================
// END OF FILE
// ============================================