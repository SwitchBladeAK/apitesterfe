import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileCode, GitBranch, BookOpen, Gauge, Home, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { authService } from '../../services/auth';
import { useTheme } from '../../context/ThemeContext';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout Component
 * Follows Single Responsibility Principle - handles layout structure
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const token = authService.getToken();

  const navigation = [
    { name: 'Dashboard', href: '/app', icon: Home },
    { name: 'Documentation Generator', href: '/app/documentation-generator', icon: BookOpen },
  ];

  const projectNavigation = [
    { name: 'Overview', href: (id: string) => `/app/project/${id}`, icon: LayoutDashboard },
    { name: 'API Builder', href: (id: string) => `/app/project/${id}/builder`, icon: FileCode },
    { name: 'Test Flow', href: (id: string) => `/app/project/${id}/test-flow`, icon: GitBranch },
    { name: 'Documentation', href: (id: string) => `/app/project/${id}/documentation`, icon: BookOpen },
    { name: 'Performance', href: (id: string) => `/app/project/${id}/performance`, icon: Gauge },
  ];

  const isProjectRoute = location.pathname.includes('/app/project/');
  const projectId = location.pathname.match(/\/app\/project\/([^/]+)/)?.[1];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-transparent">
        <div className="max-w-5xl mx-auto px-6 mt-6">
          <div className="h-14 rounded-2xl ring-1 ring-gray-200 dark:ring-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-md flex items-center justify-between px-4">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/app" className="flex items-center gap-2">
                  <img src="/logo.svg" alt="API Tester" className="h-8 w-auto" />
                  <span className="text-xl font-extrabold tracking-tight text-primary-600 hidden sm:inline">
                    API Tester
                  </span>
                </Link>
              </div>
              <div className="hidden sm:flex sm:items-center sm:gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={clsx(
                        'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-gray-900 dark:text-white dark:bg-primary-900/20'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                      )}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
                {isProjectRoute && projectId && projectNavigation.map((item) => {
                  const Icon = item.icon;
                  const href = item.href(projectId);
                  const isActive = location.pathname === href;
                  return (
                    <Link
                      key={item.name}
                      to={href}
                      className={clsx(
                        'inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-gray-900 dark:text-white dark:bg-primary-900/20'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60'
                      )}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Toggle theme"
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-5 h-5 text-gray-700" /> : <Sun className="w-5 h-5 text-yellow-400" />}
              </button>
              {!token ? (
                <Link to="/login" className="text-sm px-3 py-1.5 rounded-md bg-primary-600 text-white hover:bg-primary-500 transition-colors">
                  Sign in
                </Link>
              ) : (
                <button
                  className="text-sm px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    authService.clearToken();
                    navigate('/', { replace: true });
                  }}
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 text-gray-900 dark:text-gray-100">
        {children}
      </main>
    </div>
  );
};

export default Layout;

