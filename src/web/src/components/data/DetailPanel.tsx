import React, { useState, useEffect, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { css } from '@emotion/react'; // @emotion/react ^11.10.6
import Card from '../common/Card';
import Typography from '../common/Typography';
import Divider from '../common/Divider';
import Button from '../common/Button';
import { flexColumn, flexBetween } from '../../styles/mixins';
import { spacing } from '../../styles/variables';

/**
 * Props for the DetailPanel component
 */
export interface DetailPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Data to display in the detail panel */
  data: any;
  /** Type of detail panel (e.g., 'position', 'inventory', 'locate', 'exception') */
  type: string;
  /** Callback function to close the detail panel */
  onClose: () => void;
  /** Callback function for action buttons */
  onAction?: (actionId: string, data: any) => void;
  /** Width of the detail panel */
  width?: string | number;
  /** Height of the detail panel */
  height?: string | number;
  /** Position of the detail panel (e.g., 'right', 'bottom') */
  position?: string;
  /** Additional CSS class name */
  className?: string;
}

/**
 * Configuration for a panel section
 */
interface PanelSection {
  id: string;
  title: string;
  dataKey: string;
  format?: string;
  visible?: boolean;
}

/**
 * Configuration for a panel action button
 */
interface PanelAction {
  id: string;
  label: string;
  variant: 'contained' | 'outlined' | 'text';
  color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  visible?: boolean;
  condition?: (data: any) => boolean;
}

/**
 * Configuration for a panel type
 */
interface PanelConfig {
  title: string;
  sections: PanelSection[];
  actions?: PanelAction[];
}

/**
 * Styled container for the detail panel
 */
const DetailPanelContainer = styled(Card)<DetailPanelProps>`
  width: ${props => typeof props.width === 'number' ? `${props.width}px` : props.width};
  height: ${props => typeof props.height === 'number' ? `${props.height}px` : props.height};
  position: absolute;
  top: 0;
  ${props => props.position}: 0;
  z-index: 1200;
  overflow: hidden;
  ${flexColumn};
`;

/**
 * Styled header for the detail panel
 */
const PanelHeader = styled.div`
  ${flexBetween};
  padding: ${spacing.md}px;
  border-bottom: 1px solid #ddd;
`;

/**
 * Styled content area for the detail panel
 */
const PanelContent = styled.div`
  ${flexColumn};
  padding: ${spacing.md}px;
  overflow-y: auto;
  flex-grow: 1;
`;

/**
 * Styled section within the detail panel
 */
const PanelSection = styled.div`
  margin-bottom: ${spacing.md}px;
  ${flexColumn};
`;

/**
 * Styled footer for the detail panel actions
 */
const PanelFooter = styled.div`
  ${flexBetween};
  padding: ${spacing.md}px;
  border-top: 1px solid #ddd;
`;

/**
 * Renders the content for a specific section based on data type and format
 * @param data - The data to render
 * @param format - The format to apply to the data
 * @returns Rendered section content
 */
const renderSectionContent = (data: any, format?: string): JSX.Element => {
  // Implement different rendering formats based on the format string
  let formattedContent: string = '';

  if (data === null || data === undefined) {
    return <Typography variant="body2">N/A</Typography>;
  }

  switch (format) {
    case 'number':
      formattedContent = Number(data).toLocaleString();
      break;
    case 'currency':
      formattedContent = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(data);
      break;
    case 'date':
      formattedContent = new Date(data).toLocaleDateString();
      break;
    default:
      formattedContent = String(data);
  }

  return <Typography variant="body2">{formattedContent}</Typography>;
};

/**
 * Renders a complete section with title and formatted content
 * @param title - The title of the section
 * @param data - The data to display in the section
 * @param format - The format to apply to the data
 * @returns Rendered section with title and content
 */
const renderSection = (title: string, data: any, format?: string): JSX.Element => {
  return (
    <PanelSection>
      <Typography variant="subtitle2">{title}</Typography>
      {renderSectionContent(data, format)}
    </PanelSection>
  );
};

/**
 * Gets the configuration for a specific panel type
 * @param type - The type of panel to configure
 * @returns Panel configuration including title, sections, and actions
 */
const getPanelConfig = (type: string): PanelConfig => {
  switch (type) {
    case 'position':
      return {
        title: 'Position Details',
        sections: [
          { id: 'security', title: 'Security', dataKey: 'security.description' },
          { id: 'book', title: 'Book', dataKey: 'bookId' },
          { id: 'quantity', title: 'Quantity', dataKey: 'settledQty', format: 'number' },
          { id: 'marketValue', title: 'Market Value', dataKey: 'marketValue', format: 'currency' },
        ],
      };
    case 'inventory':
      return {
        title: 'Inventory Details',
        sections: [
          { id: 'security', title: 'Security', dataKey: 'security.description' },
          { id: 'available', title: 'Available Quantity', dataKey: 'availableQuantity', format: 'number' },
          { id: 'market', title: 'Market', dataKey: 'market' },
        ],
      };
    case 'locate':
      return {
        title: 'Locate Request Details',
        sections: [
          { id: 'security', title: 'Security', dataKey: 'security.description' },
          { id: 'client', title: 'Client', dataKey: 'client.name' },
          { id: 'quantity', title: 'Requested Quantity', dataKey: 'requestedQuantity', format: 'number' },
          { id: 'status', title: 'Status', dataKey: 'status' },
        ],
        actions: [
          { id: 'approve', label: 'Approve', variant: 'contained', color: 'success', visible: true },
          { id: 'reject', label: 'Reject', variant: 'outlined', color: 'error', visible: true },
        ],
      };
    case 'exception':
      return {
        title: 'Exception Details',
        sections: [
          { id: 'type', title: 'Type', dataKey: 'exceptionType' },
          { id: 'message', title: 'Message', dataKey: 'message' },
          { id: 'timestamp', title: 'Timestamp', dataKey: 'timestamp', format: 'date' },
        ],
      };
    default:
      return {
        title: 'Details',
        sections: [],
      };
  }
};

/**
 * Renders a panel with detailed information about a selected item
 * @param props - The props for the DetailPanel component
 * @returns Rendered detail panel component
 */
const DetailPanel: React.FC<DetailPanelProps> = React.memo(({
  data,
  type,
  onClose,
  onAction,
  width = '400px',
  height = 'auto',
  position = 'right',
  className,
}) => {
  const panelConfig = useMemo(() => getPanelConfig(type), [type]);

  return (
    <DetailPanelContainer width={width} height={height} position={position} className={className}>
      <PanelHeader>
        <Typography variant="h6">{panelConfig.title}</Typography>
        <Button variant="text" color="secondary" onClick={onClose}>
          Close
        </Button>
      </PanelHeader>
      <PanelContent>
        {panelConfig.sections.map(section => (
          <React.Fragment key={section.id}>
            {renderSection(section.title, data[section.dataKey], section.format)}
            <Divider />
          </React.Fragment>
        ))}
      </PanelContent>
      {panelConfig.actions && (
        <PanelFooter>
          {panelConfig.actions.map(action => (
            <Button
              key={action.id}
              variant={action.variant}
              color={action.color}
              onClick={() => onAction && onAction(action.id, data)}
            >
              {action.label}
            </Button>
          ))}
        </PanelFooter>
      )}
    </DetailPanelContainer>
  );
});

DetailPanel.displayName = 'DetailPanel';

export default DetailPanel;