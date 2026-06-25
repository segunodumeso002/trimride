import React, { Component, ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Receives a reset callback. */
  fallback?: (reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * React Error Boundary — catches unhandled render/lifecycle errors in the
 * entire child tree and shows a user-friendly recovery screen instead of
 * a blank white crash.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <RestOfApp />
 *   </ErrorBoundary>
 *
 * Errors are logged to console.error so they appear in Metro and are
 * visible in crash-reporting tools attached to the global error handler.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    const { hasError, errorMessage } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback(this.handleReset);
    }

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>✂️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.subtitle}>
          TrimRide hit an unexpected snag. Your session is safe — tap below to
          retry.
        </Text>
        {__DEV__ && (
          <Text style={styles.devError} numberOfLines={6}>
            {errorMessage}
          </Text>
        )}
        <TouchableOpacity style={styles.button} onPress={this.handleReset}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0f0f0f',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  devError: {
    fontSize: 11,
    color: '#ff6b6b',
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#d4a843',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ErrorBoundary;
