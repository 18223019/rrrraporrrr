/**
 * Error Boundary - Catch React errors and show fallback
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ 
            background: '#fee2e2', 
            border: '2px solid #ef4444', 
            borderRadius: '8px', 
            padding: '1.5rem',
            marginBottom: '1rem'
          }}>
            <h1 style={{ color: '#991b1b', margin: '0 0 1rem 0' }}>
              ⚠️ React Error Caught
            </h1>
            <p style={{ margin: '0 0 1rem 0' }}>
              Something went wrong rendering the app. See details below:
            </p>
          </div>

          <div style={{ 
            background: '#1f2937', 
            color: '#f9fafb', 
            padding: '1rem', 
            borderRadius: '8px',
            marginBottom: '1rem',
            overflow: 'auto'
          }}>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Error Message:</h2>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
              {this.state.error?.toString()}
            </pre>
          </div>

          {this.state.errorInfo && (
            <div style={{ 
              background: '#1f2937', 
              color: '#f9fafb', 
              padding: '1rem', 
              borderRadius: '8px',
              overflow: 'auto'
            }}>
              <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Component Stack:</h2>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}

          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            background: '#fef3c7', 
            borderRadius: '8px',
            border: '1px solid #f59e0b'
          }}>
            <p style={{ margin: 0 }}>
              <strong>To fix:</strong> Check the console for more details, fix the error in your code, and refresh the page.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
