import React from 'react';
import styled from '@emotion/styled';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // v5.13
import { colors, spacing } from '../../styles/variables';
import FormHelperText from './FormHelperText';

/**
 * Props for the FormError component
 */
export interface FormErrorProps {
  /** The error message to display */
  children: React.ReactNode;
  /** The id attribute for associating the error with a form control */
  id: string;
}

/**
 * Styled wrapper for the error icon
 */
const ErrorIconWrapper = styled.div`
  display: flex;
  margin-right: ${spacing.xs}px;
  color: ${colors.error.main};
`;

/**
 * Styled version of FormHelperText with error styling
 */
export const StyledFormError = styled(FormHelperText)`
  color: ${colors.error.main};
  display: flex;
  align-items: center;
  margin-top: ${spacing.xs}px;
  font-weight: ${typography => typography.fontWeights?.medium || 500};
`;

/**
 * Specialized form error message component with error styling and icon.
 * 
 * This component extends FormHelperText to display validation error messages with
 * appropriate styling and accessibility features for form controls with error states.
 * 
 * @example
 * <FormError id="password-error">
 *   Password must be at least 8 characters
 * </FormError>
 */
const FormError = React.memo<FormErrorProps>((props) => {
  const { children, id, ...rest } = props;

  return (
    <StyledFormError 
      id={id}
      error={true}
      aria-live="assertive"
      role="alert"
      {...rest}
    >
      <ErrorIconWrapper>
        <ErrorOutlineIcon fontSize="small" />
      </ErrorIconWrapper>
      {children}
    </StyledFormError>
  );
});

// Display name for debugging
FormError.displayName = 'FormError';

export default FormError;