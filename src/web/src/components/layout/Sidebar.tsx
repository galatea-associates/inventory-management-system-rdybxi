import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import styled from '@emotion/styled';
import { Box, Drawer, useTheme, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

import NavigationMenu from './NavigationMenu';
import { ROUTES } from '../../constants/routes';
import { selectSidebarOpen } from '../../state/ui/uiSelectors';
import useBreakpoint from '../../hooks/useBreakpoint';

/**
 * Props for the Sidebar component
 */
export interface SidebarProps {
  /** Optional class name for custom styling */
  className?: string;
}

/**
 * Styled container for the sidebar with transition effects
 */
const SidebarContainer = styled(Box)<{ open: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: ${({ theme }) => theme.palette.background.paper};
  border-right: 1px solid;
  border-color: ${({ theme }) => theme.palette.divider};
  transition: width 0.3s ease;
  width: ${props => props.open ? '240px' : '64px'};
  overflow: hidden;
  z-index: ${({ theme }) => theme.zIndex.drawer};
`;

/**
 * Styled header section of the sidebar containing logo and toggle button
 */
const SidebarHeader = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing(1, 1, 1, 2)};
  min-height: 64px;
  border-bottom: 1px solid;
  border-color: ${({ theme }) => theme.palette.divider};
`;

/**
 * Styled container for the sidebar title with responsive sizing
 */
const HeaderTitleContainer = styled(Box)<{ open: boolean }>`
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
  transition: opacity 0.3s ease, width 0.3s ease;
  opacity: ${props => props.open ? 1 : 0};
  width: ${props => props.open ? 'auto' : 0};
`;

/**
 * Styled content section of the sidebar containing navigation menu
 */
const SidebarContent = styled(Box)`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: auto;
  padding: ${({ theme }) => theme.spacing(2, 0)};
`;

/**
 * Styled button for toggling sidebar expansion/collapse
 */
const ToggleButton = styled(IconButton)<{ open: boolean }>`
  padding: ${({ theme }) => theme.spacing(0.5)};
  margin-left: ${props => props.open ? 'auto' : 0};
  margin-right: ${props => props.open ? 0 : 'auto'};
`;

/**
 * Styled drawer for mobile view of the sidebar
 */
const MobileDrawer = styled(Drawer)`
  width: 240px;
  flex-shrink: 0;
  & .MuiDrawer-paper {
    width: 240px;
    box-sizing: border-box;
  }
`;

/**
 * A responsive sidebar component that provides the main navigation menu.
 * It can be expanded or collapsed, adapts to different screen sizes, and
 * contains navigation links to all major sections of the application.
 * 
 * @param {SidebarProps} props - Props for the Sidebar component
 * @returns {JSX.Element} Rendered sidebar component
 */
const Sidebar = React.memo(({ className }: SidebarProps): JSX.Element => {
  const theme = useTheme();
  const isOpen = useSelector(selectSidebarOpen);
  const { breakpoint } = useBreakpoint();
  
  // Determine if we're in mobile view based on breakpoint
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  
  // Create navigation items - this could be moved to a separate constant if needed
  const navigationItems = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'DashboardIcon',
      path: ROUTES.DASHBOARD,
      permission: 'DASHBOARD_PERMISSIONS.VIEW'
    },
    {
      id: 'positions',
      label: 'Positions',
      icon: 'AssessmentIcon',
      path: ROUTES.POSITIONS,
      permission: 'POSITION_PERMISSIONS.VIEW'
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: 'InventoryIcon',
      path: ROUTES.INVENTORY,
      permission: 'INVENTORY_PERMISSIONS.VIEW'
    },
    {
      id: 'locates',
      label: 'Locates',
      icon: 'SearchIcon',
      path: ROUTES.LOCATES,
      permission: 'LOCATE_PERMISSIONS.VIEW'
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      icon: 'ErrorOutlineIcon',
      path: ROUTES.EXCEPTIONS,
      permission: 'EXCEPTION_PERMISSIONS.VIEW'
    },
    {
      id: 'rules',
      label: 'Rules',
      icon: 'RuleIcon',
      path: ROUTES.RULES,
      permission: 'CALCULATION_RULE_PERMISSIONS.VIEW'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'InsightsIcon',
      path: ROUTES.ANALYTICS,
      permission: 'ANALYTICS_PERMISSIONS.VIEW'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'SettingsIcon',
      path: ROUTES.SETTINGS,
      permission: 'SETTINGS_PERMISSIONS.VIEW'
    }
  ], []);
  
  // Render sidebar content
  const sidebarContent = (
    <SidebarContainer open={isOpen} className={className}>
      <SidebarHeader>
        <HeaderTitleContainer open={isOpen}>
          {/* Logo and Title */}
          {isOpen && (
            <Box sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
              IMS
            </Box>
          )}
        </HeaderTitleContainer>
        <ToggleButton
          open={isOpen}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          size="small"
          edge="end"
        >
          {theme.direction === 'ltr' ? (
            isOpen ? <ChevronLeft /> : <ChevronRight />
          ) : (
            isOpen ? <ChevronRight /> : <ChevronLeft />
          )}
        </ToggleButton>
      </SidebarHeader>
      
      <SidebarContent>
        <NavigationMenu />
      </SidebarContent>
    </SidebarContainer>
  );
  
  // For mobile, use a Drawer component
  if (isMobile) {
    return (
      <MobileDrawer
        variant="temporary"
        open={isOpen}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        className={className}
      >
        {sidebarContent}
      </MobileDrawer>
    );
  }
  
  // For desktop, use the standard sidebar
  return sidebarContent;
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;