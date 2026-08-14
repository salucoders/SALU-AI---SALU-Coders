import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { LOGO_URL, APP_NAME } from '../constants';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
            <img 
              src={LOGO_URL} 
              alt={APP_NAME} 
              className="w-10 h-10 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Something went wrong</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">
            Unable to load {APP_NAME}
          </h1>

          <p className="text-slate-400 max-w-md text-sm md:text-base mb-8">
            An unexpected error occurred while rendering the workspace. Please reload the page to restore your session.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-brand-500/25"
            >
              <RefreshCw className="w-4 h-4" /> Reload Page
            </button>
            <button
              onClick={this.handleClearAndReload}
              className="px-6 py-3 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl font-semibold text-sm transition-all active:scale-95"
            >
              Reset Cache & Reload
            </button>
          </div>

          {this.state.error?.message && (
            <div className="mt-10 p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left max-w-lg w-full overflow-hidden">
              <p className="text-xs text-slate-500 font-mono break-words">
                {this.state.error.message}
              </p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
