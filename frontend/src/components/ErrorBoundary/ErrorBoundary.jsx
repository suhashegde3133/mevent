import React from 'react';
import logger from '../../utils/logger';
import { notify } from '../../utils/notifications';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child component tree and:
 * - Logs them appropriately based on environment
 * - Shows a user-friendly fallback UI
 * - Prevents entire app from crashing
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so next render shows fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error
    logger.error('React Error Boundary caught an error', {
      error: error.message,
      componentStack: errorInfo.componentStack
    }, 'ErrorBoundary');

    this.setState({
      error,
      errorInfo
    });

    // Show user notification
    notify.error('Something went wrong. Please refresh the page or try again.');

    // In production, you would send this to an error reporting service
    // e.g., Sentry, LogRocket, etc.
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrapper}>
              <span style={styles.icon}>⚠️</span>
            </div>
            <h2 style={styles.title}>Oops! Something went wrong</h2>
            <p style={styles.message}>
              We're sorry, but something unexpected happened. 
              Please try refreshing the page or click the button below.
            </p>
            <div style={styles.buttonGroup}>
              <button 
                style={styles.primaryButton}
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              <button 
                style={styles.secondaryButton}
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Technical Details</summary>
                <pre style={styles.errorStack}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    background: '#f3f4f6',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
  },
  iconWrapper: {
    marginBottom: '20px'
  },
  icon: {
    fontSize: '48px'
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#111827'
  },
  message: {
    margin: '0 0 24px 0',
    fontSize: '1rem',
    color: '#6b7280',
    lineHeight: '1.6'
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  primaryButton: {
    padding: '12px 24px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 150ms ease'
  },
  secondaryButton: {
    padding: '12px 24px',
    background: '#fff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 150ms ease'
  },
  details: {
    marginTop: '24px',
    textAlign: 'left'
  },
  summary: {
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '0.875rem',
    marginBottom: '8px'
  },
  errorStack: {
    background: '#1f2937',
    color: '#f87171',
    padding: '16px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    overflow: 'auto',
    maxHeight: '200px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  }
};

export default ErrorBoundary;
