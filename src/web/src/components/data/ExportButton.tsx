import React, { useState, useCallback, useMemo } from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { DownloadOutlined } from '@ant-design/icons'; // @ant-design/icons ^5.0.1
import Button, { ButtonProps } from '../common/Button';
import ExportMenu from '../../features/data-export/components/ExportMenu';
import useExportData from '../../features/data-export/hooks/useExportData';

/**
 * Props for the ExportButton component
 */
export interface ExportButtonProps {
  /** Data to be exported */
  data: any[];
  /** Type of data being exported (e.g., 'positions', 'inventory') */
  dataType: string;
  /** Base filename for the exported file */
  filename: string;
  /** Array of export formats to display (e.g., ['xlsx', 'csv', 'pdf']) */
  formats?: string[];
  /** Props to pass to the Button component */
  buttonProps?: Partial<ButtonProps>;
  /** Content of the button */
  children?: React.ReactNode;
}

/**
 * A button component that provides data export functionality with format options
 * @param props - ExportButton properties
 * @returns Rendered export button component
 */
const ExportButton: React.FC<ExportButtonProps> = React.memo((props) => {
  // LD1: Destructure props including data, dataType, filename, formats, buttonProps, and other props
  const {
    data,
    dataType,
    filename,
    formats = ['xlsx', 'csv', 'pdf'], // LD1: default formats
    buttonProps = { variant: 'outlined', size: 'medium', color: 'primary' }, // LD1: default button props
    children = 'Export' // LD1: default children
  } = props;

  // LD1: Initialize state for the anchor element and menu open state
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  // LD1: Get loading state from useExportData hook
  const { loading } = useExportData();

  // LD1: Create a callback for handling button click to open the menu
  const handleButtonClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  }, []);

  // LD1: Create a callback for handling menu close
  const handleMenuClose = useCallback(() => {
    setMenuOpen(false);
  }, []);

  // LD1: Return the Button component with DownloadOutlined icon
  return (
    <>
      <Button
        {...buttonProps} // LD1: Pass appropriate props to Button component
        onClick={handleButtonClick} // LD1: Handle button click to open menu
        disabled={loading || buttonProps?.disabled} // LD1: Handle loading state in the Button component
        loading={loading} // LD1: Handle loading state in the Button component
        startIcon={<DownloadOutlined />} // LD1: Add DownloadOutlined icon
      >
        {children}
      </Button>
      {/* LD1: Render the ExportMenu component when the button is clicked */}
      <ExportMenu
        anchorEl={anchorEl} // LD1: Pass anchor element to ExportMenu
        open={menuOpen} // LD1: Pass menu open state to ExportMenu
        onClose={handleMenuClose} // LD1: Handle menu close
        data={data} // LD1: Pass data to ExportMenu
        dataType={dataType} // LD1: Pass dataType to ExportMenu
        filename={filename} // LD1: Pass filename to ExportMenu
        formats={formats} // LD1: Pass formats to ExportMenu
      />
    </>
  );
});

ExportButton.displayName = 'ExportButton';

// IE3: Export the ExportButton component for use throughout the application
export default ExportButton;

// IE3: Export the ExportButtonProps interface for use throughout the application
export interface ExportButtonProps {
  /** Data to be exported */
  data: any[];
  /** Type of data being exported (e.g., 'positions', 'inventory') */
  dataType: string;
  /** Base filename for the exported file */
  filename: string;
  /** Array of export formats to display (e.g., ['xlsx', 'csv', 'pdf']) */
  formats?: string[];
  /** Props to pass to the Button component */
  buttonProps?: Partial<ButtonProps>;
  /** Content of the button */
  children?: React.ReactNode;
}