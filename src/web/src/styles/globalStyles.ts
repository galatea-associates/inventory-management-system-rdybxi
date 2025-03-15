import { Global, css } from '@emotion/react'; // @emotion/react ^11.10.6
import { colors, typography, spacing, breakpoints, accessibility } from './variables';
import { resetList, resetButton, respondTo, visuallyHidden } from './mixins';
import { CustomTheme } from '../types/theme';

/**
 * Creates global styles based on the provided theme
 * @param theme Current application theme
 * @returns Global component with theme-based styles
 */
export const createGlobalStyles = (theme: CustomTheme) => {
  const globalStyles = css`
    /* Base styles */
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      font-family: ${typography.fontFamily};
      font-size: ${typography.fontSizes.md};
      line-height: ${typography.lineHeights.md};
      color: ${theme.palette.text.primary};
      background-color: ${theme.palette.background.default};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Box sizing rules */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    
    /* Set core root defaults */
    html:focus-within {
      scroll-behavior: smooth;
    }
    
    /* Set core body defaults */
    body {
      min-height: 100vh;
      text-rendering: optimizeSpeed;
      overflow-x: hidden;
    }
    
    /* Remove default margin and padding */
    h1, h2, h3, h4, h5, h6, 
    p, figure, blockquote, dl, dd {
      margin: 0;
      padding: 0;
    }
    
    /* Typography */
    h1 {
      font-size: ${typography.fontSizes.xxxl};
      font-weight: ${typography.fontWeights.bold};
      line-height: ${typography.lineHeights.xs};
      margin-bottom: ${spacing.md}px;
    }
    
    h2 {
      font-size: ${typography.fontSizes.xxl};
      font-weight: ${typography.fontWeights.bold};
      line-height: ${typography.lineHeights.sm};
      margin-bottom: ${spacing.md}px;
    }
    
    h3 {
      font-size: ${typography.fontSizes.xl};
      font-weight: ${typography.fontWeights.bold};
      line-height: ${typography.lineHeights.sm};
      margin-bottom: ${spacing.sm}px;
    }
    
    h4 {
      font-size: ${typography.fontSizes.lg};
      font-weight: ${typography.fontWeights.medium};
      line-height: ${typography.lineHeights.md};
      margin-bottom: ${spacing.sm}px;
    }
    
    h5 {
      font-size: ${typography.fontSizes.md};
      font-weight: ${typography.fontWeights.medium};
      line-height: ${typography.lineHeights.md};
      margin-bottom: ${spacing.sm}px;
    }
    
    h6 {
      font-size: ${typography.fontSizes.sm};
      font-weight: ${typography.fontWeights.medium};
      line-height: ${typography.lineHeights.md};
      margin-bottom: ${spacing.sm}px;
    }
    
    p {
      margin-bottom: ${spacing.sm}px;
    }
    
    /* A elements that don't have a class get default styles */
    a:not([class]) {
      text-decoration-skip-ink: auto;
      color: ${theme.palette.primary.main};
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
        color: ${theme.palette.primary.dark};
      }
    }
    
    /* Make images easier to work with */
    img, picture {
      max-width: 100%;
      display: block;
    }
    
    /* Inherit fonts for inputs and buttons */
    input, button, textarea, select {
      font: inherit;
    }
    
    /* Focus styles for keyboard navigation */
    a:focus-visible,
    button:focus-visible,
    input:focus-visible,
    select:focus-visible,
    textarea:focus-visible,
    [tabindex]:not([tabindex="-1"]):focus-visible {
      outline: ${accessibility.focusOutline} ${accessibility.focusColor};
      outline-offset: 2px;
    }
    
    /* Remove all animations, transitions and smooth scroll for people that prefer not to see them */
    @media (prefers-reduced-motion: reduce) {
      html:focus-within {
        scroll-behavior: auto;
      }
      
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    
    /* Lists */
    ul, ol {
      ${resetList()};
    }
    
    /* Buttons */
    button {
      ${resetButton()};
    }
    
    /* Responsive adjustments */
    ${respondTo('xs')`
      html {
        font-size: 14px;
      }
    `}
    
    ${respondTo('sm')`
      html {
        font-size: 15px;
      }
    `}
    
    ${respondTo('md')`
      html {
        font-size: 16px;
      }
    `}
    
    ${respondTo('lg')`
      html {
        font-size: 16px;
      }
    `}
    
    ${respondTo('xl')`
      html {
        font-size: 16px;
      }
    `}
    
    /* Utility classes */
    .visually-hidden {
      ${visuallyHidden()};
    }
    
    .no-scroll {
      overflow: hidden;
    }
    
    #root {
      height: 100%;
      width: 100%;
    }
    
    /* Application container */
    .app-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    
    /* Main content area */
    .main-content {
      flex: 1 0 auto;
      padding: ${spacing.md}px;
      
      ${respondTo('md')`
        padding: ${spacing.lg}px;
      `}
    }
    
    /* Data grid container styling */
    .data-grid-container {
      width: 100%;
      height: 100%;
      overflow: auto;
      
      .cell-highlight {
        background-color: ${colors.grey[100]};
      }
      
      .cell-error {
        color: ${colors.error.main};
      }
      
      .cell-warning {
        color: ${colors.warning.main};
      }
      
      .cell-success {
        color: ${colors.success.main};
      }
    }
    
    /* Form styling */
    .form-group {
      margin-bottom: ${spacing.md}px;
    }
    
    .form-label {
      display: block;
      margin-bottom: ${spacing.xs}px;
      font-weight: ${typography.fontWeights.medium};
    }
    
    .form-helper-text {
      display: block;
      font-size: ${typography.fontSizes.xs};
      color: ${theme.palette.text.secondary};
      margin-top: ${spacing.xs}px;
    }
    
    .form-error-text {
      color: ${theme.palette.error.main};
      font-size: ${typography.fontSizes.xs};
      margin-top: ${spacing.xs}px;
    }
    
    /* High contrast mode adjustments */
    @media (prefers-contrast: more) {
      :focus-visible {
        outline: ${accessibility.highContrastOutline} ${accessibility.highContrastFocusColor};
      }
      
      body {
        color: #000000;
        background-color: #ffffff;
      }
      
      a {
        color: #0000EE;
        text-decoration: underline;
      }
      
      a:visited {
        color: #551A8B;
      }
      
      input, select, textarea {
        border: 2px solid #000000;
      }
      
      button {
        border: 2px solid #000000;
        background-color: #ffffff;
        color: #000000;
      }
    }
  `;

  return <Global styles={globalStyles} />;
};

/**
 * Component that renders global styles using the current theme
 * Must be included once at the root of the application
 */
export const GlobalStyles = ({ theme }: { theme: CustomTheme }) => createGlobalStyles(theme);

export default createGlobalStyles;