import React, { useState, useEffect } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { Link } from 'react-router-dom'; // react-router-dom ^6.11.2
import Button from '../common/Button';
import Input from '../common/Input';
import Card from '../common/Card';
import Typography from '../common/Typography';
import Alert from '../common/Alert';
import { forgotPassword } from '../../services/auth.service';
import { validateEmail, validateRequired } from '../../utils/validation';

/**
 * Interface for the ForgotPasswordForm component props
 */
interface ForgotPasswordFormProps {
  className?: string;
  onSuccess?: () => void;
}

/**
 * Interface for the forgot password form data
 */
interface ForgotPasswordFormData {
  email: string;
}

/**
 * Interface for the forgot password form errors
 */
interface ForgotPasswordFormErrors {
  email: string | null;
}

/**
 * Container for the forgot password form
 */
const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 400px;
  margin: auto;
`;

/**
 * Title for the forgot password form
 */
const FormTitle = styled(Typography)`
  variant: h5;
  margin-bottom: 8px;
  text-align: center;
  font-weight: bold;
`;

/**
 * Subtitle for the forgot password form
 */
const FormSubtitle = styled(Typography)`
  variant: body1;
  margin-bottom: 16px;
  text-align: center;
  color: text.secondary;
`;

/**
 * Container for form action buttons
 */
const FormActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
`;

/**
 * Link to return to login page
 */
const LoginLink = styled(Link)`
  text-align: center;
  margin-top: 16px;
  text-decoration: none;
  color: primary.main;

  &:hover {
    text-decoration: underline;
  }
`;

/**
 * Component for the forgot password form
 */
const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ className = '', onSuccess }) => {
  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  });
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({
    email: null,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /**
   * Validates the forgot password form fields
   */
  const validateForm = (formData: ForgotPasswordFormData): ForgotPasswordFormErrors => {
    const newErrors: ForgotPasswordFormErrors = {
      email: null,
    };

    newErrors.email = validateRequired(formData.email, 'Email') || validateEmail(formData.email, 'Email');

    return newErrors;
  };

  /**
   * Handles form submission and password reset request
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationErrors = validateForm(formData);
    if (validationErrors.email) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      await forgotPassword({ email: formData.email });
      setSuccess(true);
      setErrors({ email: null });
      setFormData({ email: '' });
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setErrors({ email: error.message || 'Failed to send reset email. Please try again.' });
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <FormContainer>
        <FormTitle variant="h5">Forgot Password</FormTitle>
        <FormSubtitle variant="body1">
          Enter your email address and we'll send you a link to reset your password.
        </FormSubtitle>

        {success && (
          <Alert severity="success">
            A password reset link has been sent to your email address.
          </Alert>
        )}

        {errors.email && (
          <Alert severity="error">
            {errors.email}
          </Alert>
        )}

        <Input
          label="Email Address"
          type="email"
          name="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          fullWidth
          required
        />

        <FormActions>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </FormActions>

        <LoginLink to="/login">
          Back to Login
        </LoginLink>
      </FormContainer>
    </Card>
  );
};

export default ForgotPasswordForm;