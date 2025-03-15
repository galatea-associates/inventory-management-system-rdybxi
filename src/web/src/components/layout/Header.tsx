import React, { useState, useCallback } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { useSelector, useDispatch } from 'react-redux'; // react-redux ^8.0.5
import { AppBar, Toolbar, IconButton, Typography, Box } from '@mui/material'; // @mui/material 5.13
import { Menu as MenuIcon } from '@mui/icons-material'; // @mui/icons-material 5.13
import UserMenu from '../auth/UserMenu';
import NotificationBadge from '../notifications/NotificationBadge';
import NotificationCenter from '../notifications/NotificationCenter';
import { selectSidebarOpen } from '../../state/ui/uiSelectors';
import { toggleSidebar } from '../../state/ui/uiSlice';
import useBreakpoint from '../../hooks/useBreakpoint';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';

/**
 * @interface HeaderProps
 * @description Props for the Header component
 * @property {function} onToggleSidebar - Callback function to toggle the sidebar
 * @property {string} className - Optional CSS class name for custom styling
 */
export interface HeaderProps {
  onToggleSidebar?: () => void;
  className?: string;
}

/**
 * @styled_component StyledAppBar
 * @description Styled AppBar component with custom elevation and z-index
 */
const StyledAppBar = styled(AppBar)`
  z-index: ${({ theme }) => theme.zIndex.drawer + 1};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background-color: ${({ theme }) => theme.palette.background.paper};
  color: ${({ theme }) => theme.palette.text.primary};
  transition: all 0.3s ease;
`;

/**
 * @styled_component StyledToolbar
 * @description Styled Toolbar component with responsive padding and layout
 */
const StyledToolbar = styled(Toolbar)`
  display: flex;
  justify-content: space-between;
  padding: 0 16px;
  minHeight: 64px;
  width: 100%;
`;

/**
 * @styled_component LogoContainer
 * @description Container for the application logo and title
 */
const LogoContainer = styled(Box)`
  display: flex;
  align-items: center;
  flex: 0 0 auto;
`;

/**
 * @styled_component AppTitle
 * @description Styled Typography component for the application title
 */
const AppTitle = styled(Typography)`
  font-weight: 600;
  marginLeft: 16px;
  display: ${props => props.isMobile ? 'none' : 'block'};
  transition: opacity 0.3s ease;
  opacity: ${props => props.sidebarOpen || props.isMobile ? 1 : 0};
  whiteSpace: nowrap;
`;

/**
 * @styled_component ActionContainer
 * @description Container for header action items (notifications, user menu)
 */
const ActionContainer = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/**
 * @styled_component MenuButton
 * @description Styled IconButton for the sidebar toggle
 */
const MenuButton = styled(IconButton)`
  marginRight: 8px;
  color: ${({ theme }) => theme.palette.text.primary};
  transition: transform 0.3s ease;
  transform: ${props => props.sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)'};
`;

/**
 * @function Header
 * @description Header component that displays the application title, sidebar toggle, notifications, and user menu
 * @param {HeaderProps} props - Props for the Header component
 * @returns {JSX.Element} Rendered header component
 */
export const Header: React.FC<HeaderProps> = React.memo(({ onToggleSidebar, className }) => {
  // LD1: Destructure props including onToggleSidebar and className
  // IE1: Get the current breakpoint using useBreakpoint hook
  const { isMobile } = useBreakpoint();

  // IE1: Get the sidebar open state from Redux using useSelector and selectSidebarOpen
  const sidebarOpen = useSelector(selectSidebarOpen);

  // IE1: Get the dispatch function using useDispatch
  const dispatch = useDispatch();

  // IE1: Get authentication state using useAuth hook
  const { user } = useAuth();

  // IE1: Get notification state using useNotification hook
  const { notifications, unreadNotifications } = useNotification();

  // LD1: Initialize state for notification center visibility
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  /**
   * @function handleToggleSidebar
   * @description Toggles the sidebar visibility
   */
  const handleToggleSidebar = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  /**
   * @function handleToggleNotificationCenter
   * @description Toggles the notification center visibility
   */
  const handleToggleNotificationCenter = useCallback(() => {
    setIsNotificationCenterOpen((prev) => !prev);
  }, []);

  /**
   * @function handleCloseNotificationCenter
   * @description Closes the notification center
   */
  const handleCloseNotificationCenter = useCallback(() => {
    setIsNotificationCenterOpen(false);
  }, []);

  // LD1: Render the AppBar component with appropriate elevation and position
  // LD1: Render the Toolbar with logo, sidebar toggle button, title, notification badge, and user menu
  // LD1: Conditionally render the application title based on screen size and sidebar state
  // LD1: Render the NotificationBadge component with click handler to open notification center
  // LD1: Render the UserMenu component for user-related actions
  // LD1: Render the NotificationCenter component when open
  return (
    <>
      <StyledAppBar position="sticky" elevation={1}>
        <StyledToolbar>
          <LogoContainer>
            <MenuButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleToggleSidebar}
              edge="start"
              sidebarOpen={sidebarOpen}
            >
              <MenuIcon />
            </MenuButton>
            <AppTitle variant="h6" noWrap component="div" sidebarOpen={sidebarOpen} isMobile={isMobile}>
              Inventory Management System
            </AppTitle>
          </LogoContainer>
          <ActionContainer>
            <NotificationBadge onClick={handleToggleNotificationCenter} />
            <UserMenu />
          </ActionContainer>
        </StyledToolbar>
      </StyledAppBar>
      {isNotificationCenterOpen && (
        <NotificationCenter
          isOpen={isNotificationCenterOpen}
          onClose={handleCloseNotificationCenter}
        />
      )}
    </>
  );
});

export default Header;