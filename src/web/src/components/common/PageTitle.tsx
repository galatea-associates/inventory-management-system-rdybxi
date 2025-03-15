import React from 'react';
import styled from '@emotion/styled';
import { Box } from '@mui/material';
import Typography from './Typography';
import { spacing } from '../../styles/variables';
import { flexBetween } from '../../styles/mixins';

/**
 * Props for the PageTitle component
 */
export interface PageTitleProps {
  /** The main title text */
  title: string;
  /** Optional subtitle text */
  subtitle?: string;
  /** Optional action buttons or elements to display on the right side */
  actions?: React.ReactNode;
  /** Optional class name for additional styling */
  className?: string;
}

/**
 * Styled container for the page title component
 */
const TitleContainer = styled(Box)`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: ${spacing.xs}px;
`;

/**
 * Styled container for the title and actions row
 */
const TitleRow = styled(Box)`
  ${flexBetween()}
  width: 100%;
  align-items: center;
`;

/**
 * Styled container for action buttons
 */
const ActionsContainer = styled(Box)`
  display: flex;
  gap: ${spacing.sm}px;
  align-items: center;
`;

/**
 * A component that renders a page title with optional subtitle and action buttons.
 * This component is used across the application to provide consistent heading styling
 * for page titles and is typically used within the PageHeader component.
 */
const PageTitle = React.memo(({ 
  title, 
  subtitle, 
  actions, 
  className 
}: PageTitleProps) => {
  return (
    <TitleContainer className={className}>
      <TitleRow>
        <Typography variant="h4">{title}</Typography>
        {actions && <ActionsContainer>{actions}</ActionsContainer>}
      </TitleRow>
      {subtitle && <Typography variant="subtitle1">{subtitle}</Typography>}
    </TitleContainer>
  );
});

PageTitle.displayName = 'PageTitle';

export default PageTitle;