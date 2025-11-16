import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Sparkles, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { Project } from '../../types';
import BackButton from '../../components/BackButton/BackButton';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';

/**
 * Documentation Component
 * Follows Single Responsibility Principle - handles documentation display and generation
 */
const Documentation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (id) {
      loadProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  const handleGenerateDocumentation = async () => {
    if (!project || project.endpoints.length === 0) {
      toast.error('No endpoints found');
      return;
    }

    try {
      setGenerating(true);
      await apiService.generateDocumentation(id!);
      toast.success('Documentation generated successfully');
      loadProject();
    } catch (error: any) {
      toast.error('Failed to generate documentation');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (project?.documentation) {
      const blob = new Blob([project.documentation], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name}-documentation.md`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Documentation exported');
    }
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

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumbs />
        <BackButton to={id ? `/app/project/${id}` : '/app'} />
      </div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Auto-generated API documentation
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {project.documentation && (
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          )}
          <button
            onClick={handleGenerateDocumentation}
            disabled={generating || project.endpoints.length === 0}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Documentation'}
          </button>
        </div>
      </div>

      {project.documentation ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="prose max-w-none">
            <ReactMarkdown>{project.documentation}</ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No documentation</h3>
          <p className="text-sm text-gray-600 mb-4">
            Generate documentation automatically using AI
          </p>
          <button
            onClick={handleGenerateDocumentation}
            disabled={generating || project.endpoints.length === 0}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Documentation'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Documentation;

