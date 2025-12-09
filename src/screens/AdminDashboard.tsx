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
import { supabase } from '../supabaseClient';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  Clock,
  CheckSquare,
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
  Pencil,
  Square,
  Crown,
  CheckCircle,
  Paperclip,
  ArrowRightLeft,
  Bug,
  BookOpen,
  FlaskConical,
  CircleAlert,
  Database,
  Tag,
  User as UserIcon,
  MoreVertical
} from "lucide-react";
import mobileLogo from '../assets/New-Millennium-Icon-gold-on-blue-rounded-square.svg';
import desktopLogo from '../assets/New-Millennium-color-logo.svg';
import colorPickerIcon from '../assets/colorpicker.png';

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

interface PreviewFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewFeatures: Feature[] | null;
  onConfirmSync: (selectedFeatures: Feature[]) => Promise<void>;
  onReplaceAll?: () => Promise<void>;
  isFetching?: boolean;
  config: AzureDevOpsConfig;
}

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
  onConfirmSync: (selectedFeatures: Feature[]) => Promise<void>;
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

// Helper function to get Azure DevOps work item type icon and color
function getWorkItemTypeIcon(workItemType: string | undefined): { icon: React.ComponentType<any>; color: string } | null {
  if (!workItemType) return null;
  
  const type = workItemType.toLowerCase();
  
  // Azure DevOps standard icons and colors
  if (type === 'epic') {
    return { icon: Crown, color: 'rgb(51, 153, 71)' }; // Green
  } else if (type === 'feature') {
    return { icon: Trophy, color: '#773b93' }; // Purple (rgb(119, 59, 147))
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
// PREVIEW FEATURES MODAL
// ============================================

function PreviewFeaturesModal({ isOpen, onClose, previewFeatures, onConfirmSync, onReplaceAll, isFetching = false, config }: PreviewFeaturesModalProps) {
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());

  // Select all by default when modal opens
  useEffect(() => {
    if (isOpen && previewFeatures && previewFeatures.length > 0) {
      const featureIds = previewFeatures.map(f => f.id).filter(id => id); // Filter out any undefined/null IDs
      console.log('PreviewFeaturesModal: Selecting all features by default', featureIds.length, 'features');
      console.log('PreviewFeaturesModal: Feature IDs:', featureIds);
      if (featureIds.length > 0) {
        setSelectedFeatures(new Set(featureIds));
      }
    } else if (!isOpen) {
      // Clear selection when modal closes
      setSelectedFeatures(new Set());
    }
  }, [isOpen, previewFeatures]);

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!previewFeatures) return;
    if (selectedFeatures.size === previewFeatures.length) {
      setSelectedFeatures(new Set());
    } else {
      setSelectedFeatures(new Set(previewFeatures.map(f => f.id)));
    }
  };

  const handleAddSelected = async () => {
    if (!previewFeatures || previewFeatures.length === 0) {
      console.warn('handleAddSelected: No preview features available');
      return;
    }
    
    // If no features are selected, select all by default
    if (selectedFeatures.size === 0) {
      console.log('handleAddSelected: No features selected, selecting all by default');
      const allIds = previewFeatures.map(f => f.id).filter(id => id);
      setSelectedFeatures(new Set(allIds));
      // Wait a moment for state to update, then retry
      setTimeout(() => {
        handleAddSelected();
      }, 100);
      return;
    }
    
    console.log('handleAddSelected: Preview features count:', previewFeatures.length);
    console.log('handleAddSelected: Selected features count:', selectedFeatures.size);
    console.log('handleAddSelected: Selected feature IDs:', Array.from(selectedFeatures));
    console.log('handleAddSelected: Preview feature IDs:', previewFeatures.map(f => f.id));
    
    const featuresToAdd = previewFeatures.filter(f => {
      const hasId = f.id && selectedFeatures.has(f.id);
      if (!hasId) {
        console.warn('handleAddSelected: Feature not selected:', f.id, f.title);
      }
      return hasId;
    });
    
    if (featuresToAdd.length === 0) {
      console.warn('handleAddSelected: No features selected after filtering');
      console.warn('handleAddSelected: Preview features:', previewFeatures);
      console.warn('handleAddSelected: Selected set:', selectedFeatures);
      // Try selecting all as fallback
      const allIds = previewFeatures.map(f => f.id).filter(id => id);
      if (allIds.length > 0) {
        console.log('handleAddSelected: Fallback - selecting all features');
        const allFeatures = previewFeatures.filter(f => f.id);
        if (allFeatures.length > 0) {
          try {
            await onConfirmSync(allFeatures);
            console.log('handleAddSelected: Sync completed with all features, closing modal');
            onClose();
          } catch (error) {
            console.error('handleAddSelected: Error during sync', error);
          }
        }
      }
      return;
    }
    console.log('handleAddSelected: Adding', featuresToAdd.length, 'features');
    try {
      await onConfirmSync(featuresToAdd);
      console.log('handleAddSelected: Sync completed, closing modal');
      onClose();
    } catch (error) {
      console.error('handleAddSelected: Error during sync', error);
      // Don't close modal on error so user can see what happened
    }
  };

  const handleReplaceAll = async () => {
    if (!previewFeatures || !onReplaceAll) return;
    await onReplaceAll();
    onClose();
  };

  const selectedCount = selectedFeatures.size;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Preview Azure DevOps Features"
      maxWidth="max-w-6xl"
    >
      <div className="space-y-4">
        {previewFeatures && previewFeatures.length > 0 ? (
          <>
            <div className="bg-[#1E5461]/5 border border-[#1E5461]/20 rounded-lg p-4">
              <p className="text-[#1E5461] font-medium">
                Select the work items you want to add to your voting session.
              </p>
            </div>
            
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAll();
                          }}
                          className="flex items-center justify-center w-5 h-5"
                        >
                          {previewFeatures.length > 0 && selectedFeatures.size === previewFeatures.length ? (
                            <CheckSquare className="w-5 h-5 text-green-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">State</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Epic</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Area Path</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewFeatures.map((feature) => {
                      const isSelected = selectedFeatures.has(feature.id);
                      console.log(`[PreviewModal] Rendering feature ${feature.id} "${feature.title}": epic="${feature.epic}", epicId="${feature.epicId}"`);
                      return (
                        <tr
                          key={feature.id}
                          className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                          onClick={() => toggleFeature(feature.id)}
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFeature(feature.id);
                              }}
                              className="flex items-center justify-center w-5 h-5"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-green-600" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900">{feature.title}</div>
                                {feature.description && feature.description.trim() && (
                                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {feature.description.replace(/<[^>]*>/g, '').substring(0, 100)}
                                    {feature.description.replace(/<[^>]*>/g, '').length > 100 ? '...' : ''}
                                  </div>
                                )}
                                {feature.attachmentUrls && feature.attachmentUrls.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {feature.attachmentUrls.slice(0, 3).map((url, idx) => (
                                      <div
                                        key={idx}
                                        className="relative border border-gray-300 rounded overflow-hidden"
                                        style={{ width: '32px', height: '32px' }}
                                        title="Image from work item"
                                      >
                                        <img
                                          src={url}
                                          alt={`Attachment ${idx + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            // Hide broken images
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    ))}
                                    {feature.attachmentUrls.length > 3 && (
                                      <div className="flex items-center justify-center" style={{ width: '32px', height: '32px' }}>
                                        <span className="text-xs text-gray-500">+{feature.attachmentUrls.length - 3}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {feature.tags && feature.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {feature.tags.slice(0, 3).map((tag, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                        {tag}
                                      </span>
                                    ))}
                                    {feature.tags.length > 3 && (
                                      <span className="px-1.5 py-0.5 text-xs text-gray-500">
                                        +{feature.tags.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center gap-2">
                              {(() => {
                                const typeInfo = getWorkItemTypeIcon(feature.workItemType);
                                if (typeInfo && feature.azureDevOpsId) {
                                  const IconComponent = typeInfo.icon;
                                  // Convert hex color to RGB for opacity
                                  const hexToRgb = (hex: string) => {
                                    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                                    return result ? {
                                      r: parseInt(result[1], 16),
                                      g: parseInt(result[2], 16),
                                      b: parseInt(result[3], 16)
                                    } : null;
                                  };
                                  const rgb = hexToRgb(typeInfo.color);
                                  const bgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` : `${typeInfo.color}20`;
                                  const hoverBgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)` : `${typeInfo.color}40`;
                                  
                                  return (
                                    <a
                                      href={feature.azureDevOpsUrl || ''}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer border"
                                      style={{
                                        backgroundColor: bgColor,
                                        color: typeInfo.color,
                                        borderColor: typeInfo.color
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = hoverBgColor;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = bgColor;
                                      }}
                                      title="View in Azure DevOps"
                                    >
                                      <IconComponent className="h-3 w-3 mr-1" style={{ color: typeInfo.color }} />
                                      {feature.azureDevOpsId.replace(/^ado-/, '#')}
                                    </a>
                                  );
                                } else if (feature.workItemType && feature.azureDevOpsId) {
                                  return (
                                    <a
                                      href={feature.azureDevOpsUrl || ''}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#492434]/10 text-[#492434] hover:bg-[#492434]/20 cursor-pointer border border-[#492434]/30"
                                      title="View in Azure DevOps"
                                    >
                                      <span className="mr-1 text-xs">{feature.workItemType}</span>
                                      {feature.azureDevOpsId.replace(/^ado-/, '#')}
                                    </a>
                                  );
                                } else if (typeInfo) {
                                  const IconComponent = typeInfo.icon;
                                  return <IconComponent className="w-5 h-5" style={{ color: typeInfo.color }} />;
                                } else if (feature.workItemType) {
                                  return (
                                    <span className="px-2 py-1 text-xs font-medium bg-[#492434]/10 text-[#492434] rounded">
                                      {feature.workItemType}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {feature.state && (
                              <span className="px-2 py-1 text-xs font-medium bg-[#1E5461]/10 text-[#1E5461] rounded">
                                {feature.state}
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3 align-middle ${feature.epic || (feature.workItemType && feature.workItemType.toLowerCase() === 'epic') ? 'w-64' : 'w-32'}`}>
                            {feature.workItemType && feature.workItemType.toLowerCase() === 'epic' ? (
                              <span className="text-xs text-gray-600 italic">This Work Item is an Epic</span>
                            ) : feature.epic ? (
                              feature.epicId ? (
                                <a
                                  href={`https://dev.azure.com/${config.organization}/${config.project}/_workitems/edit/${feature.epicId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-block w-full"
                                >
                                  <EpicTag 
                                    name={feature.epic} 
                                    epicId={feature.epicId}
                                    description={feature.description}
                                    className="hover:opacity-80" 
                                  />
                                </a>
                              ) : (
                                <EpicTag 
                                  name={feature.epic} 
                                  description={feature.description}
                                />
                              )
                            ) : (
                              <span className="text-xs text-gray-400 italic">no Epic assigned</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            {feature.areaPath ? (
                              <div className="text-xs text-gray-700 max-w-xs truncate" title={feature.areaPath}>
                                {feature.areaPath}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {selectedCount} of {previewFeatures.length} selected
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="primary"
                  onClick={handleAddSelected}
                  disabled={selectedCount === 0 || isFetching}
                  className="flex items-center"
                >
                  {isFetching ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add {selectedCount} Feature{selectedCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                {onReplaceAll && (
                  <Button 
                    variant="danger"
                    onClick={handleReplaceAll}
                    className="flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Replace All Features
                  </Button>
                )}
              </div>
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
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const countTimeoutRef = useRef<number | null>(null);
  const prevShowPreviewModalRef = useRef(false);
  const needsFetchAfterTagCycle = useRef(false);
  const tagCycleStartTime = useRef<number | null>(null);
  const configRef = useRef(config);
  const fetchFeatureCountRef = useRef<(() => Promise<void>) | null>(null);
  
  // Flags to prevent cascading updates
  const isUpdatingFromAreaPath = useRef(false);
  const isUpdatingFromTags = useRef(false);
  const isUpdatingFromStates = useRef(false);
  const tagUpdateTimeoutRef = useRef<number | null>(null);
  const isInTagUpdateCycle = useRef(false);
  const isClearingFilters = useRef(false);
  const prevWorkItemTypesRef = useRef<string[]>([]);
  const prevStatesRef = useRef<string[]>([]);
  const prevAreaPathsRef = useRef<string[]>([]);
  const manualFilterChangeTimeoutRef = useRef<number | null>(null);
  const lastManualRemovalTimeRef = useRef<number | null>(null);
  // Track what tags populated so we can detect manual removals
  const tagPopulatedTypesRef = useRef<string[]>([]);
  const tagPopulatedStatesRef = useRef<string[]>([]);
  const tagPopulatedAreaPathsRef = useRef<string[]>([]);
  
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
    // Set flag to prevent tag auto-populate from running
    isClearingFilters.current = true;
    
    reset({ ...defaultFilters });
    setShowAdvanced(false);
    isUpdatingFromAreaPath.current = false;
    isUpdatingFromTags.current = false;
    isUpdatingFromStates.current = false;
    // Clear tag cycle flags
    isInTagUpdateCycle.current = false;
    needsFetchAfterTagCycle.current = false;
    tagCycleStartTime.current = null;
    if (tagUpdateTimeoutRef.current !== null) {
      clearTimeout(tagUpdateTimeoutRef.current);
      tagUpdateTimeoutRef.current = null;
    }
    if (manualFilterChangeTimeoutRef.current !== null) {
      clearTimeout(manualFilterChangeTimeoutRef.current);
      manualFilterChangeTimeoutRef.current = null;
    }
    lastManualRemovalTimeRef.current = null;
    // Clear tag-populated tracking
    tagPopulatedTypesRef.current = [];
    tagPopulatedStatesRef.current = [];
    tagPopulatedAreaPathsRef.current = [];
    
    // Clear the flag after a delay to allow the reset to complete
    setTimeout(() => {
      isClearingFilters.current = false;
    }, 500);
  }, [reset]);

  useEffect(() => {
    clearFilters();
  }, [resetSignal, clearFilters]);

  const selectedWorkItemTypes = watch('workItemTypes');
  const selectedStates = watch('states');
  const selectedAreaPaths = watch('areaPaths');
  const selectedTags = watch('tags');

  // Detect manual filter removal and update filters based on remaining selections
  useEffect(() => {
    // Only process if not updating from tags/area paths/states and not clearing all filters
    if (isUpdatingFromTags.current || isInTagUpdateCycle.current || isUpdatingFromAreaPath.current || isUpdatingFromStates.current || isClearingFilters.current) {
      // Update previous values but don't process changes
      prevWorkItemTypesRef.current = selectedWorkItemTypes || [];
      prevStatesRef.current = selectedStates || [];
      prevAreaPathsRef.current = selectedAreaPaths || [];
      return;
    }

    const workItemTypesReduced = selectedWorkItemTypes.length < prevWorkItemTypesRef.current.length;
    const statesReduced = selectedStates.length < prevStatesRef.current.length;
    const areaPathsReduced = selectedAreaPaths.length < prevAreaPathsRef.current.length;
    
    // If any filter was manually reduced, prevent tag auto-populate and update based on remaining filters
    if (workItemTypesReduced || statesReduced || areaPathsReduced) {
      // Record the time of manual removal
      lastManualRemovalTimeRef.current = Date.now();
      
      // Immediately update previous values to reflect the reduction (before tag effect can run)
      prevWorkItemTypesRef.current = selectedWorkItemTypes || [];
      prevStatesRef.current = selectedStates || [];
      prevAreaPathsRef.current = selectedAreaPaths || [];
      
      // Immediately prevent tag auto-populate from running
      isClearingFilters.current = true;
      
      if (manualFilterChangeTimeoutRef.current !== null) {
        clearTimeout(manualFilterChangeTimeoutRef.current);
      }
      
      // Update filters based on remaining selections (most recent change takes priority)
      const updateBasedOnRemainingFilters = async () => {
        // Clear tag-populated refs since we're updating from other sources
        if (workItemTypesReduced) tagPopulatedTypesRef.current = [];
        if (statesReduced) tagPopulatedStatesRef.current = [];
        if (areaPathsReduced) tagPopulatedAreaPathsRef.current = [];
        
        // If work item types are selected, update states, area paths, and tags
        if (selectedWorkItemTypes && selectedWorkItemTypes.length > 0) {
          if (onFetchStatesForType) {
            await onFetchStatesForType(selectedWorkItemTypes[0]);
          }
          if (onFetchAreaPathsForTypeAndState) {
            await onFetchAreaPathsForTypeAndState(selectedWorkItemTypes[0], selectedStates || []);
          }
          if (onFetchTagsForTypeStateAndAreaPath) {
            await onFetchTagsForTypeStateAndAreaPath(selectedWorkItemTypes[0], selectedStates || [], selectedAreaPaths || []);
          }
        }
        // If states are selected but no work item types, update based on states
        else if (selectedStates && selectedStates.length > 0 && onFetchTypesAndAreaPathsForStates) {
          await onFetchTypesAndAreaPathsForStates(selectedStates);
        }
        // If area paths are selected but no work item types or states, update based on area paths
        else if (selectedAreaPaths && selectedAreaPaths.length > 0 && onFetchTypesAndStatesForAreaPath) {
          await onFetchTypesAndStatesForAreaPath(selectedAreaPaths);
        }
        
        // Clear the flag and timestamp after updates complete
        setTimeout(() => {
          manualFilterChangeTimeoutRef.current = null;
          // Keep the flag and timestamp longer to prevent tag re-population
          setTimeout(() => {
            isClearingFilters.current = false;
            // Keep timestamp even longer to ensure tag effect doesn't run
            setTimeout(() => {
              lastManualRemovalTimeRef.current = null;
            }, 2000);
          }, 1000);
        }, 500);
      };
      
      // Delay to allow the form to update first, but set flag immediately above
      manualFilterChangeTimeoutRef.current = window.setTimeout(() => {
        updateBasedOnRemainingFilters();
      }, 100);
    } else {
      // No reduction detected, update previous values normally
      prevWorkItemTypesRef.current = selectedWorkItemTypes || [];
      prevStatesRef.current = selectedStates || [];
      prevAreaPathsRef.current = selectedAreaPaths || [];
    }
  }, [selectedWorkItemTypes, selectedStates, selectedAreaPaths, selectedTags, onFetchStatesForType, onFetchAreaPathsForTypeAndState, onFetchTagsForTypeStateAndAreaPath, onFetchTypesAndAreaPathsForStates, onFetchTypesAndStatesForAreaPath]);
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
    // Don't fetch states if we're updating from area paths, tags, states, or in a tag update cycle
    // Also check cooldown timeout to prevent overwriting states set by tags
    // This prevents flickering when tags are selected first
    if (isUpdatingFromAreaPath.current || isUpdatingFromTags.current || isUpdatingFromStates.current || isInTagUpdateCycle.current || tagUpdateTimeoutRef.current !== null) {
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
    // Don't fetch if we're updating from area paths, tags, or in a tag update cycle
    if (isUpdatingFromAreaPath.current || isUpdatingFromTags.current || isInTagUpdateCycle.current) {
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
    // Don't fetch tags if we're currently updating from tags, area paths, or states
    // This prevents infinite loops when tags are selected first
    if (isUpdatingFromTags.current || isUpdatingFromAreaPath.current || isUpdatingFromStates.current) {
      return;
    }

    // Don't fetch tags if we're still in the cooldown period after a tag-initiated update
    if (tagUpdateTimeoutRef.current !== null) {
      return;
    }

    // Don't fetch tags if we're in a tag-initiated update cycle
    // This prevents the fetch from running when tags populate other fields
    if (isInTagUpdateCycle.current) {
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
    // Don't run if we're clearing filters, manually removing filters, updating from tags, or in tag cycle
    if (isClearingFilters.current || manualFilterChangeTimeoutRef.current !== null || isUpdatingFromTags.current || isInTagUpdateCycle.current) return;

    if (!selectedAreaPaths || selectedAreaPaths.length === 0) {
      return;
    }

    // Check if a manual removal happened recently (within last 5 seconds)
    if (lastManualRemovalTimeRef.current !== null) {
      const timeSinceRemoval = Date.now() - lastManualRemovalTimeRef.current;
      if (timeSinceRemoval < 5000) {
        // Manual removal happened recently, don't re-populate from area path
        return;
      }
      // Clear the timestamp if it's old
      lastManualRemovalTimeRef.current = null;
    }

    const hasManualType = selectedWorkItemTypes && selectedWorkItemTypes.length > 0;
    const hasManualState = selectedStates && selectedStates.length > 0;

    // If both are manually set, don't auto-populate
    if (hasManualType && hasManualState) {
      return;
    }

    // Check if filters were just manually reduced (prevent re-population)
    const workItemTypesReduced = (selectedWorkItemTypes?.length || 0) < (prevWorkItemTypesRef.current?.length || 0);
    const statesReduced = (selectedStates?.length || 0) < (prevStatesRef.current?.length || 0);
    
    if (workItemTypesReduced || statesReduced) {
      // Filters were manually reduced, don't re-populate from area path
      // Update previous values immediately to prevent re-check
      prevWorkItemTypesRef.current = selectedWorkItemTypes || [];
      prevStatesRef.current = selectedStates || [];
      lastManualRemovalTimeRef.current = Date.now();
      return;
    }

    isUpdatingFromAreaPath.current = true;

    onFetchTypesAndStatesForAreaPath(selectedAreaPaths)
      .then(({ types, states }) => {
        if (types.length > 0 && !hasManualType) {
          setValue('workItemTypes', types, { shouldDirty: false });
          prevWorkItemTypesRef.current = types;
        }
        if (states.length > 0 && !hasManualState) {
          setValue('states', states, { shouldDirty: false });
          prevStatesRef.current = states;
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
    // Don't run if we're clearing filters, manually removing filters, or updating from other sources
    if (isClearingFilters.current || manualFilterChangeTimeoutRef.current !== null || isUpdatingFromAreaPath.current || isUpdatingFromStates.current) return;
    
    // Check if a manual removal happened recently (within last 5 seconds)
    if (lastManualRemovalTimeRef.current !== null) {
      const timeSinceRemoval = Date.now() - lastManualRemovalTimeRef.current;
      if (timeSinceRemoval < 5000) {
        // Manual removal happened recently, don't re-populate from tags
        return;
      }
      // Clear the timestamp if it's old
      lastManualRemovalTimeRef.current = null;
    }
    
    // Also check if filters were just manually reduced (prevent re-population from tags)
    // Compare current lengths with previous lengths - if reduced, it was manually removed
    const workItemTypesReduced = (selectedWorkItemTypes?.length || 0) < (prevWorkItemTypesRef.current?.length || 0);
    const statesReduced = (selectedStates?.length || 0) < (prevStatesRef.current?.length || 0);
    const areaPathsReduced = (selectedAreaPaths?.length || 0) < (prevAreaPathsRef.current?.length || 0);
    
    // Also check if current values are a subset of tag-populated values (more reliable detection)
    const currentTypes = selectedWorkItemTypes || [];
    const currentStates = selectedStates || [];
    const currentAreaPaths = selectedAreaPaths || [];
    const tagTypes = tagPopulatedTypesRef.current || [];
    const tagStates = tagPopulatedStatesRef.current || [];
    const tagAreaPaths = tagPopulatedAreaPathsRef.current || [];
    
    const isSubsetOfTagTypes = tagTypes.length > 0 && currentTypes.length < tagTypes.length && 
      currentTypes.every(type => tagTypes.includes(type));
    const isSubsetOfTagStates = tagStates.length > 0 && currentStates.length < tagStates.length && 
      currentStates.every(state => tagStates.includes(state));
    const isSubsetOfTagAreaPaths = tagAreaPaths.length > 0 && currentAreaPaths.length < tagAreaPaths.length && 
      currentAreaPaths.every(path => tagAreaPaths.includes(path));
    
    if (workItemTypesReduced || statesReduced || areaPathsReduced || 
        isSubsetOfTagTypes || isSubsetOfTagStates || isSubsetOfTagAreaPaths) {
      // Filters were manually reduced, don't re-populate from tags
      // Update previous values immediately to prevent re-check
      prevWorkItemTypesRef.current = selectedWorkItemTypes || [];
      prevStatesRef.current = selectedStates || [];
      prevAreaPathsRef.current = selectedAreaPaths || [];
      lastManualRemovalTimeRef.current = Date.now();
      return;
    }

    if (!selectedTags || selectedTags.length === 0) {
      // Clear timeout ref and cycle flag when tags are cleared
      if (tagUpdateTimeoutRef.current !== null) {
        clearTimeout(tagUpdateTimeoutRef.current);
        tagUpdateTimeoutRef.current = null;
      }
      isInTagUpdateCycle.current = false;
      tagCycleStartTime.current = null;
      needsFetchAfterTagCycle.current = false;
      lastManualRemovalTimeRef.current = null;
      // Clear tag-populated tracking
      tagPopulatedTypesRef.current = [];
      tagPopulatedStatesRef.current = [];
      tagPopulatedAreaPathsRef.current = [];
      return;
    }

    isUpdatingFromTags.current = true;
    isInTagUpdateCycle.current = true;
    tagCycleStartTime.current = Date.now();

    // Set a longer cooldown period to prevent tag fetch from running immediately after tag-initiated updates
    if (tagUpdateTimeoutRef.current !== null) {
      clearTimeout(tagUpdateTimeoutRef.current);
    }
    tagUpdateTimeoutRef.current = window.setTimeout(() => {
      tagUpdateTimeoutRef.current = null;
      // Keep the cycle flag for a bit longer to prevent re-triggering
      setTimeout(() => {
        isInTagUpdateCycle.current = false;
        tagCycleStartTime.current = null;
        // Mark that we need to fetch after cycle completes and trigger effect re-run
        needsFetchAfterTagCycle.current = true;
        setFetchTrigger(prev => prev + 1);
      }, 500);
    }, 1500);

    onFetchTypesAndStatesForTags(selectedTags)
      .then(({ types, states, areaPaths }) => {
        // Update previous values to reflect what tags populated
        const newWorkItemTypes = types.length > 0 ? types : (selectedWorkItemTypes || []);
        const newStates = states.length > 0 ? states : (selectedStates || []);
        const newAreaPaths = areaPaths.length > 0 ? areaPaths : (selectedAreaPaths || []);
        
        if (types.length > 0) {
          setValue('workItemTypes', types, { shouldDirty: false });
          prevWorkItemTypesRef.current = types;
          tagPopulatedTypesRef.current = types; // Track what tags populated
        }
        if (states.length > 0) {
          setValue('states', states, { shouldDirty: false });
          prevStatesRef.current = states;
          tagPopulatedStatesRef.current = states; // Track what tags populated
        }
        if (areaPaths.length > 0) {
          setValue('areaPaths', areaPaths, { shouldDirty: false });
          prevAreaPathsRef.current = areaPaths;
          tagPopulatedAreaPathsRef.current = areaPaths; // Track what tags populated
        }
        // After populating filters from tags, ensure feature count is fetched
        // Set the flag and trigger the effect after cycle completes
        if (types.length > 0) {
          needsFetchAfterTagCycle.current = true;
          // Wait for the cycle to complete, then trigger fetch
          setTimeout(() => {
            const currentConfig = configRef.current;
            const currentFetch = fetchFeatureCountRef.current;
            // Check if cycle is complete and we have work item types
            const cycleComplete = !isInTagUpdateCycle.current && !isUpdatingFromTags.current && tagUpdateTimeoutRef.current === null;
            if (cycleComplete && currentConfig.enabled && currentConfig.accessToken && currentFetch) {
              // Clear any existing timeout
              if (countTimeoutRef.current !== null) {
                window.clearTimeout(countTimeoutRef.current);
                countTimeoutRef.current = null;
              }
              // Directly trigger the fetch
              currentFetch();
              needsFetchAfterTagCycle.current = false;
            } else {
              // If cycle isn't complete yet, trigger the effect to check again
              setFetchTrigger(prev => prev + 1);
            }
          }, 2100); // Wait for cycle to complete (1500ms + 500ms + 100ms buffer)
        }
      })
      .finally(() => {
        setTimeout(() => {
          isUpdatingFromTags.current = false;
        }, 500);
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

  // Keep refs up to date
  useEffect(() => {
    configRef.current = config;
    fetchFeatureCountRef.current = fetchFeatureCount;
  }, [config, fetchFeatureCount]);

  // Debounced feature count fetch
  useEffect(() => {
    // Clear any existing timeout
    if (countTimeoutRef.current !== null) {
      window.clearTimeout(countTimeoutRef.current);
      countTimeoutRef.current = null;
    }
    
    // Only clear count if we don't have work item types selected
    if (!selectedWorkItemTypes || selectedWorkItemTypes.length === 0) {
      setFeatureCount(null);
      return;
    }
    
    // Check if we need to fetch after tag cycle completed
    // This takes priority - if the cycle just completed, fetch immediately
    if (needsFetchAfterTagCycle.current && selectedWorkItemTypes && selectedWorkItemTypes.length > 0) {
      // Check if cycle is complete (not still in progress)
      const cycleComplete = !isInTagUpdateCycle.current && !isUpdatingFromTags.current && tagUpdateTimeoutRef.current === null;
      // Also check if enough time has passed (2100ms) as a fallback
      const enoughTimePassed = tagCycleStartTime.current === null || (Date.now() - tagCycleStartTime.current) >= 2100;
      
      if (cycleComplete || enoughTimePassed) {
        needsFetchAfterTagCycle.current = false;
        // Fetch immediately after tag cycle completes
        const currentConfig = configRef.current;
        const currentFetch = fetchFeatureCountRef.current;
        if (currentConfig.enabled && currentConfig.accessToken && currentFetch) {
          currentFetch();
        }
        return;
      }
      // If cycle is still active but flag is set, keep the flag and return
      // The fetch will happen when the cycle completes
      return;
    }
    
    // Don't fetch feature count if we're in a tag-initiated update cycle or cooldown period
    // This prevents flashing when tags are selected first
    if (isInTagUpdateCycle.current || isUpdatingFromTags.current || tagUpdateTimeoutRef.current !== null) {
      // Don't clear the count during tag updates - preserve existing value
      // Mark that we need to fetch after the cycle completes
      needsFetchAfterTagCycle.current = true;
      return;
    }
    
    // Fetch the count if we have the required config
    if (config.enabled && config.accessToken) {
      // Always fetch when filters change (debounced for non-tag updates)
      countTimeoutRef.current = window.setTimeout(() => {
        fetchFeatureCount();
      }, 300);
    } else {
      // If config is not ready, clear the count
      setFeatureCount(null);
    }
    
    return () => {
      if (countTimeoutRef.current !== null) {
        window.clearTimeout(countTimeoutRef.current);
        countTimeoutRef.current = null;
      }
    };
  }, [selectedWorkItemTypes, selectedStates, selectedAreaPaths, selectedTags, advancedQuery, showAdvanced, config.enabled, config.accessToken, fetchFeatureCount, fetchTrigger]);

  // Sync with preview features
  useEffect(() => {
    if (showPreviewModal && !prevShowPreviewModalRef.current && previewFeatures) {
      const count = previewFeatures.length;
      setFeatureCount(count);
    }
    prevShowPreviewModalRef.current = showPreviewModal || false;
  }, [showPreviewModal, previewFeatures]);

  // Set feature count from preview features (manual preview result)
  useEffect(() => {
    if (previewFeatures && previewFeatures.length > 0) {
      setFeatureCount(previewFeatures.length);
    } else if (previewFeatures && previewFeatures.length === 0) {
      // Explicitly set to 0 if preview returned empty array
      setFeatureCount(0);
    }
  }, [previewFeatures]);

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
          {isFetching ? 'Loading...' : (() => {
            // Use featureCount if available, otherwise use previewFeatures length
            const count = featureCount !== null ? featureCount : (previewFeatures?.length ?? null);
            // Show count if available (even while fetching, to show previous count)
            return count !== null
              ? `Preview ${count} Feature${count !== 1 ? 's' : ''}`
              : 'Preview Features';
          })()}
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

  // Placeholder date constant (same as SessionSelectionScreen)
  const PLACEHOLDER_DATE = '2099-12-31'; // Placeholder date for drafts without dates
  
  const isPlaceholderDate = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    const dateOnly = dateStr.split('T')[0];
    return dateOnly === PLACEHOLDER_DATE;
  };

  // Date helper functions (same as SessionSelectionScreen)
  const parseLocalDate = (dateString: string): Date => {
    if (!dateString || typeof dateString !== 'string') {
      return new Date();
    }
    const dateOnly = dateString.split('T')[0].split(' ')[0];
    const parts = dateOnly.split('-');
    if (parts.length !== 3) {
      return new Date();
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return new Date();
    }
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (isNaN(date.getTime())) {
      return new Date();
    }
    return date;
  };

  const formatDateToISO = (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
      const today = new Date();
      return today.toISOString().split('T')[0];
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addDaysToLocalDate = (date: Date, days: number): Date => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(year, month, day + days, 0, 0, 0, 0);
  };

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
      startDate: isPlaceholderDate(session.startDate) ? '' : session.startDate.split('T')[0],
      endDate: isPlaceholderDate(session.endDate) ? '' : session.endDate.split('T')[0],
      useAutoVotes: session.useAutoVotes || false,
      votesPerUser: session.votesPerUser
    }
  });

  useEffect(() => {
    const startDateValue = isPlaceholderDate(session.startDate) ? '' : session.startDate.split('T')[0];
    const endDateValue = isPlaceholderDate(session.endDate) ? '' : session.endDate.split('T')[0];
    reset({
      productId: (session as any).productId ?? (session as any).product_id ?? '',
      title: session.title,
      goal: session.goal,
      startDate: startDateValue,
      endDate: endDateValue,
      useAutoVotes: session.useAutoVotes || false,
      votesPerUser: session.votesPerUser
    });
    prevStartDateRef.current = startDateValue;
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
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const prevStartDateRef = useRef<string>('');
  
  // Handle date focus - populate dates if empty, based on furthest out session for product
  const handleDateFocus = useCallback(async (fieldName: 'startDate' | 'endDate') => {
    const currentStartDate = startDate;
    const currentEndDate = endDate;
    
    if (fieldName === 'startDate' && !currentStartDate) {
      let newStartDate: Date;
      
      // If product is selected, calculate based on furthest out session for that product
      if (selectedProductId) {
        try {
          const productSessions = await db.getSessionsByProduct(selectedProductId);
          
          // Filter out the current session being edited
          const otherProductSessions = productSessions.filter(s => s.id !== session.id);
          
          if (otherProductSessions.length > 0) {
            // Find the latest end date (excluding placeholder dates)
            let latestEndDate: Date | null = null;
            otherProductSessions.forEach(sessionItem => {
              const sessionEndDateStr = sessionItem.end_date || (sessionItem as any).endDate;
              if (sessionEndDateStr && !isPlaceholderDate(sessionEndDateStr)) {
                const sessionEndDate = parseLocalDate(sessionEndDateStr);
                if (!latestEndDate || sessionEndDate > latestEndDate) {
                  latestEndDate = sessionEndDate;
                }
              }
            });
            
            if (latestEndDate) {
              // Start date should be the NEXT day after the latest end date
              newStartDate = addDaysToLocalDate(latestEndDate, 1);
            } else {
              // No valid end dates found - use today
              newStartDate = new Date();
            }
          } else {
            // No existing sessions - use today
            newStartDate = new Date();
          }
        } catch (error) {
          console.error('Error calculating dates for product:', error);
          newStartDate = new Date();
        }
      } else {
        // No product selected - use today
        newStartDate = new Date();
      }
      
      const newEndDate = addDaysToLocalDate(newStartDate, 14);
      setValue('startDate', formatDateToISO(newStartDate), { shouldDirty: true });
      if (!currentEndDate) {
        setValue('endDate', formatDateToISO(newEndDate), { shouldDirty: true });
      }
    } else if (fieldName === 'endDate' && !currentEndDate) {
      let newStartDate: Date;
      
      if (currentStartDate) {
        newStartDate = parseLocalDate(currentStartDate);
      } else {
        // If no start date, calculate it first based on product
        if (selectedProductId) {
          try {
            const productSessions = await db.getSessionsByProduct(selectedProductId);
            
            // Filter out the current session being edited
            const otherProductSessions = productSessions.filter(s => s.id !== session.id);
            
            if (otherProductSessions.length > 0) {
              let latestEndDate: Date | null = null;
              otherProductSessions.forEach(sessionItem => {
                const sessionEndDateStr = sessionItem.end_date || (sessionItem as any).endDate;
                if (sessionEndDateStr && !isPlaceholderDate(sessionEndDateStr)) {
                  const sessionEndDate = parseLocalDate(sessionEndDateStr);
                  if (!latestEndDate || sessionEndDate > latestEndDate) {
                    latestEndDate = sessionEndDate;
                  }
                }
              });
              
              if (latestEndDate) {
                newStartDate = addDaysToLocalDate(latestEndDate, 1);
              } else {
                newStartDate = new Date();
              }
            } else {
              newStartDate = new Date();
            }
          } catch (error) {
            console.error('Error calculating dates for product:', error);
            newStartDate = new Date();
          }
        } else {
          newStartDate = new Date();
        }
        setValue('startDate', formatDateToISO(newStartDate), { shouldDirty: true });
      }
      
      const newEndDate = addDaysToLocalDate(newStartDate, 14);
      setValue('endDate', formatDateToISO(newEndDate), { shouldDirty: true });
    }
  }, [startDate, endDate, selectedProductId, setValue]);
  
  // Auto-update end date when start date changes (only if both dates are set)
  useEffect(() => {
    if (startDate && startDate !== prevStartDateRef.current && endDate) {
      prevStartDateRef.current = startDate;
      const startDateParsed = parseLocalDate(startDate);
      const newEndDate = addDaysToLocalDate(startDateParsed, 14);
      setValue('endDate', formatDateToISO(newEndDate), { shouldDirty: true });
    }
  }, [startDate, endDate, setValue]);
  
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
  const handleFormSubmit = async (data: SessionEditFormValues, isDraft: boolean = false) => {
    try {
      // Submit the session update
      onSubmit({ ...data, isDraft });
    } catch (error) {
      console.error('ERROR in handleFormSubmit:', error);
      throw error;
    }
  };

  // Handle save draft
  const handleSaveDraft = async () => {
    const formData = watch();
    await handleFormSubmit(formData, true);
  };

  return (
    <form onSubmit={handleSubmit((data) => {
      return handleFormSubmit(data);
    }, (errors) => {
    })}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
        <div className="flex items-center gap-2">
          {(() => {
            const selectedProduct = displayProducts.find((product) => product.id === selectedProductId) ?? null;
            const lookupName = selectedProductId ? productLookup[selectedProductId] ?? null : null;
            const displayProductName = selectedProduct?.name ?? lookupName ?? initialProductName ?? 'No Product';
            const displayColorHex = selectedProduct?.color_hex || null;
            const selectedProductColors = selectedProduct
              ? getProductColor(selectedProduct.name, displayColorHex ?? null)
              : null;
            const productColorHex = selectedProductColors?.background || null;
            
            return (
              <>
                <div
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: productColorHex || '#2D4660' }}
                />
                <span className="text-gray-900">{displayProductName}</span>
              </>
            );
          })()}
        </div>
      </div>

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
            {...register('startDate', { 
              required: !isPlaceholderDate(session.startDate) && !isPlaceholderDate(session.endDate) ? 'Start date is required' : false
            })}
            value={watch('startDate') || ''}
            onFocus={(e) => {
              if (!watch('startDate')) {
                handleDateFocus('startDate');
              }
            }}
            autoComplete="off"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-0 focus:border-[#2d4660] [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
              errors.startDate ? 'border-red-500' : 'border-gray-300'
            }`}
            style={!watch('startDate') ? { 
              color: 'transparent'
            } : {}}
            onBlur={(e) => {
              if (!e.target.value) {
                e.target.style.color = 'transparent';
              } else {
                e.target.style.color = '';
              }
            }}
          />
          {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            {...register('endDate', { 
              required: !isPlaceholderDate(session.startDate) && !isPlaceholderDate(session.endDate) ? 'End date is required' : false
            })}
            value={watch('endDate') || ''}
            onFocus={(e) => {
              if (!watch('endDate')) {
                handleDateFocus('endDate');
              }
            }}
            autoComplete="off"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-0 focus:border-[#2d4660] [&::-webkit-calendar-picker-indicator]:cursor-pointer ${
              errors.endDate ? 'border-red-500' : 'border-gray-300'
            }`}
            style={!watch('endDate') ? { 
              color: 'transparent',
              position: 'relative'
            } : {}}
            onBlur={(e) => {
              if (!e.target.value) {
                e.target.style.color = 'transparent';
              } else {
                e.target.style.color = '';
              }
            }}
          />
          {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>}
        </div>
      </div>

      <div className="mb-4 bg-[#1E5461]/5 border border-[#1E5461]/20 rounded-lg p-4">
        <div className="flex items-start">
          <input
            type="checkbox"
            {...register('useAutoVotes')}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => setValue('useAutoVotes', !useAutoVotes, { shouldDirty: true })}
            className="flex-shrink-0 cursor-pointer mt-0.5 w-5 h-5 flex items-center justify-center"
          >
            {useAutoVotes ? (
              <CheckSquare className="w-5 h-5 text-green-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>
          <div className="ml-3">
            <label 
              onClick={() => setValue('useAutoVotes', !useAutoVotes, { shouldDirty: true })}
              className="text-sm font-medium text-gray-700 cursor-pointer"
            >
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
          <Button 
            variant="secondary" 
            type="button"
            onClick={handleSaveDraft}
          >
            Save Draft
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
                  return handleFormSubmit(data, false);
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
  onReplaceAll,
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
  const { currentUser, currentSession, setCurrentSession } = useSession();
  
  const [selectedProjects, setSelectedProjects] = useState<string[]>(() => {
    if (azureDevOpsConfig.project) return [azureDevOpsConfig.project];
    return projectOptions[0] ? [projectOptions[0]] : [];
  });
  const [filtersResetToken, setFiltersResetToken] = useState(0);
  
  useEffect(() => {
    if (azureDevOpsConfig.project) {
      setSelectedProjects([azureDevOpsConfig.project]);
    } else if (projectOptions.length > 0) {
      setSelectedProjects([projectOptions[0]]);
    } else {
      setSelectedProjects([]);
    }
  }, [azureDevOpsConfig.project, projectOptions]);
  
  // State declarations
  const [showSessionEditForm, setShowSessionEditForm] = useState(false);
  const [showEndEarlyModal, setShowEndEarlyModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const [sessionActionsMenuOpen, setSessionActionsMenuOpen] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isSessionAdmin, setIsSessionAdmin] = useState(false);
  
  // Compute effective role based on adminPerspective
  // When adminPerspective is 'session', treat as Product Owner even if user is System Admin
  const effectiveIsSystemAdmin = adminPerspective === 'system' && isSystemAdmin;
  const effectiveIsSessionAdmin = adminPerspective === 'session' || (adminPerspective === 'system' && !isSystemAdmin && isSessionAdmin);
  const [adminCount, setAdminCount] = useState<number>(0);
  const [stakeholderCount, setStakeholderCount] = useState<number>(0);
  const sessionActionsMenuRef = useRef<HTMLDivElement | null>(null);
  
  // Feature actions dropdown state
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | null>(null);
  const [openFeatureDropdown, setOpenFeatureDropdown] = useState<string | null>(null);
  
  // Feature attachment state
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [featureToAttach, setFeatureToAttach] = useState<Feature | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState<string[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const attachmentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<string | null>(null);
  
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
  const [editAttachments, setEditAttachments] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<FeatureSuggestion | null>(null);
  const [isDeletingSuggestion, setIsDeletingSuggestion] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [statusNotes, setStatusNotes] = useState<SessionStatusNote[]>([]);
  const [showAllStatusNotes, setShowAllStatusNotes] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductColor, setEditingProductColor] = useState<string | null>(null);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [showEditProductColorPicker, setShowEditProductColorPicker] = useState(false);
  const [editTempColor, setEditTempColor] = useState<string>('#2D4660');
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [hoveredProductTab, setHoveredProductTab] = useState<boolean>(false);
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
    const checkRoles = async () => {
      if (!currentUser) return;
      const sysAdmin = await db.isUserSystemAdmin(currentUser.id);
      setIsSystemAdmin(sysAdmin);
      
      // Check if product owner
      const { data } = await supabase
        .from('product_owners')
        .select('session_id')
        .eq('user_id', currentUser.id)
        .limit(1);
      setIsSessionAdmin(data && data.length > 0);
    };
    checkRoles();
  }, [currentUser]);

  const loadCounts = useCallback(async () => {
    // Get session ID from currentSession (has id) or votingSession (might not have id)
    const sessionId = currentSession?.id || (votingSession as any)?.id;
    
    if (!sessionId) {
      setAdminCount(0);
      setStakeholderCount(0);
      return;
    }
    
    try {
      const [admins, stakeholders] = await Promise.all([
        db.getSessionAdmins(sessionId).catch((err) => {
          console.error('[AdminDashboard] Error loading admins:', err);
          return [];
        }),
        db.getSessionStakeholders(sessionId).catch((err) => {
          console.error('[AdminDashboard] Error loading stakeholders:', err);
          return [];
        })
      ]);
      setAdminCount(admins.length);
      setStakeholderCount(stakeholders.length);
    } catch (error) {
      console.error('[AdminDashboard] Error loading admin/stakeholder counts:', error);
      setAdminCount(0);
      setStakeholderCount(0);
    }
  }, [currentSession?.id, votingSession]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Refresh counts when window regains focus (user returns from users page)
  useEffect(() => {
    const handleFocus = () => {
      loadCounts();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadCounts]);

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
  
  const handleProjectChange = useCallback((projects: string[]) => {
    const normalizedProjects = projects.filter(p => p?.trim()).map(p => p.trim());
    setSelectedProjects(normalizedProjects);
    // Use the first project for the config (for backward compatibility)
    if (normalizedProjects.length > 0 && normalizedProjects[0] !== (azureDevOpsConfig.project || '')) {
      const updatedConfig: AzureDevOpsConfig = {
        ...azureDevOpsConfig,
        project: normalizedProjects[0]
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
  
  // Placeholder date constant (same as SessionSelectionScreen)
  const PLACEHOLDER_DATE = '2099-12-31'; // Placeholder date for drafts without dates
  
  const isPlaceholderDate = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false;
    const dateOnly = dateStr.split('T')[0];
    return dateOnly === PLACEHOLDER_DATE;
  };

  const isDraftSession = (session: any) => {
    // A session is a draft if:
    // 1. It's not active (is_active: false)
    // 2. AND either the title is "Untitled Session" or the goal is empty
    // This identifies sessions saved via "Save Draft" button
    if (!session.is_active) {
      const isUntitled = !session.title || session.title === 'Untitled Session' || session.title.trim() === '';
      const hasNoGoal = !session.goal || session.goal.trim() === '';
      
      // If it's not active and has default/empty values, it's a draft
      return isUntitled || hasNoGoal;
    }
    return false;
  };

  const getSessionStatus = (session: any) => {
    // Draft sessions have a special status
    if (isDraftSession(session)) {
      return { text: 'Draft', color: 'text-yellow-900 bg-yellow-200', icon: Pencil };
    }
    
    const now = new Date();
    const startDate = session.startDate || session.start_date;
    const endDate = session.endDate || session.end_date;
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) {
      return { text: 'Upcoming', color: 'text-yellow-600 bg-yellow-50', icon: Clock };
    } else if (now > end) {
      return { text: 'Closed', color: 'text-gray-600 bg-gray-100', icon: AlertCircle };
    } else {
      return { text: 'Active', color: 'text-[#1E6154] bg-[#1E6154]/10', icon: CheckCircle };
    }
  };

  const sessionStatus = getSessionStatus(votingSession);
  const StatusIcon = sessionStatus.icon;
  
  const votingStatus = (
    <span className={`inline-flex items-center ${sessionStatus.text === 'Active' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'} rounded-full font-medium ${sessionStatus.color}`}>
      <StatusIcon className={`${sessionStatus.text === 'Active' ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
      {sessionStatus.text}
    </span>
  );

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

  const handleManageAdmins = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSession) {
      setCurrentSession(currentSession);
    }
    // Get product ID from votingSession or currentSession
    const productId = (votingSession as any)?.product_id ?? (votingSession as any)?.productId ?? (currentSession as any)?.product_id ?? (currentSession as any)?.productId ?? null;
    // Navigate to users screen with product-owner filter, perspective, and product
    const url = `/users?filter=product-owner&perspective=${adminPerspective}${productId ? `&product=${productId}` : ''}`;
    navigate(url);
  }, [currentSession, setCurrentSession, navigate, adminPerspective, votingSession]);

  const handleManageStakeholders = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSession) {
      setCurrentSession(currentSession);
    }
    // Get product ID from votingSession or currentSession
    const productId = (votingSession as any)?.product_id ?? (votingSession as any)?.productId ?? (currentSession as any)?.product_id ?? (currentSession as any)?.productId ?? null;
    // Navigate to users screen with stakeholder filter, perspective, and product
    const url = `/users?filter=stakeholder&perspective=${adminPerspective}${productId ? `&product=${productId}` : ''}`;
    navigate(url);
  }, [currentSession, setCurrentSession, navigate, adminPerspective, votingSession]);

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
      setEditAttachments(suggestionToEdit.attachment_urls ? [...suggestionToEdit.attachment_urls] : []);
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

  const handleSessionUpdate = (data: SessionEditFormValues & { isDraft?: boolean }) => {
    const isDraft = data.isDraft || false;
    
    // For drafts, use placeholder dates if empty
    const PLACEHOLDER_DATE = '2099-12-31';
    const startDateValue = data.startDate && data.startDate.trim() 
      ? data.startDate 
      : PLACEHOLDER_DATE;
    const endDateValue = data.endDate && data.endDate.trim()
      ? data.endDate
      : PLACEHOLDER_DATE;
    
    // Handle productId - can be empty string, null, undefined, or a valid ID
    const productId = data.productId && data.productId.trim() !== '' ? data.productId : null;
    
    const selectedProduct = productId ? products.find(product => product.id === productId) || null : null;
    
    const updatedSession: VotingSession = {
      ...votingSession,
      title: data.title.trim() || 'Untitled Session',
      goal: data.goal.trim() || '',
      votesPerUser: data.useAutoVotes ? Math.max(1, Math.floor(features.length / 2)) : Number(data.votesPerUser),
      useAutoVotes: data.useAutoVotes,
      startDate: new Date(startDateValue).toISOString(),
      endDate: new Date(endDateValue + 'T23:59:59').toISOString(),
      isActive: isDraft ? false : votingSession.isActive,
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
        howWouldItWork: editForm.howWouldItWork.trim() ? editForm.howWouldItWork.trim() : null,
        attachment_urls: editAttachments.length > 0 ? editAttachments : null
      });
      setSuggestionToEdit(null);
      setEditAttachments([]);
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

    // Verify the target session still exists
    try {
      const targetSession = await db.getSessionById(targetSessionId);
      if (!targetSession) {
        setMoveError('The selected session no longer exists. Please refresh and try again.');
        return;
      }
    } catch (verifyError) {
      setMoveError('The selected session no longer exists. Please refresh and try again.');
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

  // Attachment handlers
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const previewUrls: string[] = [];
    
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    
    files.forEach(file => {
      if (validTypes.includes(file.type)) {
        validFiles.push(file);
        if (file.type.startsWith('image/')) {
          previewUrls.push(URL.createObjectURL(file));
        } else {
          previewUrls.push('');
        }
      }
    });

    const remainingSlots = 3 - attachmentFiles.length;
    const filesToAdd = validFiles.slice(0, remainingSlots);
    const urlsToAdd = previewUrls.slice(0, remainingSlots);
    
    setAttachmentFiles(prev => [...prev, ...filesToAdd]);
    setAttachmentPreviewUrls(prev => [...prev, ...urlsToAdd]);
    
    if (attachmentFileInputRef.current) {
      attachmentFileInputRef.current.value = '';
    }
  }, [attachmentFiles.length]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachmentFiles(prev => {
      const fileToRemove = prev[index];
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

  const openAttachmentModal = useCallback((feature: Feature) => {
    setFeatureToAttach(feature);
    setAttachmentError(null);
    setShowAttachmentModal(true);
  }, []);

  const closeAttachmentModal = useCallback(() => {
    if (!isUploadingAttachment) {
      attachmentPreviewUrls.forEach(url => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      });
      setShowAttachmentModal(false);
      setFeatureToAttach(null);
      setAttachmentFiles([]);
      setAttachmentPreviewUrls([]);
      setAttachmentError(null);
      if (attachmentFileInputRef.current) {
        attachmentFileInputRef.current.value = '';
      }
    }
  }, [isUploadingAttachment, attachmentPreviewUrls]);

  const handleSubmitAttachment = useCallback(async () => {
    if (!featureToAttach || attachmentFiles.length === 0) {
      setAttachmentError('Please select at least one file to upload.');
      return;
    }

    try {
      setIsUploadingAttachment(true);
      setAttachmentError(null);

      // Upload attachments to Supabase storage
      const attachmentUrls: string[] = [];
      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${i}.${fileExt}`;
        const filePath = `features/${featureToAttach.id}/${fileName}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from('feature-attachments')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            if (uploadError.message?.includes('Bucket not found')) {
              console.warn('Storage bucket "feature-attachments" not found. Please create it in Supabase Storage.');
            }
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('feature-attachments')
              .getPublicUrl(filePath);
            attachmentUrls.push(publicUrl);
          }
        } catch (error: any) {
          console.error('Error uploading file:', error);
        }
      }

      if (attachmentUrls.length === 0) {
        setAttachmentError('Failed to upload files. Please try again.');
        setIsUploadingAttachment(false);
        return;
      }

      // Update feature with new attachment URLs
      const existingAttachments = featureToAttach.attachmentUrls || [];
      const updatedFeature = {
        ...featureToAttach,
        attachmentUrls: [...existingAttachments, ...attachmentUrls]
      };

      onUpdateFeature(updatedFeature);
      closeAttachmentModal();
    } catch (error) {
      console.error('Error submitting attachment:', error);
      setAttachmentError('Failed to upload attachments. Please try again.');
    } finally {
      setIsUploadingAttachment(false);
    }
  }, [featureToAttach, attachmentFiles, onUpdateFeature, closeAttachmentModal]);

  const handleRemoveFeatureAttachment = useCallback((feature: Feature, urlToRemove: string) => {
    const updatedAttachments = (feature.attachmentUrls || []).filter(url => url !== urlToRemove);
    const updatedFeature = {
      ...feature,
      attachmentUrls: updatedAttachments
    };
    onUpdateFeature(updatedFeature);
    
    // Optionally delete from storage
    const pathMatch = urlToRemove.match(/features\/[^\/]+\/[^\/]+$/);
    if (pathMatch) {
      supabase.storage
        .from('feature-attachments')
        .remove([pathMatch[0]])
        .catch(err => console.error('Error deleting file from storage:', err));
    }
  }, [onUpdateFeature]);

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

  // Handle click outside feature actions dropdown
  useEffect(() => {
    if (!openFeatureDropdown) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (!(e.target as Element).closest('.feature-actions-dropdown-container')) {
        setOpenFeatureDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [openFeatureDropdown]);

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
      
      {/* Title and buttons in same row */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <ImageWithFallback
            src={mobileLogo}
            alt="New Millennium Building Systems Logo"
            className="mr-4 md:hidden"
            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-[#2D4660] md:text-3xl">Admin Dashboard</h1>
            {currentUser && (
              <p className="text-sm text-gray-600 mt-1">
                Welcome, {currentUser.name}
                {(() => {
                  // Determine primary role based on actual roles
                  const primaryRole = isSystemAdmin ? 'system-admin' : isSessionAdmin ? 'product-owner' : 'stakeholder';
                  const primaryBadge = primaryRole === 'system-admin' ? (
                    <span className="inline-flex items-baseline text-[#C89212]">
                      <span className="inline-flex items-center"><Crown className="h-3.5 w-3.5" /></span>
                      <span className="ml-1 text-sm">System Admin</span>
                    </span>
                  ) : primaryRole === 'product-owner' ? (
                    <span className="inline-flex items-baseline text-[#576C71]">
                      <span className="inline-flex items-center"><Shield className="h-3.5 w-3.5" /></span>
                      <span className="ml-1 text-sm">Product Owner</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-baseline text-[#8B5A4A]">
                      <span className="inline-flex items-center"><UserIcon className="h-3.5 w-3.5" /></span>
                      <span className="ml-1 text-sm">Stakeholder</span>
                    </span>
                  );
                  
                  // Determine current view role based on adminPerspective
                  const currentViewRole = effectiveIsSystemAdmin ? 'system-admin' : effectiveIsSessionAdmin ? 'product-owner' : 'stakeholder';
                  
                  // If view mode matches primary role, just show primary role
                  if (currentViewRole === primaryRole) {
                    return (
                      <span className="text-sm text-gray-600">
                        , {primaryBadge}
                      </span>
                    );
                  }
                  
                  // Otherwise show primary role + "viewing this page as" + view role
                  const viewingAsBadge = currentViewRole === 'system-admin' ? (
                    <span className="inline-flex items-baseline text-[#C89212]">
                      <span className="inline-flex items-center"><Crown className="h-3.5 w-3.5" /></span>
                      <span className="ml-1 text-sm">System Admin</span>
                    </span>
                  ) : currentViewRole === 'product-owner' ? (
                    <span className="inline-flex items-baseline text-[#576C71]">
                      <span className="inline-flex items-center"><Shield className="h-3.5 w-3.5" /></span>
                      <span className="ml-1 text-sm">Product Owner</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-baseline text-[#8B5A4A]">
                      <span className="inline-flex items-center"><UserIcon className="h-3.5 w-3.5" /></span>
                      <span className="ml-1 text-sm">Stakeholder</span>
                    </span>
                  );
                  
                  return (
                    <span className="text-sm text-gray-600">
                      , {primaryBadge}
                      <span className="md:inline hidden">, </span>
                      <span className="whitespace-nowrap md:inline inline-block">
                        <span className="md:hidden">, </span>
                        viewing this page as a {viewingAsBadge}
                      </span>
                    </span>
                  );
                })()}
              </p>
            )}
          </div>
        </div>
        
        <div ref={mobileMenuRef} className="relative z-40">
          {/* Desktop buttons */}
          <div className="hidden md:flex space-x-2">
          {votingSession.isActive && (
          <button 
            onClick={onShowVoterView} 
            className="flex items-center px-4 py-2 bg-[#576C71] text-white rounded-lg hover:bg-[#1E5461] transition-colors"
          >
            <Vote className="mr-2 h-[26px] w-[26px]" />
              Vote!
          </button>
          )}
          <button 
            onClick={() => navigate(effectiveIsSystemAdmin || effectiveIsSessionAdmin ? `/users?perspective=${adminPerspective}&filter=all` : '/users?filter=stakeholder')} 
            className="flex items-center px-4 py-2 bg-[#2D4660] text-white rounded-lg hover:bg-[#173B65] transition-colors"
          >
            {effectiveIsSystemAdmin || effectiveIsSessionAdmin ? (
              <Shield className="mr-2 h-4 w-4" />
            ) : (
              <Users className="mr-2 h-4 w-4" />
            )}
              {effectiveIsSystemAdmin || effectiveIsSessionAdmin ? 'User Management' : 'Stakeholders'}
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
            className="flex items-center justify-center p-2 w-10 h-10 bg-[#576C71] text-white rounded-lg hover:bg-[#1E5461] transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
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
                  <Vote className="h-[26px] w-[26px] mr-2 text-gray-700" />
                  Vote!
                </button>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate(effectiveIsSystemAdmin || effectiveIsSessionAdmin ? `/users?perspective=${adminPerspective}&filter=all` : '/users?filter=stakeholder'); }}
                  className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                >
                  {effectiveIsSystemAdmin || effectiveIsSessionAdmin ? (
                    <Shield className="h-4 w-4 mr-2 text-gray-700" />
                  ) : (
                    <Users className="h-4 w-4 mr-2 text-gray-700" />
                  )}
                  {effectiveIsSystemAdmin || effectiveIsSessionAdmin ? 'User Management' : 'Stakeholders'}
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
                  className="w-full px-3 py-2 flex items-center justify-center hover:bg-gray-50"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4 text-gray-700" />
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
            onClick={(e) => {
              const productId = (votingSession as any).product_id || (votingSession as any).productId;
              if (!productId) return;
              e.stopPropagation();
              e.preventDefault();
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
            <button
              onClick={handleManageAdmins}
              className="relative inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#576C71] text-white hover:bg-[#1E5461]"
            >
              <Shield className="h-4 w-4 mr-2" />
              Admins
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 z-10">
                {adminCount}
              </span>
            </button>
            <button
              onClick={handleManageStakeholders}
              className="relative inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[#1E5461] text-white hover:bg-[#576C71]"
            >
              <Users className="h-4 w-4 mr-2" />
              Stakeholders
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 z-10">
                {stakeholderCount}
              </span>
            </button>
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
                  <button
                    onClick={(e) => { setSessionActionsMenuOpen(false); handleManageAdmins(e); }}
                    className="relative w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                  >
                    <Shield className="h-4 w-4 mr-2 text-gray-700" />
                    Admins
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 z-10">
                      {adminCount}
                    </span>
                  </button>
                  <button
                    onClick={(e) => { setSessionActionsMenuOpen(false); handleManageStakeholders(e); }}
                    className="relative w-full px-3 py-2 flex items-center text-left hover:bg-gray-50"
                  >
                    <Users className="h-4 w-4 mr-2 text-gray-700" />
                    Stakeholders
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 z-10">
                      {stakeholderCount}
                    </span>
                  </button>
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
            {isPlaceholderDate(votingSession.startDate) || isPlaceholderDate(votingSession.endDate) ? (
              <p className="text-gray-400 italic">Dates not set</p>
            ) : (
              <p className={`text-[#2D4660] font-medium ${votingSession.originalEndDate ? 'line-through text-gray-400' : ''}`}>
                {formatDate(votingSession.startDate)} - {formatDate(votingSession.originalEndDate || votingSession.endDate)}
              </p>
            )}
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
        {(votingSession.goal && votingSession.goal.trim()) || statusNotesDisplay.length > 0 ? (
          <div className="pt-3">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {votingSession.goal && votingSession.goal.trim() && (
                <div className="flex-[2] relative overflow-hidden rounded-2xl border border-[#C89212]/30 bg-gradient-to-r from-[#FFF6E3] via-[#FFF9ED] to-white shadow-sm p-5 md:p-6">
                  <span className="pointer-events-none absolute -top-10 left-4 h-32 w-32 rounded-full bg-[#C89212]/25 blur-3xl" />
                  <span className="pointer-events-none absolute -bottom-16 right-6 h-40 w-40 rounded-full bg-[#F4C66C]/20 blur-3xl" />
                  <span className="pointer-events-none absolute top-6 right-10 text-[#F4B400] text-xl animate-ping">✶</span>
                  <span className="pointer-events-none absolute bottom-8 left-10 text-[#C89212] text-lg animate-pulse">✦</span>

                  <div className="relative flex items-start gap-5">
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
              )}
              
              {statusNotesDisplay.length > 0 && (
                <div className="flex-[1] rounded-xl border border-white/70 bg-white/80 backdrop-blur-sm shadow-inner p-4">
                  {(statusNotesDisplay.length === 1 || statusNotesDisplay.length > 2) && (
                    <div className="flex items-center justify-between mb-3">
                      {statusNotesDisplay.length === 1 && (
                        <h3 className="text-sm font-semibold text-[#2D4660]">Status Notes</h3>
                      )}
                      {statusNotesDisplay.length > 2 && (
                        <span className="inline-flex items-center justify-between text-xs text-[#1E5461] w-[90px] ml-auto">
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
                  )}

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
                </div>
              )}
            </div>
          </div>
        ) : null}
        </div>
      </div>

      {/* Azure DevOps Integration */}
      <div className="relative bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-0">
          <div className="flex items-center pb-[20px]">
            <img
              src={AZURE_DEVOPS_ICON}
              alt="Azure DevOps logo"
              className="h-5 w-5 mr-2"
            />
            <h2 className="text-xl font-semibold text-[#2D4660]">Azure DevOps Integration</h2>
          </div>
          {azureDevOpsConfig.enabled && (
            <button
              onClick={onDisconnectAzureDevOps}
              className="text-sm text-[#591D0F] hover:text-[#6A4234] font-medium flex items-center flex-shrink-0 pr-[10px] mb-[-15px]"
            >
              <X className="h-4 w-4 mr-1" />
              Disconnect
            </button>
          )}
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
              onClick={() => handleConnect('newmill', selectedProjects[0] || projectOptions[0] || 'Product')}
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
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="font-medium text-green-900">Connected to Azure DevOps</span>
                  <span className="text-green-500">•</span>
                  <span className="text-sm text-green-700 whitespace-nowrap">
                    <span className="font-medium">Organization:</span> {azureDevOpsConfig.organization}
                  </span>
                  <span className="text-green-500">•</span>
                  <span className="text-sm text-green-700 font-medium whitespace-nowrap">Project:</span>
                  <div className="min-w-[150px]">
                    <MultiSelectDropdown
                      options={projectOptions}
                      value={selectedProjects}
                      onChange={handleProjectChange}
                      placeholder="Select projects..."
                    />
                  </div>
                </div>
                <div className="flex items-start mt-1">
                  {azureDevOpsConfig.lastSyncTime && (
                    <div className="text-sm text-green-700 ml-7 mt-[-5px]">
                      <span className="font-medium">Last Sync:</span> {formatDate(azureDevOpsConfig.lastSyncTime)}
                    </div>
                  )}
                  <div className="text-xs text-green-700 ml-[300px]">
                    Switching projects will clear the filters below.
                  </div>
                </div>
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
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#1E5461]/10 text-[#1E5461] text-sm font-medium">
              {suggestedFeatures.length} {suggestedFeatures.length === 1 ? 'suggestion' : 'suggestions'}
            </span>
            {suggestedFeatures.length > 1 && (
              <Button
                variant="gold"
                onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                className="text-xs px-3 py-1 flex items-center gap-1"
              >
                {showAllSuggestions ? (
                  <>
                    <Minus className="h-3.5 w-3.5" />
                    Show Less
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Show All
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {suggestedFeatures.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500 text-sm">
            No feature suggestions have been submitted yet. Encourage voters to use the "Suggest a Feature" button in the voting experience.
          </div>
        ) : (
          <div className={`space-y-4 pr-1 ${showAllSuggestions ? '' : 'max-h-[360px] overflow-y-auto'}`}>
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

                    {/* Attachments Section */}
                    {suggestion.attachment_urls && suggestion.attachment_urls.length > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Paperclip className="h-4 w-4 text-[#2D4660]" />
                          <p className="text-sm font-semibold text-[#2D4660]">Attachments ({suggestion.attachment_urls.length})</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {suggestion.attachment_urls.map((url, index) => {
                            const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                            const isPDF = url.match(/\.pdf$/i);
                            const fileName = url.split('/').pop() || `attachment-${index + 1}`;
                            
                            return (
                              <div
                                key={index}
                                className="relative group border border-gray-300 rounded-md overflow-hidden"
                                style={{ width: '120px', height: '120px' }}
                              >
                                {isImage ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full h-full"
                                  >
                                    <img
                                      src={url}
                                      alt={fileName}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ) : isPDF ? (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full h-full flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors"
                                  >
                                    <Paperclip className="h-10 w-10 text-red-600" />
                                  </a>
                                ) : (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full h-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                                  >
                                    <Paperclip className="h-8 w-8 text-gray-600" />
                                  </a>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1.5 truncate">
                                  {fileName.length > 18 ? `${fileName.substring(0, 18)}...` : fileName}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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

        <div className="w-full overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="sticky left-0 top-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-30">Title</th>
                <th scope="col" className="sticky top-0 bg-gray-50 hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-20">Type</th>
                <th scope="col" className="sticky top-0 bg-gray-50 hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-20">Epic</th>
                <th scope="col" className="sticky top-0 bg-gray-50 hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-20">State</th>
                <th scope="col" className="sticky top-0 bg-gray-50 hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-20">Area Path</th>
                <th scope="col" className="sticky top-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-20">Votes</th>
                <th scope="col" className="sticky top-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-20">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {features.map((feature) => (
                <tr 
                  key={feature.id} 
                  className="align-top group hover:bg-gray-50 bg-white"
                  onMouseEnter={() => {
                    if (!openFeatureDropdown) {
                      setHoveredFeatureId(feature.id);
                    }
                  }}
                  onMouseLeave={() => setHoveredFeatureId(null)}
                >
                  <td className="sticky left-0 bg-white group-hover:bg-gray-50 px-4 py-3 z-10">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{feature.title}</div>
                        {feature.description && feature.description.trim() && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {feature.description.replace(/<[^>]*>/g, '').substring(0, 100)}
                            {feature.description.replace(/<[^>]*>/g, '').length > 100 ? '...' : ''}
                          </div>
                        )}
                        
                        {/* Attachment Thumbnails */}
                        {feature.attachmentUrls && feature.attachmentUrls.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {feature.attachmentUrls.map((url, index) => {
                              const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                              const isPDF = url.match(/\.pdf$/i);
                              
                              return (
                                <div
                                  key={index}
                                  className="relative group/thumb border border-gray-300 rounded overflow-hidden cursor-pointer hover:border-[#C89212] transition-colors"
                                  style={{ width: '40px', height: '40px' }}
                                  onClick={() => setViewingAttachment(url)}
                                >
                                  {isImage ? (
                                    <img
                                      src={url}
                                      alt={`Attachment ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : isPDF ? (
                                    <div className="w-full h-full flex items-center justify-center bg-red-50">
                                      <Paperclip className="h-4 w-4 text-red-600" />
                                    </div>
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                      <Paperclip className="h-4 w-4 text-gray-600" />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFeatureAttachment(feature, url);
                                    }}
                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center"
                                    style={{ width: '16px', height: '16px' }}
                                    title="Remove attachment"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {feature.tags && feature.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1 items-center">
                            {feature.tags.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="inline-flex items-center px-1.5 py-0.5 text-xs bg-[#C89212]/10 text-[#C89212] rounded border border-[#C89212]/30">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                            {feature.tags.length > 3 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-xs bg-[#C89212]/10 text-[#C89212] rounded border border-[#C89212]/30">
                                <Tag className="h-3 w-3 mr-1" />
                                +{feature.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 align-middle">
                    {(() => {
                      const workItemType = feature.workItemType || (feature as any).work_item_type;
                      const typeInfo = getWorkItemTypeIcon(workItemType);
                      
                      if (typeInfo && feature.azureDevOpsId) {
                        const IconComponent = typeInfo.icon;
                        // Convert hex color to RGB for opacity
                        const hexToRgb = (hex: string) => {
                          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                          return result ? {
                            r: parseInt(result[1], 16),
                            g: parseInt(result[2], 16),
                            b: parseInt(result[3], 16)
                          } : null;
                        };
                        const rgb = hexToRgb(typeInfo.color);
                        const bgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` : `${typeInfo.color}20`;
                        const hoverBgColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)` : `${typeInfo.color}40`;
                        
                        return (
                          <a
                            href={feature.azureDevOpsUrl || ''}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer border"
                            style={{
                              backgroundColor: bgColor,
                              color: typeInfo.color,
                              borderColor: typeInfo.color
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = hoverBgColor;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = bgColor;
                            }}
                            title="View in Azure DevOps"
                          >
                            <IconComponent className="h-3 w-3 mr-1" style={{ color: typeInfo.color }} />
                            {feature.azureDevOpsId.replace(/^ado-/, '#')}
                          </a>
                        );
                      } else if (workItemType && feature.azureDevOpsId) {
                        return (
                          <a
                            href={feature.azureDevOpsUrl || ''}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#492434]/10 text-[#492434] hover:bg-[#492434]/20 cursor-pointer border border-[#492434]/30"
                            title="View in Azure DevOps"
                          >
                            <span className="mr-1 text-xs">{workItemType}</span>
                            {feature.azureDevOpsId.replace(/^ado-/, '#')}
                          </a>
                        );
                      } else if (typeInfo) {
                        const IconComponent = typeInfo.icon;
                        return (
                          <div className="flex items-center gap-1">
                            <IconComponent className="w-4 h-4" style={{ color: typeInfo.color }} />
                            {feature.azureDevOpsId && (
                              <span className="text-xs text-gray-600">{feature.azureDevOpsId.replace(/^ado-/, '#')}</span>
                            )}
                          </div>
                        );
                      } else if (workItemType) {
                        return (
                          <span className="px-2 py-1 text-xs font-medium bg-[#492434]/10 text-[#492434] rounded">
                            {workItemType}
                          </span>
                        );
                      }
                      return <span className="text-gray-400 text-xs">-</span>;
                    })()}
                  </td>
                  <td className={`hidden md:table-cell px-4 py-3 align-middle ${feature.epic || (feature.workItemType && feature.workItemType.toLowerCase() === 'epic') ? 'w-64' : 'w-32'}`} onMouseEnter={(e) => e.stopPropagation()} onMouseLeave={(e) => e.stopPropagation()}>
                    {feature.workItemType && feature.workItemType.toLowerCase() === 'epic' ? (
                      <span className="text-xs text-gray-600 italic">This Work Item is an Epic</span>
                    ) : feature.epic ? (
                      feature.epicId ? (
                        <a
                          href={`https://dev.azure.com/${azureDevOpsConfig.organization}/${azureDevOpsConfig.project}/_workitems/edit/${feature.epicId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-block w-full"
                        >
                          <EpicTag 
                            name={feature.epic} 
                            epicId={String(feature.epicId)}
                            description={feature.description}
                            className="hover:opacity-80" 
                          />
                        </a>
                      ) : (
                        <EpicTag 
                          name={feature.epic} 
                          description={feature.description}
                        />
                      )
                    ) : (
                      <span className="text-xs text-gray-400 italic">no Epic assigned</span>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-4 py-3 align-middle">
                    {feature.state && (
                      <span className="px-2 py-1 text-xs font-medium bg-[#1E5461]/10 text-[#1E5461] rounded">
                        {feature.state}
                      </span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-sm">
                    <div className="text-gray-600">
                      {feature.areaPath && typeof feature.areaPath === 'string' && feature.areaPath.trim() !== '' ? (
                        <div className="max-w-xs break-words text-xs">{feature.areaPath}</div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{feature.votes}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center justify-end feature-actions-dropdown-container">
                      <div className="relative inline-block">
                        {((hoveredFeatureId === feature.id && !openFeatureDropdown) || openFeatureDropdown === feature.id) && (
                          <button
                            onClick={() => setOpenFeatureDropdown(openFeatureDropdown === feature.id ? null : feature.id)}
                            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                            title="Feature actions"
                          >
                            <MoreVertical className="h-5 w-5 text-gray-600" />
                          </button>
                        )}
                        
                        {/* Dropdown menu */}
                        {openFeatureDropdown === feature.id && (
                          <div 
                            className="absolute right-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-visible"
                            style={{ 
                              zIndex: 1000,
                              top: 'auto',
                              bottom: 'auto',
                              marginTop: '0.25rem',
                              maxHeight: 'calc(100vh - 100px)',
                              overflowY: 'auto'
                            }}
                          >
                            <div>
                              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                                Feature Actions
                              </div>
                              
                              <button
                                onClick={() => {
                                  setEditingFeature(feature);
                                  setOpenFeatureDropdown(null);
                                }}
                                className="w-full px-4 py-3 text-left flex items-center hover:bg-blue-50 text-[#2D4660] transition-colors cursor-pointer"
                              >
                                <Edit className="h-5 w-5 mr-3 flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-base">Edit Feature</div>
                                  <div className="text-xs text-gray-500">Modify feature details</div>
                                </div>
                              </button>
                              
                              <button
                                onClick={() => {
                                  openAttachmentModal(feature);
                                  setOpenFeatureDropdown(null);
                                }}
                                className="w-full px-4 py-3 text-left flex items-center hover:bg-green-50 text-green-700 border-t border-gray-200 transition-colors cursor-pointer"
                              >
                                <Paperclip className="h-5 w-5 mr-3 flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-base">Add Attachment</div>
                                  <div className="text-xs text-gray-500">Upload a file</div>
                                </div>
                              </button>
                              
                              <button
                                onClick={() => {
                                  onDeleteFeature(feature.id);
                                  setOpenFeatureDropdown(null);
                                }}
                                className="w-full px-4 py-3 text-left flex items-center hover:bg-red-50 text-red-700 border-t border-gray-200 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-5 w-5 mr-3 flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-base">Delete Feature</div>
                                  <div className="text-xs text-gray-500">Remove from session</div>
                                </div>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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
          
          {/* Attachments Section */}
          {editAttachments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
              <div className="flex flex-wrap gap-3">
                {editAttachments.map((url, index) => {
                  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const isPDF = url.match(/\.pdf$/i);
                  const fileName = url.split('/').pop() || `attachment-${index + 1}`;
                  
                  return (
                    <div
                      key={index}
                      className="relative group border border-gray-300 rounded-md overflow-hidden"
                      style={{ width: '120px', height: '120px' }}
                    >
                      {isImage ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-full"
                        >
                          <img
                            src={url}
                            alt={fileName}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ) : isPDF ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-full flex items-center justify-center bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <Paperclip className="h-10 w-10 text-red-600" />
                        </a>
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <Paperclip className="h-8 w-8 text-gray-600" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditAttachments(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        style={{ width: '20px', height: '20px' }}
                        disabled={isSavingSuggestion}
                        aria-label={`Remove ${fileName}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1.5 truncate">
                        {fileName.length > 18 ? `${fileName.substring(0, 18)}...` : fileName}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">Click the X icon on hover to remove attachments</p>
            </div>
          )}
          
          {editError && (
            <div className="bg-[#591D0F]/5 border border-[#591D0F]/20 text-[#591D0F] text-sm rounded-md px-3 py-2">
              {editError}
            </div>
          )}
          <div className="flex justify-end gap-2">
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

      <PreviewFeaturesModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        previewFeatures={previewFeatures}
        onConfirmSync={onConfirmSync}
        onReplaceAll={onReplaceAll}
        isFetching={isFetchingAzureDevOps}
        config={azureDevOpsConfig}
      />

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
                      src={colorPickerIcon} 
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

      {/* Add Attachment Modal */}
      <Modal
        isOpen={showAttachmentModal}
        onClose={closeAttachmentModal}
        title={`Add Attachment - ${featureToAttach?.title || ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Upload images or PDF files to attach to this feature (maximum 3 files).
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach Images or PDFs (optional, up to 3)
            </label>
            <input
              ref={attachmentFileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={handleFileSelect}
              disabled={isUploadingAttachment || attachmentFiles.length >= 3}
              className="hidden"
              id="attachment-file-input"
            />
            <label
              htmlFor="attachment-file-input"
              className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md cursor-pointer ${
                isUploadingAttachment || attachmentFiles.length >= 3
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              {attachmentFiles.length >= 3 ? 'Maximum 3 files' : 'Attach Files'}
            </label>
            
            {attachmentFiles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {attachmentFiles.map((file, index) => {
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

          {attachmentError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
              {attachmentError}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="secondary"
              onClick={closeAttachmentModal}
              disabled={isUploadingAttachment}
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={handleSubmitAttachment}
              disabled={isUploadingAttachment || attachmentFiles.length === 0}
            >
              {isUploadingAttachment ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Attachment Viewer Modal */}
      {viewingAttachment && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingAttachment(null)}
        >
          <button
            onClick={() => setViewingAttachment(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            title="Close"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="max-w-7xl max-h-full w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {viewingAttachment.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img
                src={viewingAttachment}
                alt="Attachment"
                className="max-w-full max-h-full object-contain"
              />
            ) : viewingAttachment.match(/\.pdf$/i) ? (
              <iframe
                src={viewingAttachment}
                className="w-full h-full bg-white"
                title="PDF Viewer"
              />
            ) : (
              <div className="text-white text-center">
                <Paperclip className="h-16 w-16 mx-auto mb-4" />
                <p className="mb-4">Unable to preview this file type</p>
                <a
                  href={viewingAttachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C89212] hover:text-[#A07810] underline"
                >
                  Open in new tab
                </a>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;