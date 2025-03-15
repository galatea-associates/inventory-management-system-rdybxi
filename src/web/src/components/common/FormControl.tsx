import React from 'react';
import styled from '@emotion/styled';
import { FormControl as MuiFormControl, FormControlProps } from '@mui/material'; // @mui/material 5.13
import { colors, spacing } from '../../styles/variables';
import { flexColumn } from '../../styles/mixins';

/**
 * Props specific to the custom FormControl component
 */
export interface CustomFormControlProps {
  error?: boolean;
  fullWidth?: boolean;
}

/**
 * Styled version of Material-UI FormControl with custom styling
 */
export const StyledFormControl = styled(MuiFormControl)<FormControlProps & CustomFormControlProps>`
  ${flexColumn()};
  margin-bottom: ${spacing.md}px;
  
  /* Set width based on fullWidth prop */
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  /* Error state styling */
  ${props => props.error && `
    & .MuiInputBase-root {
      border-color: ${colors.error.main};
    }
    
    & .MuiFormLabel-root {
      color: ${colors.error.main};
    }
    
    & .MuiFormHelperText-root {
      color: ${colors.error.main};
    }
  `}
  
  /* Disabled state styling */
  ${props => props.disabled && `
    opacity: 0.7;
    cursor: not-allowed;
    
    & .MuiInputBase-root {
      background-color: ${colors.grey[100]};
    }
  `}
`;

/**
 * Enhanced form control component with custom styling and additional features.
 * This component extends the Material-UI FormControl component with consistent
 * styling and improved accessibility features.
 */
const FormControl = React.memo<FormControlProps & CustomFormControlProps>((props) => {
  const { 
    error = false, 
    fullWidth = false, 
    disabled = false, 
    required = false, 
    children, 
    ...rest 
  } = props;

  return (
    <StyledFormControl
      error={error}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      aria-invalid={error}
      aria-required={required}
      {...rest}
    >
      {children}
    </StyledFormControl>
  );
});

// Default props
FormControl.defaultProps = {
  error: false,
  fullWidth: false,
  disabled: false,
  required: false,
};

export default FormControl;