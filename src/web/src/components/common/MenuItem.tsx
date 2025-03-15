import React, { forwardRef } from 'react';
import styled from '@emotion/styled';
import { getThemeColor, conditionalStyle } from '../../styles/utils';
import { transition, focusVisible } from '../../styles/mixins';

/**
 * Props for the MenuItem component
 */
export interface MenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
  /** Content to display in the menu item */
  children: React.ReactNode;
  /** Whether the menu item is selected */
  selected?: boolean;
  /** Whether the menu item is disabled */
  disabled?: boolean;
  /** Optional icon to display before the item content */
  icon?: React.ReactNode;
  /** Click handler for the menu item */
  onClick?: (event: React.MouseEvent<HTMLLIElement> | React.KeyboardEvent<HTMLLIElement>) => void;
  /** Optional additional class name */
  className?: string;
}

/**
 * Styled component for the menu item with interactive states
 */
export const StyledMenuItem = styled.li<{ selected?: boolean; disabled?: boolean }>`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing(1, 2)};
  font-size: ${({ theme }) => theme.typography.body2.fontSize};
  font-weight: ${({ theme }) => theme.typography.body2.fontWeight};
  line-height: ${({ theme }) => theme.typography.body2.lineHeight};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  user-select: none;
  list-style: none;
  background-color: ${props => props.selected ? getThemeColor('primary', 'light', 0.1) : 'transparent'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover {
    ${props => conditionalStyle(!props.disabled, { backgroundColor: getThemeColor('action', 'hover') })}
  }
  
  &:active {
    ${props => conditionalStyle(!props.disabled, { backgroundColor: getThemeColor('action', 'active') })}
  }
  
  ${transition('background-color, color', '0.2s')}
  
  &:focus-visible {
    ${focusVisible()}
  }
  
  outline: none;
`;

/**
 * Container for the menu item icon
 */
const MenuItemIcon = styled.span`
  display: flex;
  margin-right: ${({ theme }) => theme.spacing(1.5)};
  color: inherit;
  font-size: ${({ theme }) => theme.typography.icon.fontSize};
`;

/**
 * Container for the menu item text content
 */
const MenuItemContent = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/**
 * A customizable menu item component that represents a selectable option within a menu.
 * Supports various states including hover, active, selected, and disabled.
 * Provides keyboard navigation and accessibility features.
 */
const MenuItem = React.memo(forwardRef<HTMLLIElement, MenuItemProps>(
  ({ onClick, selected = false, disabled = false, children, icon, ...props }, ref) => {
    // Handle keyboard events for accessibility
    const handleKeyDown = (event: React.KeyboardEvent<HTMLLIElement>) => {
      if (disabled) return;
      
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick && onClick(event);
      }
    };

    return (
      <StyledMenuItem
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-selected={selected}
        selected={selected}
        disabled={disabled}
        onClick={!disabled ? onClick : undefined}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {icon && <MenuItemIcon>{icon}</MenuItemIcon>}
        <MenuItemContent>{children}</MenuItemContent>
      </StyledMenuItem>
    );
  }
));

// Add display name for better debugging
MenuItem.displayName = 'MenuItem';

export default MenuItem;