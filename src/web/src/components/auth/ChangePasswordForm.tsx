import React, { useState, useEffect } from 'react'; // react 18.2.0
import styled from '@emotion/styled'; // @emotion/styled
import Input from '../common/Input';
import Button from '../common/Button';
import FormControl from '../common/FormControl';
import FormGroup from '../common/FormGroup';
import { useAuth } from '../../hooks/useAuth';
import { validatePassword, validatePasswordMatch, validateRequired } from '../../utils/validation';

/**
 * Interface defining the props for the ChangePasswordForm component
 */
interface ChangePasswordFormProps {
  /** Callback function to execute on successful password change */
  onSuccess: () => void;
  /** Callback function to execute on cancel */
  onCancel: () => void;
}

/**
 * Interface defining the state for the ChangePasswordForm component
 */
interface ChangePasswordFormState {
  /** Current password input */
  currentPassword: string;
  /** New password input */
  newPassword: string;
  /** Confirm new password input */
  confirmPassword: string;
}

/**
 * Interface defining the validation errors for the ChangePasswordForm component
 */
interface ChangePasswordFormErrors {
  /** Error message for current password */
  currentPassword: string | null;
  /** Error message for new password */
  newPassword: string | null;
  /** Error message for confirm password */
  confirmPassword: string | null;
}

/**
 * Styled container for the password change form
 */
const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  margin: 20px auto;
  max-width: 500px;
  gap: 16px;
`;

/**
 * Styled container for form buttons
 */
const ButtonGroup = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 20px;
  gap: 10px;
`;

/**
 * Styled container for success and error messages
 */
const MessageContainer = styled.div<{ type: 'success' | 'error' }>`
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  background-color: ${props => props.type === 'success' ? '#d4edda' : '#f8d7da'};
  color: ${props => props.type === 'success' ? '#155724' : '#721c24'};
`;

/**
 * A form component for changing user passwords
 */
const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({ onSuccess, onCancel }) => {
  // Initialize form state
  const [form, setForm] = useState<ChangePasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Initialize validation errors state
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({
    currentPassword: null,
    newPassword: null,
    confirmPassword: null,
  });

  // Initialize loading state
  const [loading, setLoading] = useState<boolean>(false);

  // Initialize success and error message states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get changePassword function from useAuth hook
  const { changePassword } = useAuth();

  /**
   * Handles input changes and updates the form state
   * @param e - The input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });
    setErrors({
      ...errors,
      [name]: null, // Clear the error for the field being changed
    });
  };

  /**
   * Validates the form and returns true if all fields are valid
   * @returns True if the form is valid, false otherwise
   */
  const validateForm = (): boolean => {
    let isValid = true;
    const newErrors: ChangePasswordFormErrors = {
      currentPassword: validateRequired(form.currentPassword, 'Current Password'),
      newPassword: validatePassword(form.newPassword),
      confirmPassword: validatePasswordMatch(form.newPassword, form.confirmPassword),
    };

    if (newErrors.currentPassword) {
      isValid = false;
    }
    if (newErrors.newPassword) {
      isValid = false;
    }
    if (newErrors.confirmPassword) {
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  /**
   * Handles form submission
   * @param e - The form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        await changePassword({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        });
        setSuccessMessage('Password changed successfully!');
        setForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setErrors({
          currentPassword: null,
          newPassword: null,
          confirmPassword: null,
        });
        onSuccess();
      } catch (error: any) {
        setErrorMessage(error.message || 'Failed to change password.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <FormContainer>
      <h2>Change Password</h2>
      {successMessage && (
        <MessageContainer type="success">
          {successMessage}
        </MessageContainer>
      )}
      {errorMessage && (
        <MessageContainer type="error">
          {errorMessage}
        </MessageContainer>
      )}
      <form onSubmit={handleSubmit}>
        <FormGroup spacing="comfortable">
          <FormControl error={!!errors.currentPassword}>
            <Input
              label="Current Password"
              type="password"
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              error={errors.currentPassword}
              required
            />
          </FormControl>
          <FormControl error={!!errors.newPassword}>
            <Input
              label="New Password"
              type="password"
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              error={errors.newPassword}
              helperText="Must be at least 8 characters and include uppercase, lowercase, number, and special character"
              required
            />
          </FormControl>
          <FormControl error={!!errors.confirmPassword}>
            <Input
              label="Confirm New Password"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
            />
          </FormControl>
        </FormGroup>
        <ButtonGroup>
          <Button type="submit" variant="contained" color="primary" loading={loading}>
            Change Password
          </Button>
          <Button type="button" variant="outlined" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        </ButtonGroup>
      </form>
    </FormContainer>
  );
};

export default ChangePasswordForm;