import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
} from 'react-flow-renderer';
import { Upload, Sparkles, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { Project } from '../../types';
import BackButton from '../../components/BackButton/BackButton';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';

/**
 * Test Flow Designer Component
 * Follows Single Responsibility Principle - handles visual test flow design
 */
const TestFlowDesigner: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [analyzing, setAnalyzing] = useState(false);

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
    if (project?.systemDesign) {
      const systemNodes: Node[] = project.systemDesign.nodes.map((node) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: {
          label: node.data.label || node.id,
          ...node.data,
        },
      }));

      const systemEdges: Edge[] = project.systemDesign.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type || 'default',
        animated: true,
      }));

      setNodes(systemNodes);
      setEdges(systemEdges);
    } else if (project?.endpoints) {
      // Create nodes from endpoints
      const endpointNodes: Node[] = project.endpoints.map((endpoint, index) => ({
        id: endpoint.id,
        type: 'default',
        position: endpoint.position || {
          x: (index % 3) * 200,
          y: Math.floor(index / 3) * 150,
        },
        data: {
          label: `${endpoint.method} ${endpoint.name || endpoint.url}`,
          method: endpoint.method,
          url: endpoint.url,
        },
        style: {
          background: endpoint.method === 'GET' ? '#d1fae5' : endpoint.method === 'POST' ? '#dbeafe' : '#fef3c7',
          border: '2px solid #111827',
          borderRadius: '8px',
        },
      }));

      // Create edges between endpoints (simple connection for demo)
      const endpointEdges: Edge[] = [];
      for (let i = 0; i < endpointNodes.length - 1; i++) {
        endpointEdges.push({
          id: `edge-${i}`,
          source: endpointNodes[i].id,
          target: endpointNodes[i + 1].id,
          animated: true,
        });
      }

      setNodes(endpointNodes);
      setEdges(endpointEdges);
    }
  }, [project, setNodes, setEdges]);



  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      toast.error('Please upload a ZIP file');
      return;
    }

    try {
      setAnalyzing(true);
      const result = await apiService.importZip(id!, file);
      toast.success(`Successfully imported ${result.endpoints.length} endpoints`);
      
      // Analyze system design with AI
      const systemDesign = await apiService.analyzeSystemDesign(id!, result.fileStructure);
      
      // Update project with system design
      await apiService.updateProject(id!, {
        systemDesign: systemDesign,
      } as any);
      
      toast.success('System design analyzed successfully');
      loadProject();
    } catch (error: any) {
      toast.error('Failed to import and analyze ZIP file');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const generateTestCases = async () => {
    if (!project || project.endpoints.length === 0) {
      toast.error('No endpoints found');
      return;
    }

    try {
      setAnalyzing(true);
      const testCases = await apiService.generateTestCases(id!);
      toast.success(`Generated ${testCases.length} test cases`);
      loadProject();
    } catch (error: any) {
      toast.error('Failed to generate test cases');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Test Flow Designer</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Visualize system design and generate test cases
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-500 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Import ZIP
            <input
              type="file"
              accept=".zip"
              onChange={handleFileUpload}
              className="hidden"
              disabled={analyzing}
            />
          </label>
          <button
            onClick={generateTestCases}
            disabled={analyzing || !project?.endpoints.length}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {analyzing ? 'Generating...' : 'Generate Tests'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ height: '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {project?.endpoints && project.endpoints.length === 0 && (
        <div className="mt-6 text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <FileCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No endpoints found</h3>
          <p className="text-sm text-gray-600 mb-4">
            Import a ZIP file containing your API project to visualize the system design
          </p>
          <label className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-500 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Import ZIP
            <input
              type="file"
              accept=".zip"
              onChange={handleFileUpload}
              className="hidden"
              disabled={analyzing}
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default TestFlowDesigner;

