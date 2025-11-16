import axios, { AxiosInstance, AxiosError } from 'axios';
import { Project, ApiEndpoint, TestCase, ApiResponse, PerformanceTest } from '../types';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers = config.headers ?? {};
          (config.headers as any).Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          console.error('API Error:', error.response.data);
        } else if (error.request) {
          console.error('Network Error:', error.request);
        } else {
          console.error('Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async listEndpoints(projectId: string, opts: { search?: string; folder?: string; method?: string; page?: number; limit?: number } = {}): Promise<{ items: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (opts.search) params.set('search', opts.search);
    if (opts.folder) params.set('folder', opts.folder);
    if (opts.method) params.set('method', opts.method);
    if (opts.page) params.set('page', String(opts.page));
    if (opts.limit) params.set('limit', String(opts.limit));
    const response = await this.client.get(`/projects/${projectId}/endpoints-list?${params.toString()}`);
    return response.data.data;
  }
  async getProjects(): Promise<Project[]> {
    const response = await this.client.get('/projects');
    return response.data.data;
  }

  async getProject(id: string): Promise<Project> {
    const response = await this.client.get(`/projects/${id}`);
    return response.data.data;
  }

  async createProject(name: string, description?: string): Promise<Project> {
    const response = await this.client.post('/projects', { name, description });
    return response.data.data;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const response = await this.client.put(`/projects/${id}`, data);
    return response.data.data;
  }

  async deleteProject(id: string): Promise<void> {
    await this.client.delete(`/projects/${id}`);
  }

  async addEndpoint(projectId: string, endpoint: ApiEndpoint): Promise<ApiEndpoint> {
    const response = await this.client.post(`/projects/${projectId}/endpoints`, endpoint);
    return response.data.data;
  }

  async updateEndpoint(
    projectId: string,
    endpointId: string,
    endpoint: Partial<ApiEndpoint>
  ): Promise<ApiEndpoint> {
    const response = await this.client.put(
      `/projects/${projectId}/endpoints/${endpointId}`,
      endpoint
    );
    return response.data.data;
  }

  async deleteEndpoint(projectId: string, endpointId: string): Promise<void> {
    await this.client.delete(`/projects/${projectId}/endpoints/${endpointId}`);
  }

  async testEndpoint(projectId: string, endpointId: string): Promise<ApiResponse> {
    const response = await this.client.post(
      `/projects/${projectId}/endpoints/${endpointId}/test`
    );
    return response.data.data;
  }

  async generateTestCases(projectId: string, opts: { count?: number } = {}): Promise<TestCase[]> {
    const payload: any = {};
    if (opts.count != null) payload.count = Math.max(1, Math.min(20, opts.count));
    const response = await this.client.post(`/projects/${projectId}/ai/generate-test-cases`, payload);
    return response.data.data;
  }

  async generateDocumentation(projectId: string): Promise<string> {
    const response = await this.client.post(`/projects/${projectId}/ai/generate-documentation`);
    return response.data.data.documentation;
  }

  async analyzeSystemDesign(projectId: string, fileStructure: string): Promise<any> {
    const response = await this.client.post(`/projects/${projectId}/ai/analyze-system-design`, {
      fileStructure,
    });
    return response.data.data;
  }

  async importZip(projectId: string, file: File): Promise<{ fileStructure: string; endpoints: ApiEndpoint[] }> {
    const formData = new FormData();
    formData.append('zipfile', file);
    
    const response = await this.client.post(
      `/projects/${projectId}/import-zip`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  async runPerformanceTest(
    projectId: string,
    endpointId: string,
    config: { concurrentUsers: number; duration: number; rampUpTime: number }
  ): Promise<PerformanceTest> {
    const response = await this.client.post(
      `/projects/${projectId}/endpoints/${endpointId}/performance-test`,
      config
    );
    return response.data.data;
  }

  async getPerformanceTests(projectId: string): Promise<PerformanceTest[]> {
    const response = await this.client.get(`/projects/${projectId}/performance-tests`);
    return response.data.data;
  }

  async runTestCases(
    projectId: string,
    opts: { testCaseIds?: string[]; randomize?: boolean } = {}
  ): Promise<{ results: Array<{ id: string; status: 'pass' | 'fail'; statusCode: number }> }> {
    const response = await this.client.post(`/projects/${projectId}/tests/run`, {
      testCaseIds: opts.testCaseIds || [],
      randomize: opts.randomize === true,
      count: opts as any && (opts as any).count != null
        ? Math.max(1, Math.min(20, (opts as any).count))
        : undefined
    });
    return response.data.data;
  }

  async deleteTestCase(projectId: string, caseId: string): Promise<void> {
    await this.client.delete(`/projects/${projectId}/test-cases/${caseId}`);
  }
  async proxyRequest<T = any>(params: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    headers?: Record<string, string>;
    query?: Record<string, any>;
    body?: any;
  }): Promise<{ statusCode: number; headers: any; body: T }> {
    const response = await this.client.post('/proxy', params);
    return response.data.data;
  }

  async exportProject(projectId: string): Promise<Project> {
    const response = await this.client.get(`/projects/${projectId}/export`);
    return response.data.data;
    }

  async importProject(projectId: string, data: Partial<Project>, mode: 'merge' | 'replace' = 'merge'): Promise<Project> {
    const response = await this.client.post(`/projects/${projectId}/import`, { data, mode });
    return response.data.data;
  }

  async updateEnvVars(projectId: string, envVars: Record<string, string>): Promise<Record<string, string>> {
    const response = await this.client.put(`/projects/${projectId}/env-vars`, { envVars });
    return response.data.data;
  }

  async getEndpointHistory(projectId: string, endpointId: string): Promise<Array<any>> {
    const response = await this.client.get(`/projects/${projectId}/endpoints/${endpointId}/history`);
    return response.data.data;
  }

  async rerunFromHistory(projectId: string, endpointId: string, historyId: string): Promise<any> {
    const response = await this.client.post(`/projects/${projectId}/endpoints/${endpointId}/history/${historyId}/rerun`);
    return response.data.data;
  }

  async getEndpointInsights(projectId: string, endpointId: string): Promise<{
    endpoint: ApiEndpoint;
    testCases: TestCase[];
    recentHistory: Array<any>;
    requestPreview: {
      method: string;
      url: string;
      headers: Record<string, string>;
      queryParams: Record<string, string>;
      body: any;
    };
  }> {
    const response = await this.client.get(`/projects/${projectId}/endpoints/${endpointId}/insights`);
    return response.data.data;
  }

  // Standalone documentation generation methods
  async importDocumentationFromZip(file: File): Promise<{
    documentation: string;
    endpoints: ApiEndpoint[];
    fileStructure: string;
    endpointCount: number;
    id?: string;
    createdAt?: string;
  }> {
    const formData = new FormData();
    formData.append('zipfile', file);
    
    const response = await this.client.post('/documentation/import-zip', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  }

  async importDocumentationFromJson(apis: any[], folderStructure?: string): Promise<{
    documentation: string;
    endpoints: ApiEndpoint[];
    fileStructure: string;
    endpointCount: number;
  }> {
    const response = await this.client.post('/documentation/import-json', {
      apis,
      folderStructure,
    });
    return response.data.data;
  }

  async importDocumentationFromJsonRaw(jsonData: string): Promise<{
    documentation: string;
    endpoints: ApiEndpoint[];
    fileStructure: string;
    endpointCount: number;
    id?: string;
    createdAt?: string;
  }> {
    const response = await this.client.post('/documentation/import-json-raw', {
      jsonData,
    });
    return response.data.data;
  }

  async generateDocumentationFromEndpoints(
    endpoints: ApiEndpoint[],
    folderStructure?: string,
    title?: string
  ): Promise<{
    documentation: string;
    endpointCount: number;
    id?: string;
    createdAt?: string;
  }> {
    const response = await this.client.post('/documentation/generate', {
      endpoints,
      folderStructure,
      title,
    });
    return response.data.data;
  }

  async getPreviousDocumentation(): Promise<Array<{
    _id: string;
    title: string;
    endpointCount: number;
    source: 'zip' | 'json' | 'endpoints';
    createdAt: string;
    updatedAt: string;
  }>> {
    const response = await this.client.get('/documentation');
    return response.data.data;
  }

  async getDocumentationById(id: string): Promise<{
    _id: string;
    title: string;
    documentation: string;
    endpoints: ApiEndpoint[];
    fileStructure?: string;
    endpointCount: number;
    source: 'zip' | 'json' | 'endpoints';
    createdAt: string;
    updatedAt: string;
  }> {
    const response = await this.client.get(`/documentation/${id}`);
    return response.data.data;
  }

  async deleteDocumentation(id: string): Promise<void> {
    await this.client.delete(`/documentation/${id}`);
  }
}

export const apiService = new ApiService();
export default apiService;

