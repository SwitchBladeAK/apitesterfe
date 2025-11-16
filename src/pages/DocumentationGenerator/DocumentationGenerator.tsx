import React, { useState, useEffect } from 'react';
import { FileText, Upload, FileJson, Sparkles, Download, Folder, X, History, Trash2, Clock, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { ApiEndpoint } from '../../types';
import BackButton from '../../components/BackButton/BackButton';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';

type TabType = 'zip' | 'json';

interface PreviousDocumentation {
  _id: string;
  title: string;
  endpointCount: number;
  source: 'zip' | 'json' | 'endpoints';
  createdAt: string;
  updatedAt: string;
}

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const isDark = document.documentElement.classList.contains('dark');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded shadow-lg"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={isDark ? vscDarkPlus : vs}
        language={language}
        PreTag="div"
        className="rounded-lg !m-0"
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

/**
 * Documentation Generator Component
 * Standalone page for generating professional API documentation
 */
const DocumentationGenerator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('zip');
  const [loading, setLoading] = useState(false);
  const [documentation, setDocumentation] = useState<string>('');
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [fileStructure, setFileStructure] = useState<string>('');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [previousDocs, setPreviousDocs] = useState<PreviousDocumentation[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Please upload a ZIP file');
      return;
    }

    try {
      setLoading(true);
      const result = await apiService.importDocumentationFromZip(file);
      setDocumentation(result.documentation);
      setEndpoints(result.endpoints);
      setFileStructure(result.fileStructure);
      setCurrentDocId(result.id || null);
      await loadPreviousDocumentation();
      toast.success(`Successfully imported ${result.endpointCount} endpoints and generated documentation`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import ZIP file');
      console.error(error);
    } finally {
      setLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleJsonImport = async () => {
    if (!jsonInput.trim()) {
      toast.error('Please provide JSON data');
      return;
    }

    try {
      setLoading(true);
      // Send raw JSON to backend - let backend handle parsing with AI if needed
      const result = await apiService.importDocumentationFromJsonRaw(jsonInput);
      setDocumentation(result.documentation);
      setEndpoints(result.endpoints);
      setFileStructure(result.fileStructure);
      setCurrentDocId(result.id || null);
      await loadPreviousDocumentation();
      toast.success(`Successfully imported ${result.endpointCount} endpoints and generated documentation`);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error('Invalid JSON format. Please check your JSON syntax');
      } else {
        toast.error(error.response?.data?.message || 'Failed to import JSON');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromEndpoints = async () => {
    if (endpoints.length === 0) {
      toast.error('No endpoints available. Please import first.');
      return;
    }

    try {
      setLoading(true);
      const result = await apiService.generateDocumentationFromEndpoints(endpoints, fileStructure);
      setDocumentation(result.documentation);
      setCurrentDocId(result.id || null);
      await loadPreviousDocumentation();
      toast.success('Documentation regenerated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate documentation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!documentation) {
      toast.error('No documentation to export');
      return;
    }

    const blob = new Blob([documentation], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `api-documentation-${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Documentation exported');
  };

  const handleClear = () => {
    setDocumentation('');
    setEndpoints([]);
    setFileStructure('');
    setJsonInput('');
    setCurrentDocId(null);
    toast.success('Cleared all data');
  };

  useEffect(() => {
    loadPreviousDocumentation();
  }, []);

  const loadPreviousDocumentation = async () => {
    try {
      setLoadingPrevious(true);
      const docs = await apiService.getPreviousDocumentation();
      setPreviousDocs(docs);
    } catch (error: any) {
      console.error('Failed to load previous documentation:', error);
    } finally {
      setLoadingPrevious(false);
    }
  };

  const handleLoadPrevious = async (id: string) => {
    try {
      setLoading(true);
      const doc = await apiService.getDocumentationById(id);
      setDocumentation(doc.documentation);
      setEndpoints(doc.endpoints);
      setFileStructure(doc.fileStructure || '');
      setCurrentDocId(doc._id);
      setShowHistory(false);
      toast.success('Documentation loaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load documentation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrevious = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this documentation?')) {
      return;
    }

    try {
      await apiService.deleteDocumentation(id);
      setPreviousDocs(prev => prev.filter(doc => doc._id !== id));
      if (currentDocId === id) {
        handleClear();
      }
      toast.success('Documentation deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete documentation');
      console.error(error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceBadge = (source: string) => {
    const badges = {
      zip: { label: 'ZIP', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      json: { label: 'JSON', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      endpoints: { label: 'Endpoints', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' }
    };
    return badges[source as keyof typeof badges] || badges.json;
  };

  const jsonExample = `{
  "apis": [
    {
      "method": "GET",
      "url": "/api/users",
      "name": "Get Users",
      "description": "Retrieve list of users",
      "headers": {
        "Authorization": "Bearer token"
      },
      "queryParams": {
        "page": "1",
        "limit": "10"
      }
    },
    {
      "method": "POST",
      "url": "/api/users",
      "name": "Create User",
      "description": "Create a new user",
      "body": {
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "folderStructure": "api/\n  users/\n    routes.js\n    controller.js"
}`;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumbs />
        <BackButton to="/app" />
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documentation Generator</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Import APIs from ZIP or JSON and generate professional documentation automatically
          </p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <History className="w-4 h-4 mr-2" />
          Previous ({previousDocs.length})
        </button>
      </div>

      {/* Previous Documentation Sidebar */}
      {showHistory && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Previous Documentation</h2>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {loadingPrevious ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : previousDocs.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No previous documentation found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {previousDocs.map((doc) => {
                const badge = getSourceBadge(doc.source);
                return (
                  <div
                    key={doc._id}
                    onClick={() => handleLoadPrevious(doc._id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      currentDocId === doc._id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">{doc.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {doc.endpointCount} endpoints
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(doc.createdAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeletePrevious(doc._id, e)}
                        className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('zip')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'zip'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              Import from ZIP
            </div>
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`
              py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'json'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <FileJson className="w-5 h-5" />
              Import from JSON
            </div>
          </button>
        </nav>
      </div>

      {/* Import Section */}
      {!documentation && (
        <div className="mb-6">
          {activeTab === 'zip' ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Upload ZIP File
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Upload a ZIP file containing your API project structure
                </p>
                <label className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-500 cursor-pointer">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipUpload}
                    disabled={loading}
                    className="hidden"
                  />
                  <Upload className="w-4 h-4 mr-2" />
                  {loading ? 'Processing...' : 'Choose ZIP File'}
                </label>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  JSON API Data
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder={jsonExample}
                  className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-md font-mono text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Paste your JSON API data. Should include an array of APIs with method, url, name, etc.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleJsonImport}
                  disabled={loading || !jsonInput.trim()}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {loading ? 'Generating...' : 'Generate Documentation'}
                </button>
                <button
                  onClick={() => setJsonInput(jsonExample)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Load Example
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Documentation Display */}
      {documentation && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FileText className="w-4 h-4" />
                <span>{endpoints.length} endpoints</span>
              </div>
              {fileStructure && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Folder className="w-4 h-4" />
                  <span>Folder structure included</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateFromEndpoints}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={handleClear}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="prose prose-lg max-w-none dark:prose-invert 
              prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
              prose-h1:text-4xl prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-700 prose-h1:pb-4 prose-h1:mb-6
              prose-h2:text-3xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-200 dark:prose-h2:border-gray-700 prose-h2:pb-2
              prose-h3:text-2xl prose-h3:mt-6 prose-h3:mb-3
              prose-h4:text-xl prose-h4:mt-4 prose-h4:mb-2
              prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
              prose-code:text-primary-600 dark:prose-code:text-primary-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
              prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800 dark:prose-pre:border-gray-700
              prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:bg-primary-50 dark:prose-blockquote:bg-primary-900/20 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4 prose-blockquote:italic
              prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-700 dark:prose-li:text-gray-300
              prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-gray-300 dark:prose-table:border-gray-600
              prose-th:bg-gray-100 dark:prose-th:bg-gray-700 prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:p-3 prose-th:text-left prose-th:font-semibold
              prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:p-3 prose-td:text-gray-700 dark:prose-td:text-gray-300
              prose-hr:border-gray-200 dark:prose-hr:border-gray-700 prose-hr:my-8">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    const codeString = String(children).replace(/\n$/, '');

                    if (!inline && match) {
                      return (
                        <CodeBlock code={codeString} language={language} {...props} />
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  blockquote({ children, ...props }: any) {
                    return (
                      <blockquote className="border-l-4 border-primary-500 bg-primary-50 dark:bg-primary-900/20 pl-4 py-2 my-4 italic rounded-r" {...props}>
                        {children}
                      </blockquote>
                    );
                  },
                  table({ children, ...props }: any) {
                    return (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props}>
                          {children}
                        </table>
                      </div>
                    );
                  },
                  thead({ children, ...props }: any) {
                    return (
                      <thead className="bg-gray-100 dark:bg-gray-700" {...props}>
                        {children}
                      </thead>
                    );
                  },
                  th({ children, ...props }: any) {
                    return (
                      <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold text-gray-900 dark:text-gray-100" {...props}>
                        {children}
                      </th>
                    );
                  },
                  td({ children, ...props }: any) {
                    return (
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-700 dark:text-gray-300" {...props}>
                        {children}
                      </td>
                    );
                  },
                  h1({ children, ...props }: any) {
                    return (
                      <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-4 mb-6" {...props}>
                        {children}
                      </h1>
                    );
                  },
                  h2({ children, ...props }: any) {
                    return (
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-8 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2" {...props}>
                        {children}
                      </h2>
                    );
                  },
                  h3({ children, ...props }: any) {
                    return (
                      <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3" {...props}>
                        {children}
                      </h3>
                    );
                  },
                  h4({ children, ...props }: any) {
                    return (
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2" {...props}>
                        {children}
                      </h4>
                    );
                  },
                }}
              >
                {documentation}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Generating documentation...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This may take a few moments</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentationGenerator;

