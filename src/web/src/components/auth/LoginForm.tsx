import React, { useState, useEffect } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useNavigate, Link } from 'react-router-dom'; // react-router-dom ^6.10.0
import { useAuth } from '../../hooks/useAuth';
import Input from '../common/Input';
import Button from '../common/Button';
import Card from '../common/Card';
import { validateRequired, validateEmail, validatePassword } from '../../utils/validation';

/**
 * Props for the LoginForm component
 */
interface LoginFormProps {
  redirectUrl?: string;
  title?: string;
  subtitle?: string;
  onLoginSuccess?: () => void;
}

/**
 * Form data for login
 */
interface LoginFormData {
  username?: string;
  password?: string;
}

/**
 * Validation errors for login form
 */
interface LoginFormErrors {
  username?: string | null;
  password?: string | null;
  mfaCode?: string | null;
}

/**
 * State for multi-factor authentication
 */
interface MfaState {
  required: boolean;
  sessionId?: string;
  mfaCode?: string;
}

/**
 * Container for the login form
 */
const LoginFormContainer = styled.div`
  display: flex; /* Display flex for centering content */
  flex-direction: column; /* Flex direction column for vertical layout */
  padding: 20px; /* Padding for spacing around form elements */
  max-width: 400px; /* Max-width to constrain form width */
  margin: auto; /* Margin auto for horizontal centering */
`;

/**
 * Title for the login form
 */
const FormTitle = styled.h2`
  font-size: 24px; /* Font size and weight for emphasis */
  font-weight: 500;
  margin-bottom: 16px; /* Margin bottom for spacing */
  text-align: center; /* Text align center for alignment */
  color: #333; /* Color from theme for consistency */
`;

/**
 * Subtitle for the login form
 */
const FormSubtitle = styled.p`
  font-size: 16px; /* Font size and weight for hierarchy */
  font-weight: 400;
  margin-bottom: 24px; /* Margin bottom for spacing */
  text-align: center; /* Text align center for alignment */
  color: #777; /* Color from theme for consistency */
`;

/**
 * Error message display
 */
const ErrorMessage = styled.div`
  color: #d32f2f; /* Color error from theme */
  margin-top: 16px; /* Margin top and bottom for spacing */
  margin-bottom: 16px;
  padding: 8px; /* Padding for emphasis */
  border-radius: 4px; /* Border radius for rounded corners */
  background-color: #fdecec; /* Background color for visual distinction */
`;

/**
 * Link to forgot password page
 */
const ForgotPasswordLink = styled(Link)`
  text-decoration: none; /* Text decoration none for clean appearance */
  color: #1976d2; /* Color from theme for consistency */
  margin-top: 16px; /* Margin top for spacing */
  text-align: right; /* Text align right for positioning */
  font-size: 14px; /* Font size for appropriate scale */

  &:hover { /* Hover state for interactive feedback */
    text-decoration: underline;
  }
`;

/**
 * Login form component that handles user authentication
 */
const LoginForm: React.FC<LoginFormProps> = ({ redirectUrl = '/dashboard', title = 'Sign In', subtitle = 'Enter your credentials to access your account', onLoginSuccess }) => {
  // Initialize form state with username and password fields
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
  });

  // Initialize error state for form validation errors
  const [errors, setErrors] = useState<LoginFormErrors>({});

  // Initialize loading state for form submission
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize MFA state for multi-factor authentication flow
  const [mfa, setMfa] = useState<MfaState>({
    required: false,
    sessionId: undefined,
    mfaCode: undefined,
  });

  // Get authentication functions from useAuth hook
  const { login, verifyMfa, error: authError, mfaSessionId, isAuthenticated } = useAuth();

  // Get navigate function from useNavigate hook
  const navigate = useNavigate();

  // Define validation function for form fields
  const validateForm = (formData: LoginFormData): LoginFormErrors => {
    // Initialize empty errors object
    const errors: LoginFormErrors = {};

    // Validate username field using validateRequired and validateEmail
    errors.username = validateRequired(formData.username, 'Username') || validateEmail(formData.username, 'Username');

    // Validate password field using validateRequired and validatePassword
    errors.password = validateRequired(formData.password, 'Password') || validatePassword(formData.password);

    // Return errors object with validation results
    return errors;
  };

  // Define form submission handler
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission behavior
    event.preventDefault();

    // Validate form fields
    const validationErrors = validateForm(formData);

    // If validation errors exist, update error state and return
    if (validationErrors.username || validationErrors.password) {
      setErrors(validationErrors);
      return;
    }

    // Set loading state to true
    setLoading(true);
    setErrors({});

    try {
      // Call login function from useAuth hook with form data
      await login({ username: formData.username, password: formData.password });

      // Handle successful authentication by navigating to dashboard
      if (isAuthenticated && onLoginSuccess) {
        onLoginSuccess();
        navigate(redirectUrl);
      }

      // Handle MFA requirement by setting MFA state
      if (mfaSessionId) {
        setMfa({ required: true, sessionId: mfaSessionId });
      }
    } catch (error: any) {
      // Handle authentication errors by updating error state
      setErrors({ ...errors, backend: error.message });
    } finally {
      // Set loading state to false when complete
      setLoading(false);
    }
  };

  // Define MFA code submission handler if MFA is required
  const handleMfaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission behavior
    event.preventDefault();

    // Validate MFA code field
    const validationErrors: LoginFormErrors = {};
    if (!mfa.mfaCode) {
      validationErrors.mfaCode = 'MFA code is required';
      setErrors(validationErrors);
      return;
    }

    // Set loading state to true
    setLoading(true);
    setErrors({});

    try {
      // Call verifyMfa function from useAuth hook with MFA code and session ID
      await verifyMfa({ code: mfa.mfaCode, sessionId: mfaSessionId });

      // Handle successful verification by navigating to dashboard
      if (isAuthenticated && onLoginSuccess) {
        onLoginSuccess();
        navigate(redirectUrl);
      }
    } catch (error: any) {
      // Handle verification errors by updating error state
      setErrors({ ...errors, backend: error.message });
    } finally {
      // Set loading state to false when complete
      setLoading(false);
    }
  };

  return (
    <Card>
      <LoginFormContainer>
        {/* Render form title and description */}
        <FormTitle>{title}</FormTitle>
        <FormSubtitle>{subtitle}</FormSubtitle>

        {/* Render error message if authentication fails */}
        {errors.backend && <ErrorMessage>{errors.backend}</ErrorMessage>}

        {/* Render login form with Card component */}
        <form onSubmit={mfa.required ? handleMfaSubmit : handleSubmit}>
          {!mfa.required ? (
            <>
              {/* Render username and password input fields with validation */}
              <Input
                label="Username"
                name="username"
                type="email"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                error={errors.username}
                required
              />
              <Input
                label="Password"
                name="password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password}
                required
              />
            </>
          ) : (
            <>
              {/* Render MFA code input field if MFA is required */}
              <Input
                label="MFA Code"
                name="mfaCode"
                type="text"
                value={mfa.mfaCode || ''}
                onChange={(e) => setMfa({ ...mfa, mfaCode: e.target.value })}
                error={errors.mfaCode}
                required
              />
            </>
          )}

          {/* Render login button with loading state */}
          <Button type="submit" fullWidth loading={loading}>
            {mfa.required ? 'Verify MFA' : 'Sign In'}
          </Button>
        </form>

        {/* Render forgot password link */}
        <ForgotPasswordLink to="/forgot-password">Forgot Password?</ForgotPasswordLink>
      </LoginFormContainer>
    </Card>
  );
};

export default LoginForm;