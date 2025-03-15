import React from 'react';
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // @mui/icons-material ^5.13.0
import { Collapse } from '@mui/material'; // @mui/material ^5.13.0
import { accordionStyles } from '../../styles/components';
import { getThemeColor, conditionalStyle } from '../../styles/utils';
import { transitions } from '../../styles/variables';
import Card from './Card';
import Typography from './Typography';

/**
 * Props for the Accordion component
 */
export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The variant of the accordion component.
   * @default 'outlined'
   */
  variant?: 'outlined' | 'elevated';
  
  /**
   * If true, expands the accordion; makes it controlled.
   */
  expanded?: boolean;
  
  /**
   * If true, the accordion will be expanded by default.
   * @default false
   */
  defaultExpanded?: boolean;
  
  /**
   * Callback fired when the expand/collapse state is changed.
   * @param {React.SyntheticEvent} event The event source of the callback.
   * @param {boolean} expanded The expanded state of the accordion.
   */
  onChange?: (event: React.SyntheticEvent, expanded: boolean) => void;
  
  /**
   * If true, the accordion will be disabled.
   * @default false
   */
  disabled?: boolean;
  
  /**
   * The content of the accordion summary/header.
   */
  summary: React.ReactNode;
  
  /**
   * The content of the accordion details/body.
   */
  children: React.ReactNode;
}

/**
 * Styled card component with accordion-specific styling
 */
export const StyledAccordion = styled(Card)<{
  variant?: string;
  expanded?: boolean;
  disabled?: boolean;
}>`
  ${props => accordionStyles({
    variant: props.variant,
    expanded: props.expanded,
    disabled: props.disabled
  })}
`;

/**
 * Styled component for the accordion summary (header)
 */
export const AccordionSummary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme?.spacing?.md || '16px'};
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  user-select: none;
`;

/**
 * Styled component for the accordion content area
 */
export const AccordionContent = styled.div`
  padding: ${({ theme }) => theme?.spacing?.md || '16px'};
  border-top: ${props => props.expanded ? '1px solid rgba(0, 0, 0, 0.12)' : 'none'};
  overflow: hidden;
  transition: height ${transitions.duration.standard}ms ${transitions.easing.easeInOut};
`;

/**
 * Styled component for the expand/collapse icon
 */
export const ExpandIcon = styled(ExpandMoreIcon)<{ expanded?: boolean }>`
  transition: transform ${transitions.duration.shorter}ms ${transitions.easing.easeInOut};
  transform: ${props => props.expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  font-size: 1.5rem;
`;

/**
 * Accordion component for the Inventory Management System.
 * 
 * Provides a collapsible content panel with customizable styling, accessibility
 * features, and interactive behaviors. The accordion consists of a summary that
 * controls expansion and a collapsible content section.
 * 
 * @example
 * // Basic usage
 * <Accordion summary="Section Title">
 *   <p>Content goes here</p>
 * </Accordion>
 * 
 * // Controlled accordion
 * <Accordion 
 *   summary="Controlled Accordion" 
 *   expanded={expanded} 
 *   onChange={(e, isExpanded) => setExpanded(isExpanded)}
 * >
 *   <p>This accordion's state is controlled externally</p>
 * </Accordion>
 */
const Accordion = React.memo<AccordionProps>((props) => {
  const {
    variant = 'outlined',
    expanded: controlledExpanded,
    defaultExpanded = false,
    onChange,
    disabled = false,
    summary,
    children,
    ...other
  } = props;

  // State management for uncontrolled accordion
  const [internalExpanded, setInternalExpanded] = React.useState(defaultExpanded);
  
  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  // Handle toggle function
  const handleToggle = (event: React.SyntheticEvent) => {
    if (disabled) return;
    
    const newExpanded = !isExpanded;
    
    // Update internal state if uncontrolled
    if (controlledExpanded === undefined) {
      setInternalExpanded(newExpanded);
    }
    
    // Call onChange handler if provided
    if (onChange) {
      onChange(event, newExpanded);
    }
  };

  // Handle keyboard interaction
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      handleToggle(event);
    }
  };

  return (
    <StyledAccordion
      variant={variant}
      expanded={isExpanded}
      disabled={disabled}
      {...other}
    >
      <AccordionSummary
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        className="accordion-summary"
      >
        {typeof summary === 'string' ? (
          <Typography variant="body1" fontWeight="medium">{summary}</Typography>
        ) : (
          summary
        )}
        <ExpandIcon expanded={isExpanded} className="expand-icon" />
      </AccordionSummary>
      
      <Collapse in={isExpanded}>
        <AccordionContent className="accordion-details">
          {children}
        </AccordionContent>
      </Collapse>
    </StyledAccordion>
  );
});

// Set display name for debugging and development tools
Accordion.displayName = 'Accordion';

export default Accordion;