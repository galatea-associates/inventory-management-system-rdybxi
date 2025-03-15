import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styled from '@emotion/styled';
import MenuItem from './MenuItem';
import Popover from './Popover';
import Paper from './Paper';
import { getThemeColor, conditionalStyle } from '../../styles/utils';
import { fadeIn } from '../../styles/animations';
import useClickOutside from '../../hooks/useClickOutside';

/**
 * Props for the Menu component
 */
export interface MenuProps {
  /** The anchor element to attach the menu to */
  anchorEl: HTMLElement | null;
  /** Whether the menu is open */
  open: boolean;
  /** Callback when the menu is closed */
  onClose: () => void;
  /** Content of the menu (typically MenuItem components) */
  children: React.ReactNode;
  /** Placement of the menu relative to the anchor element */
  placement?: string;
  /** Maximum width of the menu */
  maxWidth?: number | string;
  /** Maximum height of the menu */
  maxHeight?: number | string;
  /** Elevation level for shadow depth */
  elevation?: number;
  /** If true, the menu will render in place without using portal */
  disablePortal?: boolean;
  /** If true, clicking outside won't close the menu */
  disableClickAway?: boolean;
  /** Custom keyboard event handler */
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * Styled container for the menu
 */
export const StyledMenu = styled(Paper)<{ elevation?: number }>`
  position: relative;
  z-index: ${({ theme }) => theme.zIndex?.popover || 1400};
  border-radius: ${({ theme }) => theme.borderRadius?.medium || '8px'};
  overflow: hidden;
  box-shadow: ${props => 
    props.theme?.shadows?.[props.elevation || 3] || 
    `0 ${props.elevation || 3}px ${(props.elevation || 3) * 2}px rgba(0, 0, 0, 0.2)`
  };
  background-color: ${() => getThemeColor('background.paper')};
  min-width: 120px;
  animation: ${props => fadeIn('0.2s', 'ease-out')};
`;

/**
 * Container for menu items with styling
 */
export const MenuList = styled.ul<{
  maxWidth?: number | string;
  maxHeight?: number | string;
}>`
  margin: 0;
  padding: ${({ theme }) => theme.spacing(1, 0)};
  list-style: none;
  max-width: ${props => props.maxWidth || '300px'};
  max-height: ${props => props.maxHeight || '300px'};
  overflow: auto;
`;

/**
 * A customizable menu component that displays a list of selectable options.
 * 
 * The Menu component renders as a dropdown anchored to a specified element.
 * It supports keyboard navigation, focus management, and provides accessibility features.
 * 
 * @example
 * ```tsx
 * const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
 * const [open, setOpen] = useState(false);
 * 
 * const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
 *   setAnchorEl(event.currentTarget);
 *   setOpen(true);
 * };
 * 
 * const handleClose = () => {
 *   setOpen(false);
 * };
 * 
 * return (
 *   <>
 *     <Button onClick={handleClick}>Open Menu</Button>
 *     <Menu
 *       anchorEl={anchorEl}
 *       open={open}
 *       onClose={handleClose}
 *     >
 *       <MenuItem onClick={handleClose}>Option 1</MenuItem>
 *       <MenuItem onClick={handleClose}>Option 2</MenuItem>
 *       <MenuItem onClick={handleClose}>Option 3</MenuItem>
 *     </Menu>
 *   </>
 * );
 * ```
 */
const Menu = React.memo<MenuProps>((props) => {
  const {
    anchorEl,
    open,
    onClose,
    children,
    placement = 'bottom-start',
    maxWidth = '300px',
    maxHeight = '300px',
    elevation = 3,
    disablePortal = false,
    disableClickAway = false,
    onKeyDown,
    ...other
  } = props;

  // Create a ref for the menu container
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close the menu
  useClickOutside(menuRef, () => {
    if (!disableClickAway && open) {
      onClose();
    }
  });

  // Handle keyboard events for menu navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Allow custom key handler to override default behavior
    if (onKeyDown) {
      onKeyDown(event);
      return;
    }

    // Handle escape key to close the menu
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    const menuElement = menuRef.current;
    if (!menuElement) return;

    // Find all menu items that can be focused
    const menuItems = Array.from(
      menuElement.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')
    ) as HTMLElement[];
    
    if (menuItems.length === 0) return;

    // Find the currently focused item's index
    const currentIndex = menuItems.findIndex(item => item === document.activeElement);

    // Handle arrow keys for navigation
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (currentIndex === -1 || currentIndex === menuItems.length - 1) {
          menuItems[0].focus();
        } else {
          menuItems[currentIndex + 1].focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (currentIndex === -1 || currentIndex === 0) {
          menuItems[menuItems.length - 1].focus();
        } else {
          menuItems[currentIndex - 1].focus();
        }
        break;
      case 'Home':
        event.preventDefault();
        menuItems[0].focus();
        break;
      case 'End':
        event.preventDefault();
        menuItems[menuItems.length - 1].focus();
        break;
      default:
        // Handle type-ahead search
        if (/^[a-z0-9]$/i.test(event.key)) {
          const char = event.key.toLowerCase();
          
          // Start search after the current focused item
          const startIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % menuItems.length;
          
          // Search from startIndex to end
          for (let i = startIndex; i < menuItems.length; i++) {
            const text = menuItems[i].textContent?.toLowerCase() || '';
            if (text.startsWith(char)) {
              menuItems[i].focus();
              event.preventDefault();
              return;
            }
          }
          
          // If not found, wrap around to beginning
          if (startIndex > 0) {
            for (let i = 0; i < startIndex; i++) {
              const text = menuItems[i].textContent?.toLowerCase() || '';
              if (text.startsWith(char)) {
                menuItems[i].focus();
                event.preventDefault();
                return;
              }
            }
          }
        }
        break;
    }
  }, [onKeyDown, onClose]);

  // Focus the first menu item when menu opens
  useEffect(() => {
    if (open && menuRef.current) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        const firstItem = menuRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])') as HTMLElement;
        if (firstItem) {
          firstItem.focus();
        }
      }, 10);
      
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      placement={placement}
      disablePortal={disablePortal}
      disableClickAway={disableClickAway}
    >
      <div 
        ref={menuRef}
        onKeyDown={handleKeyDown}
        role="presentation"
      >
        <StyledMenu elevation={elevation}>
          <MenuList
            role="menu"
            aria-orientation="vertical"
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            {...other}
          >
            {children}
          </MenuList>
        </StyledMenu>
      </div>
    </Popover>
  );
});

// Add display name for better debugging
Menu.displayName = 'Menu';

export default Menu;