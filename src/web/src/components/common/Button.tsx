import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { useTheme } from '@mui/material/styles'; // ^5.13
import { buttonBase, focusVisible, transition } from '../../styles/mixins';
import { colors } from '../../styles/variables';
import { ThemeTypes } from '../../types';
import Spinner from './Spinner';

/**
 * Props interface for the Button component
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant of the button */
  variant?: 'contained' | 'outlined' | 'text';
  /** Size of the button */
  size?: 'small' | 'medium' | 'large';
  /** Color scheme of the button */
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  /** Whether the button should take up the full width of its container */
  fullWidth?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Icon to display at the start of the button */
  startIcon?: ReactNode;
  /** Icon to display at the end of the button */
  endIcon?: ReactNode;
  /** Click handler for the button */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Additional CSS class */
  className?: string;
  /** Button content */
  children?: ReactNode;
}

/**
 * Styled button component with variants
 */
const StyledButton = styled.button<{
  variant: string;
  size: string;
  color: string;
  fullWidth: boolean;
  disabled: boolean;
  loading: boolean;
}>`
  ${buttonBase()};
  ${transition()};
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  margin: 0;
  
  /* Variant styles */
  ${props => {
    const colorKey = props.color as keyof typeof colors;
    const colorObj = colors[colorKey] || colors.primary;
    
    switch (props.variant) {
      case 'contained':
        return css`
          background-color: ${colorObj.main};
          color: ${colorObj.contrastText};
          
          &:hover:not(:disabled) {
            background-color: ${colorObj.dark};
          }
          
          &:active:not(:disabled) {
            background-color: ${colorObj.dark};
          }
        `;
      case 'outlined':
        return css`
          background-color: transparent;
          color: ${colorObj.main};
          border: 1px solid ${colorObj.main};
          
          &:hover:not(:disabled) {
            background-color: ${colorObj.main}14; /* 14 is 0.08 opacity in hex */
          }
          
          &:active:not(:disabled) {
            background-color: ${colorObj.main}29; /* 29 is 0.16 opacity in hex */
          }
        `;
      case 'text':
      default:
        return css`
          background-color: transparent;
          color: ${colorObj.main};
          
          &:hover:not(:disabled) {
            background-color: ${colorObj.main}14; /* 14 is 0.08 opacity in hex */
          }
          
          &:active:not(:disabled) {
            background-color: ${colorObj.main}29; /* 29 is 0.16 opacity in hex */
          }
        `;
    }
  }}
  
  /* Size styles */
  ${props => {
    switch (props.size) {
      case 'small':
        return css`
          padding: 4px 10px;
          font-size: 0.8125rem;
          min-height: 32px;
        `;
      case 'large':
        return css`
          padding: 8px 22px;
          font-size: 0.9375rem;
          min-height: 48px;
        `;
      case 'medium':
      default:
        return css`
          padding: 6px 16px;
          font-size: 0.875rem;
          min-height: 40px;
        `;
    }
  }}
  
  /* Width styles */
  ${props => props.fullWidth && css`
    width: 100%;
  `}
  
  /* Disabled styles */
  ${props => props.disabled && css`
    opacity: 0.6;
    cursor: default;
    pointer-events: none;
  `}
  
  /* Loading styles */
  ${props => props.loading && css`
    color: transparent;
    pointer-events: none;
  `}
  
  /* Focus styles */
  ${focusVisible()}
`;

/**
 * Wrapper for button icons
 */
const IconWrapper = styled.span<{ position: 'start' | 'end'; size: string }>`
  display: inline-flex;
  align-items: center;
  margin-left: ${props => props.position === 'end' ? '8px' : '0'};
  margin-right: ${props => props.position === 'start' ? '8px' : '0'};
  
  /* Size adjustments */
  ${props => {
    switch (props.size) {
      case 'small':
        return css`
          font-size: 1rem;
        `;
      case 'large':
        return css`
          font-size: 1.25rem;
        `;
      case 'medium':
      default:
        return css`
          font-size: 1.125rem;
        `;
    }
  }}
`;

/**
 * Wrapper for button content
 */
const ButtonContent = styled.span`
  display: flex;
  align-items: center;
`;

/**
 * Wrapper for loading spinner
 */
const LoadingWrapper = styled.span`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
`;

/**
 * Button component for Inventory Management System UI
 * 
 * Provides a standardized button with consistent styling and behavior across the application.
 * Supports various visual variants, sizes, and states including loading state with spinner indicator.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  const {
    variant = 'contained',
    size = 'medium',
    color = 'primary',
    fullWidth = false,
    disabled = false,
    loading = false,
    startIcon,
    endIcon,
    children,
    className = '',
    type = 'button',
    ...rest
  } = props;
  
  const theme = useTheme();
  
  return (
    <StyledButton
      ref={ref}
      variant={variant}
      size={size}
      color={color}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      loading={loading}
      className={className}
      type={type}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {startIcon && (
        <IconWrapper position="start" size={size}>
          {startIcon}
        </IconWrapper>
      )}
      <ButtonContent>
        {children}
      </ButtonContent>
      {endIcon && (
        <IconWrapper position="end" size={size}>
          {endIcon}
        </IconWrapper>
      )}
      
      {loading && (
        <LoadingWrapper>
          <Spinner 
            size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
            color={variant === 'contained' ? 'white' : color}
          />
        </LoadingWrapper>
      )}
    </StyledButton>
  );
});

Button.displayName = 'Button';

export default Button;