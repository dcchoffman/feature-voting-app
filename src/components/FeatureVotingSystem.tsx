// ============================================
// FeatureVotingSystem.tsx - Complete Component
// ============================================
// Location: src/components/FeatureVotingSystem.tsx
// ============================================

import React, { useState, useEffect, useRef, useMemo, useCallback, Component } from "react";
import { useForm } from "react-hook-form";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { 
  Plus, Edit, Trash2, X, ChevronLeft, BarChart2, Settings, 
  Vote, LogOut, Users, ChevronUp, ChevronDown, Calendar, Clock, 
  Shuffle, CheckCircle, AlertTriangle, AlertCircle, Tag, RefreshCw, 
  Cloud, Database, Search
} from "lucide-react";

// Import services
import * as db from '../services/databaseService';
import * as azureService from '../services/azureDevOpsService';

// Import types
import type { AzureDevOpsConfig, Feature, VoterInfo } from '../types/azure';

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
  if (daysRemaining <= 0) return 'text-red-600';
  if (daysRemaining <= 2) return 'text-red-500';
  if (daysRemaining <= 4) return 'text-yellow-500';
  return 'text-[#1E6154]';
};

const getDeadlineBgColor = (daysRemaining: number): string => {
  if (daysRemaining <= 0) return 'bg-red-100';
  if (daysRemaining <= 2) return 'bg-red-50';
  if (daysRemaining <= 4) return 'bg-yellow-50';
  return 'bg-[#1E6154]/10';
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
  
  // Create a temporary div element to parse HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  
  // Get text content and clean up whitespace
  let text = tmp.textContent || tmp.innerText || '';
  
  // Replace multiple spaces/newlines with single space
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
    primary: "bg-[#4f6d8e] text-white hover:bg-[#3d5670]",
    secondary: "border border-gray-300 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    gold: "bg-[#c59f2d] text-white hover:bg-[#a88a26]",
    blue: "bg-[#2d4660] text-white hover:bg-[#1d3a53]",
    gray: "bg-gray-600 text-white hover:bg-gray-700"
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
      daysRemaining <= 2 ? 'border-red-200' : 
      daysRemaining <= 4 ? 'border-yellow-200' : 
      'border-[#1E6154]/20'
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
      }, 200);
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
      className={`py-2 px-4 rounded-lg flex items-center transition-colors ${
        isShuffling ? 'bg-[#c59f2d]/80 text-white' : 'bg-[#c59f2d] hover:bg-[#a88a26] text-white'
      }`}
      disabled={isShuffling}
    >
      <span className={isShuffling ? "mr-2 animate-spin" : "mr-2"}>
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
  
  const bgColor = type === "delete" ? "bg-red-50" : "bg-orange-50";
  const iconColor = type === "delete" ? "text-red-600" : "text-orange-600";
  const buttonColor = type === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700";
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-auto overflow-hidden">
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
}

const FeatureCard = React.memo(function FeatureCard({
  feature,
  userVoteCount = 0,
  remainingVotes = 0,
  votingIsActive = false,
  onVote,
  isShuffling = false
}: FeatureCardProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md overflow-hidden ${
        userVoteCount > 0 ? 'border-2 border-[#1E6154]' : ''
      } ${isShuffling ? 'opacity-75' : 'opacity-100'}`}
    >
      <div className="p-6 flex flex-col h-full">
        <h3 className="text-lg font-semibold mb-2 text-[#2d4660]">{feature.title}</h3>
        <p className="text-gray-600 mb-4 flex-grow">{feature.description}</p>
        
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
                  className={`px-4 py-1 rounded-md text-sm font-medium cursor-pointer ${
                    votingIsActive && remainingVotes > 0
                      ? 'bg-[#4f6d8e] text-white hover:bg-[#bea263]'
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
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                    aria-label="Remove vote"
                    disabled={!votingIsActive}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </button>
                  <span className="px-3 py-1 bg-[#1E6154]/10 text-[#1E6154] rounded-full font-medium text-sm">
                    {userVoteCount}
                  </span>
                  <button
                    onClick={() => onVote(feature.id, true)}
                    className={`p-1 rounded-full cursor-pointer ${
                      votingIsActive && remainingVotes > 0 
                        ? 'bg-[#4f6d8e]/10 hover:bg-[#bea263]/30 text-[#4f6d8e]' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!votingIsActive || remainingVotes <= 0}
                    aria-label="Add vote"
                  >
                    <ChevronUp className="h-5 w-5" />
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
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
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
}

function ResultsScreen({ 
  features, 
  onResetVotes,
  onResetAllVotes,
  onBack,
  showVotersList,
  setShowVotersList,
  votingSession
}: ResultsScreenProps) {
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
    <div className="container mx-auto p-4 max-w-6xl min-h-screen pb-8">
      {/* Desktop: Centered logo at top */}
      <div className="hidden md:flex md:justify-center mb-2">
        <img
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
          alt="New Millennium Building Systems Logo"
          className="-mt-8"
          style={{ height: '96px', width: 'auto' }}
        />
      </div>
      
      {/* Title with back button and reset button in same row */}
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
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Voting Results</h1>
        </div>
        <div className="flex space-x-2">
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
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#2d4660]">{votingSession.title}</h2>
          <div className="text-sm text-gray-600">
            <span className="mr-2">Votes per user: {votingSession.votesPerUser}</span>
            {votingSession.isActive ? (
              <span className="text-[#1E6154] font-medium">Voting Active</span>
            ) : isPastDate(votingSession.endDate) ? (
              <span className="text-red-600 font-medium">Voting Closed</span>
            ) : (
              <span className="text-yellow-600 font-medium">Voting Upcoming</span>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 mb-4">{votingSession.goal}</p>
        
        {votingSession.isActive && (
          <div className={`${getDeadlineBgColor(daysRemaining)} rounded-md p-3 mb-4 inline-block border ${daysRemaining <= 2 ? 'border-red-200' : daysRemaining <= 4 ? 'border-yellow-200' : 'border-[#1E6154]/20'}`}>
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

      <div className="bg-white rounded-lg shadow-md p-4">
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
                      className="text-[#2d4660] hover:text-[#bea263] flex items-center cursor-pointer"
                      disabled={feature.voters.length === 0}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {feature.voters.length} {feature.voters.length === 1 ? 'user' : 'users'}
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onResetVotes(feature.id)}
                      className="text-red-600 hover:text-red-900 cursor-pointer"
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
  onReturn: () => void;
  votingSession: VotingSession;
}

function ThankYouScreen({ onReturn, votingSession }: ThankYouScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
        <img
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
          alt="New Millennium Building Systems Logo"
          className="mx-auto mb-6"
          style={{ maxWidth: '200px', height: 'auto' }}
        />
        
        <div className="w-20 h-20 bg-[#1E6154]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-12 w-12 text-[#1E6154]" />
        </div>
        
        <h1 className="text-3xl font-bold text-[#1E6154] mb-4">Thank You!</h1>
        
        <p className="text-gray-700 text-lg mb-6">
          Your votes for <span className="font-semibold">{votingSession.title}</span> have been submitted successfully.
        </p>
        
        <p className="text-gray-600 mb-8">
          We appreciate your input in helping prioritize features for our Purchasing Dashboard redesign.
        </p>
        
        <Button variant="primary" onClick={onReturn} className="mx-auto">
          Return to Voting
        </Button>
      </div>
    </div>
  );
}

// ============================================
// FORM COMPONENTS
// ============================================

interface VotingSessionFormProps {
  votingSession: VotingSession;
  onSubmit: (data: VotingSession) => void;
  onCancel: () => void;
}

function VotingSessionForm({ votingSession, onSubmit, onCancel }: VotingSessionFormProps) {
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      title: votingSession.title,
      goal: votingSession.goal,
      votesPerUser: votingSession.votesPerUser,
      startDate: new Date(votingSession.startDate).toISOString().split('T')[0],
      endDate: new Date(votingSession.endDate).toISOString().split('T')[0],
    }
  });

  const startDate = watch('startDate');

  const onFormSubmit = (data: any) => {
    onSubmit({
      title: data.title,
      goal: data.goal,
      votesPerUser: Number(data.votesPerUser),
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
      isActive: isDateInRange(
        new Date(data.startDate).toISOString(), 
        new Date(data.endDate).toISOString()
      )
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Title</label>
          <input
            {...register('title', { required: 'Title is required' })}
            placeholder="e.g., Sprint 12 Planning"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Votes Per User</label>
          <input
            type="number"
            min="1"
            max="100"
            {...register('votesPerUser', { 
              required: 'Votes per user is required',
              min: { value: 1, message: 'Minimum 1 vote' },
              max: { value: 100, message: 'Maximum 100 votes' }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.votesPerUser && <p className="mt-1 text-sm text-red-600">{errors.votesPerUser.message}</p>}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
        <textarea
          {...register('goal', { required: 'Goal is required' })}
          rows={2}
          placeholder="Describe the purpose of this voting session"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.goal && <p className="mt-1 text-sm text-red-600">{errors.goal.message}</p>}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            {...register('startDate', { required: 'Start date is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            {...register('endDate', { 
              required: 'End date is required',
              validate: value => 
                !startDate || new Date(value) >= new Date(startDate) || 
                'End date must be after start date'
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
        </div>
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
          Save Settings
        </Button>
      </div>
    </form>
  );
}

interface AzureDevOpsFormProps {
  config: AzureDevOpsConfig;
  onUpdate: (config: AzureDevOpsConfig) => void;
  onPreview: () => Promise<void>;
  onCancel: () => void;
  isFetching: boolean;
  error: string | null;
  onInitiateOAuth: () => void;
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
    // Build query based on filters
    let finalQuery = undefined;
    const queryParts: string[] = [];
    
    // Add state filter if selected
    if (data.states && data.states.length > 0) {
      if (data.states.length === 1) {
        queryParts.push(`[System.State] = '${data.states[0]}'`);
      } else {
        const statesList = data.states.map((s: string) => `'${s}'`).join(', ');
        queryParts.push(`[System.State] IN (${statesList})`);
      }
    }
    
    // Add Area Path filter if selected
    if (data.areaPath) {
      queryParts.push(`[System.AreaPath] UNDER '${data.areaPath}'`);
    }
    
    // Add Tags filter if selected
    if (data.tags && data.tags.length > 0) {
      const tagFilters = data.tags.map((tag: string) => 
        `[System.Tags] CONTAINS '${tag}'`
      );
      queryParts.push(`(${tagFilters.join(' OR ')})`);
    }
    
    // Add custom advanced query if in advanced mode
    if (showAdvanced && data.query) {
      queryParts.push(`(${data.query})`);
    }
    
    // Combine all query parts
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
    
    // Always save the config first so org/project are persisted
    onUpdate(updatedConfig);
    
    // If already authenticated, show preview modal
    if (isAuthenticated) {
      await onPreview();
    } else {
      // Otherwise, initiate OAuth flow (config is already saved above)
      onInitiateOAuth();
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
          
          {/* State, Area Path, and Tags filters - only show when authenticated */}
          {isAuthenticated && (availableStates.length > 0 || availableAreaPaths.length > 0 || availableTags.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              {/* State Filter */}
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
              
              {/* Area Path Filter */}
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
              
              {/* Tags Filter */}
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
          
          {/* Advanced WIQL input */}
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
          
          {/* Message when not authenticated */}
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
// MAIN COMPONENT
// ============================================

interface FeatureVotingSystemProps {
  defaultVotesPerUser?: number;
  adminMode?: boolean;
}

function FeatureVotingSystem({ 
  defaultVotesPerUser = 10, 
  adminMode = false 
}: FeatureVotingSystemProps) {
  
  const isOAuthCallback = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('code') || urlParams.has('error');
  }, []);
  
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState(initialUsers[0]);
  const [view, setView] = useState<'voting' | 'admin' | 'thankyou' | 'results'>(
    adminMode || isOAuthCallback ? 'admin' : 'voting'
  );
  const [isAdmin, setIsAdmin] = useState(adminMode || isOAuthCallback);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVotersList, setShowVotersList] = useState<string | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
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

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hasOAuthParams = urlParams.has('code') || urlParams.has('error');
      
      // Check if we were in the middle of auth
      const authInProgress = localStorage.getItem('azureDevOpsAuthInProgress');
      if (authInProgress) {
        localStorage.removeItem('azureDevOpsAuthInProgress');
      }
      
      if (!hasOAuthParams || hasProcessedCallback.current) {
        return;
      }
      
      hasProcessedCallback.current = true;
      
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
          
          await db.saveAzureDevOpsConfig(updatedConfig);
          setAzureDevOpsConfig(updatedConfig);
          
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
          
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setAzureFetchError('Failed to authenticate with Azure DevOps');
        
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    };
    
    handleCallback();
  }, []);

  const handleInitiateOAuth = useCallback(() => {
    // Store a flag that we're authenticating
    localStorage.setItem('azureDevOpsAuthInProgress', 'true');
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
      
      await db.saveAzureDevOpsConfig(updatedConfig);
      setAzureDevOpsConfig(updatedConfig);
      
      return tokens.accessToken;
    }
    
    return config.accessToken;
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        console.log('Loading data from Supabase...');
        setIsLoading(true);
        
        const featuresData = await db.getFeatures();
        console.log(`Loaded ${featuresData.length} features from database`);
        const votesData = await db.getVotes();
        
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
        
        const session = await db.getActiveVotingSession();
        if (session) {
          setVotingSession({
            title: session.title,
            goal: session.goal,
            votesPerUser: session.votes_per_user,
            startDate: session.start_date,
            endDate: session.end_date,
            isActive: session.is_active
          });
        } else {
          // Create initial voting session if none exists
          const newSession = {
            ...initialVotingSession,
            votesPerUser: defaultVotesPerUser
          };
          
          try {
            await db.createVotingSession({
              title: newSession.title,
              goal: newSession.goal,
              votes_per_user: newSession.votesPerUser,
              start_date: newSession.startDate,
              end_date: newSession.endDate,
              is_active: newSession.isActive
            });
            
            setVotingSession(newSession);
          } catch (error) {
            console.error('Error creating initial voting session:', error);
            // Fall back to in-memory session if database create fails
            setVotingSession(newSession);
          }
        }
        
        const azureConfig = await db.getAzureDevOpsConfig();
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
  }, []);

  useEffect(() => {
    async function loadFilterOptions() {
      if (azureDevOpsConfig.enabled && azureDevOpsConfig.accessToken) {
        try {
          const validToken = await ensureValidToken(azureDevOpsConfig);
          const configWithValidToken = {
            ...azureDevOpsConfig,
            accessToken: validToken
          };

          // Fetch states, area paths, and tags in parallel
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
          // Silently fail - filters will just be empty
        }
      } else {
        // Clear filters when disconnected
        setAvailableStates([]);
        setAvailableAreaPaths([]);
        setAvailableTags([]);
      }
    }

    loadFilterOptions();
  }, [azureDevOpsConfig.enabled, azureDevOpsConfig.accessToken, azureDevOpsConfig.workItemType]);

  useEffect(() => {
    const checkVotingStatus = async () => {
      const isInVotingPeriod = isDateInRange(votingSession.startDate, votingSession.endDate);
      if (votingSession.isActive !== isInVotingPeriod) {
        const updatedSession = {
          ...votingSession,
          isActive: isInVotingPeriod
        };
        
        setVotingSession(updatedSession);
        
        // Update database with new active status
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
    if (!config.organization || !config.project) {
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
        const existingFeatures = await db.getFeatures();
        const existing = existingFeatures.find(f => f.azure_devops_id === feature.azureDevOpsId);
        
        // Strip HTML tags and limit description to 300 characters for Azure DevOps imports
        const plainTextDescription = stripHtmlTags(feature.description);
        const truncatedDescription = truncateText(plainTextDescription, 300);
        
        if (existing) {
          await db.updateFeature(existing.id, {
            title: feature.title,
            description: truncatedDescription,
            epic: feature.epic,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl
          });
        } else {
          await db.createFeature({
            title: feature.title,
            description: truncatedDescription,
            epic: feature.epic,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl
          });
        }
      }
      
      const allFeatures = await db.getFeatures();
      const votesData = await db.getVotes();
      
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
      
      await db.saveAzureDevOpsConfig(updatedConfig);
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
  }, [azureDevOpsConfig, ensureValidToken, handleInitiateOAuth]);

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
      
      // Strip HTML tags and limit description to 300 characters for preview
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
    if (!previewFeatures) return;
    
    try {
      setIsFetchingAzureDevOps(true);
      
      if (replaceAll) {
        const existingFeatures = await db.getFeatures();
        for (const feature of existingFeatures) {
          await db.deleteFeature(feature.id);
        }
      }
      
      for (const feature of previewFeatures) {
        const existingFeatures = await db.getFeatures();
        const existing = existingFeatures.find(f => f.azure_devops_id === feature.azureDevOpsId);
        
        // Strip HTML tags (if any remain) and limit description to 300 characters
        const plainTextDescription = stripHtmlTags(feature.description);
        const truncatedDescription = truncateText(plainTextDescription, 300);
        
        if (existing) {
          await db.updateFeature(existing.id, {
            title: feature.title,
            description: truncatedDescription,
            epic: feature.epic,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl
          });
        } else {
          await db.createFeature({
            title: feature.title,
            description: truncatedDescription,
            epic: feature.epic,
            azure_devops_id: feature.azureDevOpsId,
            azure_devops_url: feature.azureDevOpsUrl
          });
        }
      }
      
      const allFeatures = await db.getFeatures();
      const votesData = await db.getVotes();
      
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
      
      await db.saveAzureDevOpsConfig(updatedConfig);
      setAzureDevOpsConfig(updatedConfig);
      setHasImportedFeatures(true); // Mark that features have been imported
      
    } catch (error) {
      console.error('Azure DevOps sync error:', error);
      setAzureFetchError("Failed to sync features from Azure DevOps.");
    } finally {
      setIsFetchingAzureDevOps(false);
      setPreviewFeatures(null);
    }
  }, [previewFeatures, azureDevOpsConfig]);

  const handleDisconnectAzureDevOps = useCallback(async () => {
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
      
      await db.saveAzureDevOpsConfig(updatedConfig);
      setAzureDevOpsConfig(updatedConfig);
      setAzureFetchError(null);
      setHasImportedFeatures(false); // Reset when disconnecting
      
    } catch (error) {
      console.error('Error disconnecting Azure DevOps:', error);
      setAzureFetchError("Failed to disconnect from Azure DevOps");
    }
  }, [azureDevOpsConfig]);

  const handleToggleAdmin = useCallback(() => {
    if (isAdmin) {
      setIsAdmin(false);
      setView('voting');
    } else {
      setIsAdmin(true);
      setView('admin');
    }
  }, [isAdmin]);

  const handleAddFeature = useCallback(async (feature: any) => {
    try {
      const newFeature = await db.createFeature({
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
  }, []);

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
    if (!id) return;
    
    try {
      await db.deleteVotesForFeature(id);
      
      const featuresData = await db.getFeatures();
      const votesData = await db.getVotes();
      
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
  }, [confirmState.targetId]);

  const initiateResetAllVotes = useCallback(() => {
    setConfirmState({
      showReset: false,
      showResetAll: true,
      targetId: null
    });
  }, []);

  const handleResetAllVotes = useCallback(async () => {
    try {
      await db.deleteAllVotes();
      setFeatures(prev => prev.map(feature => ({ ...feature, votes: 0, voters: [] })));
    } catch (error) {
      console.error('Error resetting all votes:', error);
      alert('Failed to reset all votes');
    }
  }, []);

  const handlePendingVote = useCallback((featureId: string, increment: boolean) => {
    if (!currentUser || !votingSession.isActive) return;
    
    const currentVoteCount = pendingVotes[featureId] || 0;
    let newVoteCount = currentVoteCount;
    
    if (increment) {
      if (pendingUsedVotes < votingSession.votesPerUser) {
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
  }, [currentUser, pendingVotes, pendingUsedVotes, votingSession.isActive, votingSession.votesPerUser]);

  const handleSubmitVotes = useCallback(async () => {
    if (!currentUser || !votingSession.isActive) return;
    if (pendingUsedVotes < votingSession.votesPerUser) return;
    
    try {
      for (const [featureId, voteCount] of Object.entries(pendingVotes)) {
        if (voteCount > 0) {
          await db.saveVote({
            feature_id: featureId,
            user_id: currentUser.id,
            user_name: currentUser.name,
            user_email: currentUser.email,
            vote_count: voteCount
          });
        }
      }
      
      const featuresData = await db.getFeatures();
      const votesData = await db.getVotes();
      
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
  }, [currentUser, pendingUsedVotes, pendingVotes, votingSession.isActive, votingSession.votesPerUser]);

  const handleUpdateVotingSession = useCallback(async (updatedSession: VotingSession) => {
    try {
      // Save to database
      await db.updateVotingSession({
        title: updatedSession.title,
        goal: updatedSession.goal,
        votes_per_user: updatedSession.votesPerUser,
        start_date: updatedSession.startDate,
        end_date: updatedSession.endDate,
        is_active: updatedSession.isActive
      });
      
      setVotingSession(updatedSession);
      setShowSessionForm(false);
    } catch (error) {
      console.error('Error updating voting session:', error);
      alert('Failed to update voting session settings');
    }
  }, []);

  const handleUpdateAzureDevOpsConfig = useCallback(async (config: AzureDevOpsConfig) => {
    setAzureDevOpsConfig(config);
    
    try {
      await db.saveAzureDevOpsConfig({
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
  }, []);

  const handleReturnToVoting = useCallback(() => {
    setPendingVotes({});
    setPendingUsedVotes(0);
    setView('voting');
  }, []);

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
          />
        );
      case 'thankyou':
        return (
          <ThankYouScreen
            onReturn={handleReturnToVoting}
            votingSession={votingSession}
          />
        );
      case 'admin':
      default:
        return (
          <AdminScreen 
            features={features} 
            onAddFeature={handleAddFeature} 
            onUpdateFeature={handleUpdateFeature} 
            onDeleteFeature={handleDeleteFeature}
            onShowResults={() => setView('results')}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            editingFeature={editingFeature}
            setEditingFeature={setEditingFeature}
            onLogout={handleToggleAdmin}
            votingSession={votingSession}
            onUpdateVotingSession={handleUpdateVotingSession}
            showSessionForm={showSessionForm}
            setShowSessionForm={setShowSessionForm}
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
          />
        );
    }
  }, [
    view, features, currentUser, pendingVotes, pendingUsedVotes, 
    handlePendingVote, handleSubmitVotes, handleToggleAdmin, isAdmin, 
    votingSession, initiateResetVotes, initiateResetAllVotes, showVotersList,
    setShowVotersList, handleReturnToVoting, handleAddFeature, handleUpdateFeature,
    handleDeleteFeature, showAddForm, setShowAddForm, editingFeature,
    setEditingFeature, handleUpdateVotingSession, showSessionForm, setShowSessionForm,
    azureDevOpsConfig, handleUpdateAzureDevOpsConfig, showAzureDevOpsForm,
    setShowAzureDevOpsForm, handleFetchAzureDevOpsFeatures, handlePreviewAzureDevOpsFeatures,
    handleDisconnectAzureDevOps, isFetchingAzureDevOps, azureFetchError, handleInitiateOAuth,
    previewFeatures, showPreviewModal, setShowPreviewModal, handleConfirmSync,
    hasImportedFeatures, setHasImportedFeatures
  ]);

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
    <div className="w-full bg-gray-50 text-gray-900 font-sans">
      {renderContent}
      
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

// ============================================
// ADMIN SCREEN COMPONENT
// ============================================

interface AdminScreenProps {
  features: Feature[];
  onAddFeature: (feature: any) => void;
  onUpdateFeature: (feature: Feature) => void;
  onDeleteFeature: (id: string) => Promise<void>;
  onShowResults: () => void;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  editingFeature: Feature | null;
  setEditingFeature: (feature: Feature | null) => void;
  onLogout: () => void;
  votingSession: VotingSession;
  onUpdateVotingSession: (session: VotingSession) => void;
  showSessionForm: boolean;
  setShowSessionForm: (show: boolean) => void;
  azureDevOpsConfig: AzureDevOpsConfig;
  onUpdateAzureDevOpsConfig: (config: AzureDevOpsConfig) => void;
  showAzureDevOpsForm: boolean;
  setShowAzureDevOpsForm: (show: boolean) => void;
  onFetchAzureDevOpsFeatures: (config?: AzureDevOpsConfig) => Promise<void>;
  onPreviewAzureDevOpsFeatures: () => Promise<void>;
  onDisconnectAzureDevOps: () => Promise<void>;
  isFetchingAzureDevOps: boolean;
  azureFetchError: string | null;
  onInitiateOAuth: () => void;
  availableStates: string[];     
  availableAreaPaths: string[];
  availableTags: string[];
  previewFeatures: Feature[] | null;
  showPreviewModal: boolean;
  setShowPreviewModal: (show: boolean) => void;
  onConfirmSync: (replaceAll: boolean) => Promise<void>;
  hasImportedFeatures: boolean;
  setHasImportedFeatures: (value: boolean) => void;
}

function AdminScreen({ 
  features, 
  onAddFeature, 
  onUpdateFeature, 
  onDeleteFeature,
  onShowResults,
  showAddForm,
  setShowAddForm,
  editingFeature,
  setEditingFeature,
  onLogout,
  votingSession,
  onUpdateVotingSession,
  showSessionForm,
  setShowSessionForm,
  azureDevOpsConfig,
  onUpdateAzureDevOpsConfig,
  showAzureDevOpsForm,
  setShowAzureDevOpsForm,
  onFetchAzureDevOpsFeatures,
  onPreviewAzureDevOpsFeatures,
  onDisconnectAzureDevOps,
  isFetchingAzureDevOps,
  azureFetchError,
  onInitiateOAuth,
  availableStates,
  availableAreaPaths,
  availableTags,
  previewFeatures,
  showPreviewModal,
  setShowPreviewModal,
  onConfirmSync,
  hasImportedFeatures,
  setHasImportedFeatures
}: AdminScreenProps) {
  const daysRemaining = getDaysRemaining(votingSession.endDate);
  const deadlineColor = getDeadlineColor(daysRemaining);
  
  const votingStatus = votingSession.isActive 
    ? <span className="text-[#1E6154] font-medium">Active</span>
    : isPastDate(votingSession.endDate)
      ? <span className="text-red-600 font-medium">Closed</span>
      : <span className="text-yellow-600 font-medium">Upcoming</span>;

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen pb-8">
      {/* Desktop: Centered logo at top */}
      <div className="hidden md:flex md:justify-center mb-2">
        <img
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
          alt="New Millennium Building Systems Logo"
          className="-mt-8"
          style={{ height: '96px', width: 'auto' }}
        />
      </div>
      
      {/* Title and buttons in same row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          {/* Mobile: small logo next to title */}
          <ImageWithFallback
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px' }}
          />
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Admin Dashboard</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="gold" onClick={onShowResults} className="flex items-center">
            <BarChart2 className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">View Results</span>
          </Button>
          <Button variant="gray" onClick={onLogout} className="flex items-center">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
      
      {/* Voting Session Settings */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#2d4660]">Voting Session Settings</h2>
          <Button 
            variant="primary"
            onClick={() => setShowSessionForm(true)}
            className="flex items-center w-44"
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit Settings
          </Button>
        </div>

        <div className="flex gap-6">
          {/* Left side: Session Title and Goal grouped together */}
          <div className="flex-1">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Session Title</h3>
              <p className="text-[#2d4660] font-medium text-base">{votingSession.title}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Goal</h3>
              <p className="text-[#2d4660] text-base">{votingSession.goal}</p>
            </div>
          </div>
          
          {/* Right side: Metrics */}
          <div className="flex gap-6 items-stretch">
            <div className="flex flex-col">
              <h3 className="text-sm font-medium text-gray-700 mb-2 mt-[3px]">Votes Per User</h3>
              <div className="border border-gray-300 rounded-md p-4 text-center bg-white flex-1 flex items-center justify-center">
                <p className="text-[#2d4660] font-bold text-4xl">{votingSession.votesPerUser}</p>
              </div>
            </div>
            
            <div className="min-w-[280px] flex flex-col">
              <div className="flex items-center justify-center gap-3 mb-2">
                <h3 className="text-sm font-medium text-gray-700">Voting Period</h3>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-gray-600" />
                  {votingStatus}
                </div>
              </div>
              <div className={`${getDeadlineBgColor(daysRemaining)} rounded-md p-3 border ${
                daysRemaining <= 2 ? 'border-red-200' : 
                daysRemaining <= 4 ? 'border-yellow-200' : 
                'border-[#1E6154]/20'
              } flex-1 flex flex-col justify-center`}>
                <div className="flex items-center justify-center mb-2">
                  <Calendar className={`h-4 w-4 mr-2 ${deadlineColor}`} />
                  <span className={`font-medium text-sm ${deadlineColor}`}>
                    {formatDate(votingSession.startDate)} - {formatDate(votingSession.endDate)}
                  </span>
                </div>
                <p className={`text-sm font-medium text-center ${deadlineColor}`}>
                  {daysRemaining <= 0 
                    ? "Voting ends today!" 
                    : `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Azure DevOps Integration */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Cloud className="h-5 w-5 text-[#2d4660] mr-2" />
            <h2 className="text-xl font-semibold text-[#2d4660]">Azure DevOps Integration</h2>
          </div>
          {azureDevOpsConfig.enabled && (
            <Button 
              variant="primary"
              onClick={() => {
                setShowAzureDevOpsForm(true);
                setHasImportedFeatures(false);
              }}
              className="flex items-center w-44"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Settings
            </Button>
          )}
        </div>

        {showAzureDevOpsForm ? (
          <AzureDevOpsForm 
            config={azureDevOpsConfig}
            onUpdate={onUpdateAzureDevOpsConfig}
            onPreview={onPreviewAzureDevOpsFeatures}
            onCancel={() => setShowAzureDevOpsForm(false)}
            isFetching={isFetchingAzureDevOps}
            error={azureFetchError}
            onInitiateOAuth={onInitiateOAuth}
            availableStates={availableStates}
            availableAreaPaths={availableAreaPaths}
            availableTags={availableTags}
          />
        ) : (
          <div>
            {azureDevOpsConfig.enabled ? (
              <div className="flex justify-between gap-6">
                <div className="flex-1 space-y-2">
                  <p className="text-sm leading-[25px] flex items-baseline">
                    <span className="font-medium text-gray-700 w-36 text-right mr-2">Organization:</span>
                    <span className="text-[#2d4660] font-semibold text-[20px]">{azureDevOpsConfig.organization}</span>
                  </p>
                  
                  <p className="text-sm leading-[25px] flex items-baseline">
                    <span className="font-medium text-gray-700 w-36 text-right mr-2">Project:</span>
                    <span className="text-[#2d4660] font-semibold text-[20px]">{azureDevOpsConfig.project}</span>
                  </p>
                  
                  <p className="text-sm leading-[25px] flex items-baseline">
                    <span className="font-medium text-gray-700 w-36 text-right mr-2">Work Item Type:</span>
                    <span className="text-[#2d4660] font-semibold text-[20px]">{azureDevOpsConfig.workItemType}</span>
                  </p>
                </div>
                
                <div className="flex-1 space-y-2">
                  <p className="text-sm leading-[25px] flex items-baseline">
                    <span className="font-medium text-gray-700 w-36 text-right mr-2">Status:</span>
                    <span className="inline-flex items-baseline">
                      <span className="h-2 w-2 rounded-full bg-[#1E6154] mr-1.5 self-center"></span>
                      <span className="text-[#1E6154] font-medium text-[20px]">Connected</span>
                      <button
                        onClick={onDisconnectAzureDevOps}
                        className="ml-2 text-red-600 hover:text-red-800 cursor-pointer self-center flex items-center"
                        title="Disconnect"
                      >
                        <X className="h-4 w-4" />
                        <span className="ml-1 text-sm font-medium">Disconnect</span>
                      </button>
                    </span>
                  </p>
                  
                  {azureDevOpsConfig.lastSyncTime && (
                    <p className="text-sm leading-[25px] flex items-baseline">
                      <span className="font-medium text-gray-700 w-36 text-right mr-2">Last Synchronized:</span>
                      <span className="inline-flex items-baseline text-gray-700 text-[20px]">
                        <Clock className="h-3.5 w-3.5 mr-1 text-gray-500 self-center" />
                        {formatDate(azureDevOpsConfig.lastSyncTime)}
                      </span>
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col gap-3">
                  {!hasImportedFeatures && (
                    <Button 
                      variant="gold"
                      onClick={() => onPreviewAzureDevOpsFeatures()}
                      disabled={isFetchingAzureDevOps}
                      className="flex items-center w-44"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingAzureDevOps ? 'animate-spin' : ''}`} />
                      {isFetchingAzureDevOps ? 'Loading...' : 'Preview Features'}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center border border-dashed border-gray-300">
                <Cloud className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-700 mb-2">Azure DevOps Integration Not Configured</h3>
                <p className="text-gray-600 mb-4">
                  Connect to Azure DevOps to import work items as features for voting.
                </p>
                <Button 
                  variant="primary"
                  onClick={() => setShowAzureDevOpsForm(true)}
                  className="inline-flex items-center"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Integration
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature Management */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#2d4660]">Feature Management</h2>
          <Button 
            variant="gold"
            onClick={() => setShowAddForm(true)}
            className="flex items-center w-44"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Feature
          </Button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th scope="col" className="hidden lg:table-cell w-[25%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="hidden md:table-cell w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Epic</th>
                <th scope="col" className="hidden md:table-cell w-[8%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                <th scope="col" className="hidden lg:table-cell w-[12%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Path</th>
                <th scope="col" className="hidden xl:table-cell w-[10%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                <th scope="col" className="w-[8%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                <th scope="col" className="w-[7%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {features.map((feature) => (
                <tr key={feature.id} className="align-top group">
                  <td className="px-4 py-4 whitespace-normal break-words text-sm font-medium text-left">
                    <div className="max-w-xs overflow-hidden text-left">
                      {feature.title}
                      {feature.azureDevOpsId && (
                        <div className="mt-1">
                          <AzureDevOpsBadge id={feature.azureDevOpsId} url={feature.azureDevOpsUrl || ''} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-4 text-sm text-gray-500 text-left">
                    <div className="max-w-md overflow-hidden break-words text-left">
                      {feature.description}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm">
                    {feature.epic && <EpicTag name={feature.epic} />}
                  </td>
                  <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm">
                    {feature.state && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {feature.state}
                      </span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-4 text-sm text-gray-600">
                    <div className="max-w-xs truncate">
                      {feature.areaPath || '-'}
                    </div>
                  </td>
                  <td className="hidden xl:table-cell px-4 py-4 text-sm">
                    {feature.tags && feature.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {feature.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                            {tag}
                          </span>
                        ))}
                        {feature.tags.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500">
                            +{feature.tags.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{feature.votes}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 space-x-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingFeature(feature)}
                      className="text-[#2d4660] hover:text-[#bea263] inline-block cursor-pointer"
                      title="Edit Feature"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => onDeleteFeature(feature.id)}
                      className="text-[#2d4660] hover:text-red-600 inline-block cursor-pointer"
                      title="Delete Feature"
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

      {/* Modal Dialogs */}
      <Modal
        isOpen={showSessionForm}
        onClose={() => setShowSessionForm(false)}
        title="Edit Voting Session"
      >
        <VotingSessionForm
          votingSession={votingSession}
          onSubmit={(updatedSession) => {
            onUpdateVotingSession(updatedSession);
            setShowSessionForm(false);
          }}
          onCancel={() => setShowSessionForm(false)}
        />
      </Modal>
      
      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title="Add New Feature"
      >
        <FeatureForm
          onSubmit={(data) => {
            onAddFeature(data);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      </Modal>
      
      <Modal
        isOpen={editingFeature !== null}
        onClose={() => setEditingFeature(null)}
        title="Edit Feature"
      >
        {editingFeature && (
          <FeatureForm
            feature={editingFeature}
            onSubmit={(data) => {
              onUpdateFeature({...editingFeature, ...data});
              setEditingFeature(null);
            }}
            onCancel={() => setEditingFeature(null)}
          />
        )}
      </Modal>

      {/* Azure DevOps Preview Modal */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Preview Azure DevOps Features"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Review the features that will be synced from Azure DevOps. Choose an action:
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-800"><strong>Add Features:</strong> Merge with existing features (updates matching Azure DevOps IDs)</p>
            <p className="text-blue-800 mt-1"><strong>Replace All:</strong> Delete all existing features and add only these Azure DevOps features</p>
          </div>
          
          {previewFeatures && previewFeatures.length > 0 ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium">
                  Found {previewFeatures.length} work item{previewFeatures.length !== 1 ? 's' : ''} to sync
                </p>
              </div>
              
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Epic</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area Path</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewFeatures.map((feature) => (
                      <tr key={feature.id}>
                        <td className="px-4 py-3 text-sm">
                          {feature.azureDevOpsId && (
                            <AzureDevOpsBadge id={feature.azureDevOpsId} url={feature.azureDevOpsUrl || ''} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{feature.title}</td>
                        <td className="px-4 py-3 text-sm">
                          {feature.epic && <EpicTag name={feature.epic} />}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {feature.state && (
                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              {feature.state}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="max-w-xs truncate">
                            {feature.areaPath || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {feature.tags && feature.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {feature.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                  {tag}
                                </span>
                              ))}
                              {feature.tags.length > 2 && (
                                <span className="px-2 py-0.5 text-xs text-gray-500">
                                  +{feature.tags.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                  variant="secondary"
                  onClick={() => setShowPreviewModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary"
                  onClick={async () => {
                    await onConfirmSync(false); // false = add/merge features
                    setShowPreviewModal(false);
                  }}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {previewFeatures.length} Feature{previewFeatures.length !== 1 ? 's' : ''}
                </Button>
                <Button 
                  variant="danger"
                  onClick={async () => {
                    await onConfirmSync(true); // true = replace all features
                    setShowPreviewModal(false);
                  }}
                  className="flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Replace All Features
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No features found to sync</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

interface VotingScreenProps {
  features: Feature[];
  currentUser: User;
  pendingVotes: Record<string, number>;
  pendingUsedVotes: number;
  onVote: (featureId: string, increment: boolean) => void;
  onSubmitVotes: () => void;
  onToggleAdmin: () => void;
  isAdmin: boolean;
  votingSession: VotingSession;
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
  votingSession
}: VotingScreenProps) {
  if (!currentUser) return null;
  
  const [displayFeatures, setDisplayFeatures] = useState([...features]);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    setDisplayFeatures([...features]);
  }, [features]);

  const handleShuffle = useCallback(() => {
    if (isShuffling) return;
    setIsShuffling(true);
    
    setTimeout(() => {
      setDisplayFeatures(shuffleArray(features));
      setIsShuffling(false);
    }, 300);
  }, [features, isShuffling]);

  const remainingVotes = votingSession.votesPerUser - pendingUsedVotes;
  const allVotesUsed = remainingVotes === 0;
  const votingIsActive = votingSession.isActive;
  
  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen">
      {/* Desktop: Centered logo at top */}
      <div className="hidden md:flex md:justify-center mb-2">
        <img
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
          alt="New Millennium Building Systems Logo"
          className="-mt-8"
          style={{ height: '96px', width: 'auto' }}
        />
      </div>
      
      {/* Title and buttons in same row */}
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
        <div className="flex items-center">
          <div className="mr-4 bg-white rounded-lg shadow px-4 py-2">
            <span className="text-sm text-gray-600">
              Votes remaining: <span className="font-bold text-[#2d4660]">{remainingVotes}</span>
              <span className="text-xs text-gray-500 ml-1">/ {votingSession.votesPerUser}</span>
            </span>
          </div>
          <Button 
            variant={isAdmin ? "gray" : "blue"}
            onClick={onToggleAdmin}
            className="flex items-center"
          >
            {isAdmin ? (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </>
            ) : (
              <>
                <Settings className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Admin Login</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
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
                You have <span className="font-bold text-[#2d4660]">{remainingVotes}</span> votes remaining
              </p>
            </div>
          </div>
        </div>
      </div>

      {!votingIsActive && (
        <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center text-yellow-800">
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
        <ShuffleButton isShuffling={isShuffling} onShuffle={handleShuffle} />
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
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-gray-700">
                    You still have <span className="font-semibold text-yellow-600">{remainingVotes}</span> votes remaining.
                  </span>
                </div>
              )}
              {allVotesUsed && (
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-[#1E6154] mr-2" />
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
                  ? 'bg-[#1E6154] hover:bg-[#195148] text-white'
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

export default FeatureVotingSystem;

// ============================================
// END OF FILE
// ============================================