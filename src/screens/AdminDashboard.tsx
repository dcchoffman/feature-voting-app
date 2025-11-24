// ============================================
// AdminDashboard.tsx - Admin Dashboard Screen
// ============================================
// Location: src/screens/AdminDashboard.tsx
// ============================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { useSession } from '../contexts/SessionContext';
import * as db from '../services/databaseService';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  Clock,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Shield,
  Filter,
  ChevronDown,
  Vote,
  ArrowRight,
  Calendar,
  Workflow,
  Lightbulb,
  Minus,
  Trophy,
  LogOut,
  BarChart2,
  Settings,
  BadgeCheck,
  List,
  Pencil
} from "lucide-react";

// Import shared components
import { 
  Button, 
  Modal, 
  EpicTag, 
  AzureDevOpsBadge, 
  ImageWithFallback, 
  FeatureForm,
  Footer
 } from '../screens/FeatureVoting';
import ProductPicker from '../components/ProductPicker';

// Import types
import type { Feature, FeatureSuggestion, VotingSession, AzureDevOpsConfig } from '../types/azure';
import type { SessionStatusNote, Product } from '../types';
import { WORK_ITEM_TYPES } from '../services/azureDevOpsService';

// Import date utility
import { formatDate, isPastDate } from '../utils/date';
import { getProductColor } from '../utils/productColors';
import { getDisplayProductName } from '../utils/productDisplay';

// ============================================
// TYPES & INTERFACES
// ============================================

interface AdminDashboardProps {
  features: Feature[];
  onAddFeature: (feature: any) => void;
  onUpdateFeature: (feature: Feature) => void;
  onDeleteFeature: (id: string) => Promise<void>;
  onShowResults: () => void;
  onRequestDeleteSession: () => void;
  isDeletingSession: boolean;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  editingFeature: Feature | null;
  setEditingFeature: (feature: Feature | null) => void;
  onLogout: () => void;
  onShowVoterView: () => void;
  votingSession: VotingSession;
  azureDevOpsConfig: AzureDevOpsConfig;
  onUpdateAzureDevOpsConfig: (config: AzureDevOpsConfig) => void;
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
  onUpdateVotingSession: (session: VotingSession) => void;
  onFetchStatesForType?: (workItemType?: string) => Promise<void>;
  onFetchAreaPathsForTypeAndState?: (workItemType?: string, states?: string[]) => Promise<void>;
  onFetchTagsForTypeStateAndAreaPath?: (workItemType?: string, states?: string[], areaPaths?: string[]) => Promise<void>;
  onFetchTypesAndStatesForAreaPath?: (areaPaths: string[]) => Promise<{ types: string[]; states: string[] }>;
  onFetchTypesAndStatesForTags?: (tags: string[]) => Promise<{ types: string[]; states: string[]; areaPaths: string[] }>;
  onFetchTypesAndAreaPathsForStates?: (states: string[]) => Promise<{ types: string[]; areaPaths: string[] }>;
  suggestedFeatures: FeatureSuggestion[];
  otherSessions: Array<{ id: string; title: string; startDate: string }>;
  onPromoteSuggestion: (id: string) => Promise<void>;
  onMoveSuggestion: (id: string, targetSessionId: string) => Promise<void>;
  onEditSuggestion: (id: string, updates: { title?: string; summary?: string | null; whatWouldItDo?: string | null; howWouldItWork?: string | null; }) => Promise<void>;
  onDeleteSuggestion: (id: string) => Promise<void>;
  adminPerspective?: 'session' | 'system';
  projectOptions: string[];
}

const REOPEN_REASON_OPTIONS: string[] = [
  'Stakeholders need more time',
  'New backlog items require votes',
  'Clarify previous results',
  'Technical issue resolved',
  'Other'
];

const AZURE_DEVOPS_ICON = "https://cdn.iconscout.com/icon/free/png-512/azure-devops-3628645-3029870.png";

// ============================================
// SINGLE SELECT DROPDOWN COMPONENT
// ============================================

interface SingleSelectDropdownProps {
  options: string[];
  value: string;
  onChange: (selected: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  variant?: 'default' | 'green';
}

function SingleSelectDropdown({ options, value, onChange, placeholder = "Select...", label, disabled = false, variant = 'default' }: SingleSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const displayValue = value || placeholder;

  const borderColor = variant === 'green' ? 'border-green-600' : 'border-gray-300';
  const chevronColor = variant === 'green' ? 'text-green-600' : 'text-gray-400';
  const selectedBgColor = variant === 'green' ? 'bg-green-50' : 'bg-blue-50';
  const selectedIconColor = variant === 'green' ? 'text-green-600' : 'text-[#1E5461]';

  return (
    <div ref={dropdownRef} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border ${borderColor} rounded-md min-h-[38px] flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'
        }`}
      >
        <span className={`text-sm ${!value ? 'text-gray-400' : 'text-gray-900'}`}>
          {displayValue}
        </span>
        <ChevronDown className={`h-4 w-4 ${chevronColor} transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {options.map(option => (
            <div
              key={option}
              onClick={() => selectOption(option)}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                value === option ? selectedBgColor : ''
              }`}
            >
              <span className="text-sm text-gray-900">{option}</span>
              {value === option && (
                <CheckCircle className={`h-4 w-4 ${selectedIconColor}`} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// MULTISELECT DROPDOWN COMPONENT
// ============================================

interface MultiSelectDropdownProps {
  options: string[];
  value: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: string;
  searchable?: boolean;
  disabled?: boolean;
}

function MultiSelectDropdown({ options, value, onChange, placeholder = "Select...", label, searchable = false, disabled = false }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(v => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(v => v !== option));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const filteredOptions = searchable && searchTerm
    ? options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  return (
    <div ref={dropdownRef} className="relative">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md min-h-[38px] flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'
        }`}
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {value.length === 0 ? (
            <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-400'}`}>{placeholder}</span>
          ) : (
            value.map(item => (
              <span
                key={item}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#2D4660]/10 text-[#2D4660]"
              >
                {item}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeOption(item, e)}
                    className="ml-1 hover:text-[#173B65]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {value.length > 0 && !disabled && (
            <button
              type="button"
              onClick={clearAll}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Type to search..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D4660]"
              />
            </div>
          )}
          <div className="overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
                <div
                  key={option}
                  onClick={() => toggleOption(option)}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    value.includes(option) ? 'bg-[#2D4660]/5' : ''
                  }`}
                >
                  <span className="text-sm">{option}</span>
                  {value.includes(option) && (
                    <CheckCircle className="h-4 w-4 text-[#1E5461]" />
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// FILTER & PREVIEW FORM
// ============================================

interface FilterFormProps {
  config: AzureDevOpsConfig;
  onUpdateConfig: (config: AzureDevOpsConfig) => void;
  onPreview: () => Promise<void>;
  isFetching: boolean;
  availableStates: string[];
  availableAreaPaths: string[];
  availableTags: string[];
  onFetchStatesForType?: (workItemType?: string) => Promise<void>;
  onFetchAreaPathsForTypeAndState?: (workItemType?: string, states?: string[]) => Promise<void>;
  onFetchTagsForTypeStateAndAreaPath?: (workItemType?: string, states?: string[], areaPaths?: string[]) => Promise<void>;
  onFetchTypesAndStatesForAreaPath?: (areaPaths: string[]) => Promise<{ types: string[]; states: string[] }>;
  onFetchTypesAndStatesForTags?: (tags: string[]) => Promise<{ types: string[]; states: string[]; areaPaths: string[] }>;
  onFetchTypesAndAreaPathsForStates?: (states: string[]) => Promise<{ types: string[]; areaPaths: string[] }>;
  previewFeatures?: Feature[] | null;
  showPreviewModal?: boolean;
  resetSignal: number;
}

function FilterForm({ 
  config, 
  onUpdateConfig, 
  onPreview, 
  isFetching, 
  availableStates, 
  availableAreaPaths, 
  availableTags,
  previewFeatures,
  showPreviewModal,
  onFetchStatesForType,
  onFetchAreaPathsForTypeAndState,
  onFetchTagsForTypeStateAndAreaPath,
  onFetchTypesAndStatesForAreaPath,
  onFetchTypesAndStatesForTags,
  onFetchTypesAndAreaPathsForStates,
  resetSignal
}: FilterFormProps) {
  const WORK_ITEM_TYPE_OPTIONS = WORK_ITEM_TYPES;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [featureCount, setFeatureCount] = useState<number | null>(null);
  const [isFetchingCount, setIsFetchingCount] = useState(false);
  const [isLoadingAreaPaths, setIsLoadingAreaPaths] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const countTimeoutRef = useRef<number | null>(null);
  const prevShowPreviewModalRef = useRef(false);
  
  // Flags to prevent cascading updates
  const isUpdatingFromAreaPath = useRef(false);
  const isUpdatingFromTags = useRef(false);
  const isUpdatingFromStates = useRef(false);
  
  const defaultFilters = {
    workItemTypes: [],
    states: [],
    areaPaths: [],
    tags: [],
    query: ''
  };
  
  interface FilterFormData {
    workItemTypes: string[];
    states: string[];
    areaPaths: string[];
    tags: string[];
    query: string;
  }

  const { register, handleSubmit, watch, control, setValue, reset } = useForm<FilterFormData>({
    defaultValues: defaultFilters
  });
  
  const clearFilters = useCallback(() => {
    reset({ ...defaultFilters });
    setShowAdvanced(false);
    isUpdatingFromAreaPath.current = false;
    isUpdatingFromTags.current = false;
    isUpdatingFromStates.current = false;
  }, [reset]);

  useEffect(() => {
    clearFilters();
  }, [resetSignal, clearFilters]);

  const selectedWorkItemTypes = watch('workItemTypes');
  const selectedStates = watch('states');
  const selectedAreaPaths = watch('areaPaths');
  const selectedTags = watch('tags');
  const advancedQuery = watch('query');

  // Build query from filters
  const buildQueryFromFilters = useCallback((
    workItemTypes: string[],
    states: string[],
    areaPaths: string[],
    tags: string[],
    query: string,
    showAdvanced: boolean
  ): string | undefined => {
    const queryParts: string[] = [];
    
    if (workItemTypes && workItemTypes.length > 0) {
      if (workItemTypes.length === 1) {
        queryParts.push(`[System.WorkItemType] = '${workItemTypes[0]}'`);
      } else {
        const typesList = workItemTypes.map((type: string) => `'${type}'`).join(', ');
        queryParts.push(`[System.WorkItemType] IN (${typesList})`);
      }
    }
    
    if (states && states.length > 0) {
      if (states.length === 1) {
        queryParts.push(`[System.State] = '${states[0]}'`);
      } else {
        const statesList = states.map((s: string) => `'${s}'`).join(', ');
        queryParts.push(`[System.State] IN (${statesList})`);
      }
    }
    
    if (areaPaths && areaPaths.length > 0) {
      if (areaPaths.length === 1) {
        queryParts.push(`[System.AreaPath] UNDER '${areaPaths[0]}'`);
      } else {
        const areaPathFilters = areaPaths.map((path: string) => `[System.AreaPath] UNDER '${path}'`);
        queryParts.push(`(${areaPathFilters.join(' OR ')})`);
      }
    }
    
    if (tags && tags.length > 0) {
      const tagFilters = tags.map((tag: string) => `[System.Tags] CONTAINS '${tag}'`);
      queryParts.push(`(${tagFilters.join(' OR ')})`);
    }
    
    if (showAdvanced && query) {
      queryParts.push(`(${query})`);
    }
    
    return queryParts.length > 0 ? queryParts.join(' AND ') : undefined;
  }, []);

  // Fetch states when work item type changes
  useEffect(() => {
    if (isUpdatingFromAreaPath.current || isUpdatingFromTags.current || isUpdatingFromStates.current) {
      return;
    }

    if (!onFetchStatesForType) return;

    if (!selectedWorkItemTypes || selectedWorkItemTypes.length === 0) {
      onFetchStatesForType(undefined);
      return;
    }

    onFetchStatesForType(selectedWorkItemTypes[0]);
  }, [selectedWorkItemTypes, onFetchStatesForType]);

  // Fetch area paths when work item type or states change
  useEffect(() => {
    if (isUpdatingFromAreaPath.current || isUpdatingFromTags.current) {
      return;
    }

    if (!onFetchAreaPathsForTypeAndState) return;

    const fetchAreaPaths = async () => {
      setIsLoadingAreaPaths(true);
      try {
        await onFetchAreaPathsForTypeAndState(
          selectedWorkItemTypes && selectedWorkItemTypes.length > 0 ? selectedWorkItemTypes[0] : undefined,
          selectedStates || []
        );
      } finally {
        setIsLoadingAreaPaths(false);
      }
    };

    fetchAreaPaths();
  }, [selectedWorkItemTypes, selectedStates, onFetchAreaPathsForTypeAndState]);

  // Fetch tags when filters change
  useEffect(() => {
    if (isUpdatingFromTags.current) {
      return;
    }

    if (!onFetchTagsForTypeStateAndAreaPath) return;

    if (!selectedWorkItemTypes || selectedWorkItemTypes.length === 0) {
      return;
    }

    const fetchTags = async () => {
      setIsLoadingTags(true);
      try {
        await onFetchTagsForTypeStateAndAreaPath(
          selectedWorkItemTypes[0],
          selectedStates || [],
          selectedAreaPaths || []
        );
      } finally {
        setIsLoadingTags(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchTags();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      setIsLoadingTags(false);
    };
  }, [selectedWorkItemTypes, selectedStates, selectedAreaPaths, onFetchTagsForTypeStateAndAreaPath]);

  // Auto-populate from Area Path
  useEffect(() => {
    if (!onFetchTypesAndStatesForAreaPath) return;
    if (isUpdatingFromTags.current || isUpdatingFromStates.current) return;

    if (!selectedAreaPaths || selectedAreaPaths.length === 0) {
      return;
    }

    const hasManualType = selectedWorkItemTypes && selectedWorkItemTypes.length > 0;
    const hasManualState = selectedStates && selectedStates.length > 0;

    if (hasManualType && hasManualState) {
      return;
    }

    isUpdatingFromAreaPath.current = true;

    onFetchTypesAndStatesForAreaPath(selectedAreaPaths)
      .then(({ types, states }) => {
        if (types.length > 0 && !hasManualType) {
          setValue('workItemTypes', types, { shouldDirty: false });
        }
        if (states.length > 0 && !hasManualState) {
          setValue('states', states, { shouldDirty: false });
        }
      })
      .finally(() => {
        setTimeout(() => {
          isUpdatingFromAreaPath.current = false;
        }, 300);
      });
  }, [selectedAreaPaths, selectedWorkItemTypes, selectedStates, onFetchTypesAndStatesForAreaPath, setValue]);

  // Auto-populate from Tags
  useEffect(() => {
    if (!onFetchTypesAndStatesForTags) return;
    if (isUpdatingFromAreaPath.current || isUpdatingFromStates.current) return;

    if (!selectedTags || selectedTags.length === 0) {
      return;
    }

    isUpdatingFromTags.current = true;

    onFetchTypesAndStatesForTags(selectedTags)
      .then(({ types, states, areaPaths }) => {
        if (types.length > 0) {
          setValue('workItemTypes', types, { shouldDirty: false });
        }
        if (states.length > 0) {
          setValue('states', states, { shouldDirty: false });
        }
        if (areaPaths.length > 0) {
          setValue('areaPaths', areaPaths, { shouldDirty: false });
        }
      })
      .finally(() => {
        setTimeout(() => {
          isUpdatingFromTags.current = false;
        }, 300);
      });
  }, [selectedTags, onFetchTypesAndStatesForTags, setValue]);

  // Auto-populate from States
  useEffect(() => {
    if (!onFetchTypesAndAreaPathsForStates) return;
    if (isUpdatingFromAreaPath.current || isUpdatingFromTags.current) return;

    if (!selectedStates || selectedStates.length === 0) {
      return;
    }

    const hasType = selectedWorkItemTypes && selectedWorkItemTypes.length > 0;
    if (hasType) {
      return;
    }

    isUpdatingFromStates.current = true;

    onFetchTypesAndAreaPathsForStates(selectedStates)
      .then(({ types }) => {
        if (types.length > 0) {
          setValue('workItemTypes', types, { shouldDirty: false });
        }
      })
      .finally(() => {
        setTimeout(() => {
          isUpdatingFromStates.current = false;
        }, 300);
      });
  }, [selectedStates, selectedWorkItemTypes, onFetchTypesAndAreaPathsForStates, setValue]);

  // Clear invalid options when available options change
  useEffect(() => {
    if (selectedStates && selectedStates.length > 0 && availableStates.length > 0) {
      const validStates = selectedStates.filter(state => availableStates.includes(state));
      if (validStates.length !== selectedStates.length) {
        setValue('states', validStates);
      }
    }
  }, [availableStates, selectedStates, setValue]);

  useEffect(() => {
    if (selectedAreaPaths && selectedAreaPaths.length > 0 && availableAreaPaths.length > 0) {
      const validAreaPaths = selectedAreaPaths.filter(path => availableAreaPaths.includes(path));
      if (validAreaPaths.length !== selectedAreaPaths.length) {
        setValue('areaPaths', validAreaPaths);
        if (validAreaPaths.length === 0) {
          setValue('tags', []);
        }
      }
    }
  }, [availableAreaPaths, selectedAreaPaths, setValue]);

  useEffect(() => {
    if (selectedTags && selectedTags.length > 0 && availableTags.length > 0) {
      const validTags = selectedTags.filter(tag => availableTags.includes(tag));
      if (validTags.length !== selectedTags.length) {
        setValue('tags', validTags);
      }
    }
  }, [availableTags, selectedTags, setValue]);

  // Fetch feature count
  const fetchFeatureCount = useCallback(async () => {
    if (!config.enabled || !config.accessToken || !selectedWorkItemTypes || selectedWorkItemTypes.length === 0) {
      setFeatureCount(null);
      return;
    }
    
    try {
      setIsFetchingCount(true);
      
      const workItemType = selectedWorkItemTypes[0];
      const query = buildQueryFromFilters(
        selectedWorkItemTypes || [], 
        selectedStates || [], 
        selectedAreaPaths || [], 
        selectedTags || [], 
        advancedQuery || '',
        showAdvanced
      );
      
      let wiqlQuery = '';
      if (query) {
        wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE ${query}`;
      } else {
        wiqlQuery = `SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = '${workItemType}' AND [System.State] = 'Active'`;
      }
      
      const wiqlUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/wiql?api-version=7.0`;
      
      const wiqlResponse = await fetch(wiqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.accessToken}`
        },
        body: JSON.stringify({ query: wiqlQuery })
      });
      
      if (!wiqlResponse.ok) {
        throw new Error(`Azure DevOps query failed: ${wiqlResponse.status} ${wiqlResponse.statusText}`);
      }
      
      const wiqlData = await wiqlResponse.json();
      const count = wiqlData.workItems ? wiqlData.workItems.length : 0;
      setFeatureCount(count);
    } catch (error) {
      console.error('[FilterForm] Error fetching feature count:', error);
      setFeatureCount(null);
    } finally {
      setIsFetchingCount(false);
    }
  }, [config, selectedWorkItemTypes, selectedStates, selectedAreaPaths, selectedTags, advancedQuery, showAdvanced, buildQueryFromFilters]);

  // Debounced feature count fetch
  useEffect(() => {
    if (countTimeoutRef.current !== null) {
      window.clearTimeout(countTimeoutRef.current);
    }
    
    setFeatureCount(null);
    
    if (selectedWorkItemTypes && selectedWorkItemTypes.length > 0 && config.enabled && config.accessToken) {
      countTimeoutRef.current = window.setTimeout(() => {
        fetchFeatureCount();
      }, 300);
    }
    
    return () => {
      if (countTimeoutRef.current !== null) {
        window.clearTimeout(countTimeoutRef.current);
      }
    };
  }, [selectedWorkItemTypes, selectedStates, selectedAreaPaths, selectedTags, advancedQuery, showAdvanced, config.enabled, config.accessToken, fetchFeatureCount]);

  // Sync with preview features
  useEffect(() => {
    if (showPreviewModal && !prevShowPreviewModalRef.current && previewFeatures) {
      const count = previewFeatures.length;
      setFeatureCount(count);
    }
    prevShowPreviewModalRef.current = showPreviewModal || false;
  }, [showPreviewModal, previewFeatures]);

  useEffect(() => {
    if (previewFeatures && previewFeatures.length > 0 && !isFetchingCount) {
      setFeatureCount(previewFeatures.length);
    }
  }, [previewFeatures, isFetchingCount]);

  // Update config
  useEffect(() => {
    const finalQuery = buildQueryFromFilters(
      selectedWorkItemTypes || [], 
      selectedStates || [], 
      selectedAreaPaths || [], 
      selectedTags || [], 
      advancedQuery || '',
      showAdvanced
    );
    
    const updatedConfig: AzureDevOpsConfig = {
      ...config,
      workItemType: selectedWorkItemTypes && selectedWorkItemTypes.length > 0 ? selectedWorkItemTypes[0] : config.workItemType || 'Feature',
      query: finalQuery,
      states: selectedStates && selectedStates.length > 0 ? selectedStates : undefined,
      areaPath: selectedAreaPaths && selectedAreaPaths.length > 0 ? selectedAreaPaths[0] : undefined,
      tags: selectedTags && selectedTags.length > 0 ? selectedTags : undefined
    };
    
    const configUpdateTimeout = window.setTimeout(() => {
      onUpdateConfig(updatedConfig);
    }, 100);
    
    return () => {
      window.clearTimeout(configUpdateTimeout);
    };
  }, [selectedWorkItemTypes, selectedStates, selectedAreaPaths, selectedTags, advancedQuery, showAdvanced, buildQueryFromFilters, onUpdateConfig]);

  const onSubmit = async (_data: any) => {
    await onPreview();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[#2D4660] flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filter Work Items
        </h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-[#576C71] hover:text-[#2D4660] font-medium border border-transparent hover:border-[#576C71] rounded-full px-2 py-0.5 transition"
          >
            Clear All Filters
          </button>
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-[#1E5461] hover:text-[#2D4660] font-medium"
          >
            {showAdvanced ? '← Hide Advanced WIQL' : 'Show Advanced WIQL →'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">Work Item Type</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-[#2D4660]">
              {WORK_ITEM_TYPE_OPTIONS.length}
            </span>
          </div>
          <Controller
            name="workItemTypes"
            control={control}
            render={({ field }) => (
              <MultiSelectDropdown
                options={WORK_ITEM_TYPE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select types..."
              />
            )}
          />
          <p className="mt-1 text-xs text-gray-500">Click to select multiple types</p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">State (Optional)</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-[#1E5461]">
              {availableStates?.length || 0}
            </span>
          </div>
          <Controller
            name="states"
            control={control}
            render={({ field }) => (
              <MultiSelectDropdown
                options={availableStates}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select states..."
                disabled={availableStates.length === 0}
              />
            )}
          />
          <p className="mt-1 text-xs text-gray-500">
            {availableStates.length === 0 ? 'Loading states...' : 'Filtered by work item type'}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">Area Path (Optional)</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-[#576C71]">
              {availableAreaPaths?.length || 0}
            </span>
          </div>
          <Controller
            name="areaPaths"
            control={control}
            render={({ field }) => (
              <MultiSelectDropdown
                options={availableAreaPaths}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select area paths..."
                searchable={true}
                disabled={availableAreaPaths.length === 0}
              />
            )}
          />
          <p className="mt-1 text-xs text-gray-500">
            {isLoadingAreaPaths
              ? 'Loading area paths...'
              : availableAreaPaths.length === 0
                ? 'No area paths found for current filters'
                : 'Filtered by type & state'}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700">Tags (Optional)</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white bg-[#C89212]">
              {availableTags?.length || 0}
            </span>
          </div>
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <MultiSelectDropdown
                options={availableTags}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select tags..."
                searchable={true}
                disabled={availableTags.length === 0 && !isLoadingTags}
              />
            )}
          />
          <p className="mt-1 text-xs text-gray-500">
            {!selectedWorkItemTypes || selectedWorkItemTypes.length === 0
              ? 'Select work item type to see tags'
              : isLoadingTags
                ? 'Loading tags...'
                : availableTags.length === 0
                  ? 'No tags found for current filters'
                  : 'Filtered by type, state & area'}
          </p>
        </div>
      </div>

      {showAdvanced && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Advanced WIQL Query (Optional)</label>
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
              className="text-[#1E5461] hover:text-[#2D4660]"
            >
              WIQL syntax reference ↗
            </a>
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          variant="gold" 
          type="submit" 
          disabled={(() => {
            const hasWorkItemTypes = (selectedWorkItemTypes?.length ?? 0) > 0;
            const hasStates = (selectedStates?.length ?? 0) > 0;
            const hasAreaPaths = (selectedAreaPaths?.length ?? 0) > 0;
            const hasTags = (selectedTags?.length ?? 0) > 0;
            const hasAdvancedQuery = advancedQuery && advancedQuery.trim().length > 0;
            const hasAnyFilter = hasWorkItemTypes || hasStates || hasAreaPaths || hasTags || hasAdvancedQuery;
            return isFetching || isFetchingCount || !hasAnyFilter;
          })()} 
          className="flex items-center"
        >
          {isFetching && <RefreshCw className="animate-spin h-4 w-4 mr-2" />}
          {isFetching ? 'Loading...' : (
            featureCount !== null && !isFetchingCount 
              ? `Preview ${featureCount} Feature${featureCount !== 1 ? 's' : ''}`
              : 'Preview Features'
          )}
        </Button>
      </div>
    </form>
  );
}

// ============================================
// SESSION EDIT FORM COMPONENT
// ============================================

interface SessionEditFormProps {
  session: VotingSession;
  featureCount: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onRequestDeleteSession: () => void;
  isDeletingSession: boolean;
  productName: string;
  products: Product[];
  isLoadingProducts: boolean;
  productError: string | null;
  onRequestDeleteProduct?: (product: Product) => void;
  onProductColorUpdated?: () => void;
}

interface SessionEditFormValues {
  productId: string;
  title: string;
  goal: string;
  startDate: string;
  endDate: string;
  useAutoVotes: boolean;
  votesPerUser: number;
}

function SessionEditForm({
  session,
  featureCount,
  onSubmit,
  onCancel,
  onRequestDeleteSession,
  isDeletingSession,
  productName,
  products,
  isLoadingProducts,
  productError,
  onRequestDeleteProduct,
  onProductColorUpdated
}: SessionEditFormProps) {
  const [editingProductColor, setEditingProductColor] = useState<string | null>(null);
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);
  const [tempColor, setTempColor] = useState<string>('#2D4660');
  const [pendingColorUpdate, setPendingColorUpdate] = useState<string | null>(null);
  const [isUpdatingColor, setIsUpdatingColor] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const productLookup = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((product) => {
      if (product.id && product.name) {
        map[product.id] = product.name;
      }
    });
    return map;
  }, [products]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    setValue,
    formState: { errors }
  } = useForm<SessionEditFormValues>({
    defaultValues: {
      productId: (session as any).productId ?? (session as any).product_id ?? '',
      title: session.title,
      goal: session.goal,
      startDate: session.startDate.split('T')[0],
      endDate: session.endDate.split('T')[0],
      useAutoVotes: session.useAutoVotes || false,
      votesPerUser: session.votesPerUser
    }
  });

  useEffect(() => {
    reset({
      productId: (session as any).productId ?? (session as any).product_id ?? '',
      title: session.title,
      goal: session.goal,
      startDate: session.startDate.split('T')[0],
      endDate: session.endDate.split('T')[0],
      useAutoVotes: session.useAutoVotes || false,
      votesPerUser: session.votesPerUser
    });
  }, [session, reset]);

  const initialProductName =
    (session as any).productName ?? (session as any).product_name ?? productName ?? '';
  const initialProductId =
    (session as any).productId ?? (session as any).product_id ?? '';

  useEffect(() => {
    if (!products.length) return;
    // If we have an initialProductId and products are loaded, make sure the form has it set
    if (initialProductId) {
      const exists = products.some((product) => product.id === initialProductId);
      if (exists) {
        setValue('productId', initialProductId, { shouldDirty: false, shouldTouch: false });
      }
      return;
    }
    if (!initialProductName) return;

    const matchedProduct = products.find(
      (product) => product.name.toLowerCase() === initialProductName.toLowerCase()
    );

    if (matchedProduct) {
      setValue('productId', matchedProduct.id, { shouldDirty: false, shouldTouch: false });
    }
  }, [products, initialProductId, initialProductName, setValue]);

  const useAutoVotes = watch('useAutoVotes');
  const selectedProductId = watch('productId');
  
  // Create a modified products array that includes the pending color update for display
  // This must be after selectedProductId is defined
  const displayProducts = useMemo(() => {
    if (!pendingColorUpdate || !selectedProductId) {
      return products;
    }
    return products.map(product => 
      product.id === selectedProductId
        ? { ...product, color_hex: pendingColorUpdate }
        : product
    );
  }, [products, pendingColorUpdate, selectedProductId]);
  useEffect(() => {
    if (!selectedProductId) return;
    const exists = products.some((product) => product.id === selectedProductId);
    if (!exists) {
      setValue('productId', '', { shouldDirty: true, shouldTouch: true });
    }
  }, [selectedProductId, products, setValue]);

  // Initialize and reset color editing when product changes or products load
  useEffect(() => {
    if (selectedProductId && products.length > 0) {
      const selectedProduct = products.find((product) => product.id === selectedProductId);
      if (selectedProduct) {
        const productColor = selectedProduct.color_hex ?? null;
        setEditingProductColor(productColor);
        setTempColor(productColor || '#2D4660');
        setPendingColorUpdate(null); // Clear pending update when product changes
        setShowColorPickerModal(false);
      }
    } else if (!selectedProductId) {
      setEditingProductColor(null);
      setTempColor('#2D4660');
      setPendingColorUpdate(null);
      setShowColorPickerModal(false);
    }
  }, [selectedProductId, products]);

  const effectiveVotesPerUser = useAutoVotes 
    ? Math.max(1, Math.floor(featureCount / 2))
    : watch('votesPerUser');

  // Handle form submission - update both session and product color if pending
  const handleFormSubmit = async (data: SessionEditFormValues) => {
    try {
      // If there's a pending color update, apply it first
      if (pendingColorUpdate && selectedProductId) {
        setIsUpdatingColor(true);
        try {
          await db.updateProduct(selectedProductId, { color_hex: pendingColorUpdate });
          // Notify parent to refresh products list
          if (onProductColorUpdated) {
            onProductColorUpdated();
          }
          setPendingColorUpdate(null);
          setEditingProductColor(pendingColorUpdate);
        } catch (error) {
          console.error('Error updating product color:', error);
          // Still submit the form even if color update fails
        } finally {
          setIsUpdatingColor(false);
        }
      }
      
      // Submit the session update
      onSubmit(data);
    } catch (error) {
      console.error('ERROR in handleFormSubmit:', error);
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit((data) => {
      return handleFormSubmit(data);
    }, (errors) => {
    })}>
      <Controller
        control={control}
        name="productId"
        render={({ field }) => {
          const selectedProduct =
            displayProducts.find((product) => product.id === field.value) ?? null;

          const lookupName = field.value ? productLookup[field.value] ?? null : null;
          const fallbackProductName = !selectedProduct
            ? lookupName ?? (initialProductName ? initialProductName : null)
            : null;

          const hasProductSelected = Boolean(field.value);
          // Use the product color from displayProducts (which includes pending updates)
          const displayColorHex = selectedProduct?.color_hex || null;
          // Always use the same color source as ProductPicker for consistency
          const selectedProductColors = selectedProduct
            ? getProductColor(selectedProduct.name, displayColorHex ?? null)
            : null;
          const productColorHex = selectedProductColors?.background || null;

          return (
            <div className="mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <ProductPicker
                    products={displayProducts}
                    value={field.value}
                    onChange={(value) => {
                      field.onChange(value);
                    }}
                    fallbackName={fallbackProductName}
                    isLoading={isLoadingProducts}
                    error={productError}
                    disabled={isLoadingProducts || displayProducts.length === 0}
                    helperText={
                      !isLoadingProducts && displayProducts.length === 0 && !productError
                        ? 'No products found yet. Create products from the session creation modal.'
                        : undefined
                    }
                    allowDelete={Boolean(onRequestDeleteProduct)}
                    onRequestDeleteProduct={onRequestDeleteProduct}
                  />
                </div>
                {hasProductSelected && (
                  <div className="flex items-center gap-2 mt-6">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                      Product Color
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const productColor = productColorHex || '#2D4660';
                        setTempColor(productColor);
                        setEditingProductColor(productColor);
                        setShowColorPickerModal(true);
                      }}
                      className="block w-10 h-10 rounded-md border-2 border-gray-300 hover:border-gray-400 transition-all shadow-sm"
                      style={{ 
                        backgroundColor: productColorHex || '#2D4660', 
                        borderColor: selectedProductColors?.border || '#D1D5DB'
                      }}
                      title="Change product color"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Session Title</label>
        <input
          {...register('title', { required: 'Title is required' })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
        <textarea
          {...register('goal', { required: 'Goal is required' })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        {errors.goal && <p className="mt-1 text-sm text-red-600">{errors.goal.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
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
            {...register('endDate', { required: 'End date is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
        </div>
      </div>

      <div className="mb-4 bg-[#1E5461]/5 border border-[#1E5461]/20 rounded-lg p-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            {...register('useAutoVotes')}
            className="mt-1 h-4 w-4 text-[#399E5A] border-gray-300 rounded accent-[#399E5A]"
          />
          <div className="ml-3">
            <label className="text-sm font-medium text-gray-700">
              Automatically calculate votes per user
            </label>
            <p className="text-sm text-gray-600 mt-1">
              Each user gets half the number of features (minimum 1 vote). Currently: {effectiveVotesPerUser} votes
            </p>
          </div>
        </div>

        {!useAutoVotes && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Votes Per User</label>
            <input
              type="number"
              min="1"
              {...register('votesPerUser', { 
                required: !useAutoVotes ? 'Votes per user is required' : false,
                min: { value: 1, message: 'Must be at least 1' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            {errors.votesPerUser && <p className="mt-1 text-sm text-red-600">{errors.votesPerUser.message}</p>}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="danger"
          type="button"
          onClick={() => onRequestDeleteSession()}
          disabled={isDeletingSession}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {isDeletingSession ? 'Deleting...' : 'Delete Session'}
        </Button>

        <div className="flex w-full justify-end gap-2 sm:w-auto">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              const formData = watch();
              
              // Manually trigger form submission
              await handleSubmit(
                (data) => {
                  return handleFormSubmit(data);
                },
                (errors) => {
                  alert('Please fix form errors: ' + JSON.stringify(errors));
                }
              )();
            }}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Color Picker Modal - No Header */}
      {showColorPickerModal && selectedProductId && (() => {
        const currentProduct = displayProducts.find((product) => product.id === selectedProductId);
        return currentProduct ? (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => {
            setShowColorPickerModal(false);
            setEditingProductColor(currentProduct.color_hex ?? null);
            setTempColor(currentProduct.color_hex ?? '#2D4660');
            setPendingColorUpdate(null); // Cancel pending update when closing modal
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl px-3 py-2 w-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3 items-stretch">
              {/* Color input on the left - will trigger native picker */}
              <div className="flex-shrink-0" style={{ width: '240px', height: '260px' }}>
                <input
                  id="native-color-input"
                  type="color"
                  value={tempColor}
                  onChange={(e) => {
                    setTempColor(e.target.value);
                    setEditingProductColor(e.target.value);
                  }}
                  ref={(input) => {
                    if (input && showColorPickerModal) {
                      // Auto-click to open native picker immediately
                      setTimeout(() => input.click(), 50);
                    }
                  }}
                  className="opacity-0 absolute"
                  style={{ width: '1px', height: '1px' }}
                />
                {/* Placeholder space for where native picker will appear */}
                <div className="w-full h-full"></div>
              </div>
              
              {/* Looks Good Button on the right - same height as picker */}
              <button
                type="button"
                onClick={() => {
                  if (!selectedProductId || !tempColor) return;
                  
                  const selectedProduct = displayProducts.find((product) => product.id === selectedProductId);
                  if (!selectedProduct) return;

                  // Only update if color changed from current (including pending)
                  const currentColor = selectedProduct.color_hex || null;
                  if (currentColor === tempColor) {
                    setShowColorPickerModal(false);
                    return;
                  }

                  // Store the color as pending - will be saved when form is submitted
                  // This updates displayProducts immediately via the useMemo
                  setPendingColorUpdate(tempColor);
                  setEditingProductColor(tempColor);
                  setShowColorPickerModal(false);
                }}
                disabled={isUpdatingColor}
                className="px-6 rounded-lg text-white font-bold shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-3 text-lg flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: tempColor, height: '260px', minWidth: '100px' }}
              >
                {isUpdatingColor ? (
                  <RefreshCw className="h-8 w-8 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-8 w-8" />
                    <div className="text-center leading-tight">
                      <div>Looks</div>
                      <div>Good</div>
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        ) : null;
      })()}
    </form>
  );
}

// ============================================
// ADMIN DASHBOARD COMPONENT
// ============================================

export function AdminDashboard({ 
  features, 
  onAddFeature, 
  onUpdateFeature, 
  onDeleteFeature,
  onShowResults,
  onRequestDeleteSession,
  isDeletingSession,
  showAddForm,
  setShowAddForm,
  editingFeature,
  setEditingFeature,
  onLogout,
  onShowVoterView,
  votingSession,
  azureDevOpsConfig,
  onUpdateAzureDevOpsConfig,
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
  onUpdateVotingSession,
  onFetchStatesForType,
  onFetchAreaPathsForTypeAndState,
  onFetchTagsForTypeStateAndAreaPath,
  onFetchTypesAndStatesForAreaPath,
  onFetchTypesAndStatesForTags,
  onFetchTypesAndAreaPathsForStates,
  suggestedFeatures,
  otherSessions,
  onPromoteSuggestion,
  onMoveSuggestion,
  onEditSuggestion,
  onDeleteSuggestion,
  adminPerspective = 'session',
  projectOptions
}: AdminDashboardProps) {
  const navigate = useNavigate();
  const { currentUser, currentSession } = useSession();
  
  const [selectedProject, setSelectedProject] = useState(() => {
    if (azureDevOpsConfig.project) return azureDevOpsConfig.project;
    return projectOptions[0] ?? '';
  });
  const [filtersResetToken, setFiltersResetToken] = useState(0);
  
  useEffect(() => {
    if (azureDevOpsConfig.project) {
      setSelectedProject(azureDevOpsConfig.project);
    } else if (projectOptions.length > 0) {
      setSelectedProject(projectOptions[0]);
    } else {
      setSelectedProject('');
    }
  }, [azureDevOpsConfig.project, projectOptions]);
  
  // State declarations
  const [showSessionEditForm, setShowSessionEditForm] = useState(false);
  const [showEndEarlyModal, setShowEndEarlyModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const [sessionActionsMenuOpen, setSessionActionsMenuOpen] = useState(false);
  const sessionActionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [suggestionToPromote, setSuggestionToPromote] = useState<FeatureSuggestion | null>(null);
  const [isPromotingSuggestion, setIsPromotingSuggestion] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [suggestionToMove, setSuggestionToMove] = useState<FeatureSuggestion | null>(null);
  const [targetSessionId, setTargetSessionId] = useState<string>('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMovingSuggestion, setIsMovingSuggestion] = useState(false);
  const [suggestionToEdit, setSuggestionToEdit] = useState<FeatureSuggestion | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    summary: '',
    whatWouldItDo: '',
    howWouldItWork: ''
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<FeatureSuggestion | null>(null);
  const [isDeletingSuggestion, setIsDeletingSuggestion] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [statusNotes, setStatusNotes] = useState<SessionStatusNote[]>([]);
  const [showAllStatusNotes, setShowAllStatusNotes] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [hoveredProductTab, setHoveredProductTab] = useState<boolean>(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [showEditProductColorPicker, setShowEditProductColorPicker] = useState(false);
  const [editTempColor, setEditTempColor] = useState<string>('#2D4660');
  const productLookup = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((product) => {
      if (product.id && product.name) {
        map[product.id] = product.name;
      }
    });
    return map;
  }, [products]);
  const productColorLookup = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((product) => {
      if (product.id && product.color_hex) {
        map[product.id] = product.color_hex;
      }
    });
    return map;
  }, [products]);
  const productName = useMemo(
    () =>
      getDisplayProductName(
        {
          ...votingSession,
          product_id:
            (votingSession as any).product_id ??
            (currentSession as any)?.product_id ??
            (votingSession as any).productId ??
            null,
          product_name: null // Products table is single source of truth - don't store product_name
        },
        productLookup
      ),
    [votingSession, currentSession, productLookup]
  );
  const productColorHex = useMemo(() => {
    const productId =
      (votingSession as any).product_id ?? (votingSession as any).productId ?? null;
    if (!productId) return null;
    return productColorLookup[productId] ?? null;
  }, [votingSession, productColorLookup]);
  const productColors = useMemo(
    () => getProductColor(productName, productColorHex),
    [productName, productColorHex]
  );

  const lastTenantRef = useRef<string | null>(null);

  useEffect(() => {
      const tenantId = currentUser?.tenant_id ?? currentUser?.tenantId ?? null;
      if (!tenantId) {
      lastTenantRef.current = null;
        setProducts([]);
        setProductError(null);
        return;
      }

    // Only load if we haven't loaded for this tenant yet
    if (lastTenantRef.current === tenantId) {
      return;
    }

    let isCancelled = false;
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      setProductError(null);
      try {
        const results = await db.getProductsForTenant(tenantId);
        if (isCancelled) return;
        setProducts(results);
        lastTenantRef.current = tenantId;
      } catch (error) {
        if (isCancelled) return;
        console.error('Error loading products for admin dashboard:', error);
        if (db.isProductsTableMissingError?.(error)) {
          setProductError('Products are not configured yet. Please create the `products` table in Supabase.');
        } else {
          setProductError('Unable to load products. Please try again.');
        }
        setProducts([]);
        lastTenantRef.current = null;
      } finally {
        if (!isCancelled) {
        setIsLoadingProducts(false);
        }
      }
    };

    loadProducts();

    return () => {
      isCancelled = true;
    };
  }, [currentUser?.tenant_id, currentUser?.tenantId]);
  
  const handleDeleteProduct = useCallback(async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      await db.deleteProduct(productToDelete.id);
      setProducts(prev => prev.filter((product) => product.id !== productToDelete.id));
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product from admin dashboard:', error);
      setProductError('Failed to delete product. Please try again.');
    } finally {
      setIsDeletingProduct(false);
    }
  }, [productToDelete]);
  
  const handleProjectChange = useCallback((project: string) => {
    const normalizedProject = project?.trim();
    if (!normalizedProject) {
      return;
    }

    setSelectedProject(normalizedProject);
    if (normalizedProject !== (azureDevOpsConfig.project || '')) {
      const updatedConfig: AzureDevOpsConfig = {
        ...azureDevOpsConfig,
        project: normalizedProject
      };
      onUpdateAzureDevOpsConfig(updatedConfig);
    }
    setFiltersResetToken((prev) => prev + 1);
  }, [azureDevOpsConfig, onUpdateAzureDevOpsConfig]);
  
  // Form hooks for End Early modal
  const { register: registerEndEarly, handleSubmit: handleSubmitEndEarly, reset: resetEndEarly } = useForm({
    defaultValues: {
      reason: '',
      details: ''
    }
  });

  const {
    control: reopenControl,
    handleSubmit: handleSubmitReopen,
    reset: resetReopen,
    register: registerReopen,
    formState: { errors: reopenErrors }
  } = useForm({
    defaultValues: {
      reason: '',
      details: ''
    }
  });
  
  const votingStatus = votingSession.isActive 
    ? <span className="text-[#1E5461] font-medium">Active</span>
    : isPastDate(votingSession.endDate)
      ? <span className="text-[#591D0F] font-medium">Closed</span>
      : <span className="text-[#C89212] font-medium">Upcoming</span>;

  const statusNotesDisplay = useMemo(() => {
    const buildUiNote = (note: SessionStatusNote) => {
      const isReopen = note.type === 'reopen';
      const createdAt = note.createdAt || null;
      const actorName = note.actorName || 'Admin';
      const dateLabel = createdAt ? ` ${formatDate(createdAt)}` : '';

      return {
        id: note.id,
        type: note.type,
        reason: note.reason,
        details: note.details ?? null,
        title: isReopen 
          ? `Reopened${dateLabel} by ${actorName}`
          : `Ended early${dateLabel} by ${actorName}`,
        description: `${note.reason}${note.details ? ': ' + note.details : ''}`,
        iconBgClass: isReopen ? 'bg-[#1E5461]/10' : 'bg-[#C89212]/10',
        iconBorderClass: isReopen ? 'border-[#1E5461]/20' : 'border-[#C89212]/20',
        iconColorClass: isReopen ? 'text-[#1E5461]' : 'text-[#C89212]',
        textColorClass: isReopen ? 'text-[#1E5461]' : 'text-[#6A4234]'
      };
    };

    if (statusNotes.length > 0) {
      return statusNotes.map((note) => buildUiNote(note));
    }

    const fallbackNotes: SessionStatusNote[] = [];

    if (votingSession.reopenReason) {
      fallbackNotes.push({
        id: 'fallback-reopen',
        sessionId: currentSession?.id || '',
        type: 'reopen',
        reason: votingSession.reopenReason,
        details: votingSession.reopenDetails ?? null,
        actorName: votingSession.reopenedBy || 'Admin',
        actorId: null,
        createdAt: votingSession.reopenedAt || votingSession.endDate
      });
    }

    if (votingSession.endedEarlyReason) {
      fallbackNotes.push({
        id: 'fallback-ended-early',
        sessionId: currentSession?.id || '',
        type: 'ended-early',
        reason: votingSession.endedEarlyReason,
        details: votingSession.endedEarlyDetails ?? null,
        actorName: votingSession.endedEarlyBy || 'Admin',
        actorId: null,
        createdAt: votingSession.originalEndDate || votingSession.endDate
      });
    }

    return fallbackNotes.map((note) => buildUiNote(note));
  }, [
    statusNotes,
    votingSession.reopenReason,
    votingSession.reopenDetails,
    votingSession.reopenedAt,
    votingSession.reopenedBy,
    votingSession.endedEarlyReason,
    votingSession.endedEarlyDetails,
    votingSession.originalEndDate,
    votingSession.endDate,
    votingSession.endedEarlyBy,
    currentSession?.id
  ]);

  useEffect(() => {
    if (statusNotesDisplay.length <= 2) {
      setShowAllStatusNotes(false);
    }
  }, [statusNotesDisplay.length]);

  const loadStatusNotes = useCallback(async () => {
    if (!currentSession?.id) {
      setStatusNotes([]);
      return;
    }

    try {
      const notes = await db.getSessionStatusNotes(currentSession.id);
      setStatusNotes(notes);
    } catch (error) {
      console.error('Error loading session status notes:', error);
    }
  }, [currentSession?.id]);

  useEffect(() => {
    loadStatusNotes();
  }, [loadStatusNotes]);

  const logStatusNote = useCallback(async (note: {
    type: 'reopen' | 'ended-early';
    reason: string;
    details?: string | null;
    actorName?: string | null;
    actorId?: string | null;
  }) => {
    if (!currentSession?.id) {
      return;
    }

    try {
      const created = await db.addSessionStatusNote({
        session_id: currentSession.id,
        type: note.type,
        reason: note.reason,
        details: note.details ?? null,
        actor_id: note.actorId ?? null,
        actor_name: note.actorName || 'Admin'
      });

      setStatusNotes((prev) => {
        const existingIndex = prev.findIndex((entry) => entry.id === created.id);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = created;
          return updated;
        }
        return [created, ...prev];
      });
    } catch (error) {
      console.error('Error logging session status note:', error);
    }
  }, [currentSession?.id]);

  useEffect(() => {
    if (suggestionToEdit) {
      setEditForm({
        title: suggestionToEdit.title,
        summary: suggestionToEdit.summary ?? '',
        whatWouldItDo: suggestionToEdit.whatWouldItDo ?? '',
        howWouldItWork: suggestionToEdit.howWouldItWork ?? ''
      });
      setEditError(null);
    }
  }, [suggestionToEdit]);

  useEffect(() => {
    if (suggestionToMove && otherSessions.length > 0) {
      setTargetSessionId(otherSessions[0].id);
    } else {
      setTargetSessionId('');
    }
    setMoveError(null);
  }, [suggestionToMove, otherSessions]);

  const handleSessionUpdate = (data: any) => {
    // Handle productId - can be empty string, null, undefined, or a valid ID
    const productId = data.productId && data.productId.trim() !== '' ? data.productId : null;
    
    const selectedProduct = productId ? products.find(product => product.id === productId) || null : null;
    
    const updatedSession: VotingSession = {
      ...votingSession,
      title: data.title,
      goal: data.goal,
      votesPerUser: data.useAutoVotes ? Math.max(1, Math.floor(features.length / 2)) : Number(data.votesPerUser),
      useAutoVotes: data.useAutoVotes,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate + 'T23:59:59').toISOString(),
      isActive: votingSession.isActive,
      product_id: selectedProduct?.id ?? null,
      product_name: null // Products table is single source of truth - don't store product_name
    };
    
    onUpdateVotingSession(updatedSession);
    setShowSessionEditForm(false);
  };

  const handleEndEarly = (data: any) => {
    const now = new Date().toISOString();
    const updatedSession = {
      ...votingSession,
      originalEndDate: votingSession.endDate,
      endDate: now,
      isActive: false,
      endedEarlyBy: currentUser?.name || 'Admin',
      endedEarlyReason: data.reason,
      endedEarlyDetails: data.details?.trim() ? data.details.trim() : null,
      reopenReason: null,
      reopenDetails: null,
      reopenedBy: null,
      reopenedAt: null
    };
    onUpdateVotingSession(updatedSession);
    void logStatusNote({
      type: 'ended-early',
      reason: data.reason,
      details: data.details?.trim() ? data.details.trim() : null,
      actorName: currentUser?.name || 'Admin',
      actorId: currentUser?.id ?? null
    });
    setShowEndEarlyModal(false);
    resetEndEarly();
  };

  const handleSubmitReopenSession = (data: { reason: string; details?: string }) => {
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + 7);
    const updatedSession = {
      ...votingSession,
      endDate: newEndDate.toISOString(),
      isActive: true,
      originalEndDate: null,
      endedEarlyBy: null,
      endedEarlyReason: null,
      endedEarlyDetails: null,
      reopenReason: data.reason,
      reopenDetails: data.details?.trim() ? data.details.trim() : null,
      reopenedBy: currentUser?.name || 'Admin',
      reopenedAt: new Date().toISOString()
    };
    onUpdateVotingSession(updatedSession);
    void logStatusNote({
      type: 'reopen',
      reason: data.reason,
      details: data.details?.trim() ? data.details.trim() : null,
      actorName: currentUser?.name || 'Admin',
      actorId: currentUser?.id ?? null
    });
    setShowReopenModal(false);
    resetReopen();
  };

  const handleConnect = async (org: string, project: string) => {
    const updatedConfig = {
      ...azureDevOpsConfig,
      organization: org,
      project: project
    };
    onUpdateAzureDevOpsConfig(updatedConfig);
    onInitiateOAuth();
  };

  const openEditSuggestion = (suggestion: FeatureSuggestion) => {
    setSuggestionToEdit(suggestion);
  };

  const handleSaveSuggestionEdit = async () => {
    if (!suggestionToEdit) return;
    const trimmedTitle = editForm.title.trim();
    if (!trimmedTitle) {
      setEditError('Title is required.');
      return;
    }

    setIsSavingSuggestion(true);
    setEditError(null);
    try {
      await onEditSuggestion(suggestionToEdit.id, {
        title: trimmedTitle,
        summary: editForm.summary.trim() ? editForm.summary.trim() : null,
        whatWouldItDo: editForm.whatWouldItDo.trim() ? editForm.whatWouldItDo.trim() : null,
        howWouldItWork: editForm.howWouldItWork.trim() ? editForm.howWouldItWork.trim() : null
      });
      setSuggestionToEdit(null);
    } catch (error) {
      console.error('Error updating suggestion:', error);
      setEditError('Failed to update the suggestion. Please try again.');
    } finally {
      setIsSavingSuggestion(false);
    }
  };

  const handleConfirmMoveSuggestion = async () => {
    if (!suggestionToMove) return;
    if (!targetSessionId) {
      setMoveError('Please select a session.');
      return;
    }

    setIsMovingSuggestion(true);
    setMoveError(null);
    try {
      await onMoveSuggestion(suggestionToMove.id, targetSessionId);
      setSuggestionToMove(null);
    } catch (error) {
      console.error('Error moving suggestion:', error);
      setMoveError('Failed to move the suggestion. Please try again.');
    } finally {
      setIsMovingSuggestion(false);
    }
  };

  const handleConfirmPromoteSuggestion = async () => {
    if (!suggestionToPromote) return;

    setIsPromotingSuggestion(true);
    setPromoteError(null);
    try {
      await onPromoteSuggestion(suggestionToPromote.id);
      setSuggestionToPromote(null);
    } catch (error) {
      console.error('Error promoting suggestion:', error);
      setPromoteError('Failed to move the suggestion into the current session.');
    } finally {
      setIsPromotingSuggestion(false);
    }
  };

  const handleConfirmDeleteSuggestion = async () => {
    if (!suggestionToDelete) return;

    setIsDeletingSuggestion(true);
    setDeleteError(null);
    try {
      await onDeleteSuggestion(suggestionToDelete.id);
      setSuggestionToDelete(null);
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      setDeleteError('Failed to delete the suggestion. Please try again.');
    } finally {
      setIsDeletingSuggestion(false);
    }
  };

  const handleDeleteSessionRequest = useCallback(() => {
    setShowSessionEditForm(false);
    onRequestDeleteSession();
  }, [onRequestDeleteSession]);

  // Handle click outside mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [mobileMenuOpen]);

  // Handle click outside session actions menu
  useEffect(() => {
    if (!sessionActionsMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (sessionActionsMenuRef.current && !sessionActionsMenuRef.current.contains(e.target as Node)) {
        setSessionActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [sessionActionsMenuOpen]);

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen pb-8">
      {/* Desktop: Centered logo at top */}
      <div className="hidden md:flex md:justify-center mb-2">
        <img
          src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
          alt="New Millennium Building Systems Logo"
          className="-mt-4 cursor-pointer hover:opacity-80 transition-opacity"
          style={{ height: '96px', width: 'auto' }}
          onClick={() => navigate('/sessions')}
        />
      </div>
      
      {/* Title and buttons in same row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <ImageWithFallback
            src="https://www.steeldynamics.com/wp-content/uploads/2024/05/New-Millennium-color-logo1.png"
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px' }}
          />
          <h1 className="text-2xl font-bold text-[#2D4660] md:text-3xl">Admin Dashboard</h1>
        </div>
        
        <div ref={mobileMenuRef} className="relative z-40">
          {/* Desktop buttons */}
          <div className="hidden md:flex space-x-2">
          {votingSession.isActive && (
          <button 
            onClick={onShowVoterView} 
            className="flex items-center px-4 py-2 bg-[#576C71] text-white rounded-lg hover:bg-[#1E5461] transition-colors"
          >
            <Vote className="mr-2 h-4 w-4" />
              Vote!
          </button>
          )}
          <button 
            onClick={() => navigate(adminPerspective === 'system' ? '/users' : '/users?filter=stakeholder')} 
            className="flex items-center px-4 py-2 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors"
          >
            {adminPerspective === 'system' ? (
              <Shield className="mr-2 h-4 w-4" />
            ) : (
              <Users className="mr-2 h-4 w-4" />
            )}
              {adminPerspective === 'system' ? 'User Management' : 'Stakeholders'}
          </button>
          <button 
            onClick={() => navigate('/sessions')} 
            className="flex items-center px-4 py-2 bg-[#4f6d8e] text-white rounded-lg hover:bg-[#3d5670] transition-colors"
          >
            <Users className="mr-2 h-4 w-4" />
              All Sessions
          </button>
          <button 
            onClick={onLogout} 
            className="flex items-center px-4 py-2 bg-[#576C71] text-white rounded-lg hover:bg-[#1E5461] transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
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
                {votingSession.isActive && (
                <button
                  onClick={() => { setMobileMenuOpen(false); onShowVoterView(); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  <Vote className="h-4 w-4 mr-2 text-gray-700" />
                  Vote!
                </button>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate(adminPerspective === 'system' ? '/users' : '/users?filter=stakeholder'); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  {adminPerspective === 'system' ? (
                    <Shield className="h-4 w-4 mr-2 text-gray-700" />
                  ) : (
                    <Users className="h-4 w-4 mr-2 text-gray-700" />
                  )}
                  {adminPerspective === 'system' ? 'User Management' : 'Stakeholders'}
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/sessions'); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  <Users className="h-4 w-4 mr-2 text-gray-700" />
                  All Sessions
                </button>
                {!(votingSession.isActive === false && !isPastDate(votingSession.endDate)) && (
                  <button
                    onClick={() => { setMobileMenuOpen(false); onShowResults(); }}
                    className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                  >
                    <BarChart2 className="h-4 w-4 mr-2 text-gray-700" />
                    {isPastDate(votingSession.endDate) ? 'Final Results' : 'Current Results'}
                  </button>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); setShowSessionEditForm(true); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 mr-2 text-gray-700" />
                  Edit Session
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
      
      {/* Session Info (with Edit button) */}
      <div className="relative bg-white rounded-lg shadow-md p-4 mb-6" style={{ marginTop: productName ? '3.5rem' : '0' }}>
        {productName && (
        <div
            className="absolute left-0 px-4 py-1 pr-8 rounded-t-md border-b-0 text-sm font-semibold shadow-sm z-20 flex items-center gap-2 whitespace-nowrap group cursor-pointer"
          style={{
              top: '0',
              left: '-1px',
              transform: 'translateY(-100%)',
            backgroundColor: productColors.background,
            color: productColors.text,
              borderColor: productColors.border,
              borderWidth: '1px',
              borderBottomWidth: '0',
              boxShadow: '0 4px 8px rgba(16,24,40,0.06)',
              borderTopLeftRadius: '0.9rem',
              borderTopRightRadius: '0.9rem',
              overflow: 'visible'
            }}
            onMouseEnter={() => {
              const productId = (votingSession as any).product_id || (votingSession as any).productId;
              if (productId) {
                setHoveredProductTab(true);
              }
            }}
            onMouseLeave={() => setHoveredProductTab(false)}
            onClick={async (e) => {
              const productId = (votingSession as any).product_id || (votingSession as any).productId;
              if (!productId) return;
              e.stopPropagation();
              const product = products.find(p => p.id === productId);
              if (product) {
                setProductToEdit(product);
                setEditingProductName(product.name || '');
                setEditingProductColor(product.color_hex || null);
                setEditTempColor(product.color_hex || '#2D4660');
              }
          }}
        >
            <BadgeCheck className="h-4 w-4 flex-shrink-0" />
            <span className="overflow-hidden text-ellipsis flex-1 min-w-0">{productName}</span>
            {(() => {
              const productId = (votingSession as any).product_id || (votingSession as any).productId;
              return productId && hoveredProductTab && (
                <div className="absolute right-2 flex-shrink-0 opacity-80">
                  <Pencil className="h-4 w-4" style={{ color: productColors.text }} />
        </div>
              );
            })()}
          </div>
        )}
        <div className="pt-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#2D4660]">
            Current Session: <span className="text-[#1E5461]">{votingSession.title}</span>
          </h2>
          <div ref={sessionActionsMenuRef} className="relative z-40">
            {/* Desktop buttons */}
            <div className="hidden md:flex space-x-2">
              {!(votingSession.isActive === false && !isPastDate(votingSession.endDate)) && (
            <Button 
              variant="gold"
              onClick={onShowResults}
              className="flex items-center"
            >
              <BarChart2 className="h-4 w-4 mr-2" />
              {isPastDate(votingSession.endDate) ? 'Final Results' : 'Current Results'}
            </Button>
              )}
            <Button 
              variant="primary"
              onClick={() => setShowSessionEditForm(true)}
              className="flex items-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Session
            </Button>
            </div>

            {/* Mobile menu trigger */}
            <div className="flex md:hidden">
              <button
                onClick={() => setSessionActionsMenuOpen(!sessionActionsMenuOpen)}
                className="p-2 rounded-md border border-gray-200 bg-white shadow-sm"
                aria-label="Open session actions menu"
              >
                <List className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            {/* Mobile dropdown menu */}
            {sessionActionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg md:hidden z-50">
                <div className="py-1">
                  {!(votingSession.isActive === false && !isPastDate(votingSession.endDate)) && (
                    <button
                      onClick={() => { setSessionActionsMenuOpen(false); onShowResults(); }}
                      className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                    >
                      <BarChart2 className="h-4 w-4 mr-2 text-gray-700" />
                      {isPastDate(votingSession.endDate) ? 'Final Results' : 'Current Results'}
                    </button>
                  )}
                  <button
                    onClick={() => { setSessionActionsMenuOpen(false); setShowSessionEditForm(true); }}
                    className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4 mr-2 text-gray-700" />
                    Edit Session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {isLoadingProducts && (
          <p className="text-xs text-gray-500 mb-4">Loading products…</p>
        )}
        {productError && (
          <p className="text-xs text-[#591D0F] mb-4">{productError}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Voting Period</h3>
            <p className={`text-[#2D4660] font-medium ${votingSession.originalEndDate ? 'line-through text-gray-400' : ''}`}>
              {formatDate(votingSession.startDate)} - {formatDate(votingSession.originalEndDate || votingSession.endDate)}
            </p>
            {votingSession.originalEndDate && votingSession.endedEarlyBy && (
              <div className="flex items-center mt-1 text-xs text-[#591D0F]">
                <span>Ended Early by {votingSession.endedEarlyBy}</span>
                {votingSession.endedEarlyReason && (
                  <div className="group relative ml-1">
                    <AlertCircle className="h-3 w-3 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10 pointer-events-none max-w-xs">
                      <div className="font-semibold mb-1">Reason: {votingSession.endedEarlyReason}</div>
                      {votingSession.endedEarlyDetails && (
                        <div className="whitespace-normal">{votingSession.endedEarlyDetails}</div>
                      )}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Votes Per User</h3>
            <p className="text-[#2D4660] font-medium">
              {votingSession.useAutoVotes 
                ? `${Math.max(1, Math.floor(features.length / 2))} (Auto: ${features.length} features ÷ 2)`
                : votingSession.votesPerUser
              }
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Status</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1 text-gray-600" />
                {votingStatus}
              </div>
              {(votingSession.isActive || isPastDate(votingSession.endDate)) && (
                <Button
                  variant={votingSession.isActive ? "danger" : "primary"}
                  onClick={() => {
                    if (votingSession.isActive) {
                      setShowEndEarlyModal(true);
                    } else {
                      resetReopen();
                      setShowReopenModal(true);
                    }
                  }}
                  className="text-xs px-2 py-1 ml-2"
                >
                  {votingSession.isActive ? 'End Early' : 'Reopen'}
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-gray-200">
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

              <div className="md:w-80 lg:w-96 rounded-xl border border-white/70 bg-white/80 backdrop-blur-sm shadow-inner p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#2D4660]">Status Notes</h3>
                  {statusNotesDisplay.length > 2 && (
                    <span className="inline-flex items-center justify-between text-xs text-[#1E5461] w-[90px]">
                      <span className="flex items-center justify-center w-4 h-4 border border-current rounded">
                        {showAllStatusNotes ? (
                          <Minus className="h-2.5 w-2.5" />
                        ) : (
                          <Plus className="h-2.5 w-2.5" />
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAllStatusNotes((prev) => !prev)}
                        className="ml-1 hover:text-[#173B65] transition-colors text-left flex-1"
                      >
                        {showAllStatusNotes ? 'Show Less' : 'Show More'}
                      </button>
                    </span>
                  )}
                </div>

                {statusNotesDisplay.length > 0 ? (
                  <>
                    <div className="space-y-3">
                      {statusNotesDisplay
                        .slice(0, showAllStatusNotes ? statusNotesDisplay.length : 2)
                        .map((note) => {
                          const IconComponent = note.type === 'reopen' ? RefreshCw : AlertCircle;
                          return (
                            <div
                              key={note.id}
                              className={`flex items-start gap-3 text-sm ${note.textColorClass}`}
                            >
                              <div
                                className={`mt-0.5 flex items-center justify-center w-8 h-8 ${note.iconBgClass} ${note.iconBorderClass} border rounded-lg`}
                              >
                                <IconComponent className={`h-3.5 w-3.5 ${note.iconColorClass}`} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{note.title}</p>
                                <p className="text-xs text-gray-600 leading-relaxed">{note.description}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                    {statusNotesDisplay.length > 2 && !showAllStatusNotes && (
                      <p className="text-xs text-gray-500 mt-3">Showing newest notes. Select "Show More" to view all updates.</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No status updates yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Azure DevOps Integration */}
      <div className="relative bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img
              src={AZURE_DEVOPS_ICON}
              alt="Azure DevOps logo"
              className="h-5 w-5 mr-2"
            />
            <h2 className="text-xl font-semibold text-[#2D4660]">Azure DevOps Integration</h2>
          </div>
        </div>

        {!azureDevOpsConfig.enabled ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center border border-dashed border-gray-300">
            <img
              src={AZURE_DEVOPS_ICON}
              alt="Azure DevOps logo"
              className="h-10 w-10 mx-auto mb-3 opacity-80"
            />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Not Connected</h3>
            <p className="text-gray-600 mb-4">
              Connect to Azure DevOps to import work items as features for voting.
            </p>
            <Button 
              variant="primary"
              onClick={() => handleConnect('newmill', selectedProject || projectOptions[0] || 'Product')}
              className="inline-flex items-center"
              disabled={isFetchingAzureDevOps}
            >
              {isFetchingAzureDevOps ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Connect to Azure DevOps
                </>
              )}
            </Button>
            {azureFetchError && (
              <p className="mt-3 text-sm text-[#591D0F]">
                {azureFetchError}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm text-green-700">
                      <span className="font-medium text-green-900">Connected to Azure DevOps</span>
                      <span className="hidden sm:inline mx-1 text-green-500">•</span>
                      <span>
                        <span className="font-medium">Organization:</span> {azureDevOpsConfig.organization}
                      </span>
                      <span className="hidden sm:inline mx-1 text-green-500">•</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Project:</span>
                        <div className="min-w-[150px]">
                          <SingleSelectDropdown
                            options={projectOptions}
                            value={selectedProject}
                            onChange={handleProjectChange}
                            variant="green"
                          />
                        </div>
                      </div>
                      {azureDevOpsConfig.lastSyncTime && (
                        <>
                          <span className="hidden sm:inline mx-1 text-green-500">•</span>
                          <span>
                            <span className="font-medium">Last Sync:</span> {formatDate(azureDevOpsConfig.lastSyncTime)}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-green-700">
                      Switching projects will clear the filters below.
                    </span>
                  </div>
                </div>
                <button
                  onClick={onDisconnectAzureDevOps}
                  className="text-sm text-[#591D0F] hover:text-[#6A4234] font-medium flex items-center"
                >
                  <X className="h-4 w-4 mr-1" />
                  Disconnect
                </button>
              </div>
            </div>

            <FilterForm
              config={azureDevOpsConfig}
              onUpdateConfig={onUpdateAzureDevOpsConfig}
              onPreview={onPreviewAzureDevOpsFeatures}
              isFetching={isFetchingAzureDevOps}
              availableStates={availableStates}
              availableAreaPaths={availableAreaPaths}
              availableTags={availableTags}
              previewFeatures={previewFeatures}
              showPreviewModal={showPreviewModal}
              onFetchStatesForType={onFetchStatesForType}
              onFetchAreaPathsForTypeAndState={onFetchAreaPathsForTypeAndState}
              onFetchTagsForTypeStateAndAreaPath={onFetchTagsForTypeStateAndAreaPath}
              onFetchTypesAndStatesForAreaPath={onFetchTypesAndStatesForAreaPath}
              onFetchTypesAndStatesForTags={onFetchTypesAndStatesForTags}
              onFetchTypesAndAreaPathsForStates={onFetchTypesAndAreaPathsForStates}
              resetSignal={filtersResetToken}
            />
          </div>
        )}
      </div>

      {/* Suggested Features */}
      <div className="relative bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#2D4660]">Suggested Features</h2>
            <p className="text-sm text-gray-600">Ideas submitted from the voting experience for future consideration.</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#1E5461]/10 text-[#1E5461] text-sm font-medium">
            {suggestedFeatures.length} {suggestedFeatures.length === 1 ? 'suggestion' : 'suggestions'}
          </span>
        </div>

        {suggestedFeatures.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500 text-sm">
            No feature suggestions have been submitted yet. Encourage voters to use the "Suggest a Feature" button in the voting experience.
          </div>
        ) : (
          <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
            {suggestedFeatures.map((suggestion) => {
              const submitter = suggestion.requester_name || suggestion.requester_email || 'Anonymous';
              return (
                <div
                  key={suggestion.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-[#1E5461]/40 transition-colors"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="md:flex-1">
                        <h3 className="text-lg font-semibold text-[#2D4660]">{suggestion.title}</h3>
                        <p className="text-xs text-gray-500 mt-[14px]">
                          Submitted by <span className="font-medium text-[#1E5461]">{submitter}</span>
                          {suggestion.requester_email && (
                            <>
                              {' '}
                              (<a
                                href={`mailto:${suggestion.requester_email}`}
                                className="text-[#1E5461] hover:underline"
                              >
                                {suggestion.requester_email}
                              </a>)
                            </>
                          )} on {formatDate(suggestion.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 self-start md:min-w-[360px]">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            variant="primary"
                            onClick={() => {
                              setPromoteError(null);
                              setSuggestionToPromote(suggestion);
                            }}
                            className="text-xs px-3 py-1 flex items-center"
                          >
                            <ArrowRight className="h-3.5 w-3.5 mr-2" />
                            Move to Current Session
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              if (otherSessions.length > 0) {
                                setSuggestionToMove(suggestion);
                              }
                            }}
                            disabled={otherSessions.length === 0}
                            className="text-xs px-3 py-1 flex items-center"
                          >
                            <Calendar className="h-3.5 w-3.5 mr-2" />
                            Move to Future Session
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => openEditSuggestion(suggestion)}
                            className="text-xs px-3 py-1 flex items-center"
                          >
                            <Edit className="h-3.5 w-3.5 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => {
                              setDeleteError(null);
                              setSuggestionToDelete(suggestion);
                            }}
                            className="text-xs px-3 py-1 flex items-center"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </Button>
                        </div>
                        {otherSessions.length === 0 && (
                          <p className="text-xs text-gray-500 text-right">
                            No upcoming sessions are available yet. Create a future session to enable this action.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-[#2D4660]" />
                          <p className="text-sm font-semibold text-[#2D4660]">Problem it solves</p>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {suggestion.summary && suggestion.summary.length > 0
                            ? suggestion.summary
                            : 'No summary provided.'}
                        </p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-[#2D4660]" />
                          <p className="text-sm font-semibold text-[#2D4660]">What would it do?</p>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {suggestion.whatWouldItDo && suggestion.whatWouldItDo.length > 0
                            ? suggestion.whatWouldItDo
                            : 'No details provided.'}
                        </p>
                      </div>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <Workflow className="h-4 w-4 text-[#2D4660]" />
                          <p className="text-sm font-semibold text-[#2D4660]">How would it work?</p>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {suggestion.howWouldItWork && suggestion.howWouldItWork.length > 0
                            ? suggestion.howWouldItWork
                            : 'No implementation details provided.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Management */}
      <div className="relative bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#2D4660]">Feature Management</h2>
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
                      {feature.description || <span className="italic text-gray-400">No description provided</span>}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm">
                    {feature.epic && <EpicTag name={feature.epic} />}
                  </td>
                  <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm">
                    {feature.state && (
                      <span className="px-2 py-1 text-xs font-medium bg-[#1E5461]/10 text-[#1E5461] rounded">
                        {feature.state}
                      </span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-4 text-sm">
                    <div className="text-gray-600">
                      {feature.areaPath && typeof feature.areaPath === 'string' && feature.areaPath.trim() !== '' ? (
                        <div className="max-w-xs break-words">{feature.areaPath}</div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
                      className="text-[#2D4660] hover:text-[#C89212] inline-block cursor-pointer"
                      title="Edit Feature"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => onDeleteFeature(feature.id)}
                      className="text-[#2D4660] hover:text-[#591D0F] inline-block cursor-pointer"
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
        isOpen={suggestionToPromote !== null}
        onClose={() => {
          if (!isPromotingSuggestion) {
            setSuggestionToPromote(null);
            setPromoteError(null);
          }
        }}
        title="Move Suggestion to Current Session"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Move <span className="font-semibold text-[#2D4660]">{suggestionToPromote?.title}</span> into the current session so it can be managed and voted on.
          </p>
          {promoteError && (
            <div className="bg-[#591D0F]/5 border border-[#591D0F]/20 text-[#591D0F] text-sm rounded-md px-3 py-2">
              {promoteError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (!isPromotingSuggestion) {
                  setSuggestionToPromote(null);
                  setPromoteError(null);
                }
              }}
              disabled={isPromotingSuggestion}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmPromoteSuggestion}
              disabled={isPromotingSuggestion}
            >
              {isPromotingSuggestion ? 'Moving...' : 'Move to Current Session'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={suggestionToMove !== null}
        onClose={() => {
          if (!isMovingSuggestion) {
            setSuggestionToMove(null);
            setMoveError(null);
          }
        }}
        title="Move to Future Session"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Choose the upcoming session where you would like to queue <span className="font-semibold text-[#2D4660]">{suggestionToMove?.title}</span>.
          </p>
          {otherSessions.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination Session
              </label>
              <select
                value={targetSessionId}
                onChange={(e) => setTargetSessionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                disabled={isMovingSuggestion}
              >
                {otherSessions.map(session => (
                  <option key={session.id} value={session.id}>
                    {session.title} (Starts {formatDate(session.startDate)})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-[#1E5461]/5 border border-[#1E5461]/20 text-[#1E5461] text-sm rounded-md px-3 py-2">
              No future sessions are available yet. Create a new session to enable this action.
            </div>
          )}
          {moveError && (
            <div className="bg-[#591D0F]/5 border border-[#591D0F]/20 text-[#591D0F] text-sm rounded-md px-3 py-2">
              {moveError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (!isMovingSuggestion) {
                  setSuggestionToMove(null);
                  setMoveError(null);
                }
              }}
              disabled={isMovingSuggestion}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmMoveSuggestion}
              disabled={isMovingSuggestion || otherSessions.length === 0}
            >
              {isMovingSuggestion ? 'Moving...' : 'Move to Session'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={suggestionToEdit !== null}
        onClose={() => {
          if (!isSavingSuggestion) {
            setSuggestionToEdit(null);
            setEditError(null);
          }
        }}
        title="Edit Suggested Feature"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isSavingSuggestion}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Problem it solves</label>
            <textarea
              value={editForm.summary}
              onChange={(e) => setEditForm(prev => ({ ...prev, summary: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isSavingSuggestion}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What would it do?</label>
            <textarea
              value={editForm.whatWouldItDo}
              onChange={(e) => setEditForm(prev => ({ ...prev, whatWouldItDo: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isSavingSuggestion}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">How would it work?</label>
            <textarea
              value={editForm.howWouldItWork}
              onChange={(e) => setEditForm(prev => ({ ...prev, howWouldItWork: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              disabled={isSavingSuggestion}
            />
          </div>
          {editError && (
            <div className="bg-[#591D0F]/5 border border-[#591D0F]/20 text-[#591D0F] text-sm rounded-md px-3 py-2">
              {editError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (!isSavingSuggestion) {
                  setSuggestionToEdit(null);
                  setEditError(null);
                }
              }}
              disabled={isSavingSuggestion}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveSuggestionEdit}
              disabled={isSavingSuggestion}
            >
              {isSavingSuggestion ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={suggestionToDelete !== null}
        onClose={() => {
          if (!isDeletingSuggestion) {
            setSuggestionToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete Suggested Feature"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <span className="font-semibold text-[#591D0F]">{suggestionToDelete?.title}</span>? This action cannot be undone.
          </p>
          {deleteError && (
            <div className="bg-[#591D0F]/5 border border-[#591D0F]/20 text-[#591D0F] text-sm rounded-md px-3 py-2">
              {deleteError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                if (!isDeletingSuggestion) {
                  setSuggestionToDelete(null);
                  setDeleteError(null);
                }
              }}
              disabled={isDeletingSuggestion}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDeleteSuggestion}
              disabled={isDeletingSuggestion}
            >
              {isDeletingSuggestion ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
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

      <Modal
        isOpen={showSessionEditForm}
        onClose={() => setShowSessionEditForm(false)}
        title="Edit Session Settings"
      >
        <SessionEditForm
          session={votingSession}
          featureCount={features.length}
          onSubmit={handleSessionUpdate}
          onCancel={() => setShowSessionEditForm(false)}
          onRequestDeleteSession={handleDeleteSessionRequest}
          isDeletingSession={isDeletingSession}
          productName={productName}
          products={products}
          isLoadingProducts={isLoadingProducts}
          productError={productError}
          onRequestDeleteProduct={(product) => setProductToDelete(product)}
          onProductColorUpdated={async () => {
            // Refresh products list after color update
            const tenantId = currentUser?.tenant_id ?? currentUser?.tenantId ?? null;
            if (tenantId) {
              try {
                const results = await db.getProductsForTenant(tenantId);
                setProducts(results);
              } catch (error) {
                console.error('Error refreshing products after color update:', error);
              }
            }
          }}
        />
      </Modal>

      {productToDelete && (
        <Modal
          isOpen
          onClose={() => setProductToDelete(null)}
          title="Delete Product"
        >
          <p className="text-sm text-gray-700 mb-4">
            Are you sure you want to delete <span className="font-semibold">{productToDelete.name}</span>?
            This will remove it for everyone in your tenant.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setProductToDelete(null)} disabled={isDeletingProduct}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteProduct} disabled={isDeletingProduct}>
              {isDeletingProduct ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Preview Azure DevOps Features"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          {previewFeatures && previewFeatures.length > 0 ? (
            <>
              <div className="bg-[#1E5461]/5 border border-[#1E5461]/20 rounded-lg p-4">
                <p className="text-[#1E5461] font-medium">
                  Review the work items below. If they look correct, add them to your voting session.
                </p>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {previewFeatures.map((feature) => (
                    <div key={feature.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      {/* Title at top */}
                      <div className="mb-3">
                        <h4 className="text-base font-semibold text-gray-900">
                          {feature.title}
                        </h4>
                      </div>
                      
                      {/* Epic - above description (only for non-Feature types) */}
                      {feature.workItemType !== 'Feature' && feature.epic && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Epic</p>
                          <EpicTag name={feature.epic} />
                        </div>
                      )}
                      
                      {/* Description */}
                      {feature.description && feature.description.trim() !== '' ? (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Description</p>
                          <p className="text-xs text-gray-700 line-clamp-3">{feature.description}</p>
                        </div>
                      ) : null}
                      
                    {feature.state && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">State</p>
                        <span className="px-2 py-1 text-xs font-medium bg-[#1E5461]/10 text-[#1E5461] rounded">
                          {feature.state}
                        </span>
                      </div>
                    )}

                      {/* Epic - above Work Item Type if Feature */}
                      {feature.workItemType === 'Feature' && feature.epic && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Epic</p>
                          <EpicTag name={feature.epic} />
                        </div>
                      )}
                      
                      {/* Work Item Type with Azure DevOps ID */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Work Item Type</p>
                        <div className="flex items-center gap-2">
                          {feature.workItemType && (
                            <span className="px-2 py-1 text-xs font-medium bg-[#492434]/10 text-[#492434] rounded">
                              {feature.workItemType}
                            </span>
                          )}
                          {feature.azureDevOpsId && (
                            <AzureDevOpsBadge id={feature.azureDevOpsId} url={feature.azureDevOpsUrl || ''} />
                          )}
                        </div>
                      </div>
                      
                      {/* Area Path - Full width at bottom */}
                      {feature.areaPath && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Area Path</p>
                          <p className="text-xs text-gray-700 break-words">{feature.areaPath}</p>
                        </div>
                      )}
                      
                      {/* Tags - Compact display if available */}
                      {feature.tags && feature.tags.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Tags</p>
                          <div className="flex flex-wrap gap-1">
                            {feature.tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                    await onConfirmSync(false);
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
                    await onConfirmSync(true);
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

      {/* Reopen Session Modal */}
      <Modal
        isOpen={showReopenModal}
        onClose={() => {
          setShowReopenModal(false);
          resetReopen();
        }}
        title="Reopen Session"
      >
        <form onSubmit={handleSubmitReopen(handleSubmitReopenSession)} className="space-y-4">
          <p className="text-gray-600">
            Capture a brief note so other admins understand why this session is being reopened.
          </p>

          <Controller
            control={reopenControl}
            name="reason"
            rules={{ required: 'Please select a reason' }}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <SingleSelectDropdown
                  options={REOPEN_REASON_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select a reason..."
                />
                {reopenErrors.reason && (
                  <p className="mt-1 text-sm text-[#591D0F]">{reopenErrors.reason.message}</p>
                )}
              </div>
            )}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              {...registerReopen('details')}
              rows={3}
              placeholder="Add any context you'd like to share with other admins..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2D4660] focus:border-transparent"
            />
          </div>

          <div className="bg-[#1E5461]/5 border border-[#1E5461]/20 rounded-lg p-3 text-sm text-[#1E5461]">
            This information will appear in the Current Session summary so every admin sees why voting resumed.
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowReopenModal(false);
                resetReopen();
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save &amp; Reopen
            </Button>
          </div>
        </form>
      </Modal>

      {/* End Early Modal */}
      <Modal
        isOpen={showEndEarlyModal}
        onClose={() => {
          setShowEndEarlyModal(false);
          resetEndEarly();
        }}
        title="End Session Early"
      >
        <form onSubmit={handleSubmitEndEarly(handleEndEarly)} className="space-y-4">
          <p className="text-gray-600">
            You are about to end this voting session early. Please select a reason:
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason *
            </label>
            <select
              {...registerEndEarly('reason', { required: 'Please select a reason' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2D4660] focus:border-transparent"
            >
              <option value="">Select a reason...</option>
              <option value="Sufficient Responses">Sufficient responses received</option>
              <option value="Project Cancelled">Project or initiative cancelled</option>
              <option value="Timeline Changed">Timeline or priorities changed</option>
              <option value="Technical Issues">Technical issues or data concerns</option>
              <option value="Stakeholder Request">Stakeholder request</option>
              <option value="Low Participation">Low participation rate</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              {...registerEndEarly('details')}
              rows={3}
              placeholder="Add any additional context or notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2D4660] focus:border-transparent"
            />
          </div>

          <div className="bg-[#C89212]/5 border border-[#C89212]/20 rounded-lg p-3 text-sm text-[#6A4234]">
            <p className="font-medium mb-1">Note:</p>
            <p>Ending the session will close voting immediately. This action will be logged and visible to all admins.</p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowEndEarlyModal(false);
                resetEndEarly();
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" type="submit">
              End Session Now
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      {productToEdit && (
        <Modal
          isOpen
          onClose={() => {
            setProductToEdit(null);
            setEditingProductName('');
            setEditingProductColor(null);
            setShowEditProductColorPicker(false);
          }}
          title="Edit Product"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={editingProductName}
                onChange={(e) => setEditingProductName(e.target.value)}
                placeholder="Enter product name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-0 focus:border-[#2D4660]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Color
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditTempColor(editingProductColor || '#2D4660');
                    setShowEditProductColorPicker(true);
                  }}
                  className="block w-12 h-12 rounded-md border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center justify-center overflow-hidden"
                  style={editingProductColor ? { backgroundColor: editingProductColor } : { backgroundColor: '#ffffff' }}
                >
                  {!editingProductColor && (
                    <img 
                      src="/colorpicker.png" 
                      alt="Color Picker"
                      className="w-8 h-8 object-contain"
                    />
                  )}
                </button>
                <span className="text-sm text-gray-600">
                  {editingProductColor || 'No color selected'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setProductToEdit(null);
                  setEditingProductName('');
                  setEditingProductColor(null);
                  setShowEditProductColorPicker(false);
                }}
                disabled={isUpdatingProduct}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  if (!productToEdit?.id || !editingProductName.trim()) {
                    return;
                  }
                  setIsUpdatingProduct(true);
                  try {
                    await db.updateProduct(productToEdit.id, {
                      name: editingProductName.trim(),
                      color_hex: editingProductColor
                    });
                    // Refresh products
                    const tenantId = currentUser?.tenant_id ?? currentUser?.tenantId;
                    if (tenantId) {
                      const updatedProducts = await db.getProductsForTenant(tenantId);
                      setProducts(updatedProducts.sort((a, b) => a.name.localeCompare(b.name)));
                    }
                    setProductToEdit(null);
                    setEditingProductName('');
                    setEditingProductColor(null);
                    setShowEditProductColorPicker(false);
                    if (onProductColorUpdated) {
                      onProductColorUpdated();
                    }
                  } catch (error) {
                    console.error('Error updating product:', error);
                    alert('Failed to update product. Please try again.');
                  } finally {
                    setIsUpdatingProduct(false);
          }
        }}
                disabled={isUpdatingProduct || !editingProductName.trim()}
              >
                {isUpdatingProduct ? 'Updating...' : 'Update Product'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Product Color Picker Modal */}
      {showEditProductColorPicker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShowEditProductColorPicker(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl px-3 py-2 w-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3 items-stretch">
              <div className="flex-shrink-0" style={{ width: '240px', height: '260px' }}>
                <input
                  id="edit-native-color-input"
                  type="color"
                  value={editTempColor}
                  onChange={(e) => setEditTempColor(e.target.value)}
                  ref={(input) => {
                    if (input && showEditProductColorPicker) {
                      setTimeout(() => input.click(), 50);
                    }
                  }}
                  className="opacity-0 absolute"
                  style={{ width: '1px', height: '1px' }}
                />
                <div className="w-full h-full"></div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setEditingProductColor(editTempColor);
                  setShowEditProductColorPicker(false);
                }}
                className="px-6 rounded-lg text-white font-bold shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-3 text-lg flex-shrink-0"
                style={{ backgroundColor: editTempColor, height: '260px', minWidth: '100px' }}
              >
                <CheckCircle className="h-8 w-8" />
                <div className="text-center leading-tight">
                  <div>Looks</div>
                  <div>Good</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;