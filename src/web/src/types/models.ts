/**
 * Base interface for all entity models with common fields 
 * for tracking creation, updates, and versioning
 */
export interface BaseEntity {
  id: string;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

/**
 * Interface for user data including authentication and authorization information
 */
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  status: string;
  lastLogin: string;
}

/**
 * Interface for security identifiers from various sources (e.g., ISIN, CUSIP, Bloomberg ID)
 */
export interface SecurityIdentifier {
  id: string;
  securityId: string;
  identifierType: string;
  identifierValue: string;
  source: string;
}

/**
 * Interface for security data including reference data and market information
 */
export interface Security {
  id: string;
  internalId: string;
  securityType: string;
  issuer: string;
  description: string;
  currency: string;
  issueDate: string;
  maturityDate: string;
  market: string;
  exchange: string;
  status: string;
  isBasketProduct: boolean;
  basketType: string;
  primaryIdentifierType: string;
  primaryIdentifierValue: string;
  identifiers: SecurityIdentifier[];
  price: number;
  priceTimestamp: string;
  securityTemperature: string;
}

/**
 * Interface for index/ETF composition data linking basket products to their constituents
 */
export interface IndexComposition {
  id: string;
  indexSecurityId: string;
  constituentSecurityId: string;
  weight: number;
  effectiveDate: string;
  expiryDate: string;
}

/**
 * Interface for counterparty identifiers from various sources
 */
export interface CounterpartyIdentifier {
  id: string;
  counterpartyId: string;
  identifierType: string;
  identifierValue: string;
}

/**
 * Interface for counterparty data including clients, trading partners, and internal entities
 */
export interface Counterparty {
  id: string;
  counterpartyId: string;
  name: string;
  type: string;
  kycStatus: string;
  status: string;
  identifiers: CounterpartyIdentifier[];
}

/**
 * Interface for aggregation units used for regulatory reporting and activity segregation
 */
export interface AggregationUnit {
  id: string;
  aggregationUnitId: string;
  name: string;
  type: string;
  market: string;
  officerId: string;
  status: string;
}

/**
 * Interface for position data including settled quantities and settlement ladder projections
 */
export interface Position {
  id: string;
  bookId: string;
  security: Security;
  counterparty: Counterparty;
  aggregationUnit: AggregationUnit;
  businessDate: string;
  positionType: string;
  isHypothecatable: boolean;
  isReserved: boolean;
  contractualQty: number;
  settledQty: number;
  sd0Deliver: number;
  sd0Receipt: number;
  sd1Deliver: number;
  sd1Receipt: number;
  sd2Deliver: number;
  sd2Receipt: number;
  sd3Deliver: number;
  sd3Receipt: number;
  sd4Deliver: number;
  sd4Receipt: number;
  netSettlementToday: number;
  projectedSettledQty: number;
  marketValue: number;
}

/**
 * Interface for a single day in the settlement ladder
 */
export interface SettlementDay {
  date: string;
  deliveries: number;
  receipts: number;
  net: number;
  projectedPosition: number;
}

/**
 * Interface for settlement ladder data showing projected settlements over time
 */
export interface SettlementLadder {
  securityId: string;
  bookId: string;
  businessDate: string;
  currentSettled: number;
  days: SettlementDay[];
  projectedPosition: number;
}

/**
 * Interface for inventory availability data including for-loan and for-pledge calculations
 */
export interface Inventory {
  id: string;
  security: Security;
  counterparty: Counterparty;
  aggregationUnit: AggregationUnit;
  businessDate: string;
  calculationType: string;
  grossQuantity: number;
  netQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  decrementQuantity: number;
  remainingAvailability: number;
  market: string;
  securityTemperature: string;
  borrowRate: number;
  calculationRuleId: string;
  calculationRuleVersion: string;
  isExternalSource: boolean;
  externalSourceName: string;
  status: string;
  marketValue: number;
}

/**
 * Interface for security price data from various sources
 */
export interface Price {
  id: string;
  securityId: string;
  price: number;
  priceType: string;
  currency: string;
  source: string;
  timestamp: string;
}

/**
 * Interface for financing contracts such as securities lending, repos, and swaps
 */
export interface Contract {
  id: string;
  contractId: string;
  contractType: string;
  counterparty: Counterparty;
  startDate: string;
  endDate: string;
  status: string;
  positions: ContractPosition[];
}

/**
 * Interface for positions within financing contracts
 */
export interface ContractPosition {
  id: string;
  contractId: string;
  security: Security;
  quantity: number;
  rate: number;
}

/**
 * Interface for locate requests submitted for permission to borrow securities
 */
export interface LocateRequest {
  id: string;
  requestId: string;
  security: Security;
  requestor: Counterparty;
  client: Counterparty;
  aggregationUnit: AggregationUnit;
  locateType: string;
  requestedQuantity: number;
  requestTimestamp: string;
  status: string;
  swapCashIndicator: string;
  approval: LocateApproval;
  rejection: LocateRejection;
}

/**
 * Interface for locate request approvals
 */
export interface LocateApproval {
  id: string;
  approvalId: string;
  requestId: string;
  approvedQuantity: number;
  decrementQuantity: number;
  approvalTimestamp: string;
  approvedBy: string;
  expiryDate: string;
  comments: string;
}

/**
 * Interface for locate request rejections
 */
export interface LocateRejection {
  id: string;
  rejectionId: string;
  requestId: string;
  rejectionReason: string;
  rejectionTimestamp: string;
  rejectedBy: string;
  comments: string;
}

/**
 * Interface for trading orders including short sell orders requiring validation
 */
export interface Order {
  id: string;
  orderId: string;
  security: Security;
  buyerCounterparty: Counterparty;
  sellerCounterparty: Counterparty;
  side: string;
  price: number;
  quantity: number;
  orderType: string;
  orderDate: string;
  settlementDate: string;
  status: string;
  parentOrderId: string;
  bookId: string;
  executions: Execution[];
  validation: OrderValidation;
}

/**
 * Interface for trade executions against orders
 */
export interface Execution {
  id: string;
  executionId: string;
  orderId: string;
  price: number;
  quantity: number;
  executionTime: string;
}

/**
 * Interface for order validation results, particularly for short sell orders
 */
export interface OrderValidation {
  id: string;
  validationId: string;
  orderId: string;
  status: string;
  rejectionReason: string;
  clientLimitCheck: boolean;
  aggregationUnitLimitCheck: boolean;
  clientLimit: number;
  aggregationUnitLimit: number;
  clientAvailable: number;
  aggregationUnitAvailable: number;
  processingTimeMs: number;
  validationTimestamp: string;
}

/**
 * Interface for client-level trading limits
 */
export interface ClientLimit {
  id: string;
  clientId: string;
  securityId: string;
  businessDate: string;
  longSellLimit: number;
  shortSellLimit: number;
  lastUpdated: string;
}

/**
 * Interface for aggregation unit-level trading limits
 */
export interface AggregationUnitLimit {
  id: string;
  aggregationUnitId: string;
  securityId: string;
  businessDate: string;
  longSellLimit: number;
  shortSellLimit: number;
  lastUpdated: string;
}

/**
 * Interface for conditions in calculation rules
 */
export interface RuleCondition {
  attribute: string;
  operator: string;
  value: string;
  logicalOperator: string;
}

/**
 * Interface for actions in calculation rules
 */
export interface RuleAction {
  actionType: string;
  parameters: Record<string, string>;
}

/**
 * Interface for calculation rules that define how inventory calculations should be performed
 */
export interface CalculationRule {
  id: string;
  name: string;
  description: string;
  ruleType: string;
  market: string;
  priority: number;
  effectiveDate: string;
  expiryDate: string;
  status: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  parameters: Record<string, string>;
  version: number;
}

/**
 * Interface for system alerts and notifications
 */
export interface Alert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  timestamp: string;
  source: string;
  status: string;
  relatedEntityType: string;
  relatedEntityId: string;
}

/**
 * Interface for individual component health status
 */
export interface ComponentStatus {
  name: string;
  status: string;
  message: string;
  lastChecked: string;
  details: Record<string, any>;
}

/**
 * Interface for system health status information
 */
export interface SystemStatus {
  status: string;
  uptime: number;
  version: string;
  lastUpdated: string;
  components: Record<string, ComponentStatus>;
}

/**
 * Interface for recent activity items shown on the dashboard
 */
export interface ActivityItem {
  id: string;
  activityType: string;
  description: string;
  timestamp: string;
  user: string;
  relatedEntityType: string;
  relatedEntityId: string;
  details: Record<string, any>;
}