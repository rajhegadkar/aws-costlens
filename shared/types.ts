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
}

export interface S3BucketInventoryItem {
  name: string;
  creationDate?: string;
  region?: string;
  tags?: Record<string, string>;
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
}

export interface ResourceInventorySummary {
  scannedAt: string;
  totalEc2Instances: number;
  runningEc2Instances: number;
  stoppedEc2Instances: number;
  totalS3Buckets: number;
  totalRdsDatabases: number;
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
