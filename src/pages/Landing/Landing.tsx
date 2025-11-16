import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Moon, Sun, ArrowRight } from 'lucide-react';
import ApiTestingAnimation from '../../components/ApiTestingAnimation/ApiTestingAnimation';

const Landing: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="absolute inset-0 -z-10 opacity-40 dark:opacity-20 bg-gradient-to-br from-primary-100 via-transparent to-primary-200 blur-2xl" />
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="API Tester" className="h-8 w-auto" />
          <span className="text-xl font-extrabold tracking-tight text-primary-600">
            API Tester
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5 text-gray-700" /> : <Sun className="w-5 h-5 text-yellow-400" />}
          </button>
          <Link to="/login" className="text-sm text-gray-700 dark:text-gray-300 hover:underline">Sign in</Link>
          <Link to="/register" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-500">
            Get started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-16 grid gap-12 lg:grid-cols-2 items-center">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary-200 dark:border-primary-900 text-xs text-primary-700 dark:text-primary-300 bg-primary-50/60 dark:bg-primary-900/30">
            Visual API Platform
          </div>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
            Build, test, and document APIs-visually and fast.
          </h1>
          <p className="mt-5 text-lg text-gray-600 dark:text-gray-300">
            Design endpoints, generate tests with AI, monitor performance, and ship reliable APIs with confidence.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/register" className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-500">
              Create your account
            </Link>
            <Link to="/login" className="px-6 py-3 border border-gray-300 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900">
              Sign in
            </Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300">
              AI-assisted test generation
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300">
              Visual builder & docs
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300">
              Performance monitoring
            </div>
            <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300">
              Team-ready and secure
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 shadow-xl relative overflow-hidden">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-transparent to-blue-50/50 dark:from-primary-900/10 dark:via-transparent dark:to-blue-900/10" />
            <div className="h-80 rounded-md bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 border border-gray-100 dark:border-gray-800 p-4 relative z-10">
              <ApiTestingAnimation />
            </div>
          </div>
        </div>
      </main>
      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h3 className="font-semibold text-gray-900 dark:text-white">Design visually</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Drag, drop, and configure endpoints with clarity and speed.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h3 className="font-semibold text-gray-900 dark:text-white">Automate with AI</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Generate test cases and documentation automatically.</p>
          </div>
          <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <h3 className="font-semibold text-gray-900 dark:text-white">Ship with confidence</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Benchmark performance and catch regressions early.</p>
          </div>
        </div>
      </section>
      <footer className="max-w-7xl mx-auto px-6 py-10 text-sm text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} API Tester. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;


