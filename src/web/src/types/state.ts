import { 
  User, 
  Security, 
  Position, 
  Inventory, 
  LocateRequest, 
  Order, 
  CalculationRule, 
  Alert, 
  SystemStatus, 
  ActivityItem 
} from './models';
import { ErrorResponse, PaginatedResponse } from './api';

/**
 * Root state interface that combines all feature states
 */
export interface RootState {
  auth: AuthState;
  positions: PositionsState;
  inventory: InventoryState;
  locates: LocatesState;
  orders: OrdersState;
  rules: RulesState;
  exceptions: ExceptionsState;
  ui: UIState;
  notifications: NotificationsState;
}

/**
 * Authentication state interface for managing user session
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  mfaRequired: boolean;
  mfaSessionId: string | null;
  tokenExpiration: number | null;
}

/**
 * Positions state interface for managing position data
 */
export interface PositionsState {
  positions: Position[];
  selectedPosition: Position | null;
  isLoading: boolean;
  error: string | null;
  filters: PositionFilters;
  pagination: PaginationState;
  summary: PositionSummary | null;
}

/**
 * Position filters interface for filtering position data
 */
export interface PositionFilters {
  securityId: string | null;
  bookId: string | null;
  counterpartyId: string | null;
  aggregationUnitId: string | null;
  positionType: string | null;
  businessDate: string | null;
  isHypothecatable: boolean | null;
  isReserved: boolean | null;
}

/**
 * Position summary interface for aggregated position metrics
 */
export interface PositionSummary {
  totalLongPositions: number;
  totalShortPositions: number;
  netPosition: number;
  totalSecurities: number;
  totalMarketValue: number;
  businessDate: string;
  byBook: Record<string, number>;
  byCounterparty: Record<string, number>;
  byAggregationUnit: Record<string, number>;
}

/**
 * Inventory state interface for managing inventory data
 */
export interface InventoryState {
  inventories: Inventory[];
  selectedInventory: Inventory | null;
  isLoading: boolean;
  error: string | null;
  filters: InventoryFilters;
  pagination: PaginationState;
  summary: InventorySummary | null;
  topSecurities: TopSecurityItem[];
}

/**
 * Inventory filters interface for filtering inventory data
 */
export interface InventoryFilters {
  securityId: string | null;
  counterpartyId: string | null;
  aggregationUnitId: string | null;
  calculationType: string | null;
  businessDate: string | null;
  market: string | null;
  securityTemperature: string | null;
  isExternalSource: boolean | null;
}

/**
 * Inventory summary interface for aggregated inventory metrics
 */
export interface InventorySummary {
  totalInventory: number;
  forLoanTotal: number;
  forPledgeTotal: number;
  hardToBorrowTotal: number;
  generalCollateralTotal: number;
  businessDate: string;
  byMarket: Record<string, number>;
  byCalculationType: Record<string, number>;
  byTemperature: Record<string, number>;
}

/**
 * Top security item interface for displaying top securities by availability
 */
export interface TopSecurityItem {
  securityId: string;
  securityName: string;
  availableQuantity: number;
  marketValue: number;
  market: string;
  securityTemperature: string;
}

/**
 * Locates state interface for managing locate request data
 */
export interface LocatesState {
  locates: LocateRequest[];
  selectedLocate: LocateRequest | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  filters: LocateFilters;
  pagination: PaginationState;
  summary: LocateSummary | null;
}

/**
 * Locate filters interface for filtering locate request data
 */
export interface LocateFilters {
  securityId: string | null;
  requestorId: string | null;
  clientId: string | null;
  aggregationUnitId: string | null;
  locateType: string | null;
  status: string | null;
  swapCashIndicator: string | null;
  fromDate: string | null;
  toDate: string | null;
}

/**
 * Locate summary interface for aggregated locate request metrics
 */
export interface LocateSummary {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  autoApprovedCount: number;
  manualApprovedCount: number;
  bySecurityId: Record<string, number>;
  byClientId: Record<string, number>;
  byStatus: Record<string, number>;
}

/**
 * Orders state interface for managing order data
 */
export interface OrdersState {
  orders: Order[];
  selectedOrder: Order | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  filters: OrderFilters;
  pagination: PaginationState;
}

/**
 * Order filters interface for filtering order data
 */
export interface OrderFilters {
  securityId: string | null;
  buyerCounterpartyId: string | null;
  sellerCounterpartyId: string | null;
  side: string | null;
  orderType: string | null;
  status: string | null;
  bookId: string | null;
  fromDate: string | null;
  toDate: string | null;
}

/**
 * Rules state interface for managing calculation rule data
 */
export interface RulesState {
  rules: CalculationRule[];
  selectedRule: CalculationRule | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  filters: RuleFilters;
  pagination: PaginationState;
  testResults: RuleTestResult | null;
}

/**
 * Rule filters interface for filtering calculation rule data
 */
export interface RuleFilters {
  ruleType: string | null;
  market: string | null;
  status: string | null;
  name: string | null;
}

/**
 * Rule test result interface for calculation rule testing
 */
export interface RuleTestResult {
  ruleId: string;
  testData: any;
  result: any;
  success: boolean;
  executionTimeMs: number;
  timestamp: string;
}

/**
 * Exceptions state interface for managing system exception data
 */
export interface ExceptionsState {
  exceptions: Exception[];
  selectedException: Exception | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  filters: ExceptionFilters;
  pagination: PaginationState;
}

/**
 * Exception interface for system exception data
 */
export interface Exception {
  id: string;
  exceptionType: string;
  severity: string;
  message: string;
  details: string;
  timestamp: string;
  status: string;
  assignedTo: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

/**
 * Exception filters interface for filtering system exception data
 */
export interface ExceptionFilters {
  exceptionType: string | null;
  severity: string | null;
  status: string | null;
  assignedTo: string | null;
  fromDate: string | null;
  toDate: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

/**
 * UI state interface for managing user interface state
 */
export interface UIState {
  theme: string;
  sidebarOpen: boolean;
  activeModal: string | null;
  modalData: any;
  preferences: UserPreferences;
  systemStatus: SystemStatus | null;
  recentActivity: ActivityItem[];
}

/**
 * User preferences interface for user-specific settings
 */
export interface UserPreferences {
  defaultDateFormat: string;
  defaultTimeFormat: string;
  defaultPageSize: number;
  defaultCurrency: string;
  dashboardLayout: any;
  language: string;
  notifications: NotificationPreferences;
}

/**
 * Notification preferences interface for user notification settings
 */
export interface NotificationPreferences {
  email: boolean;
  inApp: boolean;
  desktop: boolean;
  locateApprovals: boolean;
  exceptions: boolean;
  systemAlerts: boolean;
}

/**
 * Notifications state interface for managing user notifications
 */
export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  alerts: Alert[];
}

/**
 * Notification interface for user notification data
 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: string;
  link: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
}

/**
 * Pagination state interface for managing paginated data
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  sort: string[];
}