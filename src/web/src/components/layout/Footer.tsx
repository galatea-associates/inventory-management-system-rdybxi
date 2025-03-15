import React from 'react';
import styled from '@emotion/styled';
import { Box, Link } from '@mui/material';
import { useSelector } from 'react-redux';

import Container from './Container';
import Typography from '../common/Typography';
import { selectSystemStatus } from '../../state/ui/uiSelectors';

/**
 * Props for the Footer component
 */
export interface FooterProps {
  /** Additional class name for custom styling */
  className?: string;
}

/**
 * Styled container for the footer with border and spacing
 */
const FooterContainer = styled(Box)`
  width: 100%;
  border-top: 1px solid;
  border-color: ${props => props.theme.palette.divider};
  padding: ${props => props.theme.spacing(2, 0)};
  margin-top: auto;
`;

/**
 * Styled container for the footer content with responsive layout
 */
const FooterContent = styled(Box)`
  display: flex;
  flex-direction: ${props => ({ xs: 'column', sm: 'row' })};
  justify-content: space-between;
  align-items: ${props => ({ xs: 'center', sm: 'flex-start' })};
  gap: ${props => props.theme.spacing(1)};
`;

/**
 * Styled container for the footer links with responsive alignment
 */
const FooterLinks = styled(Box)`
  display: flex;
  gap: ${props => props.theme.spacing(2)};
  justify-content: ${props => ({ xs: 'center', sm: 'flex-end' })};
`;

/**
 * Footer component for the Inventory Management System
 * 
 * Displays copyright information, version details, and essential links.
 * Provides a consistent footer across all pages of the application with
 * responsive behavior for different screen sizes.
 */
const Footer = React.memo<FooterProps>(({ className }) => {
  // Get the current year for copyright information
  const currentYear = new Date().getFullYear();
  
  // Get system status from Redux store 
  const systemStatus = useSelector(selectSystemStatus);
  
  // Extract version information from system status if available
  const version = systemStatus?.version || '';

  return (
    <FooterContainer className={className}>
      <Container>
        <FooterContent>
          <Box>
            <Typography 
              variant="body2" 
              color="text.secondary"
            >
              &copy; {currentYear} Inventory Management System
            </Typography>
            {version && (
              <Typography 
                variant="caption" 
                color="text.secondary"
              >
                Version {version}
              </Typography>
            )}
          </Box>
          
          <FooterLinks>
            <Link 
              href="/terms" 
              color="text.secondary" 
              underline="hover"
              aria-label="Terms of Use"
            >
              <Typography variant="body2">Terms</Typography>
            </Link>
            <Link 
              href="/privacy" 
              color="text.secondary" 
              underline="hover"
              aria-label="Privacy Policy"
            >
              <Typography variant="body2">Privacy</Typography>
            </Link>
            <Link 
              href="/help" 
              color="text.secondary" 
              underline="hover"
              aria-label="Help and Documentation"
            >
              <Typography variant="body2">Help</Typography>
            </Link>
          </FooterLinks>
        </FooterContent>
      </Container>
    </FooterContainer>
  );
});

Footer.displayName = 'Footer';

export default Footer;