import React from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { FormGroup as MuiFormGroup, FormGroupProps } from '@mui/material'; // @mui/material 5.13
import { colors, spacing } from '../../styles/variables';
import { flexColumn } from '../../styles/mixins';

/**
 * Props specific to the custom FormGroup component
 */
export interface CustomFormGroupProps {
  /**
   * Controls spacing between form elements
   * @default "normal"
   */
  spacing: string;
}

/**
 * Styled version of Material-UI FormGroup with custom styling
 */
export const StyledFormGroup = styled(MuiFormGroup)<FormGroupProps & CustomFormGroupProps>`
  ${props => !props.row && flexColumn()};
  
  ${props => props.row && `
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
  `}
  
  /* Apply spacing between form elements */
  ${props => {
    switch(props.spacing) {
      case 'dense':
        return `
          & > * + * {
            margin-top: ${props.row ? 0 : spacing.xs}px;
            margin-left: ${props.row ? spacing.xs : 0}px;
          }
        `;
      case 'comfortable':
        return `
          & > * + * {
            margin-top: ${props.row ? 0 : spacing.md}px;
            margin-left: ${props.row ? spacing.md : 0}px;
          }
        `;
      case 'loose':
        return `
          & > * + * {
            margin-top: ${props.row ? 0 : spacing.lg}px;
            margin-left: ${props.row ? spacing.lg : 0}px;
          }
        `;
      case 'normal':
      default:
        return `
          & > * + * {
            margin-top: ${props.row ? 0 : spacing.sm}px;
            margin-left: ${props.row ? spacing.sm : 0}px;
          }
        `;
    }
  }}
  
  /* Ensure consistent styling with other form components */
  padding: ${spacing.xs}px 0;
  
  /* Maintain proper margins for form layout consistency */
  margin-bottom: ${spacing.sm}px;
`;

/**
 * Enhanced form group component with custom styling and additional features.
 * Extends Material-UI's FormGroup with application-specific styling and accessibility.
 */
const FormGroup = React.memo<FormGroupProps & CustomFormGroupProps>(({
  row = false,
  spacing = 'normal',
  children,
  ...props
}) => {
  return (
    <StyledFormGroup
      row={row}
      spacing={spacing}
      role="group"
      aria-labelledby={props['aria-labelledby']}
      {...props}
    >
      {children}
    </StyledFormGroup>
  );
});

export default FormGroup;