import React from 'react';
import styled from '@emotion/styled';
import { FormLabel as MUIFormLabel, FormLabelProps } from '@mui/material'; // @mui/material 5.13
import { colors, typography, spacing } from '../../styles/variables';
import { focusVisible } from '../../styles/mixins';

/**
 * Props specific to the custom FormLabel component
 */
export interface CustomFormLabelProps {
  // Custom props can be added here as needed
}

/**
 * Styled version of Material-UI FormLabel with custom styling
 */
export const StyledFormLabel = styled(MUIFormLabel)<FormLabelProps & CustomFormLabelProps>`
  font-family: ${typography.fontFamily};
  font-size: ${typography.fontSizes.sm};
  font-weight: ${typography.fontWeights.medium};
  color: ${({ error }) => error ? colors.error.main : colors.text.primary};
  margin-bottom: ${spacing.xs}px;
  
  &.Mui-disabled {
    color: ${colors.text.disabled};
  }
  
  /* Apply focus visible styling for keyboard navigation */
  ${focusVisible()}
  
  /* Style the required asterisk */
  .MuiFormLabel-asterisk {
    color: ${colors.error.main};
    margin-left: ${spacing.xs / 2}px;
  }
`;

/**
 * Enhanced form label component with custom styling and additional features
 * 
 * Extends Material-UI's FormLabel with design system styling and improved
 * accessibility support.
 */
const FormLabel = React.memo(({ 
  error = false,
  required = false,
  disabled = false,
  htmlFor,
  children,
  ...props
}: FormLabelProps & CustomFormLabelProps) => {
  return (
    <StyledFormLabel
      error={error}
      required={required}
      disabled={disabled}
      htmlFor={htmlFor}
      aria-required={required}
      {...props}
    >
      {children}
    </StyledFormLabel>
  );
});

FormLabel.displayName = 'FormLabel';

export default FormLabel;