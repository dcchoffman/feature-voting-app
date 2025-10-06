import React, { useState, useEffect, useRef, useMemo, useCallback, Component } from "react";
import { useForm } from "react-hook-form";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { 
  Plus, Edit, Trash2, X, ChevronLeft, BarChart2, Settings, 
  Vote, LogOut, Users, ChevronUp, ChevronDown, Calendar, Clock, 
  Shuffle, CheckCircle, AlertTriangle, AlertCircle, Tag, RefreshCw, 
  Cloud, Lock, Database, LogIn
} from "lucide-react";
import * as db from './databaseService'

// Types
interface Feature {
  id: string;
  title: string;
  description: string;
  votes: number;
  voters: VoterInfo[];
  epic?: string;
  azureDevOpsId?: string;
  azureDevOpsUrl?: string;
}

interface VoterInfo {
  userId: string;
  name: string;
  email: string;
  voteCount: number;
}

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

interface AzureDevOpsConfig {
  organization: string;
  project: string;
  pat: string;
  enabled: boolean;
  workItemType: string;
  query?: string;
  lastSyncTime?: string;
}

interface AzureDevOpsWorkItem {
  id: number;
  fields: {
    'System.Title': string;
    'System.Description'?: string;
    'System.Tags'?: string;
    'System.WorkItemType': string;
    'System.State': string;
    'Microsoft.VSTS.Common.Priority'?: number;
    'System.AreaPath'?: string;
    'System.IterationPath'?: string;
  };
  url: string;
}

// Constants
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

// Initial data
const initialVotingSession: VotingSession = {
  title: "Q2 Product Roadmap",
  goal: "Prioritize features for the Purchasing Dashboard redesign",
  votesPerUser: 10,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  isActive: true
};

const initialAzureDevOpsConfig: AzureDevOpsConfig = {
  organization: "",
  project: "",
  pat: "",
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

// Utility functions
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

// Randomize text for shuffle button
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

// Image component with graceful fallback
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

// Azure DevOps integration utilities
const fetchAzureDevOpsWorkItems = async (config: AzureDevOpsConfig): Promise<AzureDevOpsWorkItem[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return mock data
  return [
    {
      id: 1001,
      fields: {
        'System.Title': 'Implement Vendor Performance Scorecards',
        'System.Description': 'Visual scorecards to track and compare vendor performance metrics in detail with historical trends.',
        'System.Tags': 'Vendor Management; Reporting',
        'System.WorkItemType': 'Feature',
        'System.State': 'Active',
        'Microsoft.VSTS.Common.Priority': 1
      },
      url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/1001`
    },
    {
      id: 1002,
      fields: {
        'System.Title': 'AI-Powered Spend Analysis Dashboard',
        'System.Description': 'Machine learning algorithms to identify spending patterns and cost-saving opportunities with anomaly detection.',
        'System.Tags': 'Analytics; AI',
        'System.WorkItemType': 'Feature',
        'System.State': 'Active',
        'Microsoft.VSTS.Common.Priority': 1
      },
      url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/1002`
    },
    {
      id: 1003,
      fields: {
        'System.Title': 'Interactive Dashboard with Customizable Widgets',
        'System.Description': 'A customizable dashboard with drag-and-drop widgets for key purchasing metrics and personalized views.',
        'System.Tags': 'User Experience; Dashboard',
        'System.WorkItemType': 'Feature',
        'System.State': 'Active',
        'Microsoft.VSTS.Common.Priority': 2
      },
      url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/1003`
    },
    {
      id: 1004,
      fields: {
        'System.Title': 'Real-time Purchase Order Tracking System',
        'System.Description': 'Live tracking of purchase orders from creation to delivery with notifications and status updates.',
        'System.Tags': 'Operations',
        'System.WorkItemType': 'Feature',
        'System.State': 'Active',
        'Microsoft.VSTS.Common.Priority': 2
      },
      url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/1004`
    },
    {
      id: 1005,
      fields: {
        'System.Title': 'Mobile Procurement Application',
        'System.Description': 'Complete purchasing capabilities optimized for mobile devices with offline functionality.',
        'System.Tags': 'Mobile; User Experience',
        'System.WorkItemType': 'Feature',
        'System.State': 'Active',
        'Microsoft.VSTS.Common.Priority': 2
      },
      url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/1005`
    },
    {
      id: 1006,
      fields: {
        'System.Title': 'Integrated Approval Workflows',
        'System.Description': 'Streamlined approval processes with mobile notifications and one-click approvals.',
        'System.Tags': 'Workflow; Efficiency',
        'System.WorkItemType': 'Feature',
        'System.State': 'Active',
        'Microsoft.VSTS.Common.Priority': 3
      },
      url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/1006`
    },
    {
      id: 1007,
      fields: {
        'System.Title': 'Contract Management Integration',
        'System.Description': 'Direct access to contract details and expiration alerts within the purchasing workflow.',
        'System.Tags': 'Integration; Compliance',
        'System.WorkItemType': 'Feature',
        'System.State': 'Active',
        'Microsoft.VSTS.Common.Priority': 3
      },
      url: `https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/1007`
    }
  ];
};

// Convert Azure DevOps work items to features
const convertWorkItemsToFeatures = (workItems: AzureDevOpsWorkItem[]): Feature[] => {
  return workItems.map(item => {
    // Extract epic from tags if available, or use area path
    let epic = "Uncategorized";
    
    if (item.fields['System.Tags']) {
      const tags = item.fields['System.Tags'].split(';').map(t => t.trim());
      if (tags.length > 0) {
        epic = tags[0]; // Use the first tag as the epic
      }
    } else if (item.fields['System.AreaPath']) {
      const areaPath = item.fields['System.AreaPath'];
      const parts = areaPath.split('\\');
      if (parts.length > 1) {
        epic = parts[parts.length - 1];
      }
    }
    
    return {
      id: `ado-${item.id}`,
      title: item.fields['System.Title'],
      description: item.fields['System.Description'] || `${item.fields['System.WorkItemType']} #${item.id}`,
      votes: 0,
      voters: [],
      epic,
      azureDevOpsId: item.id.toString(),
      azureDevOpsUrl: item.url
    };
  });
};

// UI Components
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
    primary: "bg-[#4f6d8e] text-white hover:bg-[#bea263]",
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

// Using class component for Modal to avoid React reconciliation issues
class Modal extends Component<ModalProps> {
  componentDidMount() {
    document.body.style.overflow = 'hidden';
  }
  
  componentWillUnmount() {
    document.body.style.overflow = 'unset';
  }
  
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
  onFetch: (config: AzureDevOpsConfig) => Promise<void>;
  onCancel: () => void;
  isFetching: boolean;
  error: string | null;
}

function AzureDevOpsForm({
  config,
  onUpdate,
  onFetch,
  onCancel,
  isFetching,
  error
}: AzureDevOpsFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      organization: config.organization,
      project: config.project,
      pat: config.pat,
      workItemType: config.workItemType || 'Feature',
      query: config.query || ''
    }
  });
  
  const onFormSubmit = async (data: any) => {
    const updatedConfig = {
      ...config,
      organization: data.organization,
      project: data.project,
      pat: data.pat,
      workItemType: data.workItemType,
      query: data.query || undefined,
      enabled: false // Will be set to true after successful fetch
    };
    
    onUpdate(updatedConfig);
    await onFetch(updatedConfig);
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
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Personal Access Token (PAT)
        </label>
        <div className="relative">
          <input
            type="password"
            {...register('pat', { required: 'Personal Access Token is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md pr-10"
            placeholder="••••••••••••••••••••••••"
          />
          <Lock className="h-4 w-4 absolute right-3 top-3 text-gray-400" />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Requires 'Read' permissions for Work Items. <a href="https://dev.azure.com/_usersSettings/tokens" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">Create a PAT</a>
        </p>
        {errors.pat && <p className="mt-1 text-sm text-red-600">{errors.pat.message}</p>}
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
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Query (Optional)
          </label>
          <input
            {...register('query')}
            placeholder="e.g., [System.State] = 'Active'"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p className="mt-1 text-xs text-gray-500">WIQL syntax for filtering work items</p>
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
          {isFetching ? 'Connecting...' : 'Connect & Import Features'}
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
      epic: AVAILABLE_EPICS[0] // Default to first epic
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

interface ThankYouScreenProps {
  onReturn: () => void;
  votingSession: VotingSession;
}

function ThankYouScreen({ onReturn, votingSession }: ThankYouScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
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

interface AdminScreenProps {
  features: Feature[];
  onAddFeature: (feature: any) => void;
  onUpdateFeature: (feature: Feature) => void;
  onDeleteFeature: (id: string) => void;
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
  isFetchingAzureDevOps: boolean;
  azureFetchError: string | null;
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
  isFetchingAzureDevOps,
  azureFetchError
}: AdminScreenProps) {
  const daysRemaining = getDaysRemaining(votingSession.endDate);
  const deadlineColor = getDeadlineColor(daysRemaining);
  
  const votingStatus = votingSession.isActive 
    ? <span className="text-[#1E6154] font-medium">Active</span>
    : isPastDate(votingSession.endDate)
      ? <span className="text-red-600 font-medium">Closed</span>
      : <span className="text-yellow-600 font-medium">Upcoming</span>;

  return (
    <div className="container mx-auto p-4 max-w-6xl h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <ImageWithFallback
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4"
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
          >
            Edit Settings
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium text-gray-700 mb-1">Session Title</h3>
            <p className="text-lg font-semibold text-[#2d4660] mb-2">{votingSession.title}</p>
            
            <h3 className="font-medium text-gray-700 mb-1">Goal</h3>
            <p className="text-gray-800 mb-2">{votingSession.goal}</p>
            
            <h3 className="font-medium text-gray-700 mb-1">Votes Per User</h3>
            <p className="text-[#2d4660] font-bold text-lg">{votingSession.votesPerUser}</p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 mb-1">Voting Period</h3>
            <div className={`${getDeadlineBgColor(daysRemaining)} rounded-md p-3 border ${
              daysRemaining <= 2 ? 'border-red-200' : 
              daysRemaining <= 4 ? 'border-yellow-200' : 
              'border-[#1E6154]/20'
            }`}>
              <div className="flex items-center mb-1">
                <Calendar className={`h-4 w-4 mr-2 ${deadlineColor}`} />
                <span className="text-gray-800">
                  {formatDate(votingSession.startDate)} - <span className={`font-semibold ${deadlineColor}`}>{formatDate(votingSession.endDate)}</span>
                </span>
              </div>
              
              {votingSession.isActive && daysRemaining >= 0 && (
                <div className="text-sm ml-6">
                  <span className={`${deadlineColor} font-medium`}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                  </span>
                </div>
              )}
            </div>
            
            <h3 className="font-medium text-gray-700 mt-3 mb-1">Status</h3>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-600" />
              {votingStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Azure DevOps Integration */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center mb-4">
          <Cloud className="h-5 w-5 text-[#2d4660] mr-2" />
          <h2 className="text-xl font-semibold text-[#2d4660]">Azure DevOps Integration</h2>
        </div>

        {showAzureDevOpsForm ? (
          <AzureDevOpsForm 
            config={azureDevOpsConfig}
            onUpdate={onUpdateAzureDevOpsConfig}
            onFetch={onFetchAzureDevOpsFeatures}
            onCancel={() => setShowAzureDevOpsForm(false)}
            isFetching={isFetchingAzureDevOps}
            error={azureFetchError}
          />
        ) : (
          <div>
            {azureDevOpsConfig.enabled ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Organization</h3>
                  <p className="text-[#2d4660] font-semibold mb-2">{azureDevOpsConfig.organization}</p>
                  
                  <h3 className="font-medium text-gray-700 mb-1">Project</h3>
                  <p className="text-[#2d4660] font-semibold mb-2">{azureDevOpsConfig.project}</p>
                  
                  <h3 className="font-medium text-gray-700 mb-1">Work Item Type</h3>
                  <p className="text-[#2d4660] font-semibold">{azureDevOpsConfig.workItemType}</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-700 mb-1">Status</h3>
                  <div className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-[#1E6154] mr-2"></div>
                    <span className="text-[#1E6154] font-medium">Connected</span>
                  </div>
                  
                  {azureDevOpsConfig.lastSyncTime && (
                    <div className="mt-3">
                      <h3 className="font-medium text-gray-700 mb-1">Last Synchronized</h3>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-700">{formatDate(azureDevOpsConfig.lastSyncTime)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <Button 
                      onClick={() => onFetchAzureDevOpsFeatures()}
                      disabled={isFetchingAzureDevOps}
                      className="flex items-center"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingAzureDevOps ? 'animate-spin' : ''}`} />
                      {isFetchingAzureDevOps ? 'Syncing...' : 'Sync Features Now'}
                    </Button>
                  </div>
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
            className="flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Feature
          </Button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-1/3 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th scope="col" className="hidden sm:table-cell w-1/3 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th scope="col" className="hidden md:table-cell w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Epic</th>
                <th scope="col" className="w-16 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Votes</th>
                <th scope="col" className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {features.map((feature) => (
                <tr key={feature.id} className="align-top group">
                  <td className="px-4 py-4 whitespace-normal break-words text-sm font-medium">
                    {feature.title}
                    {feature.azureDevOpsId && (
                      <div className="mt-1">
                        <AzureDevOpsBadge id={feature.azureDevOpsId} url={feature.azureDevOpsUrl || ''} />
                      </div>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-500 whitespace-normal break-words">
                    {feature.description}
                  </td>
                  <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm">
                    {feature.epic && <EpicTag name={feature.epic} />}
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
  
  // State for shuffled features
  const [displayFeatures, setDisplayFeatures] = useState([...features]);
  const [isShuffling, setIsShuffling] = useState(false);

  // Update display features when actual features change
  useEffect(() => {
    setDisplayFeatures([...features]);
  }, [features]);

  // Handle shuffling
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
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <ImageWithFallback
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      
      {/* Submit Votes Button */}
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
  // Sort features by votes
  const sortedFeatures = useMemo(() => {
    return [...features].sort((a, b) => b.votes - a.votes);
  }, [features]);
  
  // Prepare chart data - limit to top 10 features
  const chartData = useMemo(() => {
    return sortedFeatures.slice(0, 10).map(feature => ({
      name: feature.title,
      votes: feature.votes,
      id: feature.id
    }));
  }, [sortedFeatures]);

  // Calculate days remaining
  const daysRemaining = getDaysRemaining(votingSession.endDate);
  const deadlineColor = getDeadlineColor(daysRemaining);

  return (
    <div className="container mx-auto p-4 max-w-6xl h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="mr-2 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <ImageWithFallback
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4"
            style={{ width: '40px', height: '40px' }}
          />
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Voting Results</h1>
        </div>
        <Button 
          variant="danger"
          onClick={onResetAllVotes}
        >
          Reset All Votes
        </Button>
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

      {/* Voters List Modal */}
      {showVotersList && (
        <VotersListModal
          feature={features.find(f => f.id === showVotersList) as Feature}
          onClose={() => setShowVotersList(null)}
        />
      )}
    </div>
  );
}

interface FeatureVotingSystemProps {
  defaultVotesPerUser?: number;
  adminMode?: boolean;
}

// Main component
function FeatureVotingSystem({ 
  defaultVotesPerUser = 10, 
  adminMode = false 
}: FeatureVotingSystemProps) {
  // State
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState(initialUsers[0]);
  const [view, setView] = useState<'voting' | 'admin' | 'thankyou' | 'results'>(adminMode ? 'admin' : 'voting');
  const [isAdmin, setIsAdmin] = useState(adminMode);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showVotersList, setShowVotersList] = useState<string | null>(null);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [showAzureDevOpsForm, setShowAzureDevOpsForm] = useState(false);
  const [votingSession, setVotingSession] = useState({
    ...initialVotingSession,
    votesPerUser: defaultVotesPerUser
  });
  
  // Azure DevOps state
  const [azureDevOpsConfig, setAzureDevOpsConfig] = useState(initialAzureDevOpsConfig);
  const [isFetchingAzureDevOps, setIsFetchingAzureDevOps] = useState(false);
  const [azureFetchError, setAzureFetchError] = useState<string | null>(null);
  
  // Voting state
  const [pendingVotes, setPendingVotes] = useState<Record<string, number>>({});
  const [pendingUsedVotes, setPendingUsedVotes] = useState(0);

  // Confirmation dialog states
  const [confirmState, setConfirmState] = useState<{
    showDelete: boolean;
    showReset: boolean;
    showResetAll: boolean;
    targetId: string | null;
  }>({
    showDelete: false,
    showReset: false,
    showResetAll: false,
    targetId: null
  });

  // Load data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Load features
        const featuresData = await db.getFeatures();
        
        // Load votes
        const votesData = await db.getVotes();
        
        // Combine features with their votes
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
            azureDevOpsId: feature.azure_devops_id,
            azureDevOpsUrl: feature.azure_devops_url,
            votes: totalVotes,
            voters
          };
        });
        
        setFeatures(featuresWithVotes);
        
        // Load voting session
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
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Update voting session status periodically
  useEffect(() => {
    const checkVotingStatus = () => {
      const isInVotingPeriod = isDateInRange(votingSession.startDate, votingSession.endDate);
      if (votingSession.isActive !== isInVotingPeriod) {
        setVotingSession(prev => ({
          ...prev,
          isActive: isInVotingPeriod
        }));
      }
    };
    
    // Check immediately and then every 10 minutes
    checkVotingStatus();
    const intervalId = setInterval(checkVotingStatus, 600000);
    return () => clearInterval(intervalId);
  }, [votingSession.startDate, votingSession.endDate, votingSession.isActive]);

  // Azure DevOps handlers
  const handleFetchAzureDevOpsFeatures = useCallback(async (config = azureDevOpsConfig) => {
    if (!config.organization || !config.project) {
      setAzureFetchError("Organization and project name are required");
      return;
    }
    
    try {
      setIsFetchingAzureDevOps(true);
      setAzureFetchError(null);
      
      // Fetch work items
      const workItems = await fetchAzureDevOpsWorkItems(config);
      const newFeatures = convertWorkItemsToFeatures(workItems);
      
      // Merge with existing features
      setFeatures(prevFeatures => {
        const existingMap = new Map();
        
        // Map existing features by ID
        prevFeatures.forEach(feature => {
          if (feature.azureDevOpsId) {
            existingMap.set(feature.azureDevOpsId, feature);
          }
        });
        
        // Merge new features with existing ones
        const merged = newFeatures.map(newFeature => {
          if (newFeature.azureDevOpsId && existingMap.has(newFeature.azureDevOpsId)) {
            const existingFeature = existingMap.get(newFeature.azureDevOpsId);
            return {
              ...newFeature,
              votes: existingFeature.votes,
              voters: existingFeature.voters
            };
          }
          return newFeature;
        });
        
        // Keep existing features without Azure DevOps ID
        const nonAzureFeatures = prevFeatures.filter(feature => !feature.azureDevOpsId);
        return [...merged, ...nonAzureFeatures];
      });
      
      setAzureDevOpsConfig({
        ...config,
        lastSyncTime: new Date().toISOString(),
        enabled: true
      });
      
      setShowAzureDevOpsForm(false);
    } catch (error) {
      setAzureFetchError("Failed to fetch features from Azure DevOps. Please check your credentials and try again.");
    } finally {
      setIsFetchingAzureDevOps(false);
    }
  }, [azureDevOpsConfig]);

  // Toggle between admin and regular user views
  const handleToggleAdmin = useCallback(() => {
    if (isAdmin) {
      // Logout from admin
      setIsAdmin(false);
      setView('voting');
    } else {
      // Login as admin
      setIsAdmin(true);
      setView('admin');
    }
  }, [isAdmin]);

  // Feature management handlers
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

  const initiateDeleteFeature = useCallback((id: string) => {
    setConfirmState({
      showDelete: true,
      showReset: false,
      showResetAll: false,
      targetId: id
    });
  }, []);

  const handleDeleteFeature = useCallback(async () => {
    const id = confirmState.targetId;
    if (id) {
      try {
        await db.deleteFeature(id);
        setFeatures(prev => prev.filter(f => f.id !== id));
      } catch (error) {
        console.error('Error deleting feature:', error);
        alert('Failed to delete feature');
      }
    }
  }, [confirmState.targetId]);

  // Voting handlers
  const initiateResetVotes = useCallback((id: string) => {
    setConfirmState({
      showDelete: false,
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
      
      // Reload data
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
      showDelete: false,
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
      // Save all votes to database
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
      
      // Reload features to get updated vote counts
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

  // Session settings handlers
  const handleUpdateVotingSession = useCallback((updatedSession: VotingSession) => {
    setVotingSession(updatedSession);
    setShowSessionForm(false);
  }, []);

  const handleUpdateAzureDevOpsConfig = useCallback((config: AzureDevOpsConfig) => {
    setAzureDevOpsConfig(config);
  }, []);

  // Return to voting screen after thank you
  const handleReturnToVoting = useCallback(() => {
    setPendingVotes({});
    setPendingUsedVotes(0);
    setView('voting');
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-full w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d4660] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render content based on current view
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
            onDeleteFeature={initiateDeleteFeature}
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
            isFetchingAzureDevOps={isFetchingAzureDevOps}
            azureFetchError={azureFetchError}
          />
        );
    }
  }, [
    view, features, currentUser, pendingVotes, pendingUsedVotes, 
    handlePendingVote, handleSubmitVotes, handleToggleAdmin, isAdmin, 
    votingSession, initiateResetVotes, initiateResetAllVotes, showVotersList,
    setShowVotersList, handleReturnToVoting, handleAddFeature, handleUpdateFeature,
    initiateDeleteFeature, showAddForm, setShowAddForm, editingFeature,
    setEditingFeature, handleUpdateVotingSession, showSessionForm, setShowSessionForm,
    azureDevOpsConfig, handleUpdateAzureDevOpsConfig, showAzureDevOpsForm,
    setShowAzureDevOpsForm, handleFetchAzureDevOpsFeatures, isFetchingAzureDevOps,
    azureFetchError
  ]);

  return (
    <div className="min-h-full w-full bg-gray-50 text-gray-900 font-sans">
      {renderContent}
      
      {/* Confirmation Dialogs */}
      <ConfirmDialog 
        show={confirmState.showDelete}
        title="Delete Feature"
        message="Are you sure you want to delete this feature? This action cannot be undone."
        onConfirm={handleDeleteFeature}
        onCancel={() => setConfirmState(prev => ({ ...prev, showDelete: false }))}
        confirmText="Delete"
        type="delete"
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