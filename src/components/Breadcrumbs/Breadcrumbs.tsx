import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import clsx from 'clsx';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}


const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  const location = useLocation();

  // Auto-generate breadcrumbs from route if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (items) return items;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    const isLegacyRoute = !pathSegments.includes('app') && pathSegments[0] !== 'app';
    
    const dashboardPath = isLegacyRoute ? '/' : '/app';
    breadcrumbs.push({ label: 'Dashboard', path: dashboardPath });

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      if (segment === 'login' || segment === 'register') {
        return;
      }

      let label = segment;
      if (segment === 'app') {
        return; 
      } else if (segment === 'project') {
        if (pathSegments[index + 1]) {
          label = 'Project';
          breadcrumbs.push({ label, path: currentPath });
          return;
        }
      } else if (segment === 'builder') {
        label = 'API Builder';
      } else if (segment === 'test-flow') {
        label = 'Test Flow';
      } else if (segment === 'documentation') {
        label = 'Documentation';
      } else if (segment === 'performance') {
        label = 'Performance';
      } else if (segment === 'documentation-generator') {
        label = 'Documentation Generator';
      } else {
        // Capitalize and format
        label = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbItems = generateBreadcrumbs();

  if (breadcrumbItems.length <= 1 && location.pathname === '/app') {
    return null;
  }

  return (
    <nav className={clsx('flex items-center space-x-2 text-sm', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              {index === 0 ? (
                <Link
                  to={item.path || '/app'}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <Home className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 mx-2" />
                  {isLast ? (
                    <span className="text-gray-900 dark:text-gray-100 font-medium">
                      {item.label}
                    </span>
                  ) : (
                    <Link
                      to={item.path || '#'}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      {item.label}
                    </Link>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;

