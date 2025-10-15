import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Filter, Code, Save, Upload, Download, CheckSquare, Square, Trash2, Eye } from 'lucide-react';

interface FilterState {
  workItemTypes: string[];
  states: string[];
  assignedTo: string;
  areaPaths: string[];
  tags: string[];
  dateRange: string;
}

interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  wiql: string;
  isCustom?: boolean;
}

interface WorkItem {
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  workItemType: string;
  priority?: number;
  tags?: string;
  url: string;
}

const FeatureFilterPanel = () => {
  const [activeTemplate, setActiveTemplate] = useState<string>('');
  const [showSmartFilters, setShowSmartFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customWiql, setCustomWiql] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryResults, setQueryResults] = useState<WorkItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [savedQueries, setSavedQueries] = useState<QueryTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newQueryName, setNewQueryName] = useState('');
  const [newQueryDescription, setNewQueryDescription] = useState('');
  
  const [filters, setFilters] = useState<FilterState>({
    workItemTypes: ['Feature'],
    states: [],
    assignedTo: '',
    areaPaths: [],
    tags: [],
    dateRange: 'all'
  });

  // Default templates
  const defaultTemplates: QueryTemplate[] = [
    {
      id: 'my-active-features',
      name: 'My Active Features',
      description: 'Features assigned to me that are active',
      wiql: `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' AND [System.AssignedTo] = @Me AND [System.State] = 'Active' ORDER BY [System.ChangedDate] DESC`
    },
    {
      id: 'voting-eligible',
      name: 'Voting Eligible Features',
      description: 'Features ready for stakeholder voting',
      wiql: `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' AND [System.Tags] CONTAINS 'voting-eligible' AND [System.State] IN ('New', 'Active') ORDER BY [System.Priority] ASC`
    },
    {
      id: 'dashboard-2026',
      name: '2026 Dashboard Features',
      description: 'All features for the 2026 Dashboard initiative',
      wiql: `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' AND [System.Tags] CONTAINS '2026-dashboard' ORDER BY [System.CreatedDate] DESC`
    },
    {
      id: 'high-priority',
      name: 'High Priority Items',
      description: 'Priority 1 and 2 features across all projects',
      wiql: `SELECT [System.Id], [System.Title], [System.Priority] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' AND [Microsoft.VSTS.Common.Priority] <= 2 ORDER BY [Microsoft.VSTS.Common.Priority] ASC`
    },
    {
      id: 'recent-changes',
      name: 'Recently Updated',
      description: 'Features changed in the last 7 days',
      wiql: `SELECT [System.Id], [System.Title], [System.ChangedDate] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' AND [System.ChangedDate] >= @Today - 7 ORDER BY [System.ChangedDate] DESC`
    }
  ];

  const workItemTypeOptions = ['Feature', 'User Story', 'Bug', 'Task', 'Epic'];
  const stateOptions = ['New', 'Active', 'Resolved', 'Closed'];
  const areaPathOptions = [
    'New Millennium Building Systems\\Engineering',
    'New Millennium Building Systems\\Operations',
    'New Millennium Building Systems\\Purchasing'
  ];
  const tagOptions = ['voting-eligible', '2026-dashboard', 'canary-project', 'stakeholder-priority'];
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Load saved queries from Supabase on mount
  useEffect(() => {
    loadSavedQueries();
  }, []);

  const loadSavedQueries = async () => {
    try {
      // TODO: Replace with actual Supabase call
      // const { data, error } = await supabase
      //   .from('saved_queries')
      //   .select('*')
      //   .eq('user_id', currentUserId);
      
      // Simulated saved queries for demo
      const mockSavedQueries: QueryTemplate[] = [
        {
          id: 'custom-1',
          name: 'RED Tool Features',
          description: 'Features related to RED Tool Management',
          wiql: `SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Feature' AND [System.Tags] CONTAINS 'red-tool'`,
          isCustom: true
        }
      ];
      
      setSavedQueries(mockSavedQueries);
      console.log('Loaded saved queries from Supabase');
    } catch (error) {
      console.error('Error loading saved queries:', error);
    }
  };

  const saveQueryToSupabase = async () => {
    if (!newQueryName.trim() || !customWiql.trim()) {
      alert('Please provide a query name and WIQL');
      return;
    }

    try {
      const newQuery: QueryTemplate = {
        id: `custom-${Date.now()}`,
        name: newQueryName,
        description: newQueryDescription,
        wiql: customWiql,
        isCustom: true
      };

      // TODO: Replace with actual Supabase call
      // const { data, error } = await supabase
      //   .from('saved_queries')
      //   .insert([{
      //     user_id: currentUserId,
      //     name: newQueryName,
      //     description: newQueryDescription,
      //     wiql: customWiql,
      //     created_at: new Date().toISOString()
      //   }]);

      setSavedQueries([...savedQueries, newQuery]);
      setShowSaveDialog(false);
      setNewQueryName('');
      setNewQueryDescription('');
      
      console.log('Saved query to Supabase:', newQuery);
      alert('Query saved successfully!');
    } catch (error) {
      console.error('Error saving query:', error);
      alert('Failed to save query');
    }
  };

  const deleteQuery = async (queryId: string) => {
    if (!confirm('Are you sure you want to delete this saved query?')) {
      return;
    }

    try {
      // TODO: Replace with actual Supabase call
      // const { error } = await supabase
      //   .from('saved_queries')
      //   .delete()
      //   .eq('id', queryId);

      setSavedQueries(savedQueries.filter(q => q.id !== queryId));
      console.log('Deleted query:', queryId);
    } catch (error) {
      console.error('Error deleting query:', error);
    }
  };

  const executeAzureDevOpsQuery = async (wiql: string) => {
    setLoading(true);
    try {
      // TODO: Replace with actual Azure DevOps API call
      // const response = await fetch(
      //   `https://dev.azure.com/{organization}/{project}/_apis/wit/wiql?api-version=7.0`,
      //   {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       'Authorization': `Bearer ${accessToken}`
      //     },
      //     body: JSON.stringify({ query: wiql })
      //   }
      // );
      // const data = await response.json();

      // Simulated results for demo
      const mockResults: WorkItem[] = [
        {
          id: 12345,
          title: '2026 Dashboard - Revenue Analytics Widget',
          state: 'Active',
          assignedTo: 'Dave Hoffman',
          workItemType: 'Feature',
          priority: 1,
          tags: '2026-dashboard; voting-eligible',
          url: 'https://dev.azure.com/nmbs/_workitems/edit/12345'
        },
        {
          id: 12346,
          title: 'Feature Voting System - Stakeholder Portal',
          state: 'Active',
          assignedTo: 'Dave Hoffman',
          workItemType: 'Feature',
          priority: 2,
          tags: 'voting-eligible; stakeholder-priority',
          url: 'https://dev.azure.com/nmbs/_workitems/edit/12346'
        },
        {
          id: 12347,
          title: 'RED Tool Management - Equipment Tracking',
          state: 'New',
          assignedTo: 'Dave Hoffman',
          workItemType: 'Feature',
          priority: 2,
          tags: 'red-tool; canary-project',
          url: 'https://dev.azure.com/nmbs/_workitems/edit/12347'
        },
        {
          id: 12348,
          title: 'Purchasing Portal Dashboard Redesign',
          state: 'Active',
          assignedTo: 'Chris Rodes',
          workItemType: 'Feature',
          priority: 1,
          tags: '2026-dashboard',
          url: 'https://dev.azure.com/nmbs/_workitems/edit/12348'
        }
      ];

      setQueryResults(mockResults);
      console.log('Query executed successfully, returned', mockResults.length, 'items');
    } catch (error) {
      console.error('Error executing query:', error);
      alert('Failed to execute query');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template: QueryTemplate) => {
    setActiveTemplate(template.id);
    setCustomWiql(template.wiql);
    setShowSmartFilters(false);
    executeAzureDevOpsQuery(template.wiql);
  };

  const buildWiqlFromFilters = (): string => {
    let conditions: string[] = [];
    
    if (filters.workItemTypes.length > 0) {
      if (filters.workItemTypes.length === 1) {
        conditions.push(`[System.WorkItemType] = '${filters.workItemTypes[0]}'`);
      } else {
        const types = filters.workItemTypes.map(t => `'${t}'`).join(', ');
        conditions.push(`[System.WorkItemType] IN (${types})`);
      }
    }
    
    if (filters.states.length > 0) {
      if (filters.states.length === 1) {
        conditions.push(`[System.State] = '${filters.states[0]}'`);
      } else {
        const states = filters.states.map(s => `'${s}'`).join(', ');
        conditions.push(`[System.State] IN (${states})`);
      }
    }
    
    if (filters.assignedTo) {
      conditions.push(`[System.AssignedTo] = ${filters.assignedTo}`);
    }
    
    if (filters.areaPaths.length > 0) {
      const areaConditions = filters.areaPaths.map(
        path => `[System.AreaPath] UNDER '${path}'`
      ).join(' OR ');
      conditions.push(`(${areaConditions})`);
    }
    
    if (filters.tags.length > 0) {
      filters.tags.forEach(tag => {
        conditions.push(`[System.Tags] CONTAINS '${tag}'`);
      });
    }
    
    if (filters.dateRange !== 'all') {
      const dateMap: { [key: string]: string } = {
        'today': '@Today',
        '7days': '@Today - 7',
        '30days': '@Today - 30'
      };
      if (dateMap[filters.dateRange]) {
        conditions.push(`[System.ChangedDate] >= ${dateMap[filters.dateRange]}`);
      }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo] FROM WorkItems ${whereClause} ORDER BY [System.ChangedDate] DESC`;
  };

  const handleApplyFilters = () => {
    const wiql = buildWiqlFromFilters();
    setCustomWiql(wiql);
    setActiveTemplate('custom');
    executeAzureDevOpsQuery(wiql);
  };

  const handleResetFilters = () => {
    setFilters({
      workItemTypes: ['Feature'],
      states: [],
      assignedTo: '',
      areaPaths: [],
      tags: [],
      dateRange: 'all'
    });
    setActiveTemplate('');
    setCustomWiql('');
    setQueryResults([]);
    setSelectedItems(new Set());
  };

  const toggleArrayFilter = (array: string[], value: string): string[] => {
    return array.includes(value) 
      ? array.filter(v => v !== value)
      : [...array, value];
  };

  const toggleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === queryResults.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(queryResults.map(item => item.id)));
    }
  };

  const exportToVotingSystem = async () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one feature to export');
      return;
    }

    const selectedFeatures = queryResults.filter(item => selectedItems.has(item.id));
    
    try {
      // TODO: Replace with actual Supabase call to voting system
      // const { data, error } = await supabase
      //   .from('voting_features')
      //   .insert(
      //     selectedFeatures.map(feature => ({
      //       work_item_id: feature.id,
      //       title: feature.title,
      //       description: '', // Fetch from ADO if needed
      //       state: feature.state,
      //       priority: feature.priority,
      //       tags: feature.tags,
      //       added_date: new Date().toISOString()
      //     }))
      //   );

      console.log('Exporting features to voting system:', selectedFeatures);
      alert(`Successfully exported ${selectedItems.size} feature(s) to the voting system!`);
      setSelectedItems(new Set());
    } catch (error) {
      console.error('Error exporting to voting system:', error);
      alert('Failed to export features');
    }
  };

  const exportToCSV = () => {
    const selectedFeatures = queryResults.filter(item => selectedItems.has(item.id));
    
    const headers = ['ID', 'Title', 'State', 'Assigned To', 'Type', 'Priority', 'Tags'];
    const csvContent = [
      headers.join(','),
      ...selectedFeatures.map(item => 
        [item.id, `"${item.title}"`, item.state, item.assignedTo, item.workItemType, item.priority || '', `"${item.tags || ''}"`].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `features-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    console.log('Exported to CSV:', selectedFeatures.length, 'features');
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Feature Filter Configuration</h2>
        </div>
        {queryResults.length > 0 && (
          <div className="text-sm text-gray-600">
            {queryResults.length} result{queryResults.length !== 1 ? 's' : ''} found
            {selectedItems.size > 0 && ` • ${selectedItems.size} selected`}
          </div>
        )}
      </div>

      {/* Quick Templates */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Quick Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {defaultTemplates.map(template => (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              className={`p-4 text-left border-2 rounded-lg transition-all ${
                activeTemplate === template.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="font-semibold text-gray-800">{template.name}</div>
              <div className="text-sm text-gray-600 mt-1">{template.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Queries */}
      {savedQueries.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-3">Saved Queries</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedQueries.map(query => (
              <div
                key={query.id}
                className={`p-4 border-2 rounded-lg transition-all ${
                  activeTemplate === query.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <button
                    onClick={() => handleTemplateClick(query)}
                    className="flex-1 text-left"
                  >
                    <div className="font-semibold text-gray-800">{query.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{query.description}</div>
                  </button>
                  <button
                    onClick={() => deleteQuery(query.id)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Filters Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowSmartFilters(!showSmartFilters)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <span className="font-semibold text-gray-800">Refine Results (Smart Filters)</span>
          {showSmartFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showSmartFilters && (
          <div className="mt-4 p-6 border-2 border-gray-200 rounded-lg bg-gray-50">
            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">Work Item Type</label>
              <div className="flex flex-wrap gap-2">
                {workItemTypeOptions.map(type => (
                  <button
                    key={type}
                    onClick={() => setFilters({
                      ...filters,
                      workItemTypes: toggleArrayFilter(filters.workItemTypes, type)
                    })}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      filters.workItemTypes.includes(type)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">State</label>
              <div className="flex flex-wrap gap-2">
                {stateOptions.map(state => (
                  <button
                    key={state}
                    onClick={() => setFilters({
                      ...filters,
                      states: toggleArrayFilter(filters.states, state)
                    })}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      filters.states.includes(state)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">Assigned To</label>
              <select
                value={filters.assignedTo}
                onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Anyone</option>
                <option value="@Me">Me</option>
                <option value="Dave Hoffman">Dave Hoffman</option>
                <option value="Chris Rodes">Chris Rodes</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">Area Path</label>
              <div className="space-y-2">
                {areaPathOptions.map(path => (
                  <label key={path} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.areaPaths.includes(path)}
                      onChange={() => setFilters({
                        ...filters,
                        areaPaths: toggleArrayFilter(filters.areaPaths, path)
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-700">{path}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFilters({
                      ...filters,
                      tags: toggleArrayFilter(filters.tags, tag)
                    })}
                    className={`px-3 py-1 rounded-full border-2 text-sm transition-all ${
                      filters.tags.includes(tag)
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block font-semibold text-gray-700 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleApplyFilters}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Advanced WIQL Mode */}
      <div className="mb-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            <span className="font-semibold text-gray-800">Advanced (WIQL)</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
            <label className="block font-semibold text-gray-700 mb-2">Custom WIQL Query</label>
            <textarea
              value={customWiql}
              onChange={(e) => setCustomWiql(e.target.value)}
              placeholder="Enter your custom WIQL query..."
              className="w-full h-32 p-3 border-2 border-gray-300 rounded-lg font-mono text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex gap-3 mt-3">
              <button
                onClick={() => {
                  setActiveTemplate('custom');
                  executeAzureDevOpsQuery(customWiql);
                }}
                className="bg-green-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Execute Query
              </button>
              <button
                onClick={() => setShowSaveDialog(true)}
                className="bg-purple-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Query
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Save Query</h3>
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Query Name</label>
                <input
                  type="text"
                  value={newQueryName}
                  onChange={(e) => setNewQueryName(e.target.value)}
                  placeholder="e.g., My Custom Feature Query"
                  className="w-full p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={newQueryDescription}
                  onChange={(e) => setNewQueryDescription(e.target.value)}
                  placeholder="Describe what this query does..."
                  className="w-full h-20 p-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveQueryToSupabase}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setNewQueryName('');
                    setNewQueryDescription('');
                  }}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Query Results */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading results...</p>
        </div>
      )}

      {!loading && queryResults.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Query Results</h3>
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                disabled={selectedItems.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={exportToVotingSystem}
                disabled={selectedItems.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Add to Voting System
              </button>
            </div>
          </div>

          <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2">
                      {selectedItems.size === queryResults.length ? 
                        <CheckSquare className="w-5 h-5 text-blue-600" /> : 
                        <Square className="w-5 h-5 text-gray-400" />
                      }
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">State</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Assigned To</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Priority</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map(item => (
                  <tr key={item.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelectItem(item.id)}>
                        {selectedItems.has(item.id) ? 
                          <CheckSquare className="w-5 h-5 text-blue-600" /> : 
                          <Square className="w-5 h-5 text-gray-400" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {item.id}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-medium">{item.title}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        item.state === 'Active' ? 'bg-green-100 text-green-800' :
                        item.state === 'New' ? 'bg-blue-100 text-blue-800' :
                        item.state === 'Resolved' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.assignedTo}</td>
                    <td className="px-4 py-3 text-sm">{item.workItemType}</td>
                    <td className="px-4 py-3 text-sm">{item.priority || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureFilterPanel;