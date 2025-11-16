import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Save, Play, Plus, X, Code, Maximize2, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactSyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import apiService from '../../services/api';
import { Project, ApiEndpoint, ApiResponse } from '../../types';
import { HTTP_METHODS } from '../../utils/constants';
import { generateId } from '../../utils/helpers';
import { useTheme } from '../../context/ThemeContext';
import BackButton from '../../components/BackButton/BackButton';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';

/**
 * Visual Builder Component
 * Follows Single Responsibility Principle - handles visual API building
 */
const VisualBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const endpointId = searchParams.get('endpoint');
  const initialFolder = searchParams.get('folder') || '';
  
  const [project, setProject] = useState<Project | null>(null);
  const [endpoint, setEndpoint] = useState<ApiEndpoint | null>(null);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [showFullModal, setShowFullModal] = useState(false);
  const [modalTab, setModalTab] = useState<'body' | 'headers'>('body');
  const [folderSuggestions, setFolderSuggestions] = useState<string[]>([]);
  const { theme, toggleTheme } = useTheme();
  const [bodyText, setBodyText] = useState<string>('{}');
  const [showTestsModal, setShowTestsModal] = useState(false);
  const [showCurlModal, setShowCurlModal] = useState(false);
  const [curlText, setCurlText] = useState('');
  const [isApplyingCurl, setIsApplyingCurl] = useState(false);
  const [paramRows, setParamRows] = useState<Array<{ key: string; value: string }>>([]);
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'apiKey'>('none');
  const [authValue, setAuthValue] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('x-api-key');

  const loadProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiService.getProject(id);
      setProject(data);
    } catch (error: any) {
      toast.error('Failed to load project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (project && endpointId) {
      const found = project.endpoints.find(ep => ep.id === endpointId);
      if (found) {
        setEndpoint(found);
        const qp = found.queryParams || {};
        setParamRows(Object.entries(qp).map(([k, v]) => ({ key: k, value: String(v) })));
      }
    } else if (project && !endpointId) {
      // Create new endpoint
      setEndpoint({
        id: generateId(),
        name: 'New Endpoint',
        method: 'GET',
        url: '',
        headers: {},
        body: {},
        queryParams: {},
        folderPath: initialFolder,
        routePath: '',
      });
      setParamRows([]);
    }
    if (project) {
      const set = new Set<string>();
      project.endpoints.forEach(ep => {
        const fp = (ep as any).folderPath || '';
        if (fp && typeof fp === 'string') set.add(fp);
        // Also add parent paths for convenience
        if (fp.includes('/')) {
          const parts = fp.split('/').filter(Boolean);
          for (let i = 1; i <= parts.length; i++) {
            set.add(parts.slice(0, i).join('/'));
          }
        }
      });
      setFolderSuggestions(Array.from(set).sort());
    }
  }, [project, endpointId, initialFolder]);

  // Keep body editor text editable (not blocked by JSON parsing while typing)
  useEffect(() => {
    if (endpoint) {
      try {
        setBodyText(JSON.stringify(endpoint.body ?? {}, null, 2));
      } catch {
        setBodyText('{}');
      }
    }
  }, [endpoint]);

  // Load auth preset from localStorage per project
  useEffect(() => {
    if (!id) return;
    try {
      const raw = localStorage.getItem(`authPreset:${id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setAuthType(parsed.type || 'none');
        setAuthValue(parsed.value || '');
        setApiKeyHeader(parsed.apiKeyHeader || 'x-api-key');
      }
    } catch {}
  }, [id]);

  // Helper: sync paramRows to endpoint.queryParams
  const syncParamsToEndpoint = (rows: Array<{ key: string; value: string }>) => {
    const obj: Record<string, string> = {};
    rows.forEach(r => {
      if (r.key.trim()) obj[r.key.trim()] = r.value;
    });
    updateEndpoint({ queryParams: obj });
  };

  const addParamRow = () => {
    const rows = [...paramRows, { key: '', value: '' }];
    setParamRows(rows);
    syncParamsToEndpoint(rows);
  };

  const updateParamRow = (index: number, field: 'key' | 'value', value: string) => {
    const rows = paramRows.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    setParamRows(rows);
    syncParamsToEndpoint(rows);
  };

  const removeParamRow = (index: number) => {
    const rows = paramRows.filter((_, i) => i !== index);
    setParamRows(rows);
    syncParamsToEndpoint(rows);
  };

  // Simple cURL parser (best-effort)
  const parseCurl = (text: string) => {
    const result: { method?: string; url?: string; headers?: Record<string, string>; body?: any } = { headers: {} };
    const lines = text.replace(/\\\r?\n/g, ' ').split(/\s+/);
    let i = 0;
    while (i < lines.length) {
      const token = lines[i];
      if (!token) { i++; continue; }
      if (token.toLowerCase() === 'curl') { i++; continue; }
      if (token.startsWith('http')) {
        result.url = token.replace(/["']/g, '');
        i++; continue;
      }
      if (token === '-X' || token === '--request') {
        result.method = (lines[i+1] || 'GET').replace(/["']/g, '').toUpperCase();
        i += 2; continue;
      }
      if (token === '-H' || token === '--header') {
        const header = (lines[i+1] || '').replace(/^['"]|['"]$/g, '');
        const sep = header.indexOf(':');
        if (sep > -1) {
          const k = header.slice(0, sep).trim();
          const v = header.slice(sep + 1).trim();
          if (k) (result.headers as any)[k] = v;
        }
        i += 2; continue;
      }
      if (token === '--data' || token === '--data-raw' || token === '--data-binary' || token === '-d') {
        const data = (lines[i+1] || '');
        const cleaned = data.replace(/^['"]|['"]$/g, '');
        try {
          result.body = JSON.parse(cleaned);
        } catch {
          result.body = cleaned;
        }
        if (!result.method) result.method = 'POST';
        i += 2; continue;
      }
      i++;
    }
    if (!result.method) result.method = 'GET';
    return result;
  };

  const handleSave = async (): Promise<ApiEndpoint | null> => {
    if (!endpoint || !project) return null;

    if (!endpoint.url.trim()) {
      toast.error('URL is required');
      return null;
    }

    // Normalize empty fields before saving
    // Parse body from editor (only for methods that support a body)
    let parsedBody: any = endpoint.body ?? {};
    if (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') {
      try {
        parsedBody = bodyText?.trim() ? JSON.parse(bodyText) : {};
      } catch {
        toast.error('Body JSON is invalid');
        return null;
      }
    }

    const normalized: ApiEndpoint = {
      id: endpoint.id || generateId(),
      method: (endpoint.method || 'GET') as any,
      url: endpoint.url.trim(),
      name:
        endpoint.name && endpoint.name.trim()
          ? endpoint.name.trim()
          : `${(endpoint.method || 'GET').toUpperCase()} ${endpoint.url.trim()}`,
      folderPath: endpoint.folderPath ? endpoint.folderPath.trim() : '',
      routePath: endpoint.routePath ? endpoint.routePath.trim() : '',
      headers: endpoint.headers || {},
      body: parsedBody,
      queryParams: endpoint.queryParams || {}
    };

    try {
      if (endpointId) {
        // Update existing endpoint
        await apiService.updateEndpoint(id!, normalized.id, normalized);
        toast.success('Endpoint updated successfully');
        await loadProject();
        return normalized;
      } else {
        // Create new endpoint
        const saved = await apiService.addEndpoint(id!, normalized);
        toast.success('Endpoint created successfully');
        // Update URL to bind to the saved endpoint id for future actions
        setSearchParams({ endpoint: saved.id });
        setEndpoint(saved);
        await loadProject();
        return saved;
      }
    } catch (error: any) {
      toast.error('Failed to save endpoint');
      console.error(error);
      return null;
    }
  };

  const handleTest = async () => {
    if (!endpoint || !project) return;

    if (!endpoint.url.trim()) {
      toast.error('URL is required');
      return;
    }

    try {
      setTesting(true);
      const saved = await handleSave();
      if (!saved) {
        setTesting(false);
        return;
      }
      const testResponse = await apiService.testEndpoint(id!, saved.id);
      setResponse(testResponse);
      toast.success('Test completed');
    } catch (error: any) {
      toast.error('Test failed');
      if (error.response?.data?.data) {
        setResponse(error.response.data.data);
      }
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  const updateEndpoint = (updates: Partial<ApiEndpoint>) => {
    if (endpoint) {
      setEndpoint({ ...endpoint, ...updates });
    }
  };

  const addHeader = () => {
    if (endpoint) {
      const key = prompt('Header key:');
      if (key) {
        updateEndpoint({
          headers: { ...endpoint.headers, [key]: '' }
        });
      }
    }
  };

  const removeHeader = (key: string) => {
    if (endpoint && endpoint.headers) {
      const { [key]: _, ...rest } = endpoint.headers;
      updateEndpoint({ headers: rest });
    }
  };

  const updateHeader = (key: string, value: string) => {
    if (endpoint && endpoint.headers) {
      updateEndpoint({
        headers: { ...endpoint.headers, [key]: value }
      });
    }
  };

  if (loading || !endpoint) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumbs />
        <BackButton to={id ? `/app/project/${id}` : '/app'} />
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Visual API Builder</h1>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 mr-2" />
            {testing ? 'Testing...' : 'Test'}
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-500"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request</h2>
          
          {/* Method and URL */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={endpoint.name}
                onChange={(e) => updateEndpoint({ name: e.target.value })}
                placeholder="e.g., Get Breeds"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Folder (optional)
              </label>
              <input
                type="text"
                value={endpoint.folderPath || ''}
                onChange={(e) => updateEndpoint({ folderPath: e.target.value })}
                placeholder="e.g., Dogs/Public"
                list="folder-suggestions"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Use slashes to create nested folders.</p>
              <datalist id="folder-suggestions">
                {folderSuggestions.map((fp) => (
                  <option key={fp} value={fp} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Method
              </label>
              <select
                value={endpoint.method}
                onChange={(e) => updateEndpoint({ method: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                {HTTP_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={endpoint.url}
                  onChange={(e) => updateEndpoint({ url: e.target.value })}
                  placeholder="https://api.example.com/users"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  onClick={() => setShowCurlModal(true)}
                  className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                  title="Import from cURL"
                >
                  Import cURL
                </button>
              </div>
            </div>

            {/* Auth Preset */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Auth Preset
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                <select
                  value={authType}
                  onChange={(e) => setAuthType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="apiKey">API Key (header)</option>
                </select>
                {authType === 'apiKey' ? (
                  <input
                    type="text"
                    value={apiKeyHeader}
                    onChange={(e) => setApiKeyHeader(e.target.value)}
                    placeholder="Header name (e.g., x-api-key)"
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                ) : (
                  <div className="hidden md:block" />
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={authValue}
                    onChange={(e) => setAuthValue(e.target.value)}
                    placeholder={authType === 'bearer' ? 'Token' : 'Key value'}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={() => {
                      if (!id) return;
                      localStorage.setItem(`authPreset:${id}`, JSON.stringify({ type: authType, value: authValue, apiKeyHeader }));
                      toast.success('Auth preset saved');
                    }}
                    className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      if (!endpoint) return;
                      const next = { ...(endpoint.headers || {}) };
                      if (authType === 'bearer' && authValue) {
                        next['Authorization'] = `Bearer ${authValue}`;
                      } else if (authType === 'apiKey' && authValue) {
                        next[apiKeyHeader || 'x-api-key'] = authValue;
                      }
                      updateEndpoint({ headers: next });
                      toast.success('Auth applied to request');
                    }}
                    className="px-3 py-2 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-500"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Headers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Headers
                </label>
                <button
                  onClick={addHeader}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {endpoint.headers && Object.entries(endpoint.headers).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        if (!endpoint.headers) return;
                        const { [key]: _, ...rest } = endpoint.headers;
                        updateEndpoint({ headers: { ...rest, ...(newKey ? { [newKey]: value } : {}) } });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 dark:text-gray-100"
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateHeader(key, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={() => removeHeader(key)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Query Params */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Query Params
                </label>
                <button
                  onClick={addParamRow}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {paramRows.map((row, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateParamRow(idx, 'key', e.target.value)}
                      placeholder="key"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900 dark:text-gray-100"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateParamRow(idx, 'value', e.target.value)}
                      placeholder="value"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={() => removeParamRow(idx)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            {(endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Body (JSON)
                </label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}
          </div>
        </div>

        {/* Response Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Response</h2>
              {response && (
                <div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    className={`px-3 py-1 text-sm ${activeTab === 'body' ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
                    onClick={() => setActiveTab('body')}
                  >
                    Body
                  </button>
                  <button
                    className={`px-3 py-1 text-sm ${activeTab === 'headers' ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
                    onClick={() => setActiveTab('headers')}
                  >
                    Headers
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {response && (
                <button
                  onClick={() => {
                    setModalTab(activeTab);
                    setShowFullModal(true);
                  }}
                  className="p-2 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
                  title="Open full view"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              {response && response.headers && !endpoint?.headers?.['Accept'] && typeof response.headers['content-type'] === 'string' && (response.headers['content-type'] as string).includes('text/html') && (
                <button
                  onClick={() => updateEndpoint({ headers: { ...(endpoint?.headers || {}), Accept: 'application/json' } })}
                  className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  title="Add Accept: application/json"
                >
                  Add Accept header
                </button>
              )}
              <button
                onClick={async () => {
                  try {
                    if (!id) return;
                    const tests = await apiService.generateTestCases(id);
                    toast.success(`Generated ${tests.length} test cases`);
                  } catch (e) {
                    toast.error('Failed to generate test cases');
                  }
                }}
                className="text-xs px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-500"
                title="Generate test cases with AI"
              >
                Generate Tests
              </button>
            </div>
            {response && (
              <span
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  response.statusCode >= 200 && response.statusCode < 300
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                    : response.statusCode >= 400
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                }`}
              >
                {response.statusCode}
              </span>
            )}
          </div>

          {response ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Latency</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{response.responseTime}ms</span>
              </div>
              {activeTab === 'body' ? (
                <div className="min-h-[300px] max-h-[520px] border border-gray-200 dark:border-gray-700 rounded-md overflow-auto">
                  <div className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Body
                  </div>
                  <div className="p-0">
                    <ReactSyntaxHighlighter
                      language="json"
                      style={atomOneDark}
                      customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                    >
                      {JSON.stringify(response.body, null, 2)}
                    </ReactSyntaxHighlighter>
                  </div>
                </div>
              ) : (
                <div className="min-h-[300px] max-h-[520px] border border-gray-200 dark:border-gray-700 rounded-md overflow-auto">
                  <div className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Headers
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900">
                    {response.headers && Object.keys(response.headers).length > 0 ? (
                      Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="text-sm font-mono mb-1 break-words">
                          <span className="text-gray-700 dark:text-gray-300">{key}:</span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400">No headers</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Code className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-2" />
              <p>Click "Test" to execute the request</p>
            </div>
          )}
        </div>

      {/* Test Cases (for this endpoint) */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Test Cases</h2>
          <button
            onClick={() => setShowTestsModal(true)}
            className="p-2 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
            title="Open full view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-auto">
          {project?.testCases && project.testCases.filter(tc => tc.endpointId === endpoint.id).length > 0 ? (
            project.testCases
              .filter(tc => tc.endpointId === endpoint.id)
              .map(tc => (
                <div key={tc.id} className="flex items-center justify-between p-2 rounded border border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{tc.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(tc.createdAt as any).toLocaleString()}</div>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${tc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : tc.status === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {tc.status}
                  </span>
                </div>
              ))
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No test cases for this endpoint yet.</div>
          )}
        </div>
      </div>

        {/* Fullscreen Modal for Body/Headers */}
        {showFullModal && response && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowFullModal(false)} />
            <div className="relative w-[95vw] max-w-[1200px] h-[85vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Response Viewer</h3>
                  <div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      className={`px-3 py-1 text-sm ${modalTab === 'body' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
                      onClick={() => setModalTab('body')}
                    >
                      Body
                    </button>
                    <button
                      className={`px-3 py-1 text-sm ${modalTab === 'headers' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
                      onClick={() => setModalTab('headers')}
                    >
                      Headers
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      response.statusCode >= 200 && response.statusCode < 300
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                        : response.statusCode >= 400
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                    }`}
                  >
                    {response.statusCode}
                  </span>
                  <button
                    aria-label="Toggle theme"
                    onClick={toggleTheme}
                    className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Toggle theme"
                  >
                    {theme === 'light' ? <Moon className="w-4 h-4 text-gray-700" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                  </button>
                  <button
                    onClick={() => setShowFullModal(false)}
                    className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-0">
                {modalTab === 'body' ? (
                  <div className="h-full overflow-auto">
                    <ReactSyntaxHighlighter
                      language="json"
                      style={atomOneDark}
                      customStyle={{ margin: 0, padding: '1rem', background: 'transparent', minHeight: '100%' }}
                    >
                      {JSON.stringify(response.body, null, 2)}
                    </ReactSyntaxHighlighter>
                  </div>
                ) : (
                  <div className="h-full overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
                    {response.headers && Object.keys(response.headers).length > 0 ? (
                      Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="text-sm font-mono mb-1 break-words">
                          <span className="text-gray-700 dark:text-gray-300">{key}:</span>{' '}
                          <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400">No headers</div>
                    )}
                  </div>
                )}

      {/* Import cURL Modal */}
      {showCurlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCurlModal(false)} />
          <div className="relative w-[95vw] max-w-[900px] h-[70vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="text-base font-semibold text-gray-900 dark:text-white">Import from cURL</div>
              <button
                onClick={() => setShowCurlModal(false)}
                className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto">
              <textarea
                value={curlText}
                onChange={(e) => setCurlText(e.target.value)}
                placeholder="Paste a full cURL command here..."
                className="w-full h-full min-h-[280px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm"
              />
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-2">
              <button
                onClick={async () => {
                  try {
                    setIsApplyingCurl(true);
                    const parsed = parseCurl(curlText);
                    if (!endpoint) return;
                    const newHeaders = { ...(endpoint.headers || {}), ...(parsed.headers || {}) };
                    const newEndpoint: Partial<ApiEndpoint> = {
                      method: (parsed.method as any) || endpoint.method,
                      url: parsed.url || endpoint.url,
                      headers: newHeaders,
                      body: parsed.body !== undefined ? (typeof parsed.body === 'string' ? endpoint.body : parsed.body) : endpoint.body,
                    };
                    updateEndpoint(newEndpoint);
                    if (parsed.body !== undefined) {
                      setBodyText(typeof parsed.body === 'string' ? bodyText : JSON.stringify(parsed.body, null, 2));
                    }
                    toast.success('Imported from cURL');
                    setShowCurlModal(false);
                  } catch (e) {
                    toast.error('Failed to parse cURL');
                  } finally {
                    setIsApplyingCurl(false);
                  }
                }}
                className="px-4 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-60"
                disabled={isApplyingCurl || !curlText.trim()}
              >
                {isApplyingCurl ? 'Loading headers & payload…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Fullscreen Modal for Test Cases */}
      {showTestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTestsModal(false)} />
          <div className="relative w-[95vw] max-w-[1000px] h-[80vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Test Cases</h3>
              <button
                onClick={() => setShowTestsModal(false)}
                className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {project?.testCases && project.testCases.filter(tc => tc.endpointId === endpoint.id).length > 0 ? (
                <div className="space-y-3">
                  {project.testCases
                    .filter(tc => tc.endpointId === endpoint.id)
                    .map(tc => (
                      <div key={tc.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tc.name}</div>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${tc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : tc.status === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {tc.status}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Steps</div>
                            <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                              {tc.testSteps.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Expected</div>
                            <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1">
                              {tc.expectedResults.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Created: {new Date(tc.createdAt as any).toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400">No test cases for this endpoint.</div>
              )}
            </div>
          </div>
        </div>
      )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualBuilder;

