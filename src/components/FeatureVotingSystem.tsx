
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { useForm } from "react-hook-form";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { 
  Plus, Edit, Trash2, Check, X, ChevronLeft, BarChart2, Settings, 
  Vote, LogOut, Users, ChevronUp, ChevronDown, Calendar, Clock, 
  Shuffle, CheckCircle, AlertTriangle, AlertCircle, Tag, RefreshCw, 
  Cloud, Lock, Database, LogIn, Loader, Building
} from "lucide-react";

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
  id?: string;
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

interface Vote {
  userId: string;
  featureId: string;
  voteCount: number;
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
  // Set dates to make voting active by default
  startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),   // 7 days from now
  isActive: true
};

const initialAzureDevOpsConfig: AzureDevOpsConfig = {
  organization: "",
  project: "",
  pat: "",
  enabled: false,
  workItemType: "Feature",
};

const initialFeatures: Feature[] = [
  {
    id: "1",
    title: "Vendor Performance Scorecards",
    description: "Visual scorecards to track and compare vendor performance metrics.",
    votes: 14,
    voters: [],
    epic: "Vendor Management"
  },
  {
    id: "2",
    title: "AI-Powered Spend Analysis",
    description: "Machine learning algorithms to identify spending patterns and cost-saving opportunities.",
    votes: 9,
    voters: [],
    epic: "Analytics & Reporting"
  },
  {
    id: "3",
    title: "Interactive Dashboard Overview",
    description: "A customizable dashboard with drag-and-drop widgets for key purchasing metrics.",
    votes: 4,
    voters: [],
    epic: "User Experience"
  },
  {
    id: "4",
    title: "Real-time Purchase Order Tracking",
    description: "Live tracking of purchase orders from creation to delivery.",
    votes: 3,
    voters: [],
    epic: "Operational Efficiency"
  },
  {
    id: "5",
    title: "Integrated Approval Workflows",
    description: "Streamlined approval processes with mobile notifications and one-click approvals.",
    votes: 2,
    voters: [],
    epic: "Operational Efficiency"
  },
  {
    id: "6",
    title: "Contract Management Integration",
    description: "Direct access to contract details and expiration alerts within the purchasing workflow.",
    votes: 0,
    voters: [],
    epic: "Integration"
  },
  {
    id: "7",
    title: "Sustainability Impact Metrics",
    description: "Track environmental impact of purchasing decisions with sustainability scores.",
    votes: 0,
    voters: [],
    epic: "Sustainability"
  },
  {
    id: "8",
    title: "Budget Forecasting Tools",
    description: "Predictive analytics for budget planning based on historical spending patterns.",
    votes: 2,
    voters: [],
    epic: "Budget Management"
  },
  {
    id: "9",
    title: "Supplier Diversity Tracking",
    description: "Monitor and report on supplier diversity metrics and goals.",
    votes: 0,
    voters: [],
    epic: "Compliance & Risk"
  },
  {
    id: "10",
    title: "Mobile Procurement App",
    description: "Complete purchasing capabilities optimized for mobile devices.",
    votes: 3,
    voters: [],
    epic: "Mobile Access"
  }
];

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

const initialVoters: Record<string, VoterInfo[]> = {
  "1": [
    { userId: "u1", name: "John Doe", email: "john@example.com", voteCount: 5 },
    { userId: "u2", name: "Jane Smith", email: "jane@example.com", voteCount: 4 },
    { userId: "u3", name: "Robert Johnson", email: "robert@example.com", voteCount: 5 }
  ],
  "2": [
    { userId: "u1", name: "John Doe", email: "john@example.com", voteCount: 3 },
    { userId: "u2", name: "Jane Smith", email: "jane@example.com", voteCount: 3 },
    { userId: "u3", name: "Robert Johnson", email: "robert@example.com", voteCount: 3 }
  ],
  "3": [
    { userId: "u2", name: "Jane Smith", email: "jane@example.com", voteCount: 2 },
    { userId: "u3", name: "Robert Johnson", email: "robert@example.com", voteCount: 2 }
  ],
  "4": [
    { userId: "u1", name: "John Doe", email: "john@example.com", voteCount: 2 },
    { userId: "u3", name: "Robert Johnson", email: "robert@example.com", voteCount: 1 }
  ],
  "5": [
    { userId: "u2", name: "Jane Smith", email: "jane@example.com", voteCount: 1 },
    { userId: "u3", name: "Robert Johnson", email: "robert@example.com", voteCount: 1 }
  ],
  "8": [
    { userId: "u1", name: "John Doe", email: "john@example.com", voteCount: 2 }
  ],
  "10": [
    { userId: "u3", name: "Robert Johnson", email: "robert@example.com", voteCount: 3 }
  ]
};

// Utility functions
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    console.error("Date formatting error:", e);
    return "Invalid Date";
  }
};

const getDaysRemaining = (dateString: string): number => {
  try {
    const targetDate = new Date(dateString);
    const currentDate = new Date();
    
    if (isNaN(targetDate.getTime())) {
      return 0;
    }
    
    targetDate.setHours(0, 0, 0, 0);
    currentDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - currentDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    console.error("Date calculation error:", e);
    return 0;
  }
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
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return false;
    }
    return date < new Date();
  } catch (e) {
    console.error("Date comparison error:", e);
    return false;
  }
};

const isDateInRange = (startDate: string, endDate: string): boolean => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    return start <= now && now <= end;
  } catch (e) {
    console.error("Date range checking error:", e);
    return false;
  }
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

// Populate features with voters - run once during initialization
const populateInitialFeatures = (): Feature[] => {
  return initialFeatures.map(feature => {
    const voters = initialVoters[feature.id] || [];
    const votes = voters.reduce((sum, voter) => sum + voter.voteCount, 0);
    return {
      ...feature,
      voters,
      votes: votes || feature.votes
    };
  });
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

// Company logo component
// Actual company logo URL provided by user
const LOGO_URL = "https://scontent-lga3-2.xx.fbcdn.net/v/t39.30808-6/206691450_104907631855858_8947227135268581810_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=NNk0T84KUwAQ7kNvwE-4LCT&_nc_oc=AdkhIQNWFcjjSaseIX60zzf2Gf_3HoNej1aK-saiun11-MU8CiV4vvBOIOCLZSZzH9w&_nc_zt=23&_nc_ht=scontent-lga3-2.xx&_nc_gid=xciHQC6kZoiFd946_DjT5w&oh=00_AfeAZ0rhL2bQ6r_cmZJjbcgDrV0gWWZ9Q6gUbqOsb7U30Q&oe=68EAF333";

const CompanyLogo = ({ className = "", style = {} }: { className?: string; style?: React.CSSProperties }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Using a more reliable approach that doesn't depend directly on external URLs
  return (
    <div className={`inline-flex items-center justify-center ${className}`} style={style}>
      {hasError ? (
        <div className="flex items-center justify-center bg-gray-100 rounded-md w-[60px] h-[60px]">
          <Building className="w-6 h-6 text-[#2d4660]" />
        </div>
      ) : (
        <div className="relative w-[60px] h-[60px]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
              <Loader className="w-5 h-5 text-[#2d4660] animate-spin" />
            </div>
          )}
          <img 
            src={LOGO_URL}
            alt="NewMill logo" 
            className="w-full h-full object-contain rounded-md"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        </div>
      )}
    </div>
  );
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
  await new Promise(resolve => setTimeout(resolve, 1000));
  
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
  loading?: boolean;
}

const Button = React.memo(function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  loading = false,
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
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled || loading ? disabledClasses : ""} ${className}`}
      {...props}
    >
      {loading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
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

// Modal component
const Modal = React.memo(function Modal({
  isOpen,
  onClose, 
  title, 
  children, 
  maxWidth = "max-w-2xl"
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
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
});

// Loading overlay component
const LoadingOverlay = React.memo(function LoadingOverlay({ 
  show, 
  message = "Loading..." 
}: { 
  show: boolean; 
  message?: string;
}) {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
        <Loader className="h-8 w-8 text-[#2d4660] animate-spin mb-2" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
});

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

const ShuffleButton = React.memo(function ShuffleButton({ 
  isShuffling, 
  onShuffle 
}: ShuffleButtonProps) {
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
});

interface ConfirmDialogProps {
  show: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'delete' | 'reset';
  loading?: boolean;
}

const ConfirmDialog = React.memo(function ConfirmDialog({
  show,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "delete",
  loading = false
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
              disabled={loading}
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${buttonColor} cursor-pointer flex items-center`}
              disabled={loading}
            >
              {loading && <Loader className="mr-2 h-3 w-3 animate-spin" />}
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
  loading?: boolean;
}

const FeatureCard = React.memo(function FeatureCard({
  feature,
  userVoteCount = 0,
  remainingVotes = 0,
  votingIsActive = true,
  onVote,
  isShuffling = false,
  loading = false
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
                  onClick={() => !loading && onVote(feature.id, true)}
                  className={`px-4 py-1 rounded-md text-sm font-medium cursor-pointer ${
                    votingIsActive && remainingVotes > 0 && !loading
                      ? 'bg-[#4f6d8e] text-white hover:bg-[#bea263]'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                  disabled={!votingIsActive || remainingVotes <= 0 || loading}
                >
                  {loading ? <Loader className="h-3 w-3 animate-spin" /> : "Vote"}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => !loading && onVote(feature.id, false)}
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                    aria-label="Remove vote"
                    disabled={!votingIsActive || loading}
                  >
                    {loading ? <Loader className="h-3 w-3 animate-spin" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                  <span className="px-3 py-1 bg-[#1E6154]/10 text-[#1E6154] rounded-full font-medium text-sm">
                    {userVoteCount}
                  </span>
                  <button
                    onClick={() => !loading && onVote(feature.id, true)}
                    className={`p-1 rounded-full cursor-pointer ${
                      votingIsActive && remainingVotes > 0 && !loading
                        ? 'bg-[#4f6d8e]/10 hover:bg-[#bea263]/30 text-[#4f6d8e]' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!votingIsActive || remainingVotes <= 0 || loading}
                    aria-label="Add vote"
                  >
                    {loading ? <Loader className="h-3 w-3 animate-spin" /> : <ChevronUp className="h-5 w-5" />}
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

const VotersListModal = React.memo(function VotersListModal({ 
  feature, 
  onClose 
}: VotersListModalProps) {
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
});

interface VotingSessionFormProps {
  votingSession: VotingSession;
  onSubmit: (data: VotingSession) => void;
  onCancel: () => void;
  loading?: boolean;
}

function VotingSessionForm({ 
  votingSession, 
  onSubmit, 
  onCancel,
  loading = false
}: VotingSessionFormProps) {
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
      ...votingSession,
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
            disabled={loading}
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
            disabled={loading}
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
          disabled={loading}
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
            disabled={loading}
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
            disabled={loading}
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 mt-6">
        <Button 
          variant="secondary"
          type="button"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          variant="primary"
          type="submit"
          loading={loading}
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
            disabled={isFetching}
          />
          {errors.organization && <p className="mt-1 text-sm text-red-600">{errors.organization.message}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
          <input
            {...register('project', { required: 'Project name is required' })}
            placeholder="your-project"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={isFetching}
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
            disabled={isFetching}
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
            disabled={isFetching}
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
            disabled={isFetching}
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
          loading={isFetching}
          className="flex items-center"
        >
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
  loading?: boolean;
}

function FeatureForm({ 
  feature, 
  onSubmit, 
  onCancel, 
  loading = false
}: FeatureFormProps) {
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
          disabled={loading}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          {...register('description', { required: 'Description is required' })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={loading}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Epic</label>
        <select
          {...register('epic', { required: 'Epic is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
          disabled={loading}
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
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          variant="primary"
          type="submit"
          loading={loading}
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

const ThankYouScreen = React.memo(function ThankYouScreen({ 
  onReturn, 
  votingSession 
}: ThankYouScreenProps) {
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
});

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
  loading: boolean;
  saveLoading: {
    feature: boolean;
    session: boolean;
    delete: boolean;
  };
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
  azureFetchError,
  loading,
  saveLoading
}: AdminScreenProps) {
  const daysRemaining = votingSession?.endDate ? getDaysRemaining(votingSession.endDate) : 0;
  const deadlineColor = getDeadlineColor(daysRemaining);
  
  const votingStatus = votingSession?.isActive 
    ? <span className="text-[#1E6154] font-medium">Active</span>
    : votingSession?.endDate && isPastDate(votingSession.endDate)
      ? <span className="text-red-600 font-medium">Closed</span>
      : <span className="text-yellow-600 font-medium">Upcoming</span>;

  return (
    <div className="container mx-auto p-4 max-w-6xl h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <CompanyLogo 
            className="mr-4" 
            style={{ width: '60px', height: '60px' }} 
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
            <p className="text-lg font-semibold text-[#2d4660] mb-2">{votingSession?.title || "Default Session"}</p>
            
            <h3 className="font-medium text-gray-700 mb-1">Goal</h3>
            <p className="text-gray-800 mb-2">{votingSession?.goal || "Default Goal"}</p>
            
            <h3 className="font-medium text-gray-700 mb-1">Votes Per User</h3>
            <p className="text-[#2d4660] font-bold text-lg">{votingSession?.votesPerUser || 10}</p>
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
                  {votingSession?.startDate && formatDate(votingSession.startDate)} - <span className={`font-semibold ${deadlineColor}`}>{votingSession?.endDate && formatDate(votingSession.endDate)}</span>
                </span>
              </div>
              
              {votingSession?.isActive && daysRemaining >= 0 && (
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
                      loading={isFetchingAzureDevOps}
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
                      onClick={() => !loading && setEditingFeature(feature)}
                      className={`text-[#2d4660] ${!loading ? 'hover:text-[#bea263]' : ''} inline-block ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      title="Edit Feature"
                      disabled={loading}
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => !loading && onDeleteFeature(feature.id)}
                      className={`text-[#2d4660] ${!loading ? 'hover:text-red-600' : ''} inline-block ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      title="Delete Feature"
                      disabled={loading}
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
        onClose={() => !saveLoading.session && setShowSessionForm(false)}
        title="Edit Voting Session"
      >
        <VotingSessionForm
          votingSession={votingSession}
          onSubmit={(updatedSession) => {
            onUpdateVotingSession(updatedSession);
          }}
          onCancel={() => setShowSessionForm(false)}
          loading={saveLoading.session}
        />
      </Modal>
      
      <Modal
        isOpen={showAddForm}
        onClose={() => !saveLoading.feature && setShowAddForm(false)}
        title="Add New Feature"
      >
        <FeatureForm
          onSubmit={(data) => {
            onAddFeature(data);
          }}
          onCancel={() => setShowAddForm(false)}
          loading={saveLoading.feature}
        />
      </Modal>
      
      <Modal
        isOpen={editingFeature !== null}
        onClose={() => !saveLoading.feature && setEditingFeature(null)}
        title="Edit Feature"
      >
        {editingFeature && (
          <FeatureForm
            feature={editingFeature}
            onSubmit={(data) => {
              onUpdateFeature({...editingFeature, ...data});
            }}
            onCancel={() => setEditingFeature(null)}
            loading={saveLoading.feature}
          />
        )}
      </Modal>
      
      <LoadingOverlay show={loading && !showAddForm && !showSessionForm && !editingFeature} message="Loading data..." />
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
  loading: boolean;
  voteLoading: Record<string, boolean>;
  submitLoading: boolean;
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
  loading,
  voteLoading,
  submitLoading
}: VotingScreenProps) {
  if (!currentUser) return null;
  
  // State for shuffled features
  const [displayFeatures, setDisplayFeatures] = useState<Feature[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);

  // Update display features when actual features change
  useEffect(() => {
    if (features.length > 0 && displayFeatures.length === 0) {
      setDisplayFeatures([...features]);
    }
  }, [features, displayFeatures]);

  // Handle shuffling
  const handleShuffle = useCallback(() => {
    if (isShuffling || loading) return;
    setIsShuffling(true);
    
    setTimeout(() => {
      setDisplayFeatures(shuffleArray(features));
      setIsShuffling(false);
    }, 300);
  }, [features, isShuffling, loading]);

  const remainingVotes = votingSession?.votesPerUser 
    ? votingSession.votesPerUser - pendingUsedVotes 
    : 0;
  
  const allVotesUsed = remainingVotes === 0;
  const votingIsActive = votingSession?.isActive ?? true;

  // Format the remaining votes to avoid showing NaN
  const formattedRemainingVotes = isNaN(remainingVotes) ? 0 : remainingVotes;
  const formattedTotalVotes = isNaN(votingSession?.votesPerUser) ? 10 : votingSession.votesPerUser;
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <CompanyLogo
            className="mr-4"
            style={{ width: '60px', height: '60px' }}
          />
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Feature Voting</h1>
        </div>
        <div className="flex items-center">
          <div className="mr-4 bg-white rounded-lg shadow px-4 py-2">
            <span className="text-sm text-gray-600">
              Votes remaining: <span className="font-bold text-[#2d4660]">{formattedRemainingVotes}</span>
              <span className="text-xs text-gray-500 ml-1">/ {formattedTotalVotes}</span>
            </span>
          </div>
          <Button 
            variant={isAdmin ? "gray" : "blue"}
            onClick={onToggleAdmin}
            className="flex items-center"
            disabled={loading}
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
            <h2 className="text-xl font-semibold text-[#2d4660] mb-2">{votingSession?.title || "Feature Voting"}</h2>
            <p className="text-gray-600">{votingSession?.goal || "Vote for your preferred features"}</p>
          </div>
          
          <div className="flex flex-col justify-center">
            {votingSession?.endDate && (
              <DeadlineDisplay endDate={votingSession.endDate} />
            )}
            
            <div className="flex items-center mt-3">
              <Vote className="h-4 w-4 mr-2 text-[#2d4660]" />
              <p className="text-gray-700">
                You have <span className="font-bold text-[#2d4660]">{formattedRemainingVotes}</span> votes remaining
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-[#2d4660]">Available Features</h2>
        <ShuffleButton isShuffling={isShuffling} onShuffle={handleShuffle} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayFeatures.map((feature) => {
          const userVoteCount = pendingVotes[feature.id] || 0;
          const isLoading = voteLoading[feature.id] || false;
          
          return (
            <FeatureCard
              key={feature.id}
              feature={feature}
              userVoteCount={userVoteCount}
              remainingVotes={formattedRemainingVotes}
              votingIsActive={votingIsActive}
              onVote={onVote}
              isShuffling={isShuffling}
              loading={isLoading}
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
                    You still have <span className="font-semibold text-yellow-600">{formattedRemainingVotes}</span> votes remaining.
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
              className={`py-3 px-6 rounded-lg font-medium cursor-pointer flex items-center ${
                allVotesUsed && !submitLoading
                  ? 'bg-[#1E6154] hover:bg-[#195148] text-white'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
              disabled={!allVotesUsed || submitLoading}
            >
              {submitLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Submit Votes
            </button>
          </div>
        </div>
      )}
      
      <LoadingOverlay show={loading} message="Loading features..." />
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
  loading: boolean;
  resetLoading: {
    all: boolean;
    feature: string | null;
  };
}

function ResultsScreen({ 
  features, 
  onResetVotes,
  onResetAllVotes,
  onBack,
  showVotersList,
  setShowVotersList,
  votingSession,
  loading,
  resetLoading
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
  const daysRemaining = votingSession?.endDate ? getDaysRemaining(votingSession.endDate) : 0;
  const deadlineColor = getDeadlineColor(daysRemaining);

  return (
    <div className="container mx-auto p-4 max-w-6xl h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className={`mr-2 p-1 rounded-full ${loading ? '' : 'hover:bg-gray-200'} ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            disabled={loading}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <CompanyLogo
            className="mr-4"
            style={{ width: '60px', height: '60px' }}
          />
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Voting Results</h1>
        </div>
        <Button 
          variant="danger"
          onClick={onResetAllVotes}
          loading={resetLoading.all}
        >
          Reset All Votes
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#2d4660]">{votingSession?.title || "Voting Results"}</h2>
          <div className="text-sm text-gray-600">
            <span className="mr-2">Votes per user: {votingSession?.votesPerUser || 10}</span>
            {votingSession?.isActive ? (
              <span className="text-[#1E6154] font-medium">Voting Active</span>
            ) : votingSession?.endDate && isPastDate(votingSession.endDate) ? (
              <span className="text-red-600 font-medium">Voting Closed</span>
            ) : (
              <span className="text-yellow-600 font-medium">Voting Upcoming</span>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 mb-4">{votingSession?.goal || "Feature voting results"}</p>
        
        {votingSession?.isActive && votingSession.endDate && (
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
                {chartData.map((entry, index) => (
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
                  <td className="px-4 py-4 whitespace-nowrap text-sm">{feature.votes || 0}</td>
                  <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => !loading && feature.voters && feature.voters.length > 0 && setShowVotersList(feature.id)}
                      className={`text-[#2d4660] ${!loading ? 'hover:text-[#bea263]' : ''} flex items-center ${loading || !(feature.voters && feature.voters.length > 0) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      disabled={!(feature.voters && feature.voters.length > 0) || loading}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {feature.voters ? feature.voters.length : 0} {feature.voters && feature.voters.length === 1 ? 'user' : 'users'}
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => !loading && feature.votes > 0 && onResetVotes(feature.id)}
                      className={`flex items-center text-red-600 ${!loading && feature.votes > 0 ? 'hover:text-red-900' : ''} ${loading || feature.votes === 0 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      disabled={feature.votes === 0 || loading || (resetLoading.feature === feature.id)}
                    >
                      {resetLoading.feature === feature.id ? (
                        <Loader className="h-3 w-3 mr-1 animate-spin" />
                      ) : null}
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
      
      <LoadingOverlay show={loading} message="Loading results..." />
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
  // Application state
  const [features, setFeatures] = useState<Feature[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [votingSession, setVotingSession] = useState<VotingSession>(initialVotingSession);
  const [azureDevOpsConfig, setAzureDevOpsConfig] = useState<AzureDevOpsConfig>(initialAzureDevOpsConfig);
  
  // Current user state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // UI state
  const [currentScreen, setCurrentScreen] = useState<'voting' | 'admin' | 'results' | 'thankyou'>('voting');
  const [isAdmin, setIsAdmin] = useState<boolean>(adminMode);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showSessionForm, setShowSessionForm] = useState<boolean>(false);
  const [showAzureDevOpsForm, setShowAzureDevOpsForm] = useState<boolean>(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [pendingVotes, setPendingVotes] =  useState<Record<string, number>>({});
  const [pendingUsedVotes, setPendingUsedVotes] = useState<number>(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showFeatureResetConfirm, setShowFeatureResetConfirm] = useState<string | null>(null);
  const [showVotersList, setShowVotersList] = useState<string | null>(null);
  const [azureFetchError, setAzureFetchError] = useState<string | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState<boolean>(true);
  const [saveLoading, setSaveLoading] = useState<{
    feature: boolean;
    session: boolean;
    delete: boolean;
  }>({
    feature: false,
    session: false,
    delete: false
  });
  const [voteLoading, setVoteLoading] = useState<Record<string, boolean>>({});
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [resetLoading, setResetLoading] = useState<{
    all: boolean;
    feature: string | null;
  }>({
    all: false,
    feature: null
  });
  const [isFetchingAzureDevOps, setIsFetchingAzureDevOps] = useState<boolean>(false);
  
  // Initialize data
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      
      try {
        // Use local data
        const featuresData = populateInitialFeatures();
        setFeatures(featuresData);
        
        // Use initial users
        setUsers(initialUsers);
        
        // Set default current user
        if (initialUsers.length > 0) {
          setCurrentUser(initialUsers[0]);
        }
        
        // Set voting session (active by default)
        setVotingSession(initialVotingSession);
      } catch (error) {
        console.log("Error initializing data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeApp();
  }, []);
  
  // Set current user when switching between voting and admin
  useEffect(() => {
    // Only force navigation to admin view when toggling admin mode,
    // but allow navigating to results while still in admin mode.
    if (isAdmin && currentScreen === 'voting') {
      setCurrentScreen('admin');
    } else if (!isAdmin && currentScreen === 'admin') {
      setCurrentScreen('voting');
      // Reset pending votes when returning to voting
      if (currentUser) {
        setPendingVotes(currentUser.votesPerFeature);
        setPendingUsedVotes(currentUser.usedVotes);
      }
    }
  }, [isAdmin, currentUser, currentScreen]);
  
  // Switch user
  const handleUserChange = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setPendingVotes(user.votesPerFeature);
      setPendingUsedVotes(user.usedVotes);
    }
  };
  
  // Handle voting
  const handleVote = async (featureId: string, increment: boolean) => {
    if (!currentUser) return;
    
    // Update loading state for this feature
    setVoteLoading(prev => ({ ...prev, [featureId]: true }));
    
    try {
      // Get current vote count for this feature
      const currentVoteCount = pendingVotes[featureId] || 0;
      
      // Calculate new vote count
      const newVoteCount = increment
        ? currentVoteCount + 1
        : Math.max(0, currentVoteCount - 1);
      
      // Calculate vote difference
      const voteDiff = newVoteCount - currentVoteCount;
      
      // Calculate new total used votes
      const newUsedVotes = pendingUsedVotes + voteDiff;
      
      // Check if we have enough votes remaining
      if (increment && newUsedVotes > votingSession.votesPerUser) {
        return; // Not enough votes remaining
      }
      
      // Update pending votes
      const newPendingVotes = { ...pendingVotes };
      if (newVoteCount === 0) {
        delete newPendingVotes[featureId]; // Remove if 0
      } else {
        newPendingVotes[featureId] = newVoteCount;
      }
      
      setPendingVotes(newPendingVotes);
      setPendingUsedVotes(newUsedVotes);
    } finally {
      // Clear loading state
      setVoteLoading(prev => ({ ...prev, [featureId]: false }));
    }
  };
  
  // Submit votes
  const handleSubmitVotes = async () => {
    if (!currentUser) return;
    
    setSubmitLoading(true);
    
    try {
      // Update current user with new votes
      const updatedUser: User = {
        ...currentUser,
        votesPerFeature: pendingVotes,
        usedVotes: pendingUsedVotes
      };
      
      // Update local user state
      setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      setCurrentUser(updatedUser);
      
      // Update feature vote counts
      const updatedFeatures = features.map(feature => {
        const voteCount = pendingVotes[feature.id] || 0;
        if (voteCount === 0) return feature;
        
        // Calculate voter info
        const existingVoterIndex = feature.voters.findIndex(v => v.userId === currentUser.id);
        let voters = [...feature.voters];
        
        if (existingVoterIndex >= 0) {
          // Update existing voter
          voters[existingVoterIndex] = {
            ...voters[existingVoterIndex],
            voteCount
          };
        } else {
          // Add new voter
          voters.push({
            userId: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            voteCount
          });
        }
        
        // Calculate total votes
        const totalVotes = voters.reduce((sum, voter) => sum + voter.voteCount, 0);
        
        return {
          ...feature,
          voters,
          votes: totalVotes
        };
      });
      
      setFeatures(updatedFeatures);
      
      // Show thank you screen
      setCurrentScreen('thankyou');
    } catch (error) {
      console.log("Error submitting votes:", error);
      // Show thank you screen anyway
      setCurrentScreen('thankyou');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  // Add a new feature
  const handleAddFeature = async (formData: any) => {
    setSaveLoading(prev => ({ ...prev, feature: true }));
    
    try {
      // Generate a new unique ID
      const newId = `${Date.now()}`;
      
      // Create new feature
      const newFeature: Feature = {
        id: newId,
        title: formData.title,
        description: formData.description,
        epic: formData.epic,
        votes: 0,
        voters: []
      };
      
      // Update local state
      setFeatures(prev => [...prev, newFeature]);
      
      // Close form
      setShowAddForm(false);
    } catch (error) {
      console.log("Error adding feature:", error);
    } finally {
      setSaveLoading(prev => ({ ...prev, feature: false }));
    }
  };
  
  // Update a feature
  const handleUpdateFeature = async (feature: Feature) => {
    setSaveLoading(prev => ({ ...prev, feature: true }));
    
    try {
      // Update local state
      setFeatures(prev => 
        prev.map(f => f.id === feature.id ? feature : f)
      );
      
      // Close form
      setEditingFeature(null);
    } catch (error) {
      console.log("Error updating feature:", error);
    } finally {
      setSaveLoading(prev => ({ ...prev, feature: false }));
    }
  };
  
  // Delete a feature
  const handleDeleteFeature = async (id: string) => {
    setShowDeleteConfirm(id);
  };
  
  // Confirm feature deletion
  const confirmDeleteFeature = async (id: string) => {
    setSaveLoading(prev => ({ ...prev, delete: true }));
    
    try {
      // Update local state
      setFeatures(prev => prev.filter(f => f.id !== id));
      
      // Close confirmation
      setShowDeleteConfirm(null);
    } catch (error) {
      console.log("Error deleting feature:", error);
    } finally {
      setSaveLoading(prev => ({ ...prev, delete: false }));
    }
  };
  
  // Update voting session
  const handleUpdateVotingSession = async (session: VotingSession) => {
    setSaveLoading(prev => ({ ...prev, session: true }));
    
    try {
      // Update local state
      setVotingSession(session);
      
      // Close form
      setShowSessionForm(false);
    } catch (error) {
      console.log("Error updating voting session:", error);
    } finally {
      setSaveLoading(prev => ({ ...prev, session: false }));
    }
  };
  
  // Reset votes for a feature
  const handleResetFeatureVotes = (featureId: string) => {
    setShowFeatureResetConfirm(featureId);
  };
  
  // Confirm reset votes for a feature
  const confirmResetFeatureVotes = async (featureId: string) => {
    setResetLoading(prev => ({ ...prev, feature: featureId }));
    
    try {
      // Update local state - reset feature votes
      const updatedFeatures = features.map(feature => 
        feature.id === featureId 
          ? { ...feature, votes: 0, voters: [] } 
          : feature
      );
      setFeatures(updatedFeatures);
      
      // Update users - remove votes for this feature
      const updatedUsers = users.map(user => {
        const userVotesForFeature = user.votesPerFeature[featureId] || 0;
        if (userVotesForFeature === 0) return user;
        
        const votesPerFeature = { ...user.votesPerFeature };
        delete votesPerFeature[featureId];
        
        return {
          ...user,
          usedVotes: user.usedVotes - userVotesForFeature,
          votesPerFeature
        };
      });
      setUsers(updatedUsers);
      
      // Update current user
      if (currentUser) {
        const updatedCurrentUser = updatedUsers.find(u => u.id === currentUser.id);
        if (updatedCurrentUser) {
          setCurrentUser(updatedCurrentUser);
          setPendingVotes(updatedCurrentUser.votesPerFeature);
          setPendingUsedVotes(updatedCurrentUser.usedVotes);
        }
      }
      
      // Close confirmation
      setShowFeatureResetConfirm(null);
    } catch (error) {
      console.log("Error resetting feature votes:", error);
    } finally {
      setResetLoading(prev => ({ ...prev, feature: null }));
    }
  };
  
  // Reset all votes
  const handleResetAllVotes = () => {
    setShowResetConfirm(true);
  };
  
  // Confirm reset all votes
  const confirmResetAllVotes = async () => {
    setResetLoading(prev => ({ ...prev, all: true }));
    
    try {
      // Reset all features
      const updatedFeatures = features.map(feature => ({
        ...feature,
        votes: 0,
        voters: []
      }));
      setFeatures(updatedFeatures);
      
      // Reset all users
      const updatedUsers = users.map(user => ({
        ...user,
        usedVotes: 0,
        votesPerFeature: {}
      }));
      setUsers(updatedUsers);
      
      // Update current user
      if (currentUser) {
        const updatedCurrentUser = updatedUsers.find(u => u.id === currentUser.id);
        if (updatedCurrentUser) {
          setCurrentUser(updatedCurrentUser);
          setPendingVotes({});
          setPendingUsedVotes(0);
        }
      }
      
      // Close confirmation
      setShowResetConfirm(false);
    } catch (error) {
      console.log("Error resetting all votes:", error);
    } finally {
      setResetLoading(prev => ({ ...prev, all: false }));
    }
  };
  
  // Toggle between admin and voting
  const handleToggleAdmin = () => {
    setIsAdmin(!isAdmin);
  };
  
  // Return from thank you screen
  const handleReturnFromThankYou = () => {
    setCurrentScreen('voting');
  };
  
  // Fetch features from Azure DevOps
  const handleFetchAzureDevOpsFeatures = async (config?: AzureDevOpsConfig) => {
    setIsFetchingAzureDevOps(true);
    setAzureFetchError(null);
    
    try {
      // Use provided config or current config
      const activeConfig = config || azureDevOpsConfig;
      
      if (!activeConfig.organization || !activeConfig.project || !activeConfig.pat) {
        setAzureFetchError("Missing required configuration values");
        return;
      }
      
      // Fetch work items from Azure DevOps (mock)
      const workItems = await fetchAzureDevOpsWorkItems(activeConfig);
      
      // Convert to features
      const newFeatures = convertWorkItemsToFeatures(workItems);
      
      // Check for existing features with same Azure DevOps ID
      const updatedFeatures = [...features];
      const featuresAdded = [];
      
      for (const feature of newFeatures) {
        const existingFeatureIndex = features.findIndex(f => 
          f.azureDevOpsId === feature.azureDevOpsId
        );
        
        if (existingFeatureIndex >= 0) {
          // Update existing feature
          updatedFeatures[existingFeatureIndex] = {
            ...updatedFeatures[existingFeatureIndex],
            title: feature.title,
            description: feature.description,
            epic: feature.epic,
            azureDevOpsUrl: feature.azureDevOpsUrl
          };
        } else {
          // Add new feature
          featuresAdded.push(feature);
        }
      }
      
      // Update features state
      setFeatures([...updatedFeatures, ...featuresAdded]);
      
      // Update config with last sync time and enabled status
      const updatedConfig = {
        ...activeConfig,
        lastSyncTime: new Date().toISOString(),
        enabled: true
      };
      
      // Update config state
      setAzureDevOpsConfig(updatedConfig);
      
      // Close form if open
      setShowAzureDevOpsForm(false);
    } catch (error) {
      console.log("Error fetching Azure DevOps features:", error);
      setAzureFetchError("Failed to connect to Azure DevOps. Please check your configuration and try again.");
    } finally {
      setIsFetchingAzureDevOps(false);
    }
  };
  
  // Update Azure DevOps config
  const handleUpdateAzureDevOpsConfig = (config: AzureDevOpsConfig) => {
    setAzureDevOpsConfig(config);
  };
  
  // Render the appropriate screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'admin':
        return (
          <AdminScreen
            features={features}
            onAddFeature={handleAddFeature}
            onUpdateFeature={handleUpdateFeature}
            onDeleteFeature={handleDeleteFeature}
            onShowResults={() => setCurrentScreen('results')}
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
            loading={loading}
            saveLoading={saveLoading}
          />
        );
        
      case 'results':
        return (
          <ResultsScreen
            features={features}
            onResetVotes={handleResetFeatureVotes}
            onResetAllVotes={handleResetAllVotes}
            onBack={() => setCurrentScreen('admin')}
            showVotersList={showVotersList}
            setShowVotersList={setShowVotersList}
            votingSession={votingSession}
            loading={loading}
            resetLoading={resetLoading}
          />
        );
        
      case 'thankyou':
        return (
          <ThankYouScreen
            onReturn={handleReturnFromThankYou}
            votingSession={votingSession}
          />
        );
        
      default:
        return currentUser && (
          <VotingScreen
            features={features}
            currentUser={currentUser}
            pendingVotes={pendingVotes}
            pendingUsedVotes={pendingUsedVotes}
            onVote={handleVote}
            onSubmitVotes={handleSubmitVotes}
            onToggleAdmin={handleToggleAdmin}
            isAdmin={isAdmin}
            votingSession={votingSession}
            loading={loading}
            voteLoading={voteLoading}
            submitLoading={submitLoading}
          />
        );
    }
  };
  
  return (
    <div className="h-full bg-gray-50 w-full">
      {renderScreen()}
      
      {/* Confirmation Dialogs */}
      <ConfirmDialog
        show={showDeleteConfirm !== null}
        title="Delete Feature"
        message="Are you sure you want to delete this feature? This action cannot be undone."
        onConfirm={() => showDeleteConfirm && confirmDeleteFeature(showDeleteConfirm)}
        onCancel={() => setShowDeleteConfirm(null)}
        confirmText="Delete"
        cancelText="Cancel"
        type="delete"
        loading={saveLoading.delete}
      />
      
      <ConfirmDialog
        show={showResetConfirm}
        title="Reset All Votes"
        message="Are you sure you want to reset all votes? This will remove all votes for all features and cannot be undone."
        onConfirm={confirmResetAllVotes}
        onCancel={() => setShowResetConfirm(false)}
        confirmText="Reset All"
        cancelText="Cancel"
        type="reset"
        loading={resetLoading.all}
      />
      
      <ConfirmDialog
        show={showFeatureResetConfirm !== null}
        title="Reset Feature Votes"
        message="Are you sure you want to reset all votes for this feature? This cannot be undone."
        onConfirm={() => showFeatureResetConfirm && confirmResetFeatureVotes(showFeatureResetConfirm)}
        onCancel={() => setShowFeatureResetConfirm(null)}
        confirmText="Reset Votes"
        cancelText="Cancel"
        type="reset"
        loading={resetLoading.feature !== null}
      />
    </div>
  );
}

export default FeatureVotingSystem;
