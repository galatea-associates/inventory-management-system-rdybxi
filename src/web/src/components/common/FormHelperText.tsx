import React from 'react';
import styled from '@emotion/styled';
import { FormHelperText as MuiFormHelperText, FormHelperTextProps } from '@mui/material';
import { colors, typography, spacing } from '../../styles/variables';

/**
 * Props specific to the custom FormHelperText component
 * Provides an extension point for future customizations
 */
export interface CustomFormHelperTextProps {
  // No additional props yet, but provides extension point for future customizations
}

/**
 * Styled version of Material-UI FormHelperText with custom styling
 * Applies design system tokens for consistent appearance across the application
 */
export const StyledFormHelperText = styled(MuiFormHelperText)<FormHelperTextProps>`
  font-family: ${typography.fontFamily};
  font-size: ${typography.fontSizes.xs};
  font-weight: ${typography.fontWeights.regular};
  line-height: ${typography.lineHeights.md};
  color: ${({ error, disabled }) => 
    error 
      ? colors.error.main 
      : disabled 
        ? colors.text.disabled 
        : colors.text.secondary
  };
  margin-top: ${spacing.xs}px;
  margin-left: ${spacing.xs}px;
`;

/**
 * Enhanced form helper text component with custom styling and additional features.
 * 
 * This component extends Material-UI's FormHelperText with design system integration,
 * consistent styling, and proper accessibility attributes. The id prop can be used 
 * to associate this helper text with a form control via aria-describedby.
 * 
 * @example
 * <TextField 
 *   id="password" 
 *   aria-describedby="password-helper-text"
 * />
 * <FormHelperText id="password-helper-text">
 *   Password must be at least 8 characters.
 * </FormHelperText>
 */
const FormHelperText = React.memo<FormHelperTextProps & CustomFormHelperTextProps>(
  (props) => {
    const { children, id, ...rest } = props;
    
    return (
      <StyledFormHelperText 
        id={id}
        {...rest}
      >
        {children}
      </StyledFormHelperText>
    );
  }
);

// Display name for debugging
FormHelperText.displayName = 'FormHelperText';

FormHelperText.defaultProps = {
  disabled: false
};

export default FormHelperText;