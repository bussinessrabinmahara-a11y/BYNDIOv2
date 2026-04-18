import { Component, ReactNode, ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
          <span className="text-6xl mb-4">⚠️</span>
          <h2 className="text-xl font-black mb-2 text-gray-800">Something went wrong</h2>
          <p className="text-gray-500 mb-5 max-w-sm text-sm">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-6 py-2.5 rounded-md font-bold transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
