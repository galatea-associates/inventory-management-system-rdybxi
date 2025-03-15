import React from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { Typography as MuiTypography, TypographyProps as MuiTypographyProps } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { typography } from '../../styles/variables';
import { getThemeColor } from '../../styles/utils';

/**
 * Props for the Typography component, extending Material-UI's Typography props
 * with additional customization options specific to the IMS design system.
 */
export interface TypographyProps extends Omit<MuiTypographyProps, 'variant' | 'color'> {
  /** Typography variant that determines base styling */
  variant?: string;
  /** Text color, can be primary, secondary, error, etc. or any theme color */
  color?: string;
  /** Text alignment */
  align?: string;
  /** Whether the text should not wrap */
  noWrap?: boolean;
  /** Whether the text should have a bottom margin */
  gutterBottom?: boolean;
  /** Whether the text should be displayed as a paragraph */
  paragraph?: boolean;
  /** Custom font weight, overrides the variant's default */
  fontWeight?: string | number;
  /** Custom font size, overrides the variant's default */
  fontSize?: string | number;
  /** Custom line height, overrides the variant's default */
  lineHeight?: string | number;
  /** Custom letter spacing, overrides the variant's default */
  letterSpacing?: string | number;
  /** Content to be rendered within the typography component */
  children: React.ReactNode;
  /** Additional class name for custom styling */
  className?: string;
}

/**
 * Styled version of Material-UI's Typography component with IMS design system styling
 */
const StyledTypography = styled(MuiTypography)<TypographyProps>(
  ({ theme, variant = 'body1', color = 'textPrimary', align = 'inherit', noWrap, gutterBottom, paragraph, fontWeight, fontSize, lineHeight, letterSpacing }) => {
    // Base styles from our typography variables
    const baseStyles = {
      fontFamily: typography.fontFamily,
    };

    // Variant-specific styles
    const variantStyles = (() => {
      switch (variant) {
        case 'h1':
          return {
            fontSize: typography.fontSizes.xxxl,
            fontWeight: typography.fontWeights.bold,
            lineHeight: typography.lineHeights.xs,
            letterSpacing: typography.letterSpacings.tight,
          };
        case 'h2':
          return {
            fontSize: typography.fontSizes.xxl,
            fontWeight: typography.fontWeights.bold,
            lineHeight: typography.lineHeights.xs,
            letterSpacing: typography.letterSpacings.tight,
          };
        case 'h3':
          return {
            fontSize: typography.fontSizes.xl,
            fontWeight: typography.fontWeights.bold,
            lineHeight: typography.lineHeights.sm,
            letterSpacing: typography.letterSpacings.normal,
          };
        case 'h4':
          return {
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.medium,
            lineHeight: typography.lineHeights.sm,
            letterSpacing: typography.letterSpacings.normal,
          };
        case 'h5':
          return {
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.medium,
            lineHeight: typography.lineHeights.md,
            letterSpacing: typography.letterSpacings.normal,
          };
        case 'h6':
          return {
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            lineHeight: typography.lineHeights.md,
            letterSpacing: typography.letterSpacings.normal,
          };
        case 'subtitle1':
          return {
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.medium,
            lineHeight: typography.lineHeights.md,
            letterSpacing: typography.letterSpacings.normal,
          };
        case 'subtitle2':
          return {
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
            lineHeight: typography.lineHeights.md,
            letterSpacing: typography.letterSpacings.normal,
          };
        case 'body1':
          return {
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.regular,
            lineHeight: typography.lineHeights.md,
            letterSpacing: typography.letterSpacings.normal,
          };
        case 'body2':
          return {
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.regular,
            lineHeight: typography.lineHeights.md,
            letterSpacing: typography.letterSpacings.normal,
          };
        case 'caption':
          return {
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.regular,
            lineHeight: typography.lineHeights.md,
            letterSpacing: typography.letterSpacings.normal,
          };
        case 'overline':
          return {
            fontSize: typography.fontSizes.xs,
            fontWeight: typography.fontWeights.medium,
            lineHeight: typography.lineHeights.md,
            letterSpacing: typography.letterSpacings.wide,
            textTransform: 'uppercase',
          };
        default:
          return {
            fontSize: typography.fontSizes.md,
            fontWeight: typography.fontWeights.regular,
            lineHeight: typography.lineHeights.md,
            letterSpacing: typography.letterSpacings.normal,
          };
      }
    })();

    // Color styles
    const colorStyles = {
      color: getThemeColor(color),
    };

    // Custom property overrides
    const customStyles = {
      ...(fontWeight && { fontWeight }),
      ...(fontSize && { fontSize }),
      ...(lineHeight && { lineHeight }),
      ...(letterSpacing && { letterSpacing }),
      textAlign: align,
      ...(noWrap && {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
      ...(gutterBottom && {
        marginBottom: '0.35em',
      }),
      ...(paragraph && {
        marginBottom: '16px',
      }),
    };

    // Responsive styles for different screen sizes
    const responsiveStyles = css`
      @media (max-width: 600px) {
        ${variant === 'h1' && { fontSize: typography.fontSizes.xxl }}
        ${variant === 'h2' && { fontSize: typography.fontSizes.xl }}
        ${variant === 'h3' && { fontSize: typography.fontSizes.lg }}
      }
    `;

    return {
      ...baseStyles,
      ...variantStyles,
      ...colorStyles,
      ...customStyles,
      ...responsiveStyles,
    };
  }
);

/**
 * Typography component for the Inventory Management System
 * 
 * This component provides consistent text styling across the application, with
 * support for all standard typographic variants, custom styling options, and
 * responsive behavior.
 * 
 * @example
 * // Basic usage
 * <Typography variant="h1">Heading 1</Typography>
 * 
 * // With custom styling
 * <Typography 
 *   variant="body1" 
 *   color="primary" 
 *   fontWeight={500} 
 *   gutterBottom
 * >
 *   This is a paragraph with custom styling
 * </Typography>
 */
const Typography = React.memo(({
  variant = 'body1',
  color = 'textPrimary',
  align = 'inherit',
  noWrap = false,
  gutterBottom = false,
  paragraph = false,
  fontWeight,
  fontSize,
  lineHeight,
  letterSpacing,
  children,
  className,
  ...otherProps
}: TypographyProps) => {
  const theme = useTheme();

  // Map the variant to the appropriate HTML element for semantic HTML
  // This improves accessibility by using the correct heading levels
  const getMappedVariant = (variant: string): MuiTypographyProps['variant'] => {
    switch (variant) {
      case 'h1':
      case 'h2': 
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
      case 'subtitle1':
      case 'subtitle2':
      case 'body1':
      case 'body2':
      case 'caption':
      case 'overline':
        return variant as MuiTypographyProps['variant'];
      default:
        return 'body1';
    }
  };

  return (
    <StyledTypography
      variant={getMappedVariant(variant)}
      align={align as any}
      noWrap={noWrap}
      gutterBottom={gutterBottom}
      paragraph={paragraph}
      fontWeight={fontWeight}
      fontSize={fontSize}
      lineHeight={lineHeight}
      letterSpacing={letterSpacing}
      className={className}
      color={color}
      // Pass ARIA attributes for better accessibility
      aria-level={variant?.match(/^h[1-6]$/) ? parseInt(variant.charAt(1)) : undefined}
      {...otherProps}
    >
      {children}
    </StyledTypography>
  );
});

Typography.displayName = 'Typography';

export default Typography;