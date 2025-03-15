import React, { useState, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { FileExcelOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons'; // @ant-design/icons ^5.0.1
import Menu from '../../../components/common/Menu';
import MenuItem from '../../../components/common/MenuItem';
import useExportData from '../hooks/useExportData';
import { EXPORT_FORMATS } from '../utils/exportFormatters';

/**
 * Props for the ExportMenu component
 */
export interface ExportMenuProps {
  /** The anchor element to attach the menu to */
  anchorEl: HTMLElement | null;
  /** Whether the menu is open */
  open: boolean;
  /** Callback when the menu is closed */
  onClose: () => void;
  /** Data to be exported */
  data: any[];
  /** Type of data being exported (e.g., 'positions', 'inventory') */
  dataType: string;
  /** Base filename for the exported file */
  filename: string;
  /** Array of export formats to display (e.g., ['xlsx', 'csv', 'pdf']) */
  formats: string[];
}

/**
 * Styled component for format icons in the menu
 */
const FormatIcon = styled.span`
  display: flex;
  align-items: center;
  margin-right: ${({ theme }) => theme.spacing(1)};
  font-size: ${({ theme }) => theme.typography.icon.fontSize};
  color: inherit;
`;

/**
 * Styled component for format labels in the menu
 */
const FormatLabel = styled.span`
  flex: 1;
  font-size: ${({ theme }) => theme.typography.body2.fontSize};
  font-weight: ${({ theme }) => theme.typography.body2.fontWeight};
`;

/**
 * A dropdown menu component that provides export format options
 * @param props - ExportMenu properties
 * @returns Rendered export menu component
 */
const ExportMenu = React.memo<ExportMenuProps>((props) => {
  // 1. Destructure props including anchorEl, open, onClose, data, dataType, filename, and formats
  const {
    anchorEl,
    open,
    onClose,
    data,
    dataType,
    filename,
    formats = ['xlsx', 'csv', 'pdf'], // default formats
  } = props;

  // 2. Get export functions from useExportData hook
  const { exportPositions, exportInventory, exportLocates, exportOrders, exportRules, exportGenericData } = useExportData();

  // 3. Create a memoized map of format icons for each export format
  const formatIcons = useMemo(() => ({
    xlsx: <FileExcelOutlined />,
    csv: <FileTextOutlined />,
    pdf: <FilePdfOutlined />,
  }), []);

  // 4. Create a memoized map of format labels for each export format
  const formatLabels = useMemo(() => ({
    xlsx: 'Excel',
    csv: 'CSV',
    pdf: 'PDF',
  }), []);

  /**
   * Handles the selection of an export format
   * @param format - The selected export format
   */
  const handleFormatSelect = useCallback((format: string) => {
    // 5. Determine which export function to use based on dataType
    let exportFunction: (data: any[], format: string, filename?: string) => Promise<void>;

    switch (dataType) {
      case 'positions':
        exportFunction = exportPositions;
        break;
      case 'inventory':
        exportFunction = exportInventory;
        break;
      case 'locates':
        exportFunction = exportLocates;
        break;
      case 'orders':
        exportFunction = exportOrders;
        break;
      case 'rules':
        exportFunction = exportRules;
        break;
      default:
        exportFunction = exportGenericData;
    }

    // 6. Call the appropriate export function with data, format, and filename
    exportFunction(data, format, filename)
      .then(() => {
        // 7. Close the menu by calling onClose
        onClose();
      });
  }, [data, dataType, exportGenericData, exportInventory, exportLocates, exportOrders, exportPositions, exportRules, filename, onClose]);

  // 8. Return the Menu component with MenuItem components for each format
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
    >
      {formats.map((format) => (
        // 9. Each MenuItem includes the appropriate icon and label for the format
        <MenuItem key={format} onClick={() => handleFormatSelect(format)}>
          <FormatIcon>{formatIcons[format]}</FormatIcon>
          <FormatLabel>{formatLabels[format]}</FormatLabel>
        </MenuItem>
      ))}
    </Menu>
  );
});

ExportMenu.displayName = 'ExportMenu';

export default ExportMenu;