import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onResetPage?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[UI ErrorBoundary]', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onResetPage?.();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 rounded-3xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 shadow-sm max-w-2xl mx-auto text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Something went wrong rendering this view
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your AWS environment and read-only billing cache remain completely unaffected.
            </p>
            {this.state.error?.message && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs font-mono text-rose-600 dark:text-rose-400 break-words">
                {this.state.error.message}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry View</span>
            </button>
            {this.props.onResetPage && (
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Back to Overview</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
