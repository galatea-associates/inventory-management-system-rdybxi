import ExcelJS from 'exceljs'; // exceljs ^4.3.0 
import jsPDF from 'jspdf'; // jspdf ^2.5.1
import autoTable from 'jspdf-autotable'; // jspdf-autotable ^3.5.28
import Papa from 'papaparse'; // papaparse ^5.4.0

// Import domain model interfaces
import { Position, Inventory, LocateRequest, Order, CalculationRule } from '../../../types/models';

// Import date formatting utilities
import { formatDate, DISPLAY_DATE_FORMAT, DISPLAY_DATE_TIME_FORMAT } from '../../../utils/date';

// Import number formatting utilities
import { 
  formatQuantity, 
  formatPrice, 
  formatCurrency, 
  formatPercentage,
  formatPositionValue
} from '../../../utils/number';

// Define export formats
export const EXPORT_FORMATS = {
  EXCEL: 'xlsx',
  CSV: 'csv',
  PDF: 'pdf'
};

// Define export column interface
export interface ExportColumn {
  field: string;
  header: string;
  width?: number;
  formatter?: (value: any) => string;
}

/**
 * Formats and exports data in the specified format (Excel, CSV, PDF)
 * @param data The data to export
 * @param format The export format (xlsx, csv, pdf)
 * @param filename The filename for the exported file
 * @param columns The column definitions for the export
 * @returns Promise that resolves when export is complete
 */
export async function formatDataForExport(
  data: any[],
  format: string,
  filename: string,
  columns: ExportColumn[]
): Promise<void> {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  if (!columns || columns.length === 0) {
    console.warn('No columns defined for export');
    return;
  }

  // Ensure filename has the correct extension
  if (!filename.toLowerCase().endsWith(`.${format}`)) {
    filename = `${filename}.${format}`;
  }

  // Handle each format type
  switch (format.toLowerCase()) {
    case EXPORT_FORMATS.EXCEL:
      await exportToExcel(data, filename, columns);
      break;
    case EXPORT_FORMATS.CSV:
      exportToCsv(data, filename, columns);
      break;
    case EXPORT_FORMATS.PDF:
      exportToPdf(data, filename, columns);
      break;
    default:
      console.error(`Unsupported export format: ${format}`);
  }
}

/**
 * Returns column definitions for the specified data type
 * @param dataType The type of data being exported
 * @returns Array of column definitions
 */
export function getExportColumns(dataType: string): ExportColumn[] {
  switch (dataType.toLowerCase()) {
    case 'position':
    case 'positions':
      return [
        { field: 'securitySymbol', header: 'Security', width: 15 },
        { field: 'securityDescription', header: 'Description', width: 25 },
        { field: 'book', header: 'Book', width: 15 },
        { field: 'counterparty', header: 'Counterparty', width: 20 },
        { field: 'aggregationUnit', header: 'Aggregation Unit', width: 20 },
        { field: 'contractualQty', header: 'Contractual Qty', width: 15, formatter: formatQuantity },
        { field: 'settledQty', header: 'Settled Qty', width: 15, formatter: formatQuantity },
        { field: 'netSettlementToday', header: 'Net Settle Today', width: 15, formatter: formatQuantity },
        { field: 'projectedSettledQty', header: 'Projected Settled', width: 15, formatter: formatQuantity },
        { field: 'marketValue', header: 'Market Value', width: 15, formatter: formatCurrency },
        { field: 'businessDate', header: 'Business Date', width: 15 },
        { field: 'positionType', header: 'Position Type', width: 15 },
        { field: 'isHypothecatable', header: 'Hypothecatable', width: 15 },
        { field: 'isReserved', header: 'Reserved', width: 15 }
      ];
    
    case 'inventory':
      return [
        { field: 'securitySymbol', header: 'Security', width: 15 },
        { field: 'securityDescription', header: 'Description', width: 25 },
        { field: 'counterparty', header: 'Counterparty', width: 20 },
        { field: 'aggregationUnit', header: 'Aggregation Unit', width: 20 },
        { field: 'calculationType', header: 'Calculation Type', width: 20 },
        { field: 'grossQuantity', header: 'Gross Qty', width: 15, formatter: formatQuantity },
        { field: 'netQuantity', header: 'Net Qty', width: 15, formatter: formatQuantity },
        { field: 'availableQuantity', header: 'Available Qty', width: 15, formatter: formatQuantity },
        { field: 'reservedQuantity', header: 'Reserved Qty', width: 15, formatter: formatQuantity },
        { field: 'remainingAvailability', header: 'Remaining Avail', width: 15, formatter: formatQuantity },
        { field: 'market', header: 'Market', width: 10 },
        { field: 'securityTemperature', header: 'Temperature', width: 12 },
        { field: 'borrowRate', header: 'Borrow Rate', width: 12, formatter: (value) => formatPercentage(value, 2) },
        { field: 'status', header: 'Status', width: 10 },
        { field: 'businessDate', header: 'Business Date', width: 15 },
        { field: 'marketValue', header: 'Market Value', width: 15, formatter: formatCurrency }
      ];
    
    case 'locate':
    case 'locates':
      return [
        { field: 'securitySymbol', header: 'Security', width: 15 },
        { field: 'securityDescription', header: 'Description', width: 25 },
        { field: 'requestId', header: 'Request ID', width: 15 },
        { field: 'clientName', header: 'Client', width: 20 },
        { field: 'requestorName', header: 'Requestor', width: 20 },
        { field: 'aggregationUnit', header: 'Aggregation Unit', width: 20 },
        { field: 'locateType', header: 'Locate Type', width: 15 },
        { field: 'requestedQuantity', header: 'Requested Qty', width: 15, formatter: formatQuantity },
        { field: 'approvedQuantity', header: 'Approved Qty', width: 15, formatter: formatQuantity },
        { field: 'decrementQuantity', header: 'Decrement Qty', width: 15, formatter: formatQuantity },
        { field: 'requestTimestamp', header: 'Request Time', width: 20 },
        { field: 'status', header: 'Status', width: 12 },
        { field: 'approvalTimestamp', header: 'Approval Time', width: 20 },
        { field: 'approvedBy', header: 'Approved By', width: 15 },
        { field: 'expiryDate', header: 'Expiry Date', width: 15 },
        { field: 'rejectionReason', header: 'Rejection Reason', width: 20 },
        { field: 'rejectedBy', header: 'Rejected By', width: 15 },
        { field: 'comments', header: 'Comments', width: 30 }
      ];
    
    case 'order':
    case 'orders':
      return [
        { field: 'securitySymbol', header: 'Security', width: 15 },
        { field: 'securityDescription', header: 'Description', width: 25 },
        { field: 'orderId', header: 'Order ID', width: 15 },
        { field: 'side', header: 'Side', width: 10 },
        { field: 'orderType', header: 'Order Type', width: 15 },
        { field: 'quantity', header: 'Quantity', width: 15, formatter: formatQuantity },
        { field: 'price', header: 'Price', width: 15, formatter: formatPrice },
        { field: 'buyer', header: 'Buyer', width: 20 },
        { field: 'seller', header: 'Seller', width: 20 },
        { field: 'orderDate', header: 'Order Date', width: 15 },
        { field: 'settlementDate', header: 'Settlement Date', width: 15 },
        { field: 'status', header: 'Status', width: 12 },
        { field: 'book', header: 'Book', width: 15 },
        { field: 'executionsCount', header: 'Executions', width: 10 },
        { field: 'validationStatus', header: 'Validation Status', width: 15 },
        { field: 'validationReason', header: 'Validation Reason', width: 25 },
        { field: 'processingTimeMs', header: 'Processing Time (ms)', width: 15 }
      ];
    
    case 'rule':
    case 'rules':
      return [
        { field: 'name', header: 'Rule Name', width: 25 },
        { field: 'description', header: 'Description', width: 30 },
        { field: 'ruleType', header: 'Rule Type', width: 20 },
        { field: 'market', header: 'Market', width: 15 },
        { field: 'priority', header: 'Priority', width: 10 },
        { field: 'status', header: 'Status', width: 12 },
        { field: 'version', header: 'Version', width: 10 },
        { field: 'effectiveDate', header: 'Effective Date', width: 15 },
        { field: 'expiryDate', header: 'Expiry Date', width: 15 },
        { field: 'conditions', header: 'Conditions', width: 40 },
        { field: 'actions', header: 'Actions', width: 40 }
      ];
    
    default:
      console.warn(`No predefined columns for data type: ${dataType}`);
      return [];
  }
}

/**
 * Generates a default filename for exports based on data type and format
 * @param dataType The type of data being exported
 * @param format The export format
 * @returns Generated filename with appropriate extension
 */
export function generateFilename(dataType: string, format: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10);
  return `${dataType.toLowerCase()}_${dateStr}.${format.toLowerCase()}`;
}

/**
 * Formats position data for export, transforming complex objects into flat structure
 * @param positions Array of position objects
 * @returns Formatted position data ready for export
 */
export function formatPositionData(positions: Position[]): any[] {
  if (!positions || !Array.isArray(positions)) {
    return [];
  }

  return positions.map(position => {
    return {
      securitySymbol: position.security?.internalId || '',
      securityDescription: position.security?.description || '',
      book: position.bookId || '',
      counterparty: position.counterparty?.name || '',
      aggregationUnit: position.aggregationUnit?.name || '',
      contractualQty: position.contractualQty || 0,
      settledQty: position.settledQty || 0,
      sd0Deliver: position.sd0Deliver || 0,
      sd0Receipt: position.sd0Receipt || 0,
      sd1Deliver: position.sd1Deliver || 0,
      sd1Receipt: position.sd1Receipt || 0,
      sd2Deliver: position.sd2Deliver || 0,
      sd2Receipt: position.sd2Receipt || 0,
      sd3Deliver: position.sd3Deliver || 0,
      sd3Receipt: position.sd3Receipt || 0,
      sd4Deliver: position.sd4Deliver || 0,
      sd4Receipt: position.sd4Receipt || 0,
      netSettlementToday: position.netSettlementToday || 0,
      projectedSettledQty: position.projectedSettledQty || 0,
      businessDate: formatDate(position.businessDate, DISPLAY_DATE_FORMAT),
      positionType: position.positionType || '',
      isHypothecatable: position.isHypothecatable ? 'Yes' : 'No',
      isReserved: position.isReserved ? 'Yes' : 'No',
      marketValue: position.marketValue || 0
    };
  });
}

/**
 * Formats inventory data for export, transforming complex objects into flat structure
 * @param inventory Array of inventory objects
 * @returns Formatted inventory data ready for export
 */
export function formatInventoryData(inventory: Inventory[]): any[] {
  if (!inventory || !Array.isArray(inventory)) {
    return [];
  }

  return inventory.map(item => {
    return {
      securitySymbol: item.security?.internalId || '',
      securityDescription: item.security?.description || '',
      counterparty: item.counterparty?.name || '',
      aggregationUnit: item.aggregationUnit?.name || '',
      calculationType: item.calculationType || '',
      grossQuantity: item.grossQuantity || 0,
      netQuantity: item.netQuantity || 0,
      availableQuantity: item.availableQuantity || 0,
      reservedQuantity: item.reservedQuantity || 0,
      decrementQuantity: item.decrementQuantity || 0,
      remainingAvailability: item.remainingAvailability || 0,
      market: item.market || '',
      securityTemperature: item.securityTemperature || '',
      borrowRate: item.borrowRate || 0,
      calculationRuleId: item.calculationRuleId || '',
      calculationRuleVersion: item.calculationRuleVersion || '',
      isExternalSource: item.isExternalSource ? 'Yes' : 'No',
      externalSourceName: item.externalSourceName || '',
      status: item.status || '',
      businessDate: formatDate(item.businessDate, DISPLAY_DATE_FORMAT),
      marketValue: item.marketValue || 0
    };
  });
}

/**
 * Formats locate request data for export, transforming complex objects into flat structure
 * @param locates Array of locate request objects
 * @returns Formatted locate data ready for export
 */
export function formatLocateData(locates: LocateRequest[]): any[] {
  if (!locates || !Array.isArray(locates)) {
    return [];
  }

  return locates.map(locate => {
    return {
      securitySymbol: locate.security?.internalId || '',
      securityDescription: locate.security?.description || '',
      requestId: locate.requestId || '',
      clientName: locate.client?.name || '',
      requestorName: locate.requestor?.name || '',
      aggregationUnit: locate.aggregationUnit?.name || '',
      locateType: locate.locateType || '',
      requestedQuantity: locate.requestedQuantity || 0,
      requestTimestamp: formatDate(locate.requestTimestamp, DISPLAY_DATE_TIME_FORMAT),
      status: locate.status || '',
      swapCashIndicator: locate.swapCashIndicator || '',
      approvedQuantity: locate.approval?.approvedQuantity || 0,
      decrementQuantity: locate.approval?.decrementQuantity || 0,
      approvalTimestamp: locate.approval ? formatDate(locate.approval.approvalTimestamp, DISPLAY_DATE_TIME_FORMAT) : '',
      approvedBy: locate.approval?.approvedBy || '',
      expiryDate: locate.approval ? formatDate(locate.approval.expiryDate, DISPLAY_DATE_FORMAT) : '',
      rejectionReason: locate.rejection?.rejectionReason || '',
      rejectionTimestamp: locate.rejection ? formatDate(locate.rejection.rejectionTimestamp, DISPLAY_DATE_TIME_FORMAT) : '',
      rejectedBy: locate.rejection?.rejectedBy || '',
      comments: locate.approval?.comments || locate.rejection?.comments || ''
    };
  });
}

/**
 * Formats order data for export, transforming complex objects into flat structure
 * @param orders Array of order objects
 * @returns Formatted order data ready for export
 */
export function formatOrderData(orders: Order[]): any[] {
  if (!orders || !Array.isArray(orders)) {
    return [];
  }

  return orders.map(order => {
    return {
      securitySymbol: order.security?.internalId || '',
      securityDescription: order.security?.description || '',
      orderId: order.orderId || '',
      buyer: order.buyerCounterparty?.name || '',
      seller: order.sellerCounterparty?.name || '',
      side: order.side || '',
      price: order.price || 0,
      quantity: order.quantity || 0,
      orderType: order.orderType || '',
      orderDate: formatDate(order.orderDate, DISPLAY_DATE_FORMAT),
      settlementDate: formatDate(order.settlementDate, DISPLAY_DATE_FORMAT),
      status: order.status || '',
      book: order.bookId || '',
      parentOrderId: order.parentOrderId || '',
      executionsCount: order.executions?.length || 0,
      validationStatus: order.validation?.status || '',
      validationReason: order.validation?.rejectionReason || '',
      processingTimeMs: order.validation?.processingTimeMs || 0
    };
  });
}

/**
 * Formats calculation rule data for export, transforming complex objects into flat structure
 * @param rules Array of calculation rule objects
 * @returns Formatted rule data ready for export
 */
export function formatRuleData(rules: CalculationRule[]): any[] {
  if (!rules || !Array.isArray(rules)) {
    return [];
  }

  return rules.map(rule => {
    // Format conditions and actions for readability
    const conditionsText = rule.conditions
      ?.map(c => `${c.attribute} ${c.operator} ${c.value}`)
      ?.join('; ') || '';
    
    const actionsText = rule.actions
      ?.map(a => {
        const params = Object.entries(a.parameters || {})
          .map(([key, value]) => `${key}=${value}`)
          .join(', ');
        return `${a.actionType}(${params})`;
      })
      ?.join('; ') || '';

    return {
      name: rule.name || '',
      description: rule.description || '',
      ruleType: rule.ruleType || '',
      market: rule.market || '',
      priority: rule.priority || 0,
      effectiveDate: formatDate(rule.effectiveDate, DISPLAY_DATE_FORMAT),
      expiryDate: formatDate(rule.expiryDate, DISPLAY_DATE_FORMAT),
      status: rule.status || '',
      conditions: conditionsText,
      actions: actionsText,
      version: rule.version || 0
    };
  });
}

/**
 * Triggers a file download with the specified content and filename
 * @param content The Blob content to download
 * @param filename The filename for the download
 */
function downloadFile(content: Blob, filename: string): void {
  const url = window.URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Exports data to Excel format
 * @param data The data to export
 * @param filename The filename for the exported file
 * @param columns The column definitions for the export
 */
async function exportToExcel(data: any[], filename: string, columns: ExportColumn[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  // Add headers
  const headerRow = worksheet.addRow(columns.map(col => col.header));
  headerRow.font = { bold: true };

  // Set column widths
  columns.forEach((col, index) => {
    if (col.width) {
      worksheet.getColumn(index + 1).width = col.width;
    }
  });

  // Add data rows
  data.forEach(item => {
    const rowData = columns.map(col => {
      const value = item[col.field];
      return col.formatter ? col.formatter(value) : value;
    });
    worksheet.addRow(rowData);
  });

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadFile(blob, filename);
}

/**
 * Exports data to CSV format
 * @param data The data to export
 * @param filename The filename for the exported file
 * @param columns The column definitions for the export
 */
function exportToCsv(data: any[], filename: string, columns: ExportColumn[]): void {
  const processedData = data.map(item => {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      const value = item[col.field];
      row[col.header] = col.formatter ? col.formatter(value) : value;
    });
    return row;
  });

  const csv = Papa.unparse(processedData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename);
}

/**
 * Exports data to PDF format
 * @param data The data to export
 * @param filename The filename for the exported file
 * @param columns The column definitions for the export
 */
function exportToPdf(data: any[], filename: string, columns: ExportColumn[]): void {
  const doc = new jsPDF();
  
  // Add title
  const title = filename.split('.')[0];
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);

  // Format data for autotable
  const tableColumns = columns.map(col => ({ 
    header: col.header, 
    dataKey: col.field 
  }));
  
  const tableData = data.map(item => {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      const value = item[col.field];
      row[col.field] = col.formatter ? col.formatter(value) : value;
    });
    return row;
  });

  // Add table
  autoTable(doc, {
    columns: tableColumns,
    body: tableData,
    startY: 30,
    margin: { top: 30 },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [66, 66, 66] }
  });

  // Generate PDF
  doc.save(filename);
}