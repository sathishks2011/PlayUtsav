import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
          <div className="max-w-2xl w-full bg-gray-800 rounded-xl border border-red-500/30 p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-red-400">Something went wrong</h1>
                <p className="text-sm text-gray-400">The application encountered an unexpected error</p>
              </div>
            </div>

            <div className="space-y-4">
              {this.state.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h2 className="text-sm font-semibold text-red-300 mb-2">Error Details:</h2>
                  <pre className="text-xs text-red-200 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </div>
              )}

              {this.state.errorInfo && (
                <details className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <summary className="text-sm font-semibold text-gray-300 cursor-pointer">
                    Component Stack Trace
                  </summary>
                  <pre className="text-xs text-gray-400 mt-2 overflow-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Reload Application
                </button>
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                    window.history.back();
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
