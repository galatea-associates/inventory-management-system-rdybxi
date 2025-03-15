import React, { Component, ErrorInfo, ReactNode } from 'react'; // react ^18.2.0
import Alert from './Alert';
import Button from './Button';
import { errorService } from '../../services/error.service';
import { error as logError } from '../../utils/logger';
import styled from '../../styles/utils';
import { spacing } from '../../styles/variables';

/**
 * @interface ErrorBoundaryProps
 * @description Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /**
   * @property {React.ReactNode} children
   * @description React children to render within the ErrorBoundary
   */
  children: React.ReactNode;
  /**
   * @property {React.ComponentType<FallbackProps>} FallbackComponent
   * @description Optional component to render as a fallback UI
   */
  FallbackComponent?: React.ComponentType<FallbackProps>;
  /**
   * @property {function(error: Error, errorInfo: ErrorInfo): void} onError
   * @description Optional callback function to handle errors
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * @property {function(): void} onReset
   * @description Optional callback function to handle reset events
   */
  onReset?: () => void;
}

/**
 * @interface FallbackProps
 * @description Props for the fallback component
 */
export interface FallbackProps {
  /**
   * @property {Error} error
   * @description The error that was caught by the ErrorBoundary
   */
  error: Error;
  /**
   * @property {function(): void} resetErrorBoundary
   * @description Function to reset the error boundary state
   */
  resetErrorBoundary: () => void;
}

/**
 * @interface ErrorBoundaryState
 * @description State for the ErrorBoundary component
 */
export interface ErrorBoundaryState {
  /**
   * @property {boolean} hasError
   * @description Flag indicating whether an error has occurred
   */
  hasError: boolean;
  /**
   * @property {Error | null} error
   * @description The error that was caught, or null if no error
   */
  error: Error | null;
}

/**
 * @styled_component ErrorContainer
 * @description Styled container for the error UI
 */
const ErrorContainer = styled.div`
  padding: ${spacing.xl}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: ${spacing.md}px;
`;

/**
 * @class ErrorBoundary
 * @extends {Component<ErrorBoundaryProps, ErrorBoundaryState>}
 * @description React error boundary component that catches errors in the component tree
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /**
   * @constructor
   * @param {ErrorBoundaryProps} props - The component props
   * @description Initializes the error boundary component
   */
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * @static getDerivedStateFromError
   * @param {Error} error - The error that was thrown
   * @returns {ErrorBoundaryState} Updated state to render fallback UI
   * @description Static lifecycle method called when an error is thrown in a descendant component
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * @function componentDidCatch
   * @param {Error} error - The error that was thrown
   * @param {ErrorInfo} errorInfo - Information about the error
   * @returns {void} No return value
   * @description Lifecycle method called after an error has been thrown by a descendant component
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logError(error.message, { stack: errorInfo.componentStack });
    errorService.handleError(error);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * @function handleReset
   * @returns {void} No return value
   * @description Resets the error state and attempts to recover
   */
  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  /**
   * @function render
   * @returns {React.ReactNode} The rendered component
   * @description Renders either the error UI or the children based on error state
   */
  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.FallbackComponent) {
        const Fallback = this.props.FallbackComponent;
        return <Fallback error={this.state.error as Error} resetErrorBoundary={this.handleReset} />;
      }
      return (
        <ErrorContainer>
          <Alert severity="error" title="Oops! Something went wrong.">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Alert>
          <Button onClick={this.handleReset}>Try again</Button>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

ErrorBoundary.defaultProps = {
  onError: undefined,
  onReset: undefined,
  FallbackComponent: undefined,
};

export default ErrorBoundary;