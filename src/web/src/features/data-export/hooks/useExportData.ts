import { useState, useCallback, useMemo } from 'react'; // react v18.2.0
import { 
  formatDataForExport, 
  getExportColumns, 
  generateFilename, 
  formatPositionData, 
  formatInventoryData, 
  formatLocateData, 
  formatOrderData, 
  formatRuleData,
  EXPORT_FORMATS 
} from '../utils/exportFormatters';
import { Position, Inventory, LocateRequest, Order, CalculationRule } from '../../../types/models';

/**
 * Interface for the return value of the useExportData hook
 */
export interface ExportDataHookResult {
  /** Whether an export operation is currently in progress */
  loading: boolean;
  
  /** Export position data in the specified format */
  exportPositions: (positions: Position[], format: string, filename?: string) => Promise<void>;
  
  /** Export inventory data in the specified format */
  exportInventory: (inventory: Inventory[], format: string, filename?: string) => Promise<void>;
  
  /** Export locate request data in the specified format */
  exportLocates: (locates: LocateRequest[], format: string, filename?: string) => Promise<void>;
  
  /** Export order data in the specified format */
  exportOrders: (orders: Order[], format: string, filename?: string) => Promise<void>;
  
  /** Export calculation rule data in the specified format */
  exportRules: (rules: CalculationRule[], format: string, filename?: string) => Promise<void>;
  
  /** Export generic data in the specified format */
  exportGenericData: (data: any[], dataType: string, format: string, filename?: string) => Promise<void>;
}

/**
 * Custom hook that provides data export functionality for different data types and formats
 * @returns Object containing export functions and loading state
 */
const useExportData = (): ExportDataHookResult => {
  // State to track loading status during export operations
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Exports position data in the specified format
   * @param positions - Array of position objects to export
   * @param format - The export format (xlsx, csv, pdf)
   * @param filename - Optional custom filename for the export
   */
  const exportPositions = useCallback(async (
    positions: Position[], 
    format: string, 
    filename?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      
      // Format the position data for export
      const formattedData = formatPositionData(positions);
      
      // Get the column definitions for positions
      const columns = getExportColumns('positions');
      
      // Generate a default filename if not provided
      const exportFilename = filename || generateFilename('positions', format);
      
      // Export the formatted data
      await formatDataForExport(formattedData, format, exportFilename, columns);
    } catch (error) {
      console.error('Error exporting positions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exports inventory data in the specified format
   * @param inventory - Array of inventory objects to export
   * @param format - The export format (xlsx, csv, pdf)
   * @param filename - Optional custom filename for the export
   */
  const exportInventory = useCallback(async (
    inventory: Inventory[], 
    format: string, 
    filename?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      
      // Format the inventory data for export
      const formattedData = formatInventoryData(inventory);
      
      // Get the column definitions for inventory
      const columns = getExportColumns('inventory');
      
      // Generate a default filename if not provided
      const exportFilename = filename || generateFilename('inventory', format);
      
      // Export the formatted data
      await formatDataForExport(formattedData, format, exportFilename, columns);
    } catch (error) {
      console.error('Error exporting inventory:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exports locate request data in the specified format
   * @param locates - Array of locate request objects to export
   * @param format - The export format (xlsx, csv, pdf)
   * @param filename - Optional custom filename for the export
   */
  const exportLocates = useCallback(async (
    locates: LocateRequest[], 
    format: string, 
    filename?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      
      // Format the locate data for export
      const formattedData = formatLocateData(locates);
      
      // Get the column definitions for locates
      const columns = getExportColumns('locates');
      
      // Generate a default filename if not provided
      const exportFilename = filename || generateFilename('locates', format);
      
      // Export the formatted data
      await formatDataForExport(formattedData, format, exportFilename, columns);
    } catch (error) {
      console.error('Error exporting locates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exports order data in the specified format
   * @param orders - Array of order objects to export
   * @param format - The export format (xlsx, csv, pdf)
   * @param filename - Optional custom filename for the export
   */
  const exportOrders = useCallback(async (
    orders: Order[], 
    format: string, 
    filename?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      
      // Format the order data for export
      const formattedData = formatOrderData(orders);
      
      // Get the column definitions for orders
      const columns = getExportColumns('orders');
      
      // Generate a default filename if not provided
      const exportFilename = filename || generateFilename('orders', format);
      
      // Export the formatted data
      await formatDataForExport(formattedData, format, exportFilename, columns);
    } catch (error) {
      console.error('Error exporting orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exports calculation rule data in the specified format
   * @param rules - Array of calculation rule objects to export
   * @param format - The export format (xlsx, csv, pdf)
   * @param filename - Optional custom filename for the export
   */
  const exportRules = useCallback(async (
    rules: CalculationRule[], 
    format: string, 
    filename?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      
      // Format the rule data for export
      const formattedData = formatRuleData(rules);
      
      // Get the column definitions for rules
      const columns = getExportColumns('rules');
      
      // Generate a default filename if not provided
      const exportFilename = filename || generateFilename('rules', format);
      
      // Export the formatted data
      await formatDataForExport(formattedData, format, exportFilename, columns);
    } catch (error) {
      console.error('Error exporting rules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Exports generic data in the specified format
   * @param data - Array of data objects to export
   * @param dataType - The type of data being exported (for column selection)
   * @param format - The export format (xlsx, csv, pdf)
   * @param filename - Optional custom filename for the export
   */
  const exportGenericData = useCallback(async (
    data: any[], 
    dataType: string, 
    format: string, 
    filename?: string
  ): Promise<void> => {
    try {
      setLoading(true);
      
      // Get the column definitions for the specified data type
      const columns = getExportColumns(dataType);
      
      // Generate a default filename if not provided
      const exportFilename = filename || generateFilename(dataType, format);
      
      // Export the data
      await formatDataForExport(data, format, exportFilename, columns);
    } catch (error) {
      console.error(`Error exporting ${dataType}:`, error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Return the hook result with all export functions
  return useMemo(() => ({
    loading,
    exportPositions,
    exportInventory,
    exportLocates,
    exportOrders,
    exportRules,
    exportGenericData
  }), [
    loading,
    exportPositions,
    exportInventory,
    exportLocates,
    exportOrders,
    exportRules,
    exportGenericData
  ]);
};

export default useExportData;