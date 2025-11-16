import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard/Dashboard';
import ProjectDetail from './pages/ProjectDetail/ProjectDetail';
import VisualBuilder from './pages/VisualBuilder/VisualBuilder';
import TestFlowDesigner from './pages/TestFlowDesigner/TestFlowDesigner';
import Documentation from './pages/Documentation/Documentation';
import PerformanceMonitoring from './pages/PerformanceMonitoring/PerformanceMonitoring';
import Login from './pages/Auth/Login';
import PrivateRoute from './components/PrivateRoute';
import Register from './pages/Auth/Register';
import Landing from './pages/Landing/Landing';
import DocumentationGenerator from './pages/DocumentationGenerator/DocumentationGenerator';

/**
 * Main App Component
 * Follows Single Responsibility Principle - handles routing
 */
const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Legacy non-/app routes kept for backward compatibility */}
        <Route
          path="/project/:id"
          element={
            <PrivateRoute>
              <Layout>
                <ProjectDetail />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:id/builder"
          element={
            <PrivateRoute>
              <Layout>
                <VisualBuilder />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:id/test-flow"
          element={
            <PrivateRoute>
              <Layout>
                <TestFlowDesigner />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:id/documentation"
          element={
            <PrivateRoute>
              <Layout>
                <Documentation />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/project/:id/performance"
          element={
            <PrivateRoute>
              <Layout>
                <PerformanceMonitoring />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/app"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/app/project/:id"
          element={
            <PrivateRoute>
              <Layout>
                <ProjectDetail />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/app/project/:id/builder"
          element={
            <PrivateRoute>
              <Layout>
                <VisualBuilder />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/app/project/:id/test-flow"
          element={
            <PrivateRoute>
              <Layout>
                <TestFlowDesigner />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/app/project/:id/documentation"
          element={
            <PrivateRoute>
              <Layout>
                <Documentation />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/app/project/:id/performance"
          element={
            <PrivateRoute>
              <Layout>
                <PerformanceMonitoring />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/app/documentation-generator"
          element={
            <PrivateRoute>
              <Layout>
                <DocumentationGenerator />
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
      <Toaster position="top-right" />
    </Router>
  );
};

export default App;

