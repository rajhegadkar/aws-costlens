export type AWSMetricType = 'UnblendedCost' | 'AmortizedCost' | 'NetUnblendedCost' | 'NetAmortizedCost' | 'BlendedCost' | 'UsageQuantity';

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface AuthStatus {
  isAuthenticated: boolean;
  accountId?: string;
  arn?: string;
  region: string;
  profile?: string;
  readOnlyMode: true; // Hardcoded true
  isDemoMode: boolean;
  permissions: {
    costExplorer: 'accessible' | 'denied' | 'untested';
    sts: 'accessible' | 'denied' | 'untested';
    ec2Read: 'accessible' | 'denied' | 'untested';
    rdsRead: 'accessible' | 'denied' | 'untested';
    s3Read: 'accessible' | 'denied' | 'untested';
  };
  availableProfiles: string[];
  message?: string;
}

export interface MetricCardData {
  title: string;
  value: number;
  formattedValue: string;
  subtext?: string;
  changePercent?: number;
  changeDirection?: 'up' | 'down' | 'flat';
  changeColor?: 'green' | 'red' | 'blue' | 'orange';
  tooltip?: string;
}

export interface CostInsight {
  id: string;
  type: 'increase' | 'savings' | 'neutral' | 'warning';
  title: string;
  message: string;
  service?: string;
  amountChange?: number;
}

export interface DashboardOverview {
  currentMonthSpend: number;
  previousMonthSpend: number;
  spendChangePercent: number;
  todayEstimated: number;
  avgDailySpend: number;
  projectedMonthEnd: number;
  projectedRange: {
    min: number;
    max: number;
  };
  topService: {
    name: string;
    amount: number;
    percentage: number;
  };
  topRegion: {
    name: string;
    amount: number;
    percentage: number;
  };
  activeServicesCount: number;
  currency: string;
  lastUpdated: string;
  isDemoMode: boolean;
  authStatus: AuthStatus;
  insights: CostInsight[];
}

export type ServiceCategory = 'Compute' | 'Storage' | 'Database' | 'Networking' | 'AI & ML' | 'Management' | 'Analytics' | 'Security' | 'Other';

export interface ServiceCostItem {
  serviceName: string;
  currentMonth: number;
  previousMonth: number;
  changeAmount: number;
  changePercent: number;
  percentOfTotal: number;
  category: ServiceCategory;
  description: string;
  plainEnglishExplanation: string;
}

export interface ServiceDetailBreakdown {
  serviceName: string;
  totalCost: number;
  previousMonthCost: number;
  changePercent: number;
  explanation: string;
  subcategories: {
    name: string;
    cost: number;
    percent: number;
    explanation: string;
  }[];
  usageTypes: {
    usageType: string;
    cost: number;
    percent: number;
    explanation: string;
  }[];
  operations: {
    operation: string;
    cost: number;
    percent: number;
    explanation: string;
  }[];
  regions: {
    region: string;
    regionName: string;
    cost: number;
    percent: number;
  }[];
}

export interface CostTimelinePoint {
  date: string;
  total: number;
  previousPeriodTotal?: number;
  forecast?: number;
  services: Record<string, number>;
}

export interface RegionCostItem {
  regionCode: string;
  regionName: string;
  cost: number;
  previousCost: number;
  percentOfTotal: number;
  changePercent: number;
  country: string;
  activeServices: number;
}

export interface DailyCostSummary {
  todayCost: number;
  yesterdayCost: number;
  sevenDayAverage: number;
  thirtyDayAverage: number;
  highestDay: {
    date: string;
    amount: number;
  };
  lowestDay: {
    date: string;
    amount: number;
  };
  dailyPoints: {
    date: string;
    dayOfWeek: string;
    amount: number;
    isToday?: boolean;
    isYesterday?: boolean;
    services: Record<string, number>;
  }[];
}

export interface CostAnomaly {
  id: string;
  service: string;
  date: string;
  currentCost: number;
  expectedCost: number;
  deviationMultiplier: number;
  severity: 'low' | 'medium' | 'high';
  title: string;
  explanation: string;
  drillDownHint: string;
}

export interface CostSavings {
  id: string;
  service: string;
  previousCost: number;
  currentCost: number;
  savedAmount: number;
  savedPercent: number;
  explanation: string;
}

export interface TagSpendingItem {
  tagKey: string;
  tagValue: string;
  cost: number;
  percentOfTotal: number;
  services: {
    name: string;
    cost: number;
  }[];
}

export interface AccountSpendingItem {
  accountId: string;
  accountName: string;
  cost: number;
  previousCost: number;
  percentOfTotal: number;
  changePercent: number;
  topServices: {
    name: string;
    cost: number;
  }[];
}

export type DeepDiveCategory = 'Compute' | 'Storage' | 'Database' | 'Networking' | 'AI & ML';

export interface CategoryBreakdown {
  category: DeepDiveCategory;
  totalCost: number;
  percentOfTotalSpend: number;
  summary: string;
  plainEnglishGuide: string;
  services: {
    serviceName: string;
    cost: number;
    percentOfCategory: number;
    components: {
      name: string;
      cost: number;
      explanation: string;
    }[];
  }[];
  recommendations: string[];
}

export interface DrillDownNode {
  level: number;
  levelName: string;
  key: string;
  name: string;
  cost: number;
  percentOfParent: number;
  changePercent?: number;
  explanation: string;
  hasChildren: boolean;
  children?: DrillDownNode[];
}

export interface SearchQueryResult {
  query: string;
  intent: 'increase_explanation' | 'service_lookup' | 'region_lookup' | 'category_lookup' | 'general';
  title: string;
  summary: string;
  highlightNumber?: string;
  relevantData: any;
  suggestedAction?: {
    page: string;
    label: string;
    params?: Record<string, string>;
  };
}

export interface MonthOption {
  value: string; // '2026-09' or '2026-10' or 'current'
  label: string; // 'September 2026' or 'October 2026 (Month-to-Date)'
  isCurrent?: boolean;
}

export interface Ec2InstanceInventoryItem {
  instanceId: string;
  name: string;
  instanceType: string;
  state: 'running' | 'stopped' | 'pending' | 'shutting-down' | 'terminated' | string;
  region: string;
  regionName: string;
  privateIp?: string;
  publicIp?: string;
  launchTime?: string;
  tags: Record<string, string>;
  vpcId?: string;
  subnetId?: string;
  hourlyRate?: number;
  currentMonthCost?: number;
  estimatedMonthlyCost?: number;
  computeCost?: number;
  storageAndIpCost?: number;
  costBreakdown?: string;
}

export interface S3BucketInventoryItem {
  name: string;
  creationDate?: string;
  region?: string;
  tags?: Record<string, string>;
  currentMonthCost?: number;
  estimatedMonthlyCost?: number;
  percentOfS3Total?: number;
  estimatedSizeGb?: number;
  storageClass?: string;
  costBreakdown?: string;
}

export interface RdsInstanceInventoryItem {
  dbInstanceIdentifier: string;
  engine: string;
  dbInstanceClass: string;
  status: string;
  allocatedStorageGb?: number;
  region: string;
  multiAz?: boolean;
  endpoint?: string;
  currentMonthCost?: number;
  estimatedMonthlyCost?: number;
}

export interface ResourceInventorySummary {
  scannedAt: string;
  billingPeriod?: string;
  totalEc2Instances: number;
  runningEc2Instances: number;
  stoppedEc2Instances: number;
  totalS3Buckets: number;
  totalRdsDatabases: number;
  totalEc2CurrentMonthCost?: number;
  totalEc2EstimatedMonthlyCost?: number;
  totalS3CurrentMonthCost?: number;
  totalS3EstimatedMonthlyCost?: number;
  activeRegions: string[];
  ec2Instances: Ec2InstanceInventoryItem[];
  s3Buckets: S3BucketInventoryItem[];
  rdsInstances: RdsInstanceInventoryItem[];
}

export interface CloudTrailActivityItem {
  eventId: string;
  eventTime: string;
  eventName: string;
  username: string;
  userType?: string;
  region: string;
  resourceName?: string;
  resourceType?: string;
  sourceIpAddress?: string;
  errorMessage?: string;
}

export interface InvoiceReconciliation {
  billingPeriod: string; // 'September 2026'
  startDate: string;     // '2026-09-01'
  endDate: string;       // '2026-10-01'
  currency: string;
  subtotalUsage: number;
  taxAmount: number;
  creditsRefundsAmount: number;
  totalInvoiceAmount: number;
  isCurrentMonthEstimate: boolean;
  lineItems: {
    serviceName: string;
    amount: number;
    percentage: number;
    isTax?: boolean;
    isCredit?: boolean;
  }[];
}

// ==========================================
// VERSION 2.0: DEPARTMENT BIFURCATION & TCO
// ==========================================

export interface DepartmentAllocationRule {
  id: string;
  targetDepartmentId: string;
  matchType: 'tag' | 'name_prefix' | 'name_contains' | 'resource_id';
  pattern: string; // e.g. 'Project=customer-portal' or 'backend-' or 'i-0a1b...'
  priority: number;
  description?: string;
}

export interface DepartmentDefinition {
  id: string;
  name: string;
  color: string;
  description: string;
  budget?: number;
  allocationRules: DepartmentAllocationRule[];
}

export interface ResourceCostItemTCO {
  resourceId: string;
  resourceName: string;
  resourceType: 'EC2' | 'S3' | 'RDS' | 'Shared';
  departmentId: string;
  departmentName: string;
  departmentColor: string;
  departmentSource: 'tag' | 'rule' | 'heuristic' | 'manual' | 'unallocated';
  region: string;
  regionName: string;
  state?: string;
  computeCost: number;
  storageCost: number;
  networkingCost: number;
  otherCost: number;
  totalCost: number;
  monthlyRunRate: number;
  costFormula: string;
  nonTechnicalSummary: string;
  tags?: Record<string, string>;
  rawItem?: any;
}

export interface DepartmentCostSummary {
  departmentId: string;
  departmentName: string;
  color: string;
  description: string;
  budget?: number;
  budgetUsedPercent?: number;
  projectedMonthEnd?: number;
  budgetStatus?: 'on_track' | 'approaching_limit' | 'exceeded';
  totalCost: number;
  percentageOfBill: number;
  computeCost: number;
  storageCost: number;
  networkingCost: number;
  otherCost: number;
  resourceCount: number;
  resources: ResourceCostItemTCO[];
}

export interface SharedPlatformServiceItem {
  serviceName: string;
  category: string;
  cost: number;
  percentage: number;
  explanation: string;
  nonTechnicalGuide: string;
}

export interface DepartmentBifurcationReport {
  billingPeriod: string;
  totalOfficialBill: number;
  totalDepartmentAllocated: number;
  totalSharedPlatform: number;
  taxesAndCredits: number;
  reconciliationVariance: number; // Strictly 0.00
  isReconciled: boolean;
  departments: DepartmentCostSummary[];
  unallocatedResources: ResourceCostItemTCO[];
  sharedPlatformServices: SharedPlatformServiceItem[];
  availableDepartments: DepartmentDefinition[];
}

// ==========================================
// VERSION 3.0: FINOPS WASTE HUNTER, FORECASTING,
// MULTI-CURRENCY & ENTERPRISE GOVERNANCE
// ==========================================

export type WasteResourceType =
  | 'EBS_UNATTACHED'
  | 'EC2_STOPPED'
  | 'EC2_IDLE'
  | 'UNUSED_ELASTIC_IP'
  | 'S3_INACTIVE_TIER';

export interface WasteResourceItem {
  id: string;
  resourceId: string;
  name: string;
  resourceType: WasteResourceType;
  typeName: string;
  region: string;
  monthlyCost: number;
  savingsPotential: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  daysInactive?: number;
  nonTechnicalRemediation: string;
  details?: string;
  tags?: Record<string, string>;
}

export interface WasteHunterReport {
  scannedAt: string;
  totalPotentialMonthlySavings: number;
  totalWasteItems: number;
  summaryByCategory: {
    unattachedEbs: { count: number; savings: number };
    stoppedEc2: { count: number; savings: number };
    idleEc2: { count: number; savings: number };
    unusedElasticIps: { count: number; savings: number };
    s3Inefficient: { count: number; savings: number };
  };
  items: WasteResourceItem[];
}

export interface ForecastPoint {
  date: string;
  dayOfMonth: number;
  actualSpend?: number;
  projectedSpend?: number;
  minConfidence?: number;
  maxConfidence?: number;
}

export interface CostForecastReport {
  billingPeriod: string;
  currentMonthSpend: number;
  daysElapsed: number;
  daysInMonth: number;
  runRateDaily: number;
  previousMonthSpend: number;
  projectedMonthEnd: number;
  projectedGrowthPercent: number;
  confidenceInterval: {
    min: number;
    expected: number;
    max: number;
  };
  dailyPoints: ForecastPoint[];
  keyDrivers: {
    serviceName: string;
    projectedCost: number;
    growthPercent: number;
    driverSummary: string;
  }[];
}

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rateToUsd: number; // 1 USD in target currency
  taxMultiplier?: number; // e.g. 1.18 for 18% GST display
  taxLabel?: string;
}

export type UserRole = 'admin' | 'finance' | 'devops' | 'viewer';

export interface RoleDefinition {
  id: UserRole;
  label: string;
  description: string;
  badgeColor: string;
  allowedNavItems: string[];
}

