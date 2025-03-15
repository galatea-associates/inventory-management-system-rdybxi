import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { List, ListItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import { 
  Dashboard as DashboardIcon, 
  Assessment as AssessmentIcon, 
  Inventory as InventoryIcon, 
  Search as SearchIcon, 
  ErrorOutline as ErrorOutlineIcon, 
  Rule as RuleIcon,
  Insights as InsightsIcon, 
  Settings as SettingsIcon 
} from '@mui/icons-material';

import { ROUTES } from '../../constants/routes';
import { 
  POSITION_PERMISSIONS, 
  INVENTORY_PERMISSIONS, 
  LOCATE_PERMISSIONS, 
  EXCEPTION_PERMISSIONS, 
  CALCULATION_RULE_PERMISSIONS,
  SYSTEM_PERMISSIONS 
} from '../../constants/permissions';
import usePermissions from '../../hooks/usePermissions';
import Typography from '../common/Typography';
import { selectSidebarOpen } from '../../state/ui/uiSelectors';

/**
 * Props for the NavigationMenu component
 */
export interface NavigationMenuProps {
  /** Optional class name for custom styling */
  className?: string;
}

/**
 * Interface for navigation item configuration
 */
interface NavigationItem {
  /** Unique identifier for the navigation item */
  id: string;
  /** Display label for the navigation item */
  label: string;
  /** Icon component to display */
  icon: React.ComponentType;
  /** Route path to navigate to */
  path: string;
  /** Permission required to see this navigation item */
  permission: string;
}

/**
 * Styled List component for the navigation menu
 */
const StyledList = styled(List)`
  padding: ${({ theme }) => theme.spacing(1, 0)};
  width: 100%;
`;

/**
 * Styled NavLink component for navigation items
 */
const StyledNavLink = styled(NavLink)`
  text-decoration: none;
  color: inherit;
  display: flex;
  width: 100%;
  
  &.active {
    background-color: ${({ theme }) => theme.palette.action.selected};
    border-right: 3px solid;
    border-color: ${({ theme }) => theme.palette.primary.main};
    
    & .MuiListItemIcon-root {
      color: ${({ theme }) => theme.palette.primary.main};
    }
    
    & .MuiTypography-root {
      font-weight: 500;
      color: ${({ theme }) => theme.palette.primary.main};
    }
  }
`;

/**
 * Styled ListItem component for navigation items
 */
const StyledListItem = styled(ListItem)`
  padding: ${({ theme }) => theme.spacing(0.5, 2)};
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${({ theme }) => theme.palette.action.hover};
  }
`;

/**
 * Styled ListItemIcon component for navigation item icons
 */
const StyledListItemIcon = styled(ListItemIcon)`
  min-width: 40px;
  color: ${({ theme }) => theme.palette.text.secondary};
`;

/**
 * Styled ListItemText component for navigation item labels
 */
const StyledListItemText = styled(ListItemText)<{ open: boolean }>`
  margin: 0;
  transition: opacity 0.3s ease, width 0.3s ease;
  opacity: ${props => props.open ? 1 : 0};
  width: ${props => props.open ? 'auto' : 0};
  overflow: hidden;
`;

/**
 * Navigation items configuration array
 */
const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    path: ROUTES.DASHBOARD,
    permission: SYSTEM_PERMISSIONS.MONITOR
  },
  {
    id: 'positions',
    label: 'Positions',
    icon: AssessmentIcon,
    path: ROUTES.POSITIONS,
    permission: POSITION_PERMISSIONS.VIEW
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: InventoryIcon,
    path: ROUTES.INVENTORY,
    permission: INVENTORY_PERMISSIONS.VIEW
  },
  {
    id: 'locates',
    label: 'Locates',
    icon: SearchIcon,
    path: ROUTES.LOCATES,
    permission: LOCATE_PERMISSIONS.VIEW
  },
  {
    id: 'exceptions',
    label: 'Exceptions',
    icon: ErrorOutlineIcon,
    path: ROUTES.EXCEPTIONS,
    permission: EXCEPTION_PERMISSIONS.VIEW
  },
  {
    id: 'rules',
    label: 'Rules',
    icon: RuleIcon,
    path: ROUTES.RULES,
    permission: CALCULATION_RULE_PERMISSIONS.VIEW
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: InsightsIcon,
    path: ROUTES.ANALYTICS,
    permission: SYSTEM_PERMISSIONS.MONITOR
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    path: ROUTES.SETTINGS,
    permission: SYSTEM_PERMISSIONS.CONFIGURE
  }
];

/**
 * A responsive navigation menu component for the Inventory Management System that
 * displays navigation items with icons, labels, and handles permission-based visibility.
 * This component is used within the Sidebar component to provide the main application
 * navigation structure.
 */
const NavigationMenu = React.memo(({ className }: NavigationMenuProps) => {
  // Get the sidebar open state from Redux
  const isOpen = useSelector(selectSidebarOpen);
  
  // Get the current location for highlighting active routes
  const location = useLocation();
  
  // Get permission checking function from custom hook
  const { hasPermission } = usePermissions();
  
  // Filter items based on user permissions
  const visibleItems = useMemo(() => {
    return navigationItems.filter(item => hasPermission(item.permission));
  }, [hasPermission]);
  
  return (
    <StyledList className={className}>
      {visibleItems.map((item) => (
        <Tooltip 
          key={item.id}
          title={isOpen ? '' : item.label}
          placement="right"
          arrow
          disableHoverListener={isOpen}
        >
          <StyledListItem disablePadding>
            <StyledNavLink to={item.path}>
              <StyledListItemIcon>
                <item.icon />
              </StyledListItemIcon>
              <StyledListItemText open={isOpen}>
                <Typography variant="body2">{item.label}</Typography>
              </StyledListItemText>
            </StyledNavLink>
          </StyledListItem>
        </Tooltip>
      ))}
    </StyledList>
  );
});

NavigationMenu.displayName = 'NavigationMenu';

export default NavigationMenu;