import React, { useState, useEffect } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useNavigate, useParams, Link } from 'react-router-dom'; // react-router-dom ^6.10.0
import { LockOutlined } from '@mui/icons-material'; // @mui/icons-material 5.13
import Input from '../common/Input';
import Button from '../common/Button';
import Card from '../common/Card';
import FormControl from '../common/FormControl';
import FormError from '../common/FormError';
import {
  validateRequired,
  validatePassword,
  validatePasswordMatch,
} from '../../utils/validation';
import { resetPassword, validateResetToken } from '../../api/auth';

/**
 * Props for the ResetPasswordForm component
 */
interface ResetPasswordFormProps {
  /** Title for the reset password form */
  title?: string;
  /** Subtitle for the reset password form */
  subtitle?: string;
  /** URL to redirect to after successful reset */
  successRedirectUrl?: string;
}

/**
 * Form data for password reset
 */
interface ResetPasswordFormData {
  /** New password */
  newPassword?: string;
  /** Confirm password */
  confirmPassword?: string;
}

/**
 * Validation errors for reset password form
 */
interface ResetPasswordFormErrors {
  /** Error for new password field */
  newPassword?: string | null;
  /** Error for confirm password field */
  confirmPassword?: string | null;
}

/**
 * State for token validation
 */
interface TokenValidationState {
  /** Whether the token is valid */
  isValid: boolean;
  /** Whether the token validation is loading */
  isLoading: boolean;
  /** Error message for token validation */
  error: string | null;
}

/**
 * Container for the reset password form
 */
const ResetPasswordFormContainer = styled.div`
  display: flex; /* Display flex for centering content */
  flex-direction: column; /* Flex direction column for vertical layout */
  padding: 20px; /* Padding for spacing around form elements */
  max-width: 400px; /* Max-width to constrain form width */
  margin: auto; /* Margin auto for horizontal centering */
`;

/**
 * Title for the reset password form
 */
const FormTitle = styled.h2`
  font-size: 1.5rem; /* Font size and weight for emphasis */
  font-weight: bold;
  margin-bottom: 1rem; /* Margin bottom for spacing */
  text-align: center; /* Text align center for alignment */
  color: #333; /* Color from theme for consistency */
`;

/**
 * Subtitle for the reset password form
 */
const FormSubtitle = styled.p`
  font-size: 1rem; /* Font size and weight for hierarchy */
  font-weight: normal;
  margin-bottom: 20px; /* Margin bottom for spacing */
  text-align: center; /* Text align center for alignment */
  color: #666; /* Color from theme for consistency */
`;

/**
 * Error message display
 */
const ErrorMessage = styled.div`
  color: #d32f2f; /* Color error from theme */
  margin-top: 10px; /* Margin top and bottom for spacing */
  margin-bottom: 10px;
  padding: 8px; /* Padding for emphasis */
  border-radius: 4px; /* Border radius for rounded corners */
  background-color: #fdecec; /* Background color for visual distinction */
`;

/**
 * Link to login page
 */
const LoginLink = styled(Link)`
  text-decoration: none; /* Text decoration none for clean appearance */
  color: #1976d2; /* Color from theme for consistency */
  margin-top: 20px; /* Margin top for spacing */
  text-align: center; /* Text align center for positioning */
  font-size: 0.9rem; /* Font size for appropriate scale */
  &:hover {
    text-decoration: underline; /* Hover state for interactive feedback */
  }
`;

/**
 * Wrapper for the lock icon
 */
const IconWrapper = styled.div`
  display: flex; /* Display flex for centering */
  justify-content: center; /* Justify content center for horizontal alignment */
  margin-bottom: 20px; /* Margin bottom for spacing */
  color: #777; /* Color from theme for consistency */
`;

/**
 * Validates the reset password form fields
 */
const validateForm = (formData: ResetPasswordFormData): ResetPasswordFormErrors => {
  // Initialize empty errors object
  const errors: ResetPasswordFormErrors = {};

  // Validate newPassword field using validateRequired and validatePassword
  errors.newPassword = validateRequired(formData.newPassword, 'New Password') || validatePassword(formData.newPassword);

  // Validate confirmPassword field using validateRequired
  errors.confirmPassword = validateRequired(formData.confirmPassword, 'Confirm Password');

  // Validate password match using validatePasswordMatch
  if (formData.newPassword && formData.confirmPassword) {
    errors.confirmPassword = validatePasswordMatch(formData.newPassword, formData.confirmPassword);
  }

  // Return errors object with validation results
  return errors;
};

/**
 * Reset password form component that handles password reset functionality
 */
const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  title = 'Reset Password',
  subtitle = 'Enter your new password below',
  successRedirectUrl = '/login',
}) => {
  // Initialize form state with newPassword and confirmPassword fields
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    newPassword: '',
    confirmPassword: '',
  });

  // Initialize error state for form validation errors
  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});

  // Initialize loading state for form submission
  const [loading, setLoading] = useState(false);

  // Initialize token validation state
  const [tokenValid, setTokenValid] = useState<TokenValidationState>({
    isValid: false,
    isLoading: true,
    error: null,
  });

  // Extract token from URL parameters using useParams
  const { token } = useParams();

  // Get navigate function from useNavigate hook
  const navigate = useNavigate();

  // Validate the reset token on component mount
  useEffect(() => {
    const validateToken = async () => {
      // Set token validation loading state to true
      setTokenValid((prevState) => ({ ...prevState, isLoading: true, error: null }));
      try {
        // Call validateResetToken function with token from URL
        if (token) {
          await validateResetToken(token);
          // Handle successful validation by setting token valid state to true
          setTokenValid((prevState) => ({ ...prevState, isValid: true }));
        } else {
          // Handle missing token by setting token valid state to false and updating error state
          setTokenValid((prevState) => ({ ...prevState, isValid: false, error: 'Missing token' }));
        }
      } catch (error: any) {
        // Handle validation errors by setting token valid state to false and updating error state
        setTokenValid((prevState) => ({ ...prevState, isValid: false, error: error.message }));
      } finally {
        // Set token validation loading state to false when complete
        setTokenValid((prevState) => ({ ...prevState, isLoading: false }));
      }
    };

    validateToken();
  }, [token]);

  // Define form submission handler
  const handleSubmit = async (event: React.FormEvent) => {
    // Prevent default form submission behavior
    event.preventDefault();

    // Validate form fields
    const validationErrors = validateForm(formData);

    // If validation errors exist, update error state and return
    if (Object.keys(validationErrors).length > 0 && Object.values(validationErrors).some(error => error !== null)) {
      setErrors(validationErrors);
      return;
    }

    // Set loading state to true
    setLoading(true);
    try {
      // Call resetPassword function with token and new password
      if (token && formData.newPassword) {
        await resetPassword({ token, newPassword: formData.newPassword });
        // Handle successful reset by navigating to login page with success message
        navigate(successRedirectUrl, { state: { resetSuccess: true } });
      }
    } catch (error: any) {
      // Handle reset errors by updating error state
      setErrors({ resetError: error.message });
    } finally {
      // Set loading state to false when complete
      setLoading(false);
    }
  };

  // Define validation function for form fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Render reset password form with Card component
  return (
    <ResetPasswordFormContainer>
      <Card>
        <form onSubmit={handleSubmit}>
          <IconWrapper>
            <LockOutlined fontSize="large" />
          </IconWrapper>
          <FormTitle>{title}</FormTitle>
          <FormSubtitle>{subtitle}</FormSubtitle>

          {/* Render password input fields with validation */}
          <FormControl error={!!errors.newPassword} fullWidth>
            <Input
              label="New Password"
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
              required
            />
          </FormControl>

          <FormControl error={!!errors.confirmPassword} fullWidth>
            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
            />
          </FormControl>

          {/* Render reset button with loading state */}
          <Button type="submit" variant="contained" color="primary" fullWidth loading={loading} disabled={tokenValid.isLoading || !tokenValid.isValid}>
            Reset Password
          </Button>

          {/* Render login link for returning to login page */}
          <LoginLink to="/login">Back to Login</LoginLink>

          {/* Render error message if token is invalid or reset fails */}
          {tokenValid.error && <ErrorMessage>{tokenValid.error}</ErrorMessage>}
          {errors.resetError && <ErrorMessage>{errors.resetError}</ErrorMessage>}
        </form>
      </Card>
    </ResetPasswordFormContainer>
  );
};

export default ResetPasswordForm;