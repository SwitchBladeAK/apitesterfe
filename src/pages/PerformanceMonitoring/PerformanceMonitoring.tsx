import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Play, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import apiService from '../../services/api';
import { Project, PerformanceTest } from '../../types';
import { formatRelativeTime, formatResponseTime, formatNumber } from '../../utils/helpers';
import BackButton from '../../components/BackButton/BackButton';
import Breadcrumbs from '../../components/Breadcrumbs/Breadcrumbs';

/**
 * Performance Monitoring Component
 * Follows Single Responsibility Principle - handles performance testing and monitoring
 */
const PerformanceMonitoring: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tests, setTests] = useState<PerformanceTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [testConfig, setTestConfig] = useState({
    concurrentUsers: 10,
    duration: 60,
    rampUpTime: 0,
  });

  useEffect(() => {
    if (id) {
      loadProject();
      loadTests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProject(id!);
      setProject(data);
      if (data.endpoints.length > 0) {
        setSelectedEndpoint(data.endpoints[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to load project');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadTests = async () => {
    try {
      const data = await apiService.getPerformanceTests(id!);
      setTests(data);
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleRunTest = async () => {
    if (!selectedEndpoint) {
      toast.error('Please select an endpoint');
      return;
    }

    try {
      setRunning(true);
      await apiService.runPerformanceTest(id!, selectedEndpoint, testConfig);
      toast.success('Performance test started');
      // Poll for results
      setTimeout(() => {
        loadTests();
      }, 2000);
    } catch (error: any) {
      toast.error('Failed to run performance test');
      console.error(error);
    } finally {
      setRunning(false);
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

  const latestTest = tests[0];
  const chartData = tests.slice(0, 10).reverse().map((test) => ({
    name: test.testName,
    avgResponseTime: test.results.averageResponseTime,
    requestsPerSecond: test.results.requestsPerSecond,
    errorRate: test.results.errorRate,
  }));

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between">
        <Breadcrumbs />
        <BackButton to={id ? `/app/project/${id}` : '/app'} />
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Monitoring</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Run load tests and monitor performance metrics
        </p>
      </div>

      {/* Test Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Run Performance Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint
            </label>
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              {project.endpoints.map((endpoint) => (
                <option key={endpoint.id} value={endpoint.id}>
                  {endpoint.method} {endpoint.url}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Concurrent Users
            </label>
            <input
              type="number"
              value={testConfig.concurrentUsers}
              onChange={(e) =>
                setTestConfig({ ...testConfig, concurrentUsers: parseInt(e.target.value) })
              }
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={testConfig.duration}
              onChange={(e) =>
                setTestConfig({ ...testConfig, duration: parseInt(e.target.value) })
              }
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ramp-up Time (seconds)
            </label>
            <input
              type="number"
              value={testConfig.rampUpTime}
              onChange={(e) =>
                setTestConfig({ ...testConfig, rampUpTime: parseInt(e.target.value) })
              }
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        <button
          onClick={handleRunTest}
          disabled={running || !selectedEndpoint}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4 mr-2" />
          {running ? 'Running...' : 'Run Test'}
        </button>
      </div>

      {/* Latest Test Results */}
      {latestTest && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Latest Test Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Clock className="w-5 h-5 text-primary-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Avg Response Time</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatResponseTime(latestTest.results.averageResponseTime)}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Requests/sec</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(Number(latestTest.results.requestsPerSecond.toFixed(2)))}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Error Rate</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {latestTest.results.errorRate.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Total Requests</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(latestTest.results.totalRequests)}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-4">Response Time Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgResponseTime"
                    stroke="#0ea5e9"
                    name="Avg Response Time (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-4">Throughput</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="requestsPerSecond" fill="#10b981" name="Requests/sec" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Test History */}
      {tests.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Requests/sec
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tests.map((test) => (
                  <tr key={test._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {test.testName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          test.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : test.status === 'running'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {test.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatResponseTime(test.results.averageResponseTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(Number(test.results.requestsPerSecond.toFixed(2)))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {test.results.errorRate.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRelativeTime(test.startedAt)}
                    </td>
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

export default PerformanceMonitoring;

