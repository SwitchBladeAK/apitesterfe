/**
 * Type Definitions
 * Follows TypeScript best practices - centralized type definitions
 */

export interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  folderPath?: string;
  routePath?: string;
  headers?: Record<string, string>;
  body?: Record<string, any>;
  queryParams?: Record<string, string>;
  description?: string;
  position?: { x: number; y: number };
}

export interface TestCase {
  id: string;
  name: string;
  endpointId: string;
  testSteps: string[];
  expectedResults: string[];
  status: 'pass' | 'fail' | 'pending';
  createdAt: string;
}

export interface SystemDesign {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, any>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
  }>;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  endpoints: ApiEndpoint[];
  testCases: TestCase[];
  systemDesign?: SystemDesign;
  documentation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  responseTime: number;
}

export interface PerformanceTest {
  _id: string;
  projectId: string;
  endpointId: string;
  testName: string;
  config: {
    concurrentUsers: number;
    duration: number;
    rampUpTime: number;
  };
  results: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    percentiles: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

