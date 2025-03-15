import React from 'react'; // react ^18.2.0
import styled from '@emotion/styled'; // @emotion/styled ^11.10.6
import { ColDef, ValueFormatterParams, ICellRendererParams } from 'ag-grid-community'; // ag-grid-community 29.3
import { Box, Typography } from '@mui/material'; // @mui/material 5.13
import Tooltip from '../common/Tooltip';
import {
  formatCurrency,
  formatQuantity,
  formatPercentage,
  formatPrice,
  formatRate,
  formatDateString,
  formatDateTimeString,
  formatPositionValue,
  formatPositionValueWithColor,
} from '../../utils/formatter';
import { Security, Position, Inventory, LocateRequest, Order } from '../../types/models';

/**
 * Configuration interface for grid columns with strong typing
 */
export interface GridColumn {
  field: string;
  headerName: string;
  type?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  sortable?: boolean;
  filter?: boolean | string;
  resizable?: boolean;
  pinned?: string;
  hide?: boolean;
  tooltip?: string;
  valueFormatter?: (params: ValueFormatterParams) => string;
  cellRenderer?: React.ComponentType<ICellRendererParams> | string;
  cellClass?: string | string[];
  headerClass?: string | string[];
  filterParams?: object;
  cellRendererParams?: object;
  valueGetterParams?: object;
  valueGetter?: (params: any) => any;
  comparator?: (valueA: any, valueB: any, nodeA: any, nodeB: any, isInverted: boolean) => number;
  sort?: string;
  sortIndex?: number;
  editable?: boolean;
  cellEditor?: string | React.ComponentType<any>;
  cellEditorParams?: object;
}

/**
 * Enum of supported column data types with specialized formatting and rendering
 */
export enum ColumnType {
  STRING = 'string',
  NUMBER = 'number',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  DATE = 'date',
  DATETIME = 'datetime',
  BOOLEAN = 'boolean',
  POSITION = 'position',
  QUANTITY = 'quantity',
  PRICE = 'price',
  RATE = 'rate',
  SECURITY = 'security',
  COUNTERPARTY = 'counterparty',
  STATUS = 'status',
}

/**
 * Props for the header component with tooltip support
 */
interface HeaderWithTooltipProps {
  displayName: string;
  tooltip: string;
}

/**
 * Styled component for grid header cells with tooltip support
 */
const StyledHeaderCell = styled(Box)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding: 0 8px;
`;

/**
 * Styled component for security cells with symbol and description
 */
const SecurityCell = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

/**
 * Styled component for counterparty cells with name and identifier
 */
const CounterpartyCell = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

/**
 * Styled component for status cells with badge and text
 */
const StatusCell = styled(Box)`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/**
 * Styled component for status indicator badge
 */
const StatusBadge = styled(Box)<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: props => props.color;
`;

/**
 * Renders a position value with appropriate color coding based on positive/negative values
 * @param params 
 * @returns Rendered cell with formatted position value
 */
export const PositionValueCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const { value, color } = formatPositionValueWithColor(params.value);
  return <Typography variant="body2" color={color}>{value}</Typography>;
};

/**
 * Renders a security cell with symbol and description
 * @param params 
 * @returns Rendered cell with security information
 */
export const SecurityCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const security = params.value as Security;
  return (
    <SecurityCell>
      <Typography variant="body2">{security?.securityType}</Typography>
      <Typography variant="caption" color="textSecondary">{security?.description}</Typography>
    </SecurityCell>
  );
};

/**
 * Renders a counterparty cell with name and identifier
 * @param params 
 * @returns Rendered cell with counterparty information
 */
export const CounterpartyCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const counterparty = params.value as Security;
  return (
    <CounterpartyCell>
      <Typography variant="body2">{counterparty?.id}</Typography>
      <Typography variant="caption" color="textSecondary">{counterparty?.name}</Typography>
    </CounterpartyCell>
  );
};

/**
 * Renders a status cell with appropriate color coding and badge
 * @param params 
 * @returns Rendered cell with status indicator
 */
export const StatusCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const status = params.value as string;
  let color = '#9e9e9e'; // Default grey
  if (status === 'Active') {
    color = '#4caf50'; // Green
  } else if (status === 'Inactive') {
    color = '#f44336'; // Red
  }

  return (
    <StatusCell>
      <StatusBadge color={color} />
      <Typography variant="body2">{status}</Typography>
    </StatusCell>
  );
};

/**
 * Returns default column definition properties for AG Grid
 * @returns Default column properties
 */
export const getDefaultColDef = (): Partial<ColDef> => ({
  sortable: true,
  resizable: true,
  filter: true,
  minWidth: 100,
  width: 150,
  filterParams: {
    buttons: ['reset', 'apply'],
  },
});

/**
 * Creates an AG Grid column definition from a GridColumn configuration
 * @param column 
 * @returns AG Grid column definition
 */
export const createColumnDef = (column: GridColumn): ColDef => {
  let colDef: ColDef = {
    ...getDefaultColDef(),
    field: column.field,
    headerName: column.headerName,
    width: column.width,
    minWidth: column.minWidth,
    maxWidth: column.maxWidth,
    flex: column.flex,
    sortable: column.sortable,
    filter: column.filter,
    resizable: column.resizable,
    pinned: column.pinned,
    hide: column.hide,
    valueFormatter: column.valueFormatter,
    cellClass: column.cellClass,
    headerClass: column.headerClass,
    filterParams: column.filterParams,
    cellRendererParams: column.cellRendererParams,
    valueGetterParams: column.valueGetterParams,
    valueGetter: column.valueGetter,
    comparator: column.comparator,
    sort: column.sort,
    sortIndex: column.sortIndex,
    editable: column.editable,
    cellEditor: column.cellEditor,
    cellEditorParams: column.cellEditorParams,
  };

  if (column.tooltip) {
    colDef.headerComponent = (props: any) => (
      <StyledHeaderCell>
        <span>{column.headerName}</span>
        <Tooltip title={column.tooltip}>
          <span>(?)</span>
        </Tooltip>
      </StyledHeaderCell>
    );
  }

  switch (column.type) {
    case ColumnType.CURRENCY:
      colDef.valueFormatter = (params) => formatCurrency(params.value);
      break;
    case ColumnType.QUANTITY:
      colDef.valueFormatter = (params) => formatQuantity(params.value);
      break;
    case ColumnType.PERCENTAGE:
      colDef.valueFormatter = (params) => formatPercentage(params.value, 2);
      break;
    case ColumnType.PRICE:
      colDef.valueFormatter = (params) => formatPrice(params.value);
      break;
    case ColumnType.RATE:
      colDef.valueFormatter = (params) => formatRate(params.value);
      break;
    case ColumnType.DATE:
      colDef.valueFormatter = (params) => formatDateString(params.value);
      break;
    case ColumnType.DATETIME:
      colDef.valueFormatter = (params) => formatDateTimeString(params.value);
      break;
    case ColumnType.POSITION:
      colDef.cellRenderer = PositionValueCellRenderer;
      break;
    case ColumnType.SECURITY:
      colDef.cellRenderer = SecurityCellRenderer;
      break;
    case ColumnType.COUNTERPARTY:
      colDef.cellRenderer = CounterpartyCellRenderer;
      break;
    case ColumnType.STATUS:
      colDef.cellRenderer = StatusCellRenderer;
      break;
    default:
      break;
  }

  return colDef;
};

/**
 * Configuration interface for grid columns with strong typing
 */
export interface GridColumn {
  field: string;
  headerName: string;
  type?: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  sortable?: boolean;
  filter?: boolean | string;
  resizable?: boolean;
  pinned?: string;
  hide?: boolean;
  tooltip?: string;
  valueFormatter?: (params: ValueFormatterParams) => string;
  cellRenderer?: React.ComponentType<ICellRendererParams> | string;
  cellClass?: string | string[];
  headerClass?: string | string[];
  filterParams?: object;
  cellRendererParams?: object;
  valueGetterParams?: object;
  valueGetter?: (params: any) => any;
  comparator?: (valueA: any, valueB: any, nodeA: any, nodeB: any, isInverted: boolean) => number;
  sort?: string;
  sortIndex?: number;
  editable?: boolean;
  cellEditor?: string | React.ComponentType<any>;
  cellEditorParams?: object;
}

/**
 * Enum of supported column data types with specialized formatting and rendering
 */
export enum ColumnType {
  STRING = 'string',
  NUMBER = 'number',
  CURRENCY = 'currency',
  PERCENTAGE = 'percentage',
  DATE = 'date',
  DATETIME = 'datetime',
  BOOLEAN = 'boolean',
  POSITION = 'position',
  QUANTITY = 'quantity',
  PRICE = 'price',
  RATE = 'rate',
  SECURITY = 'security',
  COUNTERPARTY = 'counterparty',
  STATUS = 'status',
}

/**
 * Returns default column definition properties for AG Grid
 * @returns Default column properties
 */
export const getDefaultColDef = (): Partial<ColDef> => ({
  sortable: true,
  resizable: true,
  filter: true,
  minWidth: 100,
  width: 150,
  filterParams: {
    buttons: ['reset', 'apply'],
  },
});

/**
 * Creates an AG Grid column definition from a GridColumn configuration
 * @param column 
 * @returns AG Grid column definition
 */
export const createColumnDef = (column: GridColumn): ColDef => {
  let colDef: ColDef = {
    ...getDefaultColDef(),
    field: column.field,
    headerName: column.headerName,
    width: column.width,
    minWidth: column.minWidth,
    maxWidth: column.maxWidth,
    flex: column.flex,
    sortable: column.sortable,
    filter: column.filter,
    resizable: column.resizable,
    pinned: column.pinned,
    hide: column.hide,
    valueFormatter: column.valueFormatter,
    cellClass: column.cellClass,
    headerClass: column.headerClass,
    filterParams: column.filterParams,
    cellRendererParams: column.cellRendererParams,
    valueGetterParams: column.valueGetterParams,
    valueGetter: column.valueGetter,
    comparator: column.comparator,
    sort: column.sort,
    sortIndex: column.sortIndex,
    editable: column.editable,
    cellEditor: column.cellEditor,
    cellEditorParams: column.cellEditorParams,
  };

  if (column.tooltip) {
    colDef.headerComponent = (props: any) => (
      <StyledHeaderCell>
        <span>{column.headerName}</span>
        <Tooltip title={column.tooltip}>
          <span>(?)</span>
        </Tooltip>
      </StyledHeaderCell>
    );
  }

  switch (column.type) {
    case ColumnType.CURRENCY:
      colDef.valueFormatter = (params) => formatCurrency(params.value);
      break;
    case ColumnType.QUANTITY:
      colDef.valueFormatter = (params) => formatQuantity(params.value);
      break;
    case ColumnType.PERCENTAGE:
      colDef.valueFormatter = (params) => formatPercentage(params.value, 2);
      break;
    case ColumnType.PRICE:
      colDef.valueFormatter = (params) => formatPrice(params.value);
      break;
    case ColumnType.RATE:
      colDef.valueFormatter = (params) => formatRate(params.value);
      break;
    case ColumnType.DATE:
      colDef.valueFormatter = (params) => formatDateString(params.value);
      break;
    case ColumnType.DATETIME:
      colDef.valueFormatter = (params) => formatDateTimeString(params.value);
      break;
    case ColumnType.POSITION:
      colDef.cellRenderer = PositionValueCellRenderer;
      break;
    case ColumnType.SECURITY:
      colDef.cellRenderer = SecurityCellRenderer;
      break;
    case ColumnType.COUNTERPARTY:
      colDef.cellRenderer = CounterpartyCellRenderer;
      break;
    case ColumnType.STATUS:
      colDef.cellRenderer = StatusCellRenderer;
      break;
    default:
      break;
  }

  return colDef;
};

/**
 * Renders a position value with appropriate color coding based on positive/negative values
 * @param params 
 * @returns Rendered cell with formatted position value
 */
export const PositionValueCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const { value, color } = formatPositionValueWithColor(params.value);
  return <Typography variant="body2" color={color}>{value}</Typography>;
};

/**
 * Renders a security cell with symbol and description
 * @param params 
 * @returns Rendered cell with security information
 */
export const SecurityCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const security = params.value as Security;
  return (
    <SecurityCell>
      <Typography variant="body2">{security?.securityType}</Typography>
      <Typography variant="caption" color="textSecondary">{security?.description}</Typography>
    </SecurityCell>
  );
};

/**
 * Renders a counterparty cell with name and identifier
 * @param params 
 * @returns Rendered cell with counterparty information
 */
export const CounterpartyCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const counterparty = params.value as Security;
  return (
    <CounterpartyCell>
      <Typography variant="body2">{counterparty?.id}</Typography>
      <Typography variant="caption" color="textSecondary">{counterparty?.name}</Typography>
    </CounterpartyCell>
  );
};

/**
 * Renders a status cell with appropriate color coding and badge
 * @param params 
 * @returns Rendered cell with status indicator
 */
export const StatusCellRenderer: React.FC<ICellRendererParams> = (params) => {
  const status = params.value as string;
  let color = '#9e9e9e'; // Default grey
  if (status === 'Active') {
    color = '#4caf50'; // Green
  } else if (status === 'Inactive') {
    color = '#f44336'; // Red
  }

  return (
    <StatusCell>
      <StatusBadge color={color} />
      <Typography variant="body2">{status}</Typography>
    </StatusCell>
  );
};