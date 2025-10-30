// ============================================
// AdminDashboard.tsx - Admin Dashboard Screen
// ============================================
// Location: src/screens/AdminDashboard.tsx
// ============================================

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { useSession } from '../contexts/SessionContext';
import { 
  Plus, Edit, Trash2, X, BarChart2, Settings, 
  LogOut, Users, Clock, Cloud, CheckCircle, 
  RefreshCw, AlertCircle, Vote, Shield, Calendar, Filter, ChevronDown
} from "lucide-react";

// Import shared components
import { 
  Button, 
  Modal, 
  EpicTag, 
  AzureDevOpsBadge, 
  ImageWithFallback, 
  FeatureForm, 
  AzureDevOpsForm,
  formatDate,
  getDaysRemaining,
  getDeadlineColor,
  isPastDate
} from '../components/FeatureVotingSystem';

// Import types
import type { Feature, VotingSession, AzureDevOpsConfig } from '../types/azure';

// ============================================
// TYPES & INTERFACES
// ============================================

interface AdminDashboardProps {
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
  onShowVoterView: () => void;
  onUpdateVotingSession: (session: VotingSession) => void;
  onFetchStatesForType?: (workItemType: string) => Promise<void>;
}

// ============================================
// SIMPLE CONNECTION FORM
// ============================================

interface ConnectionFormProps {
  config: AzureDevOpsConfig;
  onConnect: (org: string, project: string) => void;
  onCancel: () => void;
  isFetching: boolean;
  error: string | null;
}

function ConnectionForm({ config, onConnect, onCancel, isFetching, error }: ConnectionFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      organization: config.organization || 'newmill',
      project: config.project || 'Product'
    }
  });

  const onSubmit = (data: any) => {
    onConnect(data.organization, data.project);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-blue-50 p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-4 text-[#2d4660] flex items-center">
        <Cloud className="h-5 w-5 mr-2" />
        Connect to Azure DevOps
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
          <input
            {...register('organization', { required: 'Organization name is required' })}
            placeholder="your-organization"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.organization && <p className="mt-1 text-sm text-red-600">{errors.organization.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
          <input
            {...register('project', { required: 'Project name is required' })}
            placeholder="your-project"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          {errors.project && <p className="mt-1 text-sm text-red-600">{errors.project.message}</p>}
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
        <Button variant="secondary" onClick={onCancel} disabled={isFetching}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isFetching} className="flex items-center">
          {isFetching && <RefreshCw className="animate-spin h-4 w-4 mr-2" />}
          {isFetching ? 'Connecting...' : 'Connect with Azure DevOps'}
        </Button>
      </div>
    </form>
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
}

function MultiSelectDropdown({ options, value, onChange, placeholder = "Select...", label, searchable = false }: MultiSelectDropdownProps) {
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
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer min-h-[38px] flex items-center justify-between"
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {value.length === 0 ? (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          ) : (
            value.map(item => (
              <span
                key={item}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {item}
                <button
                  type="button"
                  onClick={(e) => removeOption(item, e)}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {value.length > 0 && (
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

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Type to search..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    value.includes(option) ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-sm">{option}</span>
                  {value.includes(option) && (
                    <CheckCircle className="h-4 w-4 text-blue-600" />
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
  onFetchStatesForType?: (workItemType: string) => Promise<void>;
}

function FilterForm({ config, onUpdateConfig, onPreview, isFetching, availableStates, availableAreaPaths, availableTags, onFetchStatesForType }: FilterFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { register, handleSubmit, watch, control } = useForm({
    defaultValues: {
      workItemTypes: config.workItemType ? [config.workItemType] : ['Feature'],
      states: config.states || [],
      areaPaths: config.areaPath ? [config.areaPath] : [],
      tags: config.tags || [],
      query: config.query || ''
    }
  });

  const selectedWorkItemTypes = watch('workItemTypes');

  useEffect(() => {
    if (onFetchStatesForType && selectedWorkItemTypes && selectedWorkItemTypes.length > 0) {
      onFetchStatesForType(selectedWorkItemTypes[0]);
    }
  }, [selectedWorkItemTypes, onFetchStatesForType]);

  const onSubmit = async (data: any) => {
    const queryParts: string[] = [];
    
    if (data.workItemTypes && data.workItemTypes.length > 0) {
      if (data.workItemTypes.length === 1) {
        queryParts.push(`[System.WorkItemType] = '${data.workItemTypes[0]}'`);
      } else {
        const typesList = data.workItemTypes.map((type: string) => `'${type}'`).join(', ');
        queryParts.push(`[System.WorkItemType] IN (${typesList})`);
      }
    }
    
    if (data.states && data.states.length > 0) {
      if (data.states.length === 1) {
        queryParts.push(`[System.State] = '${data.states[0]}'`);
      } else {
        const statesList = data.states.map((s: string) => `'${s}'`).join(', ');
        queryParts.push(`[System.State] IN (${statesList})`);
      }
    }
    
    if (data.areaPaths && data.areaPaths.length > 0) {
      if (data.areaPaths.length === 1) {
        queryParts.push(`[System.AreaPath] UNDER '${data.areaPaths[0]}'`);
      } else {
        const areaPathFilters = data.areaPaths.map((path: string) => `[System.AreaPath] UNDER '${path}'`);
        queryParts.push(`(${areaPathFilters.join(' OR ')})`);
      }
    }
    
    if (data.tags && data.tags.length > 0) {
      const tagFilters = data.tags.map((tag: string) => `[System.Tags] CONTAINS '${tag}'`);
      queryParts.push(`(${tagFilters.join(' OR ')})`);
    }
    
    if (showAdvanced && data.query) {
      queryParts.push(`(${data.query})`);
    }
    
    const finalQuery = queryParts.length > 0 ? queryParts.join(' AND ') : undefined;
    
    const updatedConfig = {
      ...config,
      workItemType: data.workItemTypes && data.workItemTypes.length > 0 ? data.workItemTypes[0] : 'Feature',
      query: finalQuery,
      states: data.states && data.states.length > 0 ? data.states : undefined,
      areaPath: data.areaPaths && data.areaPaths.length > 0 ? data.areaPaths[0] : undefined,
      tags: data.tags && data.tags.length > 0 ? data.tags : undefined
    };
    
    onUpdateConfig(updatedConfig);
    await onPreview();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[#2d4660] flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filter Work Items
        </h3>
        <button 
          type="button" 
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {showAdvanced ? '← Hide Advanced WIQL' : 'Show Advanced WIQL →'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <Controller
            name="workItemTypes"
            control={control}
            render={({ field }) => (
              <MultiSelectDropdown
                label="Work Item Type"
                options={['Feature', 'User Story', 'Product Backlog Item', 'Epic', 'Issue']}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select types..."
              />
            )}
          />
          <p className="mt-1 text-xs text-gray-500">Click to select multiple types</p>
        </div>

        {availableStates.length > 0 && (
          <div>
            <Controller
              name="states"
              control={control}
              render={({ field }) => (
                <MultiSelectDropdown
                  label="State (Optional)"
                  options={availableStates}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select states..."
                />
              )}
            />
            <p className="mt-1 text-xs text-gray-500">Click to select multiple states</p>
          </div>
        )}

        {availableAreaPaths.length > 0 && (
          <div>
            <Controller
              name="areaPaths"
              control={control}
              render={({ field }) => (
                <MultiSelectDropdown
                  label="Area Path (Optional)"
                  options={availableAreaPaths}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select area paths..."
                  searchable={true}
                />
              )}
            />
            <p className="mt-1 text-xs text-gray-500">Type to search and select paths</p>
          </div>
        )}

        {availableTags.length > 0 && (
          <div>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <MultiSelectDropdown
                  label="Tags (Optional)"
                  options={availableTags}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select tags..."
                  searchable={true}
                />
              )}
            />
            <p className="mt-1 text-xs text-gray-500">Type to search and select tags</p>
          </div>
        )}
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
              className="text-blue-600 hover:text-blue-800"
            >
              WIQL syntax reference ↗
            </a>
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="gold" type="submit" disabled={isFetching} className="flex items-center">
          {isFetching && <RefreshCw className="animate-spin h-4 w-4 mr-2" />}
          {isFetching ? 'Loading...' : 'Preview Features'}
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
}

function SessionEditForm({ session, featureCount, onSubmit, onCancel }: SessionEditFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: session.title,
      goal: session.goal,
      startDate: session.startDate.split('T')[0],
      endDate: session.endDate.split('T')[0],
      useAutoVotes: session.useAutoVotes || false,
      votesPerUser: session.votesPerUser
    }
  });

  const useAutoVotes = watch('useAutoVotes');
  const effectiveVotesPerUser = useAutoVotes 
    ? Math.max(1, Math.floor(featureCount / 2))
    : watch('votesPerUser');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
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

      <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            {...register('useAutoVotes')}
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
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

      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Save Changes
        </Button>
      </div>
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
  showAddForm,
  setShowAddForm,
  editingFeature,
  setEditingFeature,
  onLogout,
  votingSession,
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
  setHasImportedFeatures,
  onShowVoterView,
  onUpdateVotingSession,
  onFetchStatesForType
}: AdminDashboardProps) {
  const navigate = useNavigate();
  const { currentUser } = useSession();
  
  // State declarations
  const [showSessionEditForm, setShowSessionEditForm] = useState(false);
  const [showEndEarlyModal, setShowEndEarlyModal] = useState(false);
  
  // Form hooks for End Early modal
  const { register: registerEndEarly, handleSubmit: handleSubmitEndEarly, reset: resetEndEarly } = useForm({
    defaultValues: {
      reason: '',
      details: ''
    }
  });
  
  const daysRemaining = getDaysRemaining(votingSession.endDate);
  const deadlineColor = getDeadlineColor(daysRemaining);
  
  const votingStatus = votingSession.isActive 
    ? <span className="text-[#1E5461] font-medium">Active</span>
    : isPastDate(votingSession.endDate)
      ? <span className="text-[#591D0F] font-medium">Closed</span>
      : <span className="text-[#C89212] font-medium">Upcoming</span>;

  const handleSessionUpdate = (data: any) => {
    const updatedSession: VotingSession = {
      title: data.title,
      goal: data.goal,
      votesPerUser: data.useAutoVotes ? Math.max(1, Math.floor(features.length / 2)) : Number(data.votesPerUser),
      useAutoVotes: data.useAutoVotes,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate + 'T23:59:59').toISOString(),
      isActive: votingSession.isActive
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
      endedEarlyDetails: data.details || undefined
    };
    onUpdateVotingSession(updatedSession);
    setShowEndEarlyModal(false);
    resetEndEarly();
  };

  const handleReopenSession = () => {
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + 7);
    const updatedSession = {
      ...votingSession,
      endDate: newEndDate.toISOString(),
      isActive: true,
      originalEndDate: undefined,
      endedEarlyBy: undefined,
      endedEarlyReason: undefined,
      endedEarlyDetails: undefined
    };
    onUpdateVotingSession(updatedSession);
  };

  const handleConnect = (org: string, project: string) => {
    const updatedConfig = {
      ...azureDevOpsConfig,
      organization: org,
      project: project
    };
    onUpdateAzureDevOpsConfig(updatedConfig);
    onInitiateOAuth();
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl min-h-screen pb-8">
      {/* Desktop: Centered logo at top */}
      <div className="hidden md:flex md:justify-center mb-2 cursor-pointer" onClick={() => navigate('/sessions')}>
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
          <ImageWithFallback
            src="https://media.licdn.com/dms/image/C4D0BAQEC3OhRqehrKg/company-logo_200_200/0/1630518354793/new_millennium_building_systems_logo?e=2147483647&v=beta&t=LM3sJTmQZet5NshZ-RNHXW1MMG9xSi1asp-VUeSA9NA"
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px' }}
          />
          <h1 className="text-2xl font-bold text-[#2d4660] md:text-3xl">Admin Dashboard</h1>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={onShowVoterView} 
            className="flex items-center px-4 py-2 bg-[#5A7C8C] text-white rounded-lg hover:bg-[#4A6C7C] transition-colors"
          >
            <Vote className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Voter View</span>
          </button>
          <button 
            onClick={() => navigate('/manage-stakeholders')} 
            className="flex items-center px-4 py-2 bg-[#2d4660] text-white rounded-lg hover:bg-[#173B65] transition-colors"
          >
            <Users className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Stakeholders</span>
          </button>
          <button 
            onClick={() => navigate('/manage-admins')} 
            className="flex items-center px-4 py-2 bg-[#2d4660] text-white rounded-lg hover:bg-[#173B65] transition-colors"
          >
            <Shield className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Session Admins</span>
          </button>
          <button 
            onClick={onLogout} 
            className="flex items-center px-4 py-2 bg-[#576C71] text-white rounded-lg hover:bg-[#1E5461] transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
      
      {/* Session Info (with Edit button) */}
      <div className="relative z-10 bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#2d4660]">Current Session</h2>
          <div className="flex space-x-2">
            <Button 
              variant="gold"
              onClick={onShowResults}
              className="flex items-center"
            >
              <BarChart2 className="h-4 w-4 mr-2" />
              {isPastDate(votingSession.endDate) ? 'Final Results' : 'Current Results'}
            </Button>
            <Button 
              variant="primary"
              onClick={() => setShowSessionEditForm(true)}
              className="flex items-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              Edit Session
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Session Title</h3>
            <p className="text-[#2d4660] font-medium">{votingSession.title}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-1">Voting Period</h3>
            <p className={`text-[#2d4660] font-medium ${votingSession.originalEndDate ? 'line-through text-gray-400' : ''}`}>
              {formatDate(votingSession.startDate)} - {formatDate(votingSession.originalEndDate || votingSession.endDate)}
            </p>
            {votingSession.originalEndDate && votingSession.endedEarlyBy && (
              <div className="flex items-center mt-1 text-xs text-red-600">
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
            <p className="text-[#2d4660] font-medium">
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
                      handleReopenSession();
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
          <h3 className="text-sm font-medium text-gray-700 mb-1">Goal</h3>
          <p className="text-[#2d4660]">{votingSession.goal}</p>
        </div>
      </div>

      {/* Azure DevOps Integration */}
      <div className="relative z-10 bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Cloud className="h-5 w-5 text-[#2d4660] mr-2" />
            <h2 className="text-xl font-semibold text-[#2d4660]">Azure DevOps Integration</h2>
          </div>
        </div>

        {!azureDevOpsConfig.enabled ? (
          showAzureDevOpsForm ? (
            <ConnectionForm
              config={azureDevOpsConfig}
              onConnect={handleConnect}
              onCancel={() => setShowAzureDevOpsForm(false)}
              isFetching={isFetchingAzureDevOps}
              error={azureFetchError}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center border border-dashed border-gray-300">
              <Cloud className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Not Connected</h3>
              <p className="text-gray-600 mb-4">
                Connect to Azure DevOps to import work items as features for voting.
              </p>
              <Button 
                variant="primary"
                onClick={() => setShowAzureDevOpsForm(true)}
                className="inline-flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Connect to Azure DevOps
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Connected to Azure DevOps
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      <span className="font-medium">Organization:</span> {azureDevOpsConfig.organization} 
                      <span className="mx-2">•</span>
                      <span className="font-medium">Project:</span> {azureDevOpsConfig.project}
                      {azureDevOpsConfig.lastSyncTime && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="font-medium">Last Sync:</span> {formatDate(azureDevOpsConfig.lastSyncTime)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onDisconnectAzureDevOps}
                  className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
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
              onFetchStatesForType={onFetchStatesForType}
            />
          </div>
        )}
      </div>

      {/* Feature Management */}
      <div className="relative z-10 bg-white rounded-lg shadow-md p-4 mb-6">
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
                      {feature.description || <span className="italic text-gray-400">No description provided</span>}
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
                      className="text-[#2d4660] hover:text-[#C89212] inline-block cursor-pointer"
                      title="Edit Feature"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => onDeleteFeature(feature.id)}
                      className="text-[#2d4660] hover:text-[#591D0F] inline-block cursor-pointer"
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
        />
      </Modal>

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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#2d4660] focus:border-transparent"
            />
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
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
    </div>
  );
}

export default AdminDashboard;