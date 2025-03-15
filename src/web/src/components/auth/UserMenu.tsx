import React, { useState, useCallback, useRef } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { AccountCircle, Settings, ExitToApp, Security, Person } from '@mui/icons-material'; // @mui/icons-material ^5.13.0
import Menu from '../common/Menu';
import MenuItem from '../common/MenuItem';
import Avatar from '../common/Avatar';
import Modal from '../common/Modal';
import UserProfile from './UserProfile';
import ChangePasswordForm from './ChangePasswordForm';
import { useAuth } from '../../hooks/useAuth';

/**
 * Interface defining the props for the UserMenu component
 */
interface UserMenuProps {
  className?: string;
}

/**
 * Container for the user menu component
 */
const UserMenuContainer = styled.div`
  display: flex;
  align-items: center;
  position: relative;
`;

/**
 * Styled Avatar component with cursor pointer
 */
const UserAvatar = styled(Avatar)`
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

/**
 * Container for menu item icons
 */
const MenuItemIcon = styled.span`
  display: flex;
  margin-right: 8px;
  color: inherit;
  font-size: 20px;
`;

/**
 * Container for modal content
 */
const ModalContent = styled.div`
  width: 100%;
  max-width: 600px;
  padding: 24px;
  background-color: ${({ theme }) => theme.palette.background.paper};
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  outline: none;
`;

/**
 * Component that displays a user menu with profile and account options
 */
const UserMenu: React.FC<UserMenuProps> = React.memo(({ className }) => {
  // Destructure props including className
  // Get user data and logout function from useAuth hook
  const { user, logout } = useAuth();

  // Create state for menu anchor element
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Create state for profile modal visibility
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);

  // Create state for change password modal visibility
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState<boolean>(false);

  // Create ref for avatar button element
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Function to handle menu open
   * @param event - The click event
   */
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  /**
   * Function to handle menu close
   */
  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  /**
   * Function to handle profile click
   */
  const handleProfileClick = useCallback(() => {
    setProfileModalOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  /**
   * Function to handle change password click
   */
  const handleChangePasswordClick = useCallback(() => {
    setChangePasswordModalOpen(true);
    handleMenuClose();
  }, [handleMenuClose]);

  /**
   * Function to handle logout
   */
  const handleLogout = useCallback(() => {
    logout();
    handleMenuClose();
  }, [logout, handleMenuClose]);

  /**
   * Function to handle profile modal close
   */
  const handleProfileModalClose = useCallback(() => {
    setProfileModalOpen(false);
  }, []);

  /**
   * Function to handle change password modal close
   */
  const handleChangePasswordModalClose = useCallback(() => {
    setChangePasswordModalOpen(false);
  }, []);

  /**
   * Function to handle successful password change
   */
  const handleChangePasswordSuccess = useCallback(() => {
    setChangePasswordModalOpen(false);
  }, []);

  // Render Avatar component with user initials or image that triggers menu on click
  // Render Menu component with MenuItem components for Profile, Change Password, Settings, and Logout
  // Render Modal with UserProfile component when profile modal is open
  // Render Modal with ChangePasswordForm component when change password modal is open
  return (
    <UserMenuContainer className={className}>
      <UserAvatar
        alt={`${user?.firstName} ${user?.lastName}`}
        src={user?.imageUrl}
        onClick={handleMenuOpen}
        ref={avatarButtonRef}
        aria-controls="user-menu"
        aria-haspopup="true"
        aria-expanded={anchorEl ? 'true' : undefined}
      />
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        aria-labelledby="user-button"
      >
        <MenuItem onClick={handleProfileClick}>
          <MenuItemIcon>
            <Person />
          </MenuItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleChangePasswordClick}>
          <MenuItemIcon>
            <Security />
          </MenuItemIcon>
          Change Password
        </MenuItem>
        <MenuItem>
          <MenuItemIcon>
            <Settings />
          </MenuItemIcon>
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <MenuItemIcon>
            <ExitToApp />
          </MenuItemIcon>
          Logout
        </MenuItem>
      </Menu>
      <Modal
        isOpen={profileModalOpen}
        onClose={handleProfileModalClose}
        title="User Profile"
      >
        <ModalContent>
          <UserProfile />
        </ModalContent>
      </Modal>
      <Modal
        isOpen={changePasswordModalOpen}
        onClose={handleChangePasswordModalClose}
        title="Change Password"
      >
        <ModalContent>
          <ChangePasswordForm
            onSuccess={handleChangePasswordSuccess}
            onCancel={handleChangePasswordModalClose}
          />
        </ModalContent>
      </Modal>
    </UserMenuContainer>
  );
});

export default UserMenu;