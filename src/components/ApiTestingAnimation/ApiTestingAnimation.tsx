import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Send, Zap, Activity } from 'lucide-react';

interface ApiRequest {
  id: string;
  method: string;
  endpoint: string;
  status: 'pending' | 'success' | 'error';
  delay: number;
}

const ApiTestingAnimation: React.FC = () => {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<string | null>(null);

  useEffect(() => {
    const initialRequests: ApiRequest[] = [
      { id: '1', method: 'GET', endpoint: '/api/users', status: 'pending', delay: 0 },
      { id: '2', method: 'POST', endpoint: '/api/auth', status: 'pending', delay: 1500 },
      { id: '3', method: 'DELETE', endpoint: '/api/item', status: 'pending', delay: 3000 },
      { id: '4', method: 'PATCH', endpoint: '/api/update', status: 'pending', delay: 4500 },
    ];

    const animateCycle = () => {
      setRequests(initialRequests);
      setActiveRequest(null);

      // Animate requests sequentially
      initialRequests.forEach((req) => {
        setTimeout(() => {
          setActiveRequest(req.id);
          setTimeout(() => {
            setRequests((prev) =>
              prev.map((r) =>
                r.id === req.id
                  ? { ...r, status: Math.random() > 0.2 ? 'success' : 'error' }
                  : r
              )
            );
            setTimeout(() => {
              setActiveRequest(null);
              setRequests((prev) =>
                prev.map((r) => (r.id === req.id ? { ...r, status: 'pending' } : r))
              );
            }, 2000);
          }, 800);
        }, req.delay);
      });
    };

    // Start immediately
    animateCycle();

    // Repeat every 8 seconds
    const interval = setInterval(animateCycle, 8000);

    return () => clearInterval(interval);
  }, []);

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
      POST: 'text-green-500 bg-green-50 dark:bg-green-900/20',
      PUT: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
      DELETE: 'text-red-500 bg-red-50 dark:bg-red-900/20',
      PATCH: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    };
    return colors[method] || 'text-gray-500 bg-gray-50 dark:bg-gray-900/20';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'success') {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    }
    if (status === 'error') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <Activity className="w-4 h-4 text-primary-500 animate-pulse" />;
  };

  return (
    <div className="relative h-full w-full p-4 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-blue-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-24 h-24 bg-green-400/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-1/2 w-28 h-28 bg-purple-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>

      {/* Central API hub with glow and surrounding cards */}
      <div className="relative z-10 h-full flex items-center justify-center">
        {/* Central API hub */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
          {/* Multiple glow rings for depth */}
          <div className="absolute inset-0 rounded-full bg-primary-500/50 blur-2xl animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 rounded-full bg-primary-400/40 blur-xl animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
          <div className="relative bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 rounded-full p-6 shadow-2xl ring-4 ring-primary-500/30 animate-pulse" style={{ animationDuration: '2s' }}>
            <Zap className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </div>

        {/* Request cards positioned around the hub */}
        <div className="relative w-full h-full">
          {requests.map((req, index) => {
            const isActive = activeRequest === req.id;
            const hasGlow = isActive || req.status !== 'pending';

            const positions: Record<string, { top: string; left: string }> = {
              '1': { top: '18%', left: '20%' }, // Top-left
              '2': { top: '18%', left: '80%' }, // Top-right (symmetric to left)
              '3': { top: '68%', left: '20%' }, // Bottom-left
              '4': { top: '68%', left: '80%' }, // Bottom-right (symmetric to left)
            };
            const pos = positions[req.id] || { top: '50%', left: '50%' };

            return (
              <div
                key={req.id}
                className={`
                  absolute w-40 rounded-lg border p-3 transition-all duration-500
                  ${hasGlow ? 'shadow-lg scale-105 z-30' : 'shadow-sm scale-100 z-20'}
                  ${req.status === 'success' ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : ''}
                  ${req.status === 'error' ? 'border-red-500/50 bg-red-50/50 dark:bg-red-900/10' : ''}
                  ${req.status === 'pending' ? 'border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm' : ''}
                `}
                style={{
                  ...pos,
                  transform: 'translate(-50%, -50%)',
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                {/* Glow effect when active */}
                {hasGlow && (
                  <>
                    <div
                      className={`absolute -inset-1 rounded-lg blur-lg opacity-60 ${
                        req.status === 'success'
                          ? 'bg-green-400'
                          : req.status === 'error'
                          ? 'bg-red-400'
                          : 'bg-primary-400'
                      }`}
                      style={{
                        animation: hasGlow ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                      }}
                    />
                    <div
                      className={`absolute -inset-0.5 rounded-lg blur-sm opacity-40 ${
                        req.status === 'success'
                          ? 'bg-green-300'
                          : req.status === 'error'
                          ? 'bg-red-300'
                          : 'bg-primary-300'
                      }`}
                      style={{
                        animation: hasGlow ? 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                        animationDelay: '0.3s',
                      }}
                    />
                  </>
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${getMethodColor(req.method)}`}
                    >
                      {req.method}
                    </span>
                    {/* Always show waveform icon for pending, status icon for success/error */}
                    {req.status === 'pending' ? (
                      <Activity className="w-4 h-4 text-primary-400 dark:text-primary-500 animate-pulse" />
                    ) : (
                      getStatusIcon(req.status)
                    )}
                  </div>
                  <div className="text-xs font-mono text-gray-700 dark:text-gray-200 truncate">
                    {req.endpoint}
                  </div>
                  {isActive && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 animate-pulse">
                      <Send className="w-3 h-3" />
                      <span>Sending...</span>
                    </div>
                  )}
                </div>

                {/* Animated progress line */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-primary-300 shadow-lg"
                      style={{ 
                        width: '100%',
                        animation: 'shimmer 1.5s ease-in-out infinite',
                      }} 
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Connection lines animation */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {requests.map((req) => {
            if (activeRequest !== req.id) return null;
            const cardPositions: Record<string, { top: string; left: string }> = {
              '1': { top: '18%', left: '20%' },
              '2': { top: '18%', left: '80%' },
              '3': { top: '68%', left: '20%' },
              '4': { top: '68%', left: '80%' },
            };
            const cardPos = cardPositions[req.id] || { top: '50%', left: '50%' };
            const centerX = 50;
            const centerY = 50;
            const cardX = parseFloat(cardPos.left);
            const cardY = parseFloat(cardPos.top);

            return (
              <svg
                key={`line-${req.id}`}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
              >
                <defs>
                  <linearGradient id={`gradient-${req.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <line
                  x1={`${cardX}%`}
                  y1={`${cardY}%`}
                  x2={`${centerX}%`}
                  y2={`${centerY}%`}
                  stroke={`url(#gradient-${req.id})`}
                  strokeWidth="2.5"
                  opacity="0.7"
                  strokeDasharray="6 4"
                  style={{
                    animation: 'dash 1.5s linear infinite',
                  }}
                />
              </svg>
            );
          })}
        </div>

      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes dash {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 20;
          }
        }
      `}</style>
    </div>
  );
};

export default ApiTestingAnimation;

