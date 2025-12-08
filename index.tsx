import React, { Component, ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ZamanX AI Critical Failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="bg-gray-900 border border-red-900/50 p-8 rounded-2xl shadow-2xl max-w-2xl w-full">
            <h2 className="text-3xl font-bold text-cyan-500 mb-4">System Malfunction</h2>
            <p className="text-gray-400 mb-6 text-lg">
              The neural core encountered an unexpected error and needs to restart.
            </p>
            
            <button 
              onClick={() => window.location.reload()} 
              className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all mb-8"
            >
              Reboot System
            </button>
            
            <div className="text-left">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-2">Error Log</p>
              <pre className="p-4 bg-black rounded-lg text-xs text-red-400 overflow-auto border border-gray-800 font-mono">
                 {this.state.error?.message || "Unknown Critical Error"}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Fatal: Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);