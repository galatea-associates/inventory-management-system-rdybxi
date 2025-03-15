import React, { useState, useEffect } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // react-router-dom ^6.10.0
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';
import Page from '../../components/layout/Page';
import Alert from '../../components/common/Alert';
import { ROUTES } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';

/**
 * @emotion/styled component for the reset password page container with centered content
 */
const ResetPasswordContainer = styled.div`
  display: flex; /* Display flex for centering content */
  flex-direction: column; /* Flex direction column for vertical layout */
  align-items: center; /* Align items center for horizontal centering */
  justify-content: center; /* Justify content center for vertical centering */
  min-height: 100vh; /* Min-height 100vh to fill the viewport */
  padding: 20px; /* Padding for spacing */
`;

/**
 * @emotion/styled component for the content container of the reset password form
 */
const ResetPasswordContent = styled.div`
  width: 100%; /* Width 100% with max-width constraint */
  max-width: 400px;
  margin: auto; /* Margin auto for centering */
  padding: 20px; /* Padding for internal spacing */
`;

/**
 * @emotion/styled component for the container of the application logo
 */
const LogoContainer = styled.div`
  text-align: center; /* Text align center for centering */
  margin-bottom: 20px; /* Margin bottom for spacing */
  width: 100%; /* Width 100% for full width */
`;

/**
 * @emotion/styled component for the application logo image
 */
const Logo = styled.img`
  max-width: 150px; /* Max width constraint */
  height: auto; /* Height auto for proper scaling */
`;

/**
 * @emotion/styled component for the container of error messages
 */
const ErrorContainer = styled.div`
  margin-bottom: 20px; /* Margin bottom for spacing */
  width: 100%; /* Width 100% for full width */
`;

/**
 * Reset password page component that validates the token and renders the reset password form
 * @returns Rendered reset password page component
 */
const ResetPassword: React.FC = () => {
  // 1. Get token parameter from URL using useParams hook
  const { token } = useParams<{ token: string }>();

  // 2. Get navigate function from useNavigate hook for redirection
  const navigate = useNavigate();

  // 3. Get location object from useLocation hook to access query parameters
  const location = useLocation();

  // 4. Extract successMessage from query parameters if present
  const successMessage = new URLSearchParams(location.search).get('success');

  // 5. Initialize state for token validation status and error message
  const [isValidToken, setIsValidToken] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 6. Get authentication functions from useAuth hook
  const { validateResetToken } = useAuth();

  /**
   * Validates the reset token on component mount
   * @returns Promise<void> Promise that resolves when token validation is complete
   */
  const validateToken = async (): Promise<void> => {
    // 1. Set loading state to true
    setIsLoading(true);
    try {
      // 2. Call validateResetToken function from useAuth with token from URL
      if (token) {
        await validateResetToken(token);
        // 3. Handle successful validation by setting isValidToken to true
        setIsValidToken(true);
        setErrorMessage(null);
      } else {
        // Handle missing token
        setIsValidToken(false);
        setErrorMessage('Missing reset token.');
      }
    } catch (error: any) {
      // 4. Handle validation errors by setting isValidToken to false and updating error message
      setIsValidToken(false);
      setErrorMessage(error.message || 'Invalid reset token.');
    } finally {
      // 5. Set loading state to false when complete
      setIsLoading(false);
    }
  };

  /**
   * Handles successful password reset by redirecting to login page
   * @returns void No return value
   */
  const handleResetSuccess = (): void => {
    // 1. Navigate to login page with success message in query parameters
    navigate(`${ROUTES.AUTH_ROUTES.LOGIN}?success=true`);
  };

  // Validate token on component mount
  useEffect(() => {
    validateToken();
  }, [token, validateResetToken]);

  // Render the reset password page
  return (
    <Page title="Reset Password">
      <ResetPasswordContainer>
        <ResetPasswordContent>
          {successMessage && (
            <Alert severity="success">
              Your password has been successfully reset. Please log in with your new password.
            </Alert>
          )}
          {isLoading ? (
            <p>Loading...</p>
          ) : errorMessage ? (
            <ErrorContainer>
              <Alert severity="error">{errorMessage}</Alert>
            </ErrorContainer>
          ) : isValidToken ? (
            <ResetPasswordForm onResetSuccess={handleResetSuccess} />
          ) : (
            <ErrorContainer>
              <Alert severity="error">Invalid or expired reset token.</Alert>
            </ErrorContainer>
          )}
        </ResetPasswordContent>
      </ResetPasswordContainer>
    </Page>
  );
};

export default ResetPassword;