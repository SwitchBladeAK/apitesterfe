import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileCode, Play, Trash2, Edit2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { Project, ApiEndpoint } from '../../types';
import clsx from 'clsx';
import ReactSyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import BackButton from '../../components/BackButton/BackButton';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';

/**
 * Project Detail Component
 * Follows Single Responsibility Principle - displays project details
 */
const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [showSuiteModal, setShowSuiteModal] = useState(false);
  const [suiteProgress, setSuiteProgress] = useState<Array<{ id: string; name: string; status: 'pending' | 'running' | 'pass' | 'fail' }>>([]);
  const [paged, setPaged] = useState<{ items: any[]; total: number; page: number; limit: number; totalPages: number }>({
    items: [], total: 0, page: 1, limit: 10, totalPages: 1
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'endpoints' | 'graph'>('endpoints');
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [envDraft, setEnvDraft] = useState<Array<{ key: string; value: string }>>([]);
  const [isSavingEnv, setIsSavingEnv] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [historyEndpointId, setHistoryEndpointId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDiff, setHistoryDiff] = useState<{ a: any | null; b: any | null }>({ a: null, b: null });
  const [dndDraggingId, setDndDraggingId] = useState<string | null>(null);

  const [tTab, setTTab] = useState<'new' | 'previous'>('new');
  const [tPage, setTPage] = useState(1);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genCount, setGenCount] = useState(5);
  const [lastGeneratedIds, setLastGeneratedIds] = useState<Set<string>>(new Set());
  const [insights, setInsights] = useState<{
    open: boolean;
    endpointId?: string;
    name?: string;
    method?: string;
    url?: string;
    requestPreview?: any;
    testCases: any[];
    history: any[];
    selectedTestId: string | null;
    selectedHistoryId: string | null;
  }>({ open: false, testCases: [], history: [], selectedTestId: null, selectedHistoryId: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type?: 'endpoint' | 'testCase'; id?: string; name?: string }>({ open: false });
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyMethod, setProxyMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [proxyHeaders, setProxyHeaders] = useState<string>('{}');
  const [proxyQuery, setProxyQuery] = useState<string>('{}');
  const [proxyBody, setProxyBody] = useState<string>('{}');
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxyResp, setProxyResp] = useState<any | null>(null);

  const listDebounceRef = useRef<any>(null);
  useEffect(() => {
    if (!id) return;
    if (listDebounceRef.current) {
      clearTimeout(listDebounceRef.current);
    }
    listDebounceRef.current = setTimeout(async () => {
      try {
        const data = await apiService.listEndpoints(id!, { page, limit: 10, search, method: methodFilter || undefined, folder: folderFilter || undefined });
        setPaged(data);
      } catch (e: any) {
        console.warn('List endpoints failed:', e?.message || e);
      }
    }, 200);
    return () => {
      if (listDebounceRef.current) clearTimeout(listDebounceRef.current);
    };
  }, [id, page, search, methodFilter, folderFilter]);
  const activeCase = React.useMemo(() => {
    if (!project || !activeCaseId) return null;
    const found = project.testCases.find(c => c.id === activeCaseId) || null;
    return found ? { case: found, endpoint: project.endpoints.find(e => e.id === found.endpointId) || null } : null;
  }, [project, activeCaseId]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProject(id!);
      setProject(data);
    } catch (error: any) {
      toast.error('Failed to load project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadedOnceRef = useRef(false);
  useEffect(() => {
    if (!id) return;
    if (loadedOnceRef.current) return;
    loadedOnceRef.current = true;
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openEnvModal = () => {
    const entries = Object.entries((project as any)?.envVars || {}).map(([key, value]) => ({ key, value: String(value) }));
    if (entries.length === 0) entries.push({ key: '', value: '' });
    setEnvDraft(entries);
    setShowEnvModal(true);
  };

  const saveEnv = async () => {
    if (!id) return;
    try {
      setIsSavingEnv(true);
      const envVars: Record<string, string> = {};
      envDraft.forEach(({ key, value }) => {
        const k = key.trim();
        if (k) envVars[k] = value;
      });
      await apiService.updateEnvVars(id, envVars);
      toast.success('Environment saved');
      setShowEnvModal(false);
      await loadProject();
    } catch (e) {
      toast.error('Failed to save env vars');
    } finally {
      setIsSavingEnv(false);
    }
  };

  const exportProject = async () => {
    if (!id) return;
    try {
      const data = await apiService.exportProject(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(data as any).name || 'project'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const doImport = async () => {
    if (!id) return;
    try {
      let parsed: any = null;
      try {
        parsed = JSON.parse(importText);
      } catch {
        toast.error('Invalid JSON');
        return;
      }
      await apiService.importProject(id, parsed, importMode);
      toast.success('Import complete');
      setShowImportModal(false);
      setImportText('');
      await loadProject();
    } catch {
      toast.error('Import failed');
    }
  };

  const openHistory = async (endpointId: string) => {
    if (!id) return;
    setHistoryEndpointId(endpointId);
    setHistoryLoading(true);
    try {
      const data = await apiService.getEndpointHistory(id, endpointId);
      setHistoryItems(data);
      setHistoryDiff({ a: data[1]?.response?.body ?? null, b: data[0]?.response?.body ?? null });
    } catch {
      toast.error('Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const rerunHistory = async (historyId: string) => {
    if (!id || !historyEndpointId) return;
    try {
      await apiService.rerunFromHistory(id, historyEndpointId, historyId);
      toast.success('Re-run complete');
      openHistory(historyEndpointId);
    } catch {
      toast.error('Re-run failed');
    }
  };
  const handleDeleteEndpoint = async (endpointId: string) => {
    setDeleteModal({ open: true, type: 'endpoint', id: endpointId, name: project?.endpoints.find(e => e.id === endpointId)?.name || endpointId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Project not found</p>
      </div>
    );
  }

  // Build a folder tree from folderPath "a/b/c"
  const tree: any = {};
  project.endpoints.forEach((ep) => {
    const path = (ep.folderPath || '').trim();
    const parts = path ? path.split('/').filter(Boolean) : [];
    let node = tree;
    for (const part of parts) {
      node.children = node.children || {};
      node.children[part] = node.children[part] || {};
      node = node.children[part];
    }
    node.items = node.items || [];
    node.items.push(ep);
  });

  const renderTree = (node: any, prefix: string[] = []) => {
    const entries: JSX.Element[] = [];
    if (node.items) {
      node.items.forEach((ep: ApiEndpoint) => {
        entries.push(
          <div
            key={ep.id}
            className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
            draggable
            onDragStart={() => setDndDraggingId(ep.id)}
            onDragEnd={() => setDndDraggingId(null)}
          >
            <button
              onClick={async () => {
                try {
                  if (!id) return;
                  const data = await apiService.getEndpointInsights(id, ep.id);
                  setInsights({
                    open: true,
                    endpointId: ep.id,
                    name: ep.name || ep.url,
                    method: ep.method,
                    url: ep.url,
                    requestPreview: data.requestPreview,
                    testCases: data.testCases,
                    history: data.recentHistory,
                    selectedTestId: data.testCases[0]?.id || null,
                    selectedHistoryId: data.recentHistory[0]?.id || null
                  });
                } catch {
                  toast.error('Failed to load endpoint insights');
                }
              }}
              className="text-left flex-1 text-sm text-gray-700 dark:text-gray-200 truncate"
              title="Open insights"
            >
              {ep.name || ep.url}
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.preventDefault(); openHistory(ep.id); }}
                className="p-1 text-gray-400 hover:text-blue-600"
                title="View history"
              >
                ⏱
              </button>
              <Link to={`/project/${id}/builder?endpoint=${ep.id}`} className="p-1 text-gray-400 hover:text-primary-600">
                <Edit2 className="w-4 h-4" />
              </Link>
              <button onClick={() => handleDeleteEndpoint(ep.id)} className="p-1 text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      });
    }
    if (node.children) {
      Object.keys(node.children).sort().forEach((folder) => {
        entries.push(
          <div key={prefix.concat(folder).join('/')} className="mt-3">
            <div
              className="flex items-center justify-between"
              onDragOver={(e) => { if (dndDraggingId) e.preventDefault(); }}
              onDrop={async (e) => {
                const endpointId = dndDraggingId;
                setDndDraggingId(null);
                if (!endpointId || !id) return;
                try {
                  const ep = project.endpoints.find(x => x.id === endpointId);
                  if (!ep) return;
                  await apiService.updateEndpoint(id, endpointId, { folderPath: prefix.concat(folder).join('/') });
                  toast.success('Moved');
                  await loadProject();
                } catch {
                  toast.error('Move failed');
                }
              }}
            >
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{folder}</div>
              <Link
                to={`/project/${id}/builder?folder=${encodeURIComponent(prefix.concat(folder).join('/'))}`}
                className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                title="Add endpoint to this folder"
              >
                + Add
              </Link>
            </div>
            <div className="ml-3 border-l border-gray-200 dark:border-gray-700 pl-3 space-y-1">
              {renderTree(node.children[folder], prefix.concat(folder))}
            </div>
          </div>
        );
      });
    }
    return entries;
  };

  // Test cases tabs + pagination (frontend)
  const testLimit = 10;
  const allTests = (project.testCases || []).slice().sort((a: any, b: any) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  const filteredTests = tTab === 'new'
    ? allTests.filter((t: any) => lastGeneratedIds.has(t.id))
    : allTests.filter((t: any) => !lastGeneratedIds.has(t.id));
  const visibleTotal = filteredTests.length;
  const testTotalPages = Math.max(1, Math.ceil(visibleTotal / testLimit));
  const visibleTests = filteredTests.slice((tPage - 1) * testLimit, (tPage) * testLimit);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumbs />
        <BackButton to="/app" />
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{project.name}</h1>
        {project.description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{project.description}</p>
        )}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          className={`px-3 py-1.5 rounded-md text-sm ${activeTab === 'endpoints' ? 'bg-primary-600 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}
          onClick={() => setActiveTab('endpoints')}
        >
          Endpoints
        </button>
        <button
          className={`px-3 py-1.5 rounded-md text-sm ${activeTab === 'graph' ? 'bg-primary-600 text-white' : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}
          onClick={() => setActiveTab('graph')}
        >
          System Graph
        </button>
      </div>

      {activeTab === 'graph' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Endpoints by Folder</h2>
            <div className="max-h-[70vh] overflow-auto">
              {Object.keys(tree).length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No endpoints to visualize.</div>
              ) : (
                <div className="space-y-2">{renderTree(tree)}</div>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Proxy Tester</h2>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2">
                <select
                  value={proxyMethod}
                  onChange={(e) => setProxyMethod(e.target.value as any)}
                  className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>PATCH</option>
                  <option>DELETE</option>
                </select>
                <input
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="https://example.com/api"
                  className="flex-1 px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
                <button
                  onClick={async () => {
                    try {
                      setProxyLoading(true);
                      const headers = JSON.parse(proxyHeaders || '{}');
                      const query = JSON.parse(proxyQuery || '{}');
                      const body = JSON.parse(proxyBody || '{}');
                      const resp = await apiService.proxyRequest({ url: proxyUrl, method: proxyMethod, headers, query, body });
                      setProxyResp(resp);
                    } catch (e: any) {
                      toast.error('Proxy request failed');
                      setProxyResp({ error: e?.message || String(e) });
                    } finally {
                      setProxyLoading(false);
                    }
                  }}
                  disabled={proxyLoading || !proxyUrl}
                  className="px-3 py-2 text-sm rounded-md bg-primary-600 text-white disabled:opacity-60"
                >
                  {proxyLoading ? 'Sending…' : 'Send'}
                </button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Headers (JSON)</div>
                  <textarea value={proxyHeaders} onChange={(e) => setProxyHeaders(e.target.value)} rows={6} className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-mono" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Query (JSON)</div>
                  <textarea value={proxyQuery} onChange={(e) => setProxyQuery(e.target.value)} rows={6} className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-mono" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Body (JSON)</div>
                  <textarea value={proxyBody} onChange={(e) => setProxyBody(e.target.value)} rows={6} className="w-full px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-mono" />
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Response</div>
                <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-auto max-h-[40vh]">
                  <ReactSyntaxHighlighter language="json" style={atomOneDark} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
{JSON.stringify(proxyResp, null, 2)}
                  </ReactSyntaxHighlighter>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {insights.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setInsights(prev => ({ ...prev, open: false }))} />
          <div className="relative w-full max-w-[1100px] h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-700">{insights.method}</span>
                <div className="text-base font-semibold text-gray-900 dark:text-white truncate">{insights.name}</div>
              </div>
              <button
                onClick={() => setInsights(prev => ({ ...prev, open: false }))}
                className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700"
              >
                Close
              </button>
            </div>
            <div className="p-4 flex items-center gap-3 border-b border-gray-200 dark:border-gray-800">
              <select
                value={insights.selectedTestId || ''}
                onChange={(e) => setInsights(prev => ({ ...prev, selectedTestId: e.target.value || null }))}
                className="px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <option value="">Select test case</option>
                {insights.testCases.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
              </select>
              <select
                value={insights.selectedHistoryId || ''}
                onChange={(e) => setInsights(prev => ({ ...prev, selectedHistoryId: e.target.value || null }))}
                className="px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <option value="">Select history</option>
                {insights.history.map((h: any) => (
                  <option key={h.id} value={h.id}>{new Date(h.createdAt).toLocaleString()} • {h.response?.statusCode}</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  try {
                    if (!id || !insights.endpointId || !insights.selectedHistoryId) return;
                    await apiService.rerunFromHistory(id, insights.endpointId, insights.selectedHistoryId);
                    toast.success('Re-run complete');
                    const data = await apiService.getEndpointInsights(id, insights.endpointId);
                    setInsights(prev => ({ ...prev, history: data.recentHistory }));
                  } catch {
                    toast.error('Re-run failed');
                  }
                }}
                className="px-3 py-2 text-sm rounded bg-primary-600 text-white"
              >
                Re-run history
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm font-medium">Request</div>
                <ReactSyntaxHighlighter language="json" style={atomOneDark} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
{JSON.stringify(insights.requestPreview, null, 2)}
                </ReactSyntaxHighlighter>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm font-medium">Response</div>
                <ReactSyntaxHighlighter language="json" style={atomOneDark} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
{JSON.stringify((insights.history.find((h: any) => h.id === insights.selectedHistoryId) || insights.history[0] || {}).response || null, null, 2)}
                </ReactSyntaxHighlighter>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm font-medium">Expected</div>
                <ReactSyntaxHighlighter language="json" style={atomOneDark} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
{JSON.stringify((insights.testCases.find((t: any) => t.id === insights.selectedTestId) || insights.testCases[0] || { expectedResults: [] }).expectedResults, null, 2)}
                </ReactSyntaxHighlighter>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'endpoints' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <FileCode className="w-8 h-8 text-primary-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Endpoints</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.endpoints.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <Play className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Test Cases</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{project.testCases.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-600 font-bold">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Status</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">Active</p>
            </div>
          </div>
        </div>
      </div>
      )}

      {showEnvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEnvModal(false)} />
          <div className="relative w-[95vw] max-w-[700px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold text-gray-900 dark:text-white">Environment Variables</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEnvDraft(prev => [...prev, { key: '', value: '' }])}
                  className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700"
                >
                  Add
                </button>
                <button
                  onClick={saveEnv}
                  disabled={isSavingEnv}
                  className="text-sm px-3 py-1 rounded bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-60"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowEnvModal(false)}
                  className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {envDraft.map((row, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2">
                  <input
                    value={row.key}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEnvDraft(prev => prev.map((r, i) => i === idx ? { ...r, key: val } : r));
                    }}
                    placeholder="KEY"
                    className="col-span-2 px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                  <input
                    value={row.value}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEnvDraft(prev => prev.map((r, i) => i === idx ? { ...r, value: val } : r));
                    }}
                    placeholder="value"
                    className="col-span-3 px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Use variables in requests as <code>{'{{VAR}}'}</code> in URL, headers, query, and body.
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowImportModal(false)} />
          <div className="relative w-[95vw] max-w-[800px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold text-gray-900 dark:text-white">Import Project JSON</div>
              <div className="flex items-center gap-2">
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as any)}
                  className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option value="merge">Merge</option>
                  <option value="replace">Replace</option>
                </select>
                <button
                  onClick={doImport}
                  className="text-sm px-3 py-1 rounded bg-primary-600 text-white hover:bg-primary-500"
                >
                  Import
                </button>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste project JSON here"
              className="w-full h-[60vh] px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-mono"
            />
          </div>
        </div>
      )}

      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowGenModal(false)} />
          <div className="relative w-[95vw] max-w-[420px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-4">
            <div className="text-base font-semibold text-gray-900 dark:text-white mb-2">Generate Test Cases</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              How many test cases would you like to generate? (1–20)
            </div>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                min={1}
                max={20}
                value={genCount}
                onChange={(e) => setGenCount(Math.max(1, Math.min(20, parseInt(e.target.value || '1', 10))))}
                className="w-24 px-3 py-2 text-sm rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowGenModal(false)}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!id) return;
                    const created = await apiService.generateTestCases(id, { count: genCount });
                    setShowGenModal(false);
                    toast.success(`Generated ${created.length} test case(s)`);
                    // Track new IDs to show in "New" tab
                    setLastGeneratedIds(new Set(created.map((c: any) => c.id)));
                    setTTab('new');
                    await loadProject();
                  } catch {
                    toast.error('Failed to generate test cases');
                  }
                }}
                className="px-3 py-1.5 text-sm rounded-md bg-purple-600 text-white"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'endpoints' && (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Endpoints</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search name or URL..."
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
            <button
              onClick={exportProject}
              className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              title="Export project JSON"
            >
              Export
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              title="Import project JSON"
            >
              Import
            </button>
            <button
              onClick={openEnvModal}
              className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              title="Environment variables"
            >
              Env
            </button>
            <select
              onChange={(e) => setFolderFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <option value="">All Folders</option>
              {Array.from(new Set(project.endpoints.map(ep => (ep.folderPath || '').trim()).filter(Boolean))).sort().map(fp => (
                <option key={fp} value={fp}>{fp}</option>
              ))}
            </select>
            <select
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
            >
              <option value="">All</option>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
            </select>
            <Link
              to={`/project/${id}/builder`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Endpoint
            </Link>
          </div>
        </div>
        <div className="p-6">
          {paged.items.length === 0 ? (
            <div className="text-center py-12">
              <FileCode className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No endpoints</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new endpoint.
              </p>
              <div className="mt-6">
                <Link
                  to={`/project/${id}/builder`}
                  className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Endpoint
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Folders</div>
                <div className="mt-2">{renderTree(tree)}</div>
              </div>
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {paged.items.map((endpoint: any) => (
                    <div
                      key={endpoint.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <span className="px-3 py-1 text-xs font-semibold rounded border border-gray-200 dark:border-gray-700">
                          {endpoint.method}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{endpoint.name || endpoint.url}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{endpoint.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/project/${id}/builder?endpoint=${endpoint.id}`}
                          className="p-2 text-gray-400 hover:text-primary-600"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteEndpoint(endpoint.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Page {paged.page} of {paged.totalPages} - {paged.total} total
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setPage(Math.min(paged.totalPages, page + 1))}
                        disabled={page >= paged.totalPages}
                        className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Test Cases</h2>
            <div className="flex items-center rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                className={`px-3 py-1 text-sm ${tTab === 'new' ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => setTTab('new')}
              >
                New
              </button>
              <button
                className={`px-3 py-1 text-sm ${tTab === 'previous' ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}
                onClick={() => setTTab('previous')}
              >
                Previous
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{(project.testCases || []).length} total</p>
            <button
              onClick={async () => {
                try {
                  setIsRunningAll(true);
                  setShowSuiteModal(true);
                  setSuiteProgress((project.testCases || []).map(tc => ({ id: tc.id, name: tc.name, status: 'running' })));
                  const result = await apiService.runTestCases(id!);
                  const map = new Map(result.results.map(r => [r.id, r.status]));
                  setSuiteProgress(prev => prev.map(p => ({ ...p, status: (map.get(p.id) as any) || 'fail' })));
                  toast.success('Completed');
                  setTimeout(async () => {
                    await loadProject();
                    setIsRunningAll(false);
                  }, 600);
                } catch (e) {
                  toast.error('Failed to run test cases');
                } finally {
                  setIsRunningAll(false);
                }
              }}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 flex items-center gap-2 disabled:opacity-60"
              disabled={isRunningAll}
            >
              {isRunningAll && <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-primary-600 animate-spin" />}
              Run All
            </button>
            <button
              onClick={() => setShowGenModal(true)}
              className="text-xs px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-500"
            >
              Generate Tests
            </button>
          </div>
        </div>
        <div className="p-6">
          {visibleTests.length === 0 ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
              No test cases yet. Use Generate Tests in the builder to create them.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Endpoint</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {visibleTests.map((tc) => {
                    const ep = project.endpoints.find(e => e.id === tc.endpointId);
                    return (
                      <tr
                        key={tc.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => { setActiveCaseId(tc.id); setShowCaseModal(true); }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{tc.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                          {ep ? `${ep.method} ${ep.name || ep.url}` : tc.endpointId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={clsx(
                            'px-2 inline-flex text-xs leading-5 font-semibold rounded-full',
                            tc.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                            tc.status === 'pass' && 'bg-green-100 text-green-800',
                            tc.status === 'fail' && 'bg-red-100 text-red-800'
                          )}>
                            {tc.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(tc.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal({ open: true, type: 'testCase', id: tc.id, name: tc.name });
                            }}
                            className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Page {tPage} of {testTotalPages} - {visibleTotal} total
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTPage(Math.max(1, tPage - 1))}
                    disabled={tPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setTPage(Math.min(testTotalPages, tPage + 1))}
                    disabled={tPage >= testTotalPages}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSuiteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSuiteModal(false)} />
          <div className="relative w-[95vw] max-w-[900px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-base font-semibold text-gray-900 dark:text-white">Running Test Suite</div>
              <button
                onClick={() => setShowSuiteModal(false)}
                className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-auto">
              {suiteProgress.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-800 rounded-md">
                  <div className="text-sm text-gray-900 dark:text-gray-100">{item.name}</div>
                  <div className="flex items-center gap-2">
                    {item.status === 'running' && <span className="inline-block h-3 w-3 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-primary-600 animate-spin" />}
                    <span className={clsx(
                      'px-2 py-0.5 text-xs rounded-full',
                      item.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                      item.status === 'running' && 'bg-blue-100 text-blue-800',
                      item.status === 'pass' && 'bg-green-100 text-green-800',
                      item.status === 'fail' && 'bg-red-100 text-red-800'
                    )}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCaseModal && activeCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCaseModal(false)} />
          <div className="relative w-[95vw] max-w-[1100px] h-[80vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="text-base font-semibold text-gray-900 dark:text-white">{activeCase.case.name}</div>
              <button
                onClick={() => setShowCaseModal(false)}
                className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Request (Input)
                </div>
                <div className="p-0">
                  <ReactSyntaxHighlighter language="json" style={atomOneDark} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
{JSON.stringify({
  method: activeCase.endpoint?.method,
  url: activeCase.endpoint?.url,
  headers: activeCase.endpoint?.headers || {},
  queryParams: activeCase.endpoint?.queryParams || {},
  body: activeCase.endpoint?.body || {}
}, null, 2)}
                  </ReactSyntaxHighlighter>
                </div>
              </div>
              <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Test Case
                </div>
                <div className="p-0">
                  <ReactSyntaxHighlighter language="json" style={atomOneDark} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
{JSON.stringify({
  id: activeCase.case.id,
  name: activeCase.case.name,
  status: activeCase.case.status,
  steps: activeCase.case.testSteps,
  expected: activeCase.case.expectedResults,
  createdAt: activeCase.case.createdAt
}, null, 2)}
                  </ReactSyntaxHighlighter>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {historyEndpointId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setHistoryEndpointId(null)} />
          <div className="relative w-[95vw] max-w-[1100px] h-[80vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="text-base font-semibold text-gray-900 dark:text-white">Response History</div>
              <button
                onClick={() => setHistoryEndpointId(null)}
                className="text-sm px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-0">
              <div className="border-r border-gray-200 dark:border-gray-800 overflow-auto p-3">
                {historyLoading ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
                ) : historyItems.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No history</div>
                ) : (
                  <div className="space-y-2">
                    {historyItems.map((h: any) => (
                      <div key={h.id} className="p-2 rounded border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            {new Date(h.createdAt).toLocaleString()} • {h.response.statusCode}
                          </div>
                          <button
                            onClick={() => rerunHistory(h.id)}
                            className="text-xs px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700"
                          >
                            Re-run
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => setHistoryDiff(prev => ({ a: h.response.body, b: prev.b }))}
                            className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                          >
                            Select A
                          </button>
                          <button
                            onClick={() => setHistoryDiff(prev => ({ a: prev.a, b: h.response.body }))}
                            className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                          >
                            Select B
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="lg:col-span-2 overflow-auto p-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm font-medium">A</div>
                    <ReactSyntaxHighlighter language="json" style={atomOneDark} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
{JSON.stringify(historyDiff.a, null, 2)}
                    </ReactSyntaxHighlighter>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 text-sm font-medium">B</div>
                    <ReactSyntaxHighlighter language="json" style={atomOneDark} customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}>
{JSON.stringify(historyDiff.b, null, 2)}
                    </ReactSyntaxHighlighter>
                  </div>
                  <div className="lg:col-span-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-md p-3 text-xs text-gray-600 dark:text-gray-300">
                    Visual diff coming soon. For now, compare side-by-side JSON.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteModal({ open: false })} />
          <div className="relative w-[95vw] max-w-[520px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-4">
            <div className="text-base font-semibold text-gray-900 dark:text-white mb-2">Confirm Delete</div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete {deleteModal.type === 'endpoint' ? 'endpoint' : 'test case'}:
              <span className="font-semibold"> {deleteModal.name}</span>?
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteModal({ open: false })}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!id || !deleteModal.id || !deleteModal.type) return;
                    if (deleteModal.type === 'endpoint') {
                      await apiService.deleteEndpoint(id, deleteModal.id);
                      toast.success('Endpoint deleted');
                    } else {
                      await apiService.deleteTestCase(id, deleteModal.id);
                      toast.success('Test case deleted');
                    }
                    setDeleteModal({ open: false });
                    await loadProject();
                  } catch {
                    toast.error('Delete failed');
                  }
                }}
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;

