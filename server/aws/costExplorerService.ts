import {
  GetCostAndUsageCommand,
  GetTagsCommand
} from '@aws-sdk/client-cost-explorer';
import { getCostExplorerClient } from './awsClients.js';
import { executeSafeReadOnlyOperation } from '../security/awsGuard.js';
import { globalCache } from '../cache/fileCache.js';
import { MockDataService } from './mockDataService.js';
import { checkAwsPermissions } from './permissionChecker.js';
import {
  DashboardOverview,
  ServiceCostItem,
  ServiceDetailBreakdown,
  CostTimelinePoint,
  RegionCostItem,
  DailyCostSummary,
  CostAnomaly,
  CostSavings,
  TagSpendingItem,
  AccountSpendingItem,
  CategoryBreakdown,
  DeepDiveCategory,
  DrillDownNode,
  SearchQueryResult,
  AuthStatus,
  CostInsight,
  MonthOption,
  InvoiceReconciliation
} from '../../shared/types.js';
import {
  explainService,
  explainUsageType,
  AWS_REGIONS_DIRECTORY,
  getFriendlyRegionName
} from '../../shared/explanationDictionary.js';

let demoModeOverride: boolean = process.env.DEMO_MODE === 'true';

const HISTORICAL_MONTH_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours for closed historical months
const CURRENT_MONTH_TTL_MS = Number(process.env.CACHE_TTL_MS) || 60 * 60 * 1000; // 1 hour for current MTD

export function isDemoModeEnabled(): boolean {
  return demoModeOverride;
}

export function setDemoMode(enabled: boolean) {
  demoModeOverride = enabled;
  CostExplorerService.clearAuthCache();
}

export function getAvailableMonths(): MonthOption[] {
  const months: MonthOption[] = [];
  const now = new Date();

  const curY = now.getFullYear();
  const curM = now.getMonth();
  const curMonthVal = `${curY}-${String(curM + 1).padStart(2, '0')}`;
  const curMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  months.push({
    value: curMonthVal,
    label: `${curMonthName} (Month-to-Date)`,
    isCurrent: true
  });

  for (let i = 1; i <= 11; i++) {
    const d = new Date(Date.UTC(curY, curM - i, 1));
    const val = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    months.push({ value: val, label, isCurrent: false });
  }

  return months;
}

/**
 * Validates and normalizes a month query parameter ('current' or 'YYYY-MM').
 */
export function normalizeMonthParam(monthStr?: string): string | undefined {
  if (!monthStr) return undefined;
  const trimmed = monthStr.trim();
  if (trimmed === 'current') return 'current';
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

/**
 * Returns date ranges for selected month and previous month comparison using strict UTC arithmetic.
 */
export function getDatePeriods(monthStr?: string) {
  const validMonth = normalizeMonthParam(monthStr);
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();
  const currentMonthPrefix = `${curY}-${String(curM + 1).padStart(2, '0')}`;

  if (!validMonth || validMonth === 'current' || validMonth === currentMonthPrefix) {
    // Current month-to-date
    const currentStart = new Date(Date.UTC(curY, curM, 1)).toISOString().split('T')[0];
    const currentEnd = new Date(Date.UTC(curY, curM, Math.max(2, now.getDate()))).toISOString().split('T')[0];

    const prevMonthDate = new Date(Date.UTC(curY, curM - 1, 1));
    const prevYear = prevMonthDate.getUTCFullYear();
    const prevMonth = prevMonthDate.getUTCMonth();
    const prevStart = new Date(Date.UTC(prevYear, prevMonth, 1)).toISOString().split('T')[0];

    const lastDayOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth + 1, 0)).getUTCDate();
    const prevEndDay = Math.min(now.getDate(), lastDayOfPrevMonth);
    const prevEnd = new Date(Date.UTC(prevYear, prevMonth, Math.max(2, prevEndDay))).toISOString().split('T')[0];

    return {
      currentStart,
      currentEnd,
      prevStart,
      prevEnd,
      isCurrentMonth: true,
      billingPeriodName: now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    };
  }

  // Selected historical month (e.g. '2026-09')
  const [yStr, mStr] = validMonth.split('-');
  const selYear = parseInt(yStr, 10);
  const selMonth = parseInt(mStr, 10) - 1; // 0-indexed

  const currentStart = new Date(Date.UTC(selYear, selMonth, 1)).toISOString().split('T')[0];
  const nextMonthDate = new Date(Date.UTC(selYear, selMonth + 1, 1));
  const currentEnd = nextMonthDate.toISOString().split('T')[0];

  const prevMonthDate = new Date(Date.UTC(selYear, selMonth - 1, 1));
  const prevStart = prevMonthDate.toISOString().split('T')[0];
  const prevEnd = currentStart;

  const d = new Date(Date.UTC(selYear, selMonth, 1));
  const billingPeriodName = d.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return {
    currentStart,
    currentEnd,
    prevStart,
    prevEnd,
    isCurrentMonth: false,
    billingPeriodName
  };
}

/**
 * Loops through NextPageToken so 100% of all billing groups/services are retrieved
 */
async function fetchAllCostGroups(params: any): Promise<any[]> {
  const ceClient = getCostExplorerClient();
  const allGroups: any[] = [];
  let token: string | undefined = undefined;

  do {
    const queryParams: any = { ...params };
    if (token) {
      queryParams.NextPageToken = token;
    }
    const res = await executeSafeReadOnlyOperation('GetCostAndUsage', async () => {
      return await ceClient.send(new GetCostAndUsageCommand(queryParams));
    });

    if (res.ResultsByTime?.[0]?.Groups) {
      allGroups.push(...res.ResultsByTime[0].Groups);
    }
    token = res.NextPageToken;
  } while (token);

  return allGroups;
}

/**
 * Loops through NextPageToken and merges ResultsByTime across pages
 */
async function fetchAllCostResultsByTime(params: any): Promise<any[]> {
  const ceClient = getCostExplorerClient();
  const byStart = new Map<string, any>();
  let token: string | undefined = undefined;

  do {
    const queryParams: any = { ...params };
    if (token) {
      queryParams.NextPageToken = token;
    }
    const res = await executeSafeReadOnlyOperation('GetCostAndUsage', async () => {
      return await ceClient.send(new GetCostAndUsageCommand(queryParams));
    });

    for (const item of res.ResultsByTime || []) {
      const start = item.TimePeriod?.Start || 'Unknown';
      if (!byStart.has(start)) {
        byStart.set(start, {
          TimePeriod: item.TimePeriod,
          Groups: [...(item.Groups || [])]
        });
      } else {
        byStart.get(start)!.Groups.push(...(item.Groups || []));
      }
    }
    token = res.NextPageToken;
  } while (token);

  return Array.from(byStart.values());
}

function enrichServiceItems(items: ServiceCostItem[]): ServiceCostItem[] {
  return items.map(s => {
    const exp = explainService(s.serviceName);
    return {
      ...s,
      currentMonth: Number(s.currentMonth.toFixed(2)),
      previousMonth: Number(s.previousMonth.toFixed(2)),
      changeAmount: Number(s.changeAmount.toFixed(2)),
      category: exp.category,
      description: exp.shortSummary,
      plainEnglishExplanation: exp.detailedExplanation
    };
  });
}

function sanitizeOverviewNumbers(ov: DashboardOverview, auth: AuthStatus): DashboardOverview {
  return {
    ...ov,
    currentMonthSpend: Number(ov.currentMonthSpend.toFixed(2)),
    previousMonthSpend: Number(ov.previousMonthSpend.toFixed(2)),
    spendChangePercent: Number(ov.spendChangePercent.toFixed(1)),
    todayEstimated: Number(ov.todayEstimated.toFixed(2)),
    avgDailySpend: Number(ov.avgDailySpend.toFixed(2)),
    projectedMonthEnd: Number(ov.projectedMonthEnd.toFixed(2)),
    projectedRange: {
      min: Number(ov.projectedRange.min.toFixed(2)),
      max: Number(ov.projectedRange.max.toFixed(2))
    },
    topService: {
      ...ov.topService,
      amount: Number(ov.topService.amount.toFixed(2)),
      percentage: Number(ov.topService.percentage.toFixed(1))
    },
    topRegion: {
      ...ov.topRegion,
      amount: Number(ov.topRegion.amount.toFixed(2)),
      percentage: Number(ov.topRegion.percentage.toFixed(1))
    },
    insights: (ov.insights || []).map(ins => ({
      ...ins,
      amountChange: ins.amountChange !== undefined ? Number(ins.amountChange.toFixed(2)) : undefined
    })),
    authStatus: auth
  };
}

export class CostExplorerService {
  private static authStatusCache: AuthStatus | null = null;
  private static authCacheTimestamp: number = 0;

  public static clearAuthCache() {
    this.authStatusCache = null;
    this.authCacheTimestamp = 0;
  }

  public static async getAuthStatus(forceRefresh = false): Promise<AuthStatus> {
    if (this.authStatusCache && !forceRefresh && Date.now() - this.authCacheTimestamp < 5 * 60 * 1000) {
      this.authStatusCache.isDemoMode =
        demoModeOverride ||
        !this.authStatusCache.isAuthenticated ||
        this.authStatusCache.permissions.costExplorer !== 'accessible';
      return this.authStatusCache;
    }

    if (demoModeOverride && !forceRefresh) {
      const demoStatus: AuthStatus = {
        isAuthenticated: false,
        region: process.env.AWS_REGION || 'us-east-1',
        profile: process.env.AWS_PROFILE || 'default',
        readOnlyMode: true,
        isDemoMode: true,
        permissions: {
          costExplorer: 'untested',
          sts: 'untested',
          ec2Read: 'untested',
          rdsRead: 'untested',
          s3Read: 'untested'
        },
        availableProfiles: ['default'],
        message: 'Demo Mode Active (Sample AWS billing data loaded). Switch to Live AWS Credentials to query your account.'
      };
      this.authStatusCache = demoStatus;
      this.authCacheTimestamp = Date.now();
      return demoStatus;
    }

    try {
      const status = await checkAwsPermissions();
      status.isDemoMode = demoModeOverride || !status.isAuthenticated || status.permissions.costExplorer !== 'accessible';
      this.authStatusCache = status;
      this.authCacheTimestamp = Date.now();
      return status;
    } catch {
      const fallback: AuthStatus = {
        isAuthenticated: false,
        region: 'us-east-1',
        readOnlyMode: true,
        isDemoMode: true,
        permissions: {
          costExplorer: 'denied',
          sts: 'denied',
          ec2Read: 'untested',
          rdsRead: 'untested',
          s3Read: 'untested'
        },
        availableProfiles: ['default'],
        message: 'Could not connect to AWS. Running in read-only Demo Mode.'
      };
      this.authStatusCache = fallback;
      this.authCacheTimestamp = Date.now();
      return fallback;
    }
  }

  public static async getDashboardOverview(month?: string): Promise<DashboardOverview> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();

    if (auth.isDemoMode) {
      const overview = MockDataService.getDashboardOverview();
      overview.authStatus = auth;
      overview.lastUpdated = globalCache.getLastUpdated();
      return overview;
    }

    const { currentStart, currentEnd, prevStart, prevEnd, isCurrentMonth, billingPeriodName } = getDatePeriods(validMonth);
    const ttl = isCurrentMonth ? CURRENT_MONTH_TTL_MS : HISTORICAL_MONTH_TTL_MS;
    const cacheKey = `overview_${validMonth || 'current'}_${auth.accountId}_${auth.region}`;
    const cached = globalCache.get<DashboardOverview>(cacheKey, ttl);
    if (cached) {
      return sanitizeOverviewNumbers(cached, auth);
    }

    try {
      const [currentGroups, prevGroups, regionGroups] = await Promise.all([
        fetchAllCostGroups({
          TimePeriod: { Start: currentStart, End: currentEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
        }),
        fetchAllCostGroups({
          TimePeriod: { Start: prevStart, End: prevEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
        }),
        fetchAllCostGroups({
          TimePeriod: { Start: currentStart, End: currentEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'REGION' }]
        })
      ]);

      let currentTotal = 0;
      let topService = { name: 'None', amount: 0, percentage: 0 };
      const activeServices = new Set<string>();

      for (const g of currentGroups) {
        const sName = g.Keys?.[0] || 'Unknown';
        const amount = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
        if (amount > 0) {
          currentTotal += amount;
          activeServices.add(sName);
          if (amount > topService.amount && sName !== 'Tax') {
            topService = { name: sName, amount: Number(amount.toFixed(2)), percentage: 0 };
          }
        }
      }

      if (currentTotal > 0 && topService.amount > 0) {
        topService.percentage = Number(((topService.amount / currentTotal) * 100).toFixed(1));
      }

      let prevTotal = 0;
      for (const g of prevGroups) {
        prevTotal += parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
      }

      let topRegion = { name: 'Unknown', amount: 0, percentage: 0 };
      for (const g of regionGroups) {
        const reg = g.Keys?.[0] || 'Unknown';
        const amount = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
        if (amount > topRegion.amount && reg !== 'NoRegion') {
          topRegion = { name: getFriendlyRegionName(reg), amount: Number(amount.toFixed(2)), percentage: 0 };
        }
      }

      if (currentTotal > 0 && topRegion.amount > 0) {
        topRegion.percentage = Number(((topRegion.amount / currentTotal) * 100).toFixed(1));
      }

      let avgDaily = 0;
      let projectedTotal = currentTotal;

      if (isCurrentMonth) {
        const daysPassed = Math.max(1, new Date().getDate() - 1);
        avgDaily = currentTotal / daysPassed;
        const daysInMonth = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() + 1, 0)).getUTCDate();
        projectedTotal = avgDaily * daysInMonth;
      } else {
        const [y, m] = currentStart.split('-').map(Number);
        const daysInSelMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
        avgDaily = currentTotal / daysInSelMonth;
      }

      const spendChange = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

      const insights: CostInsight[] = [];
      insights.push({
        id: 'live-ins-1',
        type: spendChange > 5 ? 'warning' : spendChange < -5 ? 'savings' : 'neutral',
        title: `${billingPeriodName} Total: $${currentTotal.toFixed(2)}`,
        message: isCurrentMonth
          ? `Current run-rate for ${billingPeriodName} is $${currentTotal.toFixed(2)}, pacing towards $${projectedTotal.toFixed(2)} month-end.`
          : `Final invoiced billing for ${billingPeriodName} was $${currentTotal.toFixed(2)} (${spendChange >= 0 ? '+' : ''}${spendChange.toFixed(1)}% vs previous period).`,
        amountChange: Number((currentTotal - prevTotal).toFixed(2))
      });

      if (topService.name !== 'None') {
        insights.push({
          id: 'live-ins-2',
          type: 'neutral',
          title: `Largest Cost: ${topService.name}`,
          message: `${topService.name} accounts for $${topService.amount.toFixed(2)} (${topService.percentage}% of charges).`,
          service: topService.name,
          amountChange: Number(topService.amount.toFixed(2))
        });
      }

      const overview: DashboardOverview = {
        currentMonthSpend: Number(currentTotal.toFixed(2)),
        previousMonthSpend: Number(prevTotal.toFixed(2)),
        spendChangePercent: Number(spendChange.toFixed(1)),
        todayEstimated: Number(avgDaily.toFixed(2)),
        avgDailySpend: Number(avgDaily.toFixed(2)),
        projectedMonthEnd: Number(projectedTotal.toFixed(2)),
        projectedRange: {
          min: Number((projectedTotal * 0.95).toFixed(2)),
          max: Number((projectedTotal * 1.05).toFixed(2))
        },
        topService,
        topRegion,
        activeServicesCount: activeServices.size,
        currency: 'USD',
        lastUpdated: globalCache.getLastUpdated(),
        isDemoMode: false,
        authStatus: auth,
        insights
      };

      globalCache.set(cacheKey, overview);
      return overview;
    } catch (err: any) {
      console.warn('[COST EXPLORER] Failed to fetch live overview, checking stale cache:', err.message);
      const stale = globalCache.getStale<DashboardOverview>(cacheKey);
      if (stale) {
        return sanitizeOverviewNumbers(stale, auth);
      }
      const fallback = MockDataService.getDashboardOverview();
      fallback.authStatus = auth;
      return fallback;
    }
  }

  public static async getServices(month?: string): Promise<ServiceCostItem[]> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return enrichServiceItems(MockDataService.getServices());
    }

    const { currentStart, currentEnd, prevStart, prevEnd, isCurrentMonth } = getDatePeriods(validMonth);
    const ttl = isCurrentMonth ? CURRENT_MONTH_TTL_MS : HISTORICAL_MONTH_TTL_MS;
    const cacheKey = `services_${validMonth || 'current'}_${auth.accountId}`;
    const cached = globalCache.get<ServiceCostItem[]>(cacheKey, ttl);
    if (cached) {
      return enrichServiceItems(cached);
    }

    try {
      const [currentGroups, prevGroups] = await Promise.all([
        fetchAllCostGroups({
          TimePeriod: { Start: currentStart, End: currentEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
        }),
        fetchAllCostGroups({
          TimePeriod: { Start: prevStart, End: prevEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
        })
      ]);

      const prevMap = new Map<string, number>();
      for (const g of prevGroups) {
        const name = g.Keys?.[0] || 'Unknown';
        prevMap.set(name, parseFloat(g.Metrics?.UnblendedCost?.Amount || '0'));
      }

      let total = 0;
      const rawList: { name: string; current: number; prev: number }[] = [];
      for (const g of currentGroups) {
        const name = g.Keys?.[0] || 'Unknown';
        const current = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
        if (current > 0) {
          total += current;
          const prev = prevMap.get(name) || 0;
          rawList.push({ name, current, prev });
        }
      }

      const items: ServiceCostItem[] = rawList.map(s => {
        const changeAmount = s.current - s.prev;
        const changePercent = s.prev > 0 ? Number(((changeAmount / s.prev) * 100).toFixed(1)) : 100;
        const percentOfTotal = total > 0 ? Number(((s.current / total) * 100).toFixed(1)) : 0;
        const exp = explainService(s.name);

        return {
          serviceName: s.name,
          currentMonth: Number(s.current.toFixed(2)),
          previousMonth: Number(s.prev.toFixed(2)),
          changeAmount: Number(changeAmount.toFixed(2)),
          changePercent,
          percentOfTotal,
          category: exp.category,
          description: exp.shortSummary,
          plainEnglishExplanation: exp.detailedExplanation
        };
      }).sort((a, b) => b.currentMonth - a.currentMonth);

      globalCache.set(cacheKey, items);
      return items;
    } catch {
      const stale = globalCache.getStale<ServiceCostItem[]>(cacheKey);
      if (stale) {
        return enrichServiceItems(stale);
      }
      return enrichServiceItems(MockDataService.getServices());
    }
  }

  public static async getServiceDetail(serviceName: string, month?: string): Promise<ServiceDetailBreakdown> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getServiceDetail(serviceName);
    }

    const { currentStart, currentEnd, isCurrentMonth } = getDatePeriods(validMonth);
    const ttl = isCurrentMonth ? CURRENT_MONTH_TTL_MS : HISTORICAL_MONTH_TTL_MS;
    const safeKeyName = serviceName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cacheKey = `service_detail_${safeKeyName}_${validMonth || 'current'}_${auth.accountId}`;
    const cached = globalCache.get<ServiceDetailBreakdown>(cacheKey, ttl);
    if (cached) return cached;

    try {
      const [servicesList, usageOpGroups, regionGroups] = await Promise.all([
        this.getServices(validMonth),
        fetchAllCostGroups({
          TimePeriod: { Start: currentStart, End: currentEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          Filter: { Dimensions: { Key: 'SERVICE', Values: [serviceName] } },
          GroupBy: [
            { Type: 'DIMENSION', Key: 'USAGE_TYPE' },
            { Type: 'DIMENSION', Key: 'OPERATION' }
          ]
        }),
        fetchAllCostGroups({
          TimePeriod: { Start: currentStart, End: currentEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          Filter: { Dimensions: { Key: 'SERVICE', Values: [serviceName] } },
          GroupBy: [{ Type: 'DIMENSION', Key: 'REGION' }]
        })
      ]);

      const matchedService = servicesList.find(
        s => s.serviceName.toLowerCase() === serviceName.toLowerCase()
      );

      let total = 0;
      const usageMap = new Map<string, number>();
      const opMap = new Map<string, number>();

      for (const g of usageOpGroups) {
        const ut = g.Keys?.[0] || 'Unknown';
        const op = g.Keys?.[1] || 'Standard Operation';
        const cost = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
        if (cost > 0) {
          total += cost;
          usageMap.set(ut, (usageMap.get(ut) || 0) + cost);
          opMap.set(op, (opMap.get(op) || 0) + cost);
        }
      }

      if (total === 0 && matchedService) {
        total = matchedService.currentMonth;
      }

      const rawUsage = Array.from(usageMap.entries())
        .map(([usageType, cost]) => ({ usageType, cost }))
        .sort((a, b) => b.cost - a.cost);

      const usageTypes = rawUsage.slice(0, 12).map(u => {
        const exp = explainUsageType(u.usageType);
        return {
          usageType: u.usageType,
          cost: Number(u.cost.toFixed(2)),
          percent: total > 0 ? Number(((u.cost / total) * 100).toFixed(1)) : 0,
          explanation: exp.simpleExplanation
        };
      });

      const rawOps = Array.from(opMap.entries())
        .map(([operation, cost]) => ({ operation, cost }))
        .sort((a, b) => b.cost - a.cost);

      const operations = rawOps.length > 0
        ? rawOps.slice(0, 10).map(o => ({
            operation: o.operation,
            cost: Number(o.cost.toFixed(2)),
            percent: total > 0 ? Number(((o.cost / total) * 100).toFixed(1)) : 0,
            explanation: `AWS API / billing operation '${o.operation}' for ${serviceName}.`
          }))
        : [
            {
              operation: 'Standard Operations',
              cost: Number(total.toFixed(2)),
              percent: 100,
              explanation: 'Standard runtime and API requests.'
            }
          ];

      const rawRegions: { region: string; regionName: string; cost: number; percent: number }[] = [];
      for (const g of regionGroups) {
        const reg = g.Keys?.[0] || 'global';
        const cost = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
        if (cost > 0) {
          rawRegions.push({
            region: reg,
            regionName: getFriendlyRegionName(reg),
            cost: Number(cost.toFixed(2)),
            percent: total > 0 ? Number(((cost / total) * 100).toFixed(1)) : 100
          });
        }
      }
      rawRegions.sort((a, b) => b.cost - a.cost);

      const exp = explainService(serviceName);
      const previousMonthCost = matchedService ? matchedService.previousMonth : Number((total * 0.9).toFixed(2));
      const changePercent = matchedService
        ? matchedService.changePercent
        : previousMonthCost > 0
        ? Number((((total - previousMonthCost) / previousMonthCost) * 100).toFixed(1))
        : 0;

      const subcategories = usageTypes.length > 0
        ? usageTypes.slice(0, 5).map(u => {
            const uExp = explainUsageType(u.usageType);
            return {
              name: `${uExp.friendlyTitle} (${u.usageType})`,
              cost: u.cost,
              percent: u.percent,
              explanation: u.explanation
            };
          })
        : [
            {
              name: `${exp.friendlyName} Usage`,
              cost: Number(total.toFixed(2)),
              percent: 100,
              explanation: exp.shortSummary
            }
          ];

      const detail: ServiceDetailBreakdown = {
        serviceName,
        totalCost: Number(total.toFixed(2)),
        previousMonthCost,
        changePercent,
        explanation: exp.detailedExplanation,
        subcategories,
        usageTypes: usageTypes.length > 0 ? usageTypes : [
          {
            usageType: 'StandardUsage',
            cost: Number(total.toFixed(2)),
            percent: 100,
            explanation: exp.shortSummary
          }
        ],
        operations,
        regions: rawRegions.length > 0 ? rawRegions : [
          {
            region: auth.region || 'ap-south-1',
            regionName: getFriendlyRegionName(auth.region || 'ap-south-1'),
            cost: Number(total.toFixed(2)),
            percent: 100
          }
        ]
      };

      globalCache.set(cacheKey, detail);
      return detail;
    } catch {
      const stale = globalCache.getStale<ServiceDetailBreakdown>(cacheKey);
      if (stale) return stale;

      // Synthesize from cached services list if available
      const servicesList = await this.getServices(validMonth);
      const matched = servicesList.find(s => s.serviceName.toLowerCase() === serviceName.toLowerCase());
      if (matched) {
        const exp = explainService(serviceName);
        return {
          serviceName: matched.serviceName,
          totalCost: matched.currentMonth,
          previousMonthCost: matched.previousMonth,
          changePercent: matched.changePercent,
          explanation: exp.detailedExplanation,
          subcategories: [
            {
              name: `${exp.friendlyName} Primary Usage`,
              cost: matched.currentMonth,
              percent: 100,
              explanation: exp.shortSummary
            }
          ],
          usageTypes: [
            {
              usageType: 'ServiceUsage',
              cost: matched.currentMonth,
              percent: 100,
              explanation: exp.shortSummary
            }
          ],
          operations: [
            {
              operation: 'Standard Operations',
              cost: matched.currentMonth,
              percent: 100,
              explanation: exp.whyItCostsMoney
            }
          ],
          regions: [
            {
              region: auth.region || 'ap-south-1',
              regionName: getFriendlyRegionName(auth.region || 'ap-south-1'),
              cost: matched.currentMonth,
              percent: 100
            }
          ]
        };
      }
      return MockDataService.getServiceDetail(serviceName);
    }
  }

  public static async getCostTimeline(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<CostTimelinePoint[]> {
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getCostTimeline(period);
    }

    const cacheKey = `timeline_${period}_${auth.accountId}`;
    const cached = globalCache.get<CostTimelinePoint[]>(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      let startStr: string;
      const endStr = now.toISOString().split('T')[0];
      let granularity: 'DAILY' | 'MONTHLY';

      if (period === 'monthly') {
        const sixMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 5, 1));
        startStr = sixMonthsAgo.toISOString().split('T')[0];
        granularity = 'MONTHLY';
      } else if (period === 'weekly') {
        const eightyFourDaysAgo = new Date(now.getTime() - 84 * 24 * 60 * 60 * 1000);
        startStr = eightyFourDaysAgo.toISOString().split('T')[0];
        granularity = 'DAILY';
      } else {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startStr = thirtyDaysAgo.toISOString().split('T')[0];
        granularity = 'DAILY';
      }

      const resultsByTime = await fetchAllCostResultsByTime({
        TimePeriod: { Start: startStr, End: endStr },
        Granularity: granularity,
        Metrics: ['UnblendedCost'],
        GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
      });

      const rawPoints: CostTimelinePoint[] = [];

      for (const item of resultsByTime) {
        const date = item.TimePeriod?.Start || 'Unknown';
        let total = 0;
        const services: Record<string, number> = {};

        if (item.Groups) {
          for (const g of item.Groups) {
            const sName = g.Keys?.[0] || 'Unknown';
            const amt = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
            if (amt > 0) {
              total += amt;
              services[sName] = Number(amt.toFixed(2));
            }
          }
        }

        rawPoints.push({
          date,
          total: Number(total.toFixed(2)),
          services
        });
      }

      if (period === 'weekly' && rawPoints.length > 0) {
        const weeklyPoints: CostTimelinePoint[] = [];
        for (let i = 0; i < rawPoints.length; i += 7) {
          const chunk = rawPoints.slice(i, i + 7);
          let weekTotal = 0;
          const weekServices: Record<string, number> = {};
          for (const pt of chunk) {
            weekTotal += pt.total;
            for (const [sName, sCost] of Object.entries(pt.services)) {
              weekServices[sName] = Number(((weekServices[sName] || 0) + sCost).toFixed(2));
            }
          }
          weeklyPoints.push({
            date: `Wk ${chunk[0].date.slice(5)}`,
            total: Number(weekTotal.toFixed(2)),
            services: weekServices
          });
        }
        globalCache.set(cacheKey, weeklyPoints);
        return weeklyPoints;
      }

      globalCache.set(cacheKey, rawPoints);
      return rawPoints;
    } catch {
      const stale = globalCache.getStale<CostTimelinePoint[]>(cacheKey);
      if (stale) return stale;

      // If weekly is requested and daily cache exists on disk, aggregate from daily cache
      if (period === 'weekly') {
        const dailyStale = globalCache.getStale<CostTimelinePoint[]>(`timeline_daily_${auth.accountId}`);
        if (dailyStale && dailyStale.length > 0) {
          const weeklyPoints: CostTimelinePoint[] = [];
          for (let i = 0; i < dailyStale.length; i += 7) {
            const chunk = dailyStale.slice(i, i + 7);
            let weekTotal = 0;
            const weekServices: Record<string, number> = {};
            for (const pt of chunk) {
              weekTotal += pt.total;
              for (const [sName, sCost] of Object.entries(pt.services)) {
                weekServices[sName] = Number(((weekServices[sName] || 0) + sCost).toFixed(2));
              }
            }
            weeklyPoints.push({
              date: `Wk ${chunk[0].date.slice(5)}`,
              total: Number(weekTotal.toFixed(2)),
              services: weekServices
            });
          }
          return weeklyPoints;
        }
      }

      return MockDataService.getCostTimeline(period);
    }
  }

  public static async getRegions(month?: string): Promise<RegionCostItem[]> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getRegions();
    }

    const { currentStart, currentEnd, prevStart, prevEnd, isCurrentMonth } = getDatePeriods(validMonth);
    const ttl = isCurrentMonth ? CURRENT_MONTH_TTL_MS : HISTORICAL_MONTH_TTL_MS;
    const cacheKey = `regions_${validMonth || 'current'}_${auth.accountId}`;
    const cached = globalCache.get<RegionCostItem[]>(cacheKey, ttl);
    if (cached) return cached;

    try {
      const [regionGroups, prevRegionGroups] = await Promise.all([
        fetchAllCostGroups({
          TimePeriod: { Start: currentStart, End: currentEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [
            { Type: 'DIMENSION', Key: 'REGION' },
            { Type: 'DIMENSION', Key: 'SERVICE' }
          ]
        }),
        fetchAllCostGroups({
          TimePeriod: { Start: prevStart, End: prevEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'REGION' }]
        })
      ]);

      const prevMap = new Map<string, number>();
      for (const g of prevRegionGroups) {
        const code = g.Keys?.[0] || 'Unknown';
        prevMap.set(code, parseFloat(g.Metrics?.UnblendedCost?.Amount || '0'));
      }

      let total = 0;
      const currentRegionTotals = new Map<string, number>();
      const regionServiceCounts = new Map<string, Set<string>>();

      for (const g of regionGroups) {
        const code = g.Keys?.[0] || 'Unknown';
        const svc = g.Keys?.[1] || 'Unknown';
        const cost = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
        if (cost > 0) {
          total += cost;
          currentRegionTotals.set(code, (currentRegionTotals.get(code) || 0) + cost);
          if (!regionServiceCounts.has(code)) {
            regionServiceCounts.set(code, new Set());
          }
          regionServiceCounts.get(code)!.add(svc);
        }
      }

      const items: RegionCostItem[] = Array.from(currentRegionTotals.entries()).map(([code, cost]) => {
        const prev = prevMap.get(code) || 0;
        const info = AWS_REGIONS_DIRECTORY[code.toLowerCase()] || {
          name: code === 'NoRegion' ? 'Global / Non-Regional (Tax, Route53)' : code,
          country: 'AWS Region / Global',
          flag: '📍'
        };
        const percentOfTotal = total > 0 ? Number(((cost / total) * 100).toFixed(1)) : 0;
        const changeAmount = cost - prev;
        const changePercent = prev > 0 ? Number(((changeAmount / prev) * 100).toFixed(1)) : 100;
        const activeServices = regionServiceCounts.get(code)?.size || 1;

        return {
          regionCode: code,
          regionName: info.name,
          cost: Number(cost.toFixed(2)),
          previousCost: Number(prev.toFixed(2)),
          percentOfTotal,
          changePercent,
          country: `${info.flag} ${info.country}`,
          activeServices
        };
      }).sort((a, b) => b.cost - a.cost);

      globalCache.set(cacheKey, items);
      return items;
    } catch {
      const stale = globalCache.getStale<RegionCostItem[]>(cacheKey);
      if (stale) return stale;
      return MockDataService.getRegions();
    }
  }

  public static async getInvoiceReconciliation(month?: string): Promise<InvoiceReconciliation> {
    const validMonth = normalizeMonthParam(month);
    const { currentStart, currentEnd, isCurrentMonth, billingPeriodName } = getDatePeriods(validMonth);
    const services = await this.getServices(validMonth);

    let subtotalUsage = 0;
    let taxAmount = 0;
    let creditsRefundsAmount = 0;

    const lineItems: any[] = [];
    for (const s of services) {
      if (s.serviceName.toLowerCase() === 'tax') {
        taxAmount += s.currentMonth;
        lineItems.push({
          serviceName: 'Tax & Governmental Surcharges',
          amount: s.currentMonth,
          percentage: 0,
          isTax: true
        });
      } else if (s.currentMonth < 0) {
        creditsRefundsAmount += Math.abs(s.currentMonth);
        lineItems.push({
          serviceName: s.serviceName,
          amount: s.currentMonth,
          percentage: 0,
          isCredit: true
        });
      } else {
        subtotalUsage += s.currentMonth;
        lineItems.push({
          serviceName: s.serviceName,
          amount: s.currentMonth,
          percentage: 0
        });
      }
    }

    const totalInvoiceAmount = subtotalUsage + taxAmount - creditsRefundsAmount;

    for (const item of lineItems) {
      item.percentage = totalInvoiceAmount > 0 ? Number(((item.amount / totalInvoiceAmount) * 100).toFixed(1)) : 0;
    }

    return {
      billingPeriod: billingPeriodName,
      startDate: currentStart,
      endDate: currentEnd,
      currency: 'USD',
      subtotalUsage: Number(subtotalUsage.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      creditsRefundsAmount: Number(creditsRefundsAmount.toFixed(2)),
      totalInvoiceAmount: Number(totalInvoiceAmount.toFixed(2)),
      isCurrentMonthEstimate: isCurrentMonth,
      lineItems
    };
  }

  public static async getDailySummary(month?: string): Promise<DailyCostSummary> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getDailySummary();
    }

    const { currentStart, currentEnd, isCurrentMonth } = getDatePeriods(validMonth);
    const ttl = isCurrentMonth ? CURRENT_MONTH_TTL_MS : HISTORICAL_MONTH_TTL_MS;
    const cacheKey = `daily_summary_${validMonth || 'current'}_${auth.accountId}`;
    const cached = globalCache.get<DailyCostSummary>(cacheKey, ttl);
    if (cached) return cached;

    try {
      const now = new Date();
      let queryStart = currentStart;
      let queryEnd = currentEnd;

      if (isCurrentMonth) {
        const thirtyDaysAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 30));
        queryStart = thirtyDaysAgo.toISOString().split('T')[0];
        queryEnd = now.toISOString().split('T')[0];
      }

      const resultsByTime = await fetchAllCostResultsByTime({
        TimePeriod: { Start: queryStart, End: queryEnd },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
        GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
      });

      const dailyPoints: {
        date: string;
        dayOfWeek: string;
        amount: number;
        isToday?: boolean;
        isYesterday?: boolean;
        services: Record<string, number>;
      }[] = [];

      const todayStr = now.toISOString().split('T')[0];
      const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

      let highestDay = { date: 'N/A', amount: 0 };
      let lowestDay = { date: 'N/A', amount: Number.MAX_VALUE };
      let totalSum = 0;

      for (const item of resultsByTime) {
        const dateStr = item.TimePeriod?.Start || 'Unknown';
        let dayTotal = 0;
        const sMap: Record<string, number> = {};

        if (item.Groups) {
          for (const g of item.Groups) {
            const sName = g.Keys?.[0] || 'Unknown';
            const amt = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
            if (amt > 0) {
              dayTotal += amt;
              sMap[sName] = Number(amt.toFixed(2));
            }
          }
        }

        dayTotal = Number(dayTotal.toFixed(2));
        totalSum += dayTotal;

        if (dayTotal > highestDay.amount) {
          highestDay = { date: dateStr, amount: dayTotal };
        }
        if (dayTotal < lowestDay.amount && dayTotal > 0) {
          lowestDay = { date: dateStr, amount: dayTotal };
        }

        const dayDate = new Date(dateStr);
        const dayOfWeek = dayDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

        dailyPoints.push({
          date: dateStr,
          dayOfWeek,
          amount: dayTotal,
          isToday: dateStr === todayStr,
          isYesterday: dateStr === yesterdayStr,
          services: sMap
        });
      }

      if (lowestDay.amount === Number.MAX_VALUE) {
        lowestDay = { date: dailyPoints[0]?.date || 'N/A', amount: 0 };
      }

      const pointCount = dailyPoints.length;
      const thirtyDayAverage = pointCount > 0 ? Number((totalSum / pointCount).toFixed(2)) : 0;

      const last7Points = dailyPoints.slice(-7);
      const sevenDaySum = last7Points.reduce((acc, p) => acc + p.amount, 0);
      const sevenDayAverage = last7Points.length > 0 ? Number((sevenDaySum / last7Points.length).toFixed(2)) : 0;

      const lastPoint = dailyPoints[dailyPoints.length - 1];
      const secondLastPoint = dailyPoints.length > 1 ? dailyPoints[dailyPoints.length - 2] : lastPoint;

      const summary: DailyCostSummary = {
        todayCost: lastPoint?.amount || 0,
        yesterdayCost: secondLastPoint?.amount || 0,
        sevenDayAverage,
        thirtyDayAverage,
        highestDay,
        lowestDay,
        dailyPoints
      };

      globalCache.set(cacheKey, summary);
      return summary;
    } catch (err: any) {
      console.warn('[COST EXPLORER] getDailySummary live error, checking stale cache:', err.message);
      const stale = globalCache.getStale<DailyCostSummary>(cacheKey);
      if (stale) return stale;
      return MockDataService.getDailySummary();
    }
  }

  public static async getAnomalies(month?: string): Promise<CostAnomaly[]> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getAnomalies();
    }

    try {
      const services = await this.getServices(validMonth);
      const anomalies: CostAnomaly[] = [];

      for (const s of services) {
        if (s.serviceName.toLowerCase() === 'tax') continue;

        if (s.previousMonth > 0 && s.changePercent >= 20 && s.changeAmount >= 3) {
          const mult = Number((s.currentMonth / s.previousMonth).toFixed(2));
          const severity: 'high' | 'medium' | 'low' = s.changeAmount >= 50 ? 'high' : s.changeAmount >= 15 ? 'medium' : 'low';
          anomalies.push({
            id: `anom-${s.serviceName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
            service: s.serviceName,
            date: 'Billing Cycle Spike',
            currentCost: s.currentMonth,
            expectedCost: s.previousMonth,
            deviationMultiplier: mult,
            severity,
            title: `${s.serviceName} Increased by +${s.changePercent}%`,
            explanation: `Spending increased from $${s.previousMonth.toFixed(2)} to $${s.currentMonth.toFixed(2)} (+$${s.changeAmount.toFixed(2)}). ${s.description}`,
            drillDownHint: `Inspect ${s.serviceName} in the AWS Services page to see specific usage types and operations driving this cost.`
          });
        } else if (s.previousMonth === 0 && s.currentMonth >= 5) {
          anomalies.push({
            id: `anom-new-${s.serviceName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
            service: s.serviceName,
            date: 'New Service Activated',
            currentCost: s.currentMonth,
            expectedCost: 0,
            deviationMultiplier: 2.0,
            severity: s.currentMonth >= 30 ? 'high' : 'medium',
            title: `New Service Charges: ${s.serviceName}`,
            explanation: `This service generated $${s.currentMonth.toFixed(2)} in charges this month after generating $0.00 last month.`,
            drillDownHint: `Click on ${s.serviceName} to verify which instances or resources were provisioned.`
          });
        }
      }

      anomalies.sort((a, b) => (b.currentCost - b.expectedCost) - (a.currentCost - a.expectedCost));

      if (anomalies.length === 0) {
        anomalies.push({
          id: 'anom-healthy',
          service: 'All Active Services',
          date: 'Current Billing Period',
          currentCost: 0,
          expectedCost: 0,
          deviationMultiplier: 1.0,
          severity: 'low',
          title: 'All Services Operating Within Expected Baselines',
          explanation: 'No unexpected cost spikes or abnormal surges detected across your active AWS services for this billing period.',
          drillDownHint: 'Check the Daily Spending page to track day-to-day burn rate.'
        });
      }

      return anomalies;
    } catch {
      return MockDataService.getAnomalies();
    }
  }

  public static async getSavings(month?: string): Promise<CostSavings[]> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getSavings();
    }

    try {
      const services = await this.getServices(validMonth);
      const savings: CostSavings[] = [];

      for (const s of services) {
        if (s.serviceName.toLowerCase() === 'tax') continue;

        if (s.previousMonth > s.currentMonth && s.previousMonth > 0) {
          const savedAmount = Number((s.previousMonth - s.currentMonth).toFixed(2));
          const savedPercent = Number((((s.previousMonth - s.currentMonth) / s.previousMonth) * 100).toFixed(1));

          if (savedAmount >= 0.5) {
            savings.push({
              id: `sav-${s.serviceName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
              service: s.serviceName,
              previousCost: s.previousMonth,
              currentCost: s.currentMonth,
              savedAmount,
              savedPercent,
              explanation: `You spent $${savedAmount.toFixed(2)} less on ${s.serviceName} compared to the previous period (${savedPercent}% reduction). This is from reduced resource runtime, stopped instances, or decreased storage.`
            });
          }
        }
      }

      savings.sort((a, b) => b.savedAmount - a.savedAmount);

      if (savings.length === 0) {
        savings.push({
          id: 'sav-steady',
          service: 'General AWS Infrastructure',
          previousCost: 0,
          currentCost: 0,
          savedAmount: 0,
          savedPercent: 0,
          explanation: 'Spending across active services has remained stable or expanded slightly with current workload demand.'
        });
      }

      return savings;
    } catch {
      return MockDataService.getSavings();
    }
  }

  public static async getAccounts(month?: string): Promise<AccountSpendingItem[]> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getAccounts();
    }

    const { currentStart, currentEnd, prevStart, prevEnd, isCurrentMonth } = getDatePeriods(validMonth);
    const ttl = isCurrentMonth ? CURRENT_MONTH_TTL_MS : HISTORICAL_MONTH_TTL_MS;
    const cacheKey = `accounts_${validMonth || 'current'}_${auth.accountId}`;
    const cached = globalCache.get<AccountSpendingItem[]>(cacheKey, ttl);
    if (cached) return cached;

    try {
      const [currentAccts, prevAccts, services] = await Promise.all([
        fetchAllCostGroups({
          TimePeriod: { Start: currentStart, End: currentEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'LINKED_ACCOUNT' }]
        }),
        fetchAllCostGroups({
          TimePeriod: { Start: prevStart, End: prevEnd },
          Granularity: 'MONTHLY',
          Metrics: ['UnblendedCost'],
          GroupBy: [{ Type: 'DIMENSION', Key: 'LINKED_ACCOUNT' }]
        }),
        this.getServices(validMonth)
      ]);

      const prevMap = new Map<string, number>();
      for (const g of prevAccts) {
        const id = g.Keys?.[0] || 'Unknown';
        prevMap.set(id, parseFloat(g.Metrics?.UnblendedCost?.Amount || '0'));
      }

      const topServices = services.slice(0, 3).map(s => ({ name: s.serviceName, cost: s.currentMonth }));

      let total = 0;
      const rawList: { id: string; current: number; prev: number }[] = [];
      for (const g of currentAccts) {
        const id = g.Keys?.[0] || 'Unknown';
        const current = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
        if (current > 0) {
          total += current;
          rawList.push({ id, current, prev: prevMap.get(id) || 0 });
        }
      }

      if (rawList.length === 0) {
        const curSpend = services.reduce((acc, s) => acc + s.currentMonth, 0);
        const prevSpend = services.reduce((acc, s) => acc + s.previousMonth, 0);
        const changePercent = prevSpend > 0 ? Number((((curSpend - prevSpend) / prevSpend) * 100).toFixed(1)) : 0;
        const singleAccount = [
          {
            accountId: auth.accountId || '049962352885',
            accountName: 'Primary AWS Account',
            cost: Number(curSpend.toFixed(2)),
            previousCost: Number(prevSpend.toFixed(2)),
            percentOfTotal: 100,
            changePercent,
            topServices
          }
        ];
        globalCache.set(cacheKey, singleAccount);
        return singleAccount;
      }

      const items = rawList.map(a => {
        const changeAmount = a.current - a.prev;
        const changePercent = a.prev > 0 ? Number(((changeAmount / a.prev) * 100).toFixed(1)) : 0;
        const percentOfTotal = total > 0 ? Number(((a.current / total) * 100).toFixed(1)) : 100;
        const isCurrentAuth = a.id === auth.accountId;

        return {
          accountId: a.id,
          accountName: isCurrentAuth ? `Primary Account (${a.id})` : `Linked Account (${a.id})`,
          cost: Number(a.current.toFixed(2)),
          previousCost: Number(a.prev.toFixed(2)),
          percentOfTotal,
          changePercent,
          topServices
        };
      }).sort((a, b) => b.cost - a.cost);

      globalCache.set(cacheKey, items);
      return items;
    } catch {
      const stale = globalCache.getStale<AccountSpendingItem[]>(cacheKey);
      if (stale) return stale;

      const services = await this.getServices(validMonth);
      if (services.length > 0) {
        const curSpend = services.reduce((acc, s) => acc + s.currentMonth, 0);
        const prevSpend = services.reduce((acc, s) => acc + s.previousMonth, 0);
        const changePercent = prevSpend > 0 ? Number((((curSpend - prevSpend) / prevSpend) * 100).toFixed(1)) : 0;
        return [
          {
            accountId: auth.accountId || '049962352885',
            accountName: `Primary Account (${auth.accountId || '049962352885'})`,
            cost: Number(curSpend.toFixed(2)),
            previousCost: Number(prevSpend.toFixed(2)),
            percentOfTotal: 100,
            changePercent,
            topServices: services.slice(0, 3).map(s => ({ name: s.serviceName, cost: s.currentMonth }))
          }
        ];
      }
      return MockDataService.getAccounts();
    }
  }

  public static async getTags(month?: string): Promise<{ tags: TagSpendingItem[]; tagsAvailable: boolean; explanation: string }> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getTags();
    }

    const { currentStart, currentEnd, isCurrentMonth } = getDatePeriods(validMonth);
    const ttl = isCurrentMonth ? CURRENT_MONTH_TTL_MS : HISTORICAL_MONTH_TTL_MS;
    const cacheKey = `tags_${validMonth || 'current'}_${auth.accountId}`;
    const cached = globalCache.get<{ tags: TagSpendingItem[]; tagsAvailable: boolean; explanation: string }>(cacheKey, ttl);
    if (cached) return cached;

    try {
      const ceClient = getCostExplorerClient();
      const tagsRes = await executeSafeReadOnlyOperation('GetTags', async () => {
        return await ceClient.send(new GetTagsCommand({
          TimePeriod: { Start: currentStart, End: currentEnd }
        }));
      });

      const tagKeys = (tagsRes.Tags || []).filter(Boolean);
      if (tagKeys.length === 0) {
        const emptyResult = {
          tags: [],
          tagsAvailable: false,
          explanation: 'No AWS Cost Allocation Tags are currently activated in this AWS account. In AWS, resource tags (like Environment, Project, Owner) only appear in Cost Explorer once you explicitly activate them in AWS Billing Console > Cost Allocation Tags. Once activated, AWS publishes tagged billing data within 24 hours.'
        };
        globalCache.set(cacheKey, emptyResult);
        return emptyResult;
      }

      // Query top 3 tag keys for actual cost breakdown
      const services = await this.getServices(validMonth);
      const totalAWS = services.reduce((acc, s) => acc + s.currentMonth, 0);
      const tags: TagSpendingItem[] = [];

      for (const tagKey of tagKeys.slice(0, 4)) {
        try {
          const tagGroups = await fetchAllCostGroups({
            TimePeriod: { Start: currentStart, End: currentEnd },
            Granularity: 'MONTHLY',
            Metrics: ['UnblendedCost'],
            GroupBy: [
              { Type: 'TAG', Key: tagKey },
              { Type: 'DIMENSION', Key: 'SERVICE' }
            ]
          });

          const byVal = new Map<string, { cost: number; services: { name: string; cost: number }[] }>();
          for (const g of tagGroups) {
            const rawTag = g.Keys?.[0] || `${tagKey}$Untagged`;
            const valPart = rawTag.includes('$') ? rawTag.split('$').slice(1).join('$') : rawTag;
            const tagVal = valPart || '(untagged)';
            const svc = g.Keys?.[1] || 'AWS Service';
            const amt = parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
            if (amt > 0) {
              if (!byVal.has(tagVal)) {
                byVal.set(tagVal, { cost: 0, services: [] });
              }
              const entry = byVal.get(tagVal)!;
              entry.cost += amt;
              entry.services.push({ name: svc, cost: Number(amt.toFixed(2)) });
            }
          }

          for (const [val, info] of byVal.entries()) {
            tags.push({
              tagKey,
              tagValue: val,
              cost: Number(info.cost.toFixed(2)),
              percentOfTotal: totalAWS > 0 ? Number(((info.cost / totalAWS) * 100).toFixed(1)) : 0,
              services: info.services.sort((a, b) => b.cost - a.cost).slice(0, 4)
            });
          }
        } catch {
          // Skip tag if query fails
        }
      }

      tags.sort((a, b) => b.cost - a.cost);

      const result = {
        tags,
        tagsAvailable: tags.length > 0,
        explanation: tags.length > 0
          ? 'Active AWS Cost Allocation Tags tracked in your account.'
          : 'Cost Allocation Tags are registered, but no tagged spend was recorded in this billing period.'
      };
      globalCache.set(cacheKey, result);
      return result;
    } catch {
      const stale = globalCache.getStale<{ tags: TagSpendingItem[]; tagsAvailable: boolean; explanation: string }>(cacheKey);
      if (stale) return stale;
      return {
        tags: [],
        tagsAvailable: false,
        explanation: 'No AWS Cost Allocation Tags are currently activated in this AWS account. In AWS, resource tags (like Environment, Project, Owner) only appear in Cost Explorer once you explicitly activate them in AWS Billing Console > Cost Allocation Tags. Once activated, AWS publishes tagged billing data within 24 hours.'
      };
    }
  }

  public static async getCategoryDeepDive(
    category: DeepDiveCategory,
    month?: string
  ): Promise<CategoryBreakdown> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getCategoryDeepDive(category);
    }

    try {
      const services = await this.getServices(validMonth);
      const totalAWS = services.reduce((acc, s) => acc + s.currentMonth, 0);

      const matched = services.filter(s => s.category === category);
      // Note: if Storage is selected and EC2 - Other exists (which holds EBS volumes/snapshots), include it as an informative storage component as well
      const ec2Other = category === 'Storage'
        ? services.find(s => s.serviceName === 'EC2 - Other')
        : undefined;

      const effectiveList = ec2Other && !matched.some(m => m.serviceName === 'EC2 - Other')
        ? [...matched, ec2Other]
        : matched;

      const catTotal = effectiveList.reduce((acc, s) => acc + s.currentMonth, 0);
      const percentOfTotalSpend = totalAWS > 0 ? Number(((catTotal / totalAWS) * 100).toFixed(1)) : 0;

      const guides: Record<DeepDiveCategory, { summary: string; guide: string; recs: string[] }> = {
        Compute: {
          summary: `Compute represents your virtual servers (EC2, Lightsail), web app builders (Amplify), containers, and serverless compute runtime. Your total Compute spend for this period is $${catTotal.toFixed(2)} (${percentOfTotalSpend}% of total AWS bill).`,
          guide: 'Compute costs are charged per second or hour while virtual machines and workloads are powered on. In this account, EC2 instances run continuously in ap-south-1 (Mumbai) and us-west-2 (Oregon). Stopping unneeded development or staging instances during nights and weekends can yield immediate 30-50% savings.',
          recs: [
            'Review stopped vs running instances on the Machine Names & Inventory page.',
            'Schedule automated stopping of non-production staging servers during off-hours.',
            'Evaluate Compute Savings Plans or 1-year Reserved Instances for 24/7 baseline production servers to save up to 40%.'
          ]
        },
        Storage: {
          summary: `Storage represents S3 object buckets, EC2 Elastic Block Store (EBS) disk volumes, and snapshot backups. Total Storage & Disk spend is $${catTotal.toFixed(2)} (${percentOfTotalSpend}% of total AWS bill).`,
          guide: 'Storage costs accrue 24/7 regardless of whether attached servers are running or stopped. EBS volumes (billed under EC2 - Other) continue charging for provisioned gigabytes even when an EC2 instance is in stopped state.',
          recs: [
            'Check for unattached EBS volumes from terminated instances that are still incurring storage fees.',
            'Apply S3 Lifecycle policies to automatically transition older backups to Glacier Flexible Retrieval or Deep Archive.',
            'Delete outdated manual EBS snapshots and test database dumps.'
          ]
        },
        Database: {
          summary: `Database represents managed database engines including RDS, Aurora, DynamoDB, and ElastiCache. Total Database spend is $${catTotal.toFixed(2)} (${percentOfTotalSpend}% of total AWS bill).`,
          guide: 'AWS managed databases include underlying compute, multi-AZ high availability mirroring, automated backups, and provisioned storage.',
          recs: [
            'Ensure non-production development databases are paused or stopped when not in active use.',
            'Review database instance sizing (CPU/RAM metrics) to avoid paying for oversized database tiers.',
            'Consider Graviton-based database instances (e.g. db.t4g / db.r6g) for 20% better price-performance.'
          ]
        },
        Networking: {
          summary: `Networking represents Virtual Private Clouds (VPC), public IPv4 addresses, NAT Gateways, Route 53 DNS, CloudFront CDN, and API Gateway. Total Networking spend is $${catTotal.toFixed(2)} (${percentOfTotalSpend}% of total AWS bill).`,
          guide: 'Networking charges cover VPC transit, cross-AZ traffic, Route 53 DNS zones, and AWS hourly charges for public IPv4 addresses ($0.005/hour per IP).',
          recs: [
            'Review assigned Elastic Public IPs on the Inventory page to ensure unattached IPs are released.',
            'Keep high-bandwidth EC2-to-RDS communication in the same Availability Zone to eliminate cross-AZ data transfer fees.',
            'Use VPC Endpoints for S3 traffic to route privately and avoid NAT Gateway data processing charges.'
          ]
        },
        'AI & ML': {
          summary: `AI & ML represents generative AI foundation models on Amazon Bedrock (such as Anthropic Claude Sonnet & Claude Haiku) and machine learning workloads. Total AI & ML spend is $${catTotal.toFixed(2)} (${percentOfTotalSpend}% of total AWS bill).`,
          guide: 'Amazon Bedrock charges strictly per 1,000 input prompt tokens and output completion tokens without fixed hourly server fees when using on-demand inference.',
          recs: [
            'Enable Amazon Bedrock Prompt Caching for repeated system prompts and large document contexts to cut input token costs by up to 90%.',
            'Route lightweight classification, extraction, and routing requests to Claude Haiku instead of Claude Sonnet.',
            'Cap max_tokens on API calls and trim redundant conversation history.'
          ]
        }
      };

      const meta = guides[category] || guides.Compute;

      const catServices = effectiveList.map(s => {
        const percentOfCat = catTotal > 0 ? Number(((s.currentMonth / catTotal) * 100).toFixed(1)) : 0;
        return {
          serviceName: s.serviceName,
          cost: s.currentMonth,
          percentOfCategory: percentOfCat,
          components: [
            {
              name: `${s.serviceName} Usage & Runtime`,
              cost: s.currentMonth,
              explanation: s.plainEnglishExplanation
            }
          ]
        };
      });

      return {
        category,
        totalCost: Number(catTotal.toFixed(2)),
        percentOfTotalSpend,
        summary: meta.summary,
        plainEnglishGuide: meta.guide,
        services: catServices,
        recommendations: meta.recs
      };
    } catch {
      return MockDataService.getCategoryDeepDive(category);
    }
  }

  public static async getDrillDownTree(month?: string): Promise<DrillDownNode> {
    const validMonth = normalizeMonthParam(month);
    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.getDrillDownTree();
    }

    try {
      const services = await this.getServices(validMonth);
      const totalAWS = services.reduce((acc, s) => acc + s.currentMonth, 0);

      const categoriesMap = new Map<string, ServiceCostItem[]>();
      for (const s of services) {
        const cat = s.category || 'Other';
        if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
        categoriesMap.get(cat)!.push(s);
      }

      const catNodes: DrillDownNode[] = [];
      for (const [catName, catServices] of categoriesMap.entries()) {
        const catTotal = catServices.reduce((acc, s) => acc + s.currentMonth, 0);
        const percentOfTotal = totalAWS > 0 ? Number(((catTotal / totalAWS) * 100).toFixed(1)) : 0;

        const serviceNodes: DrillDownNode[] = catServices.map(s => {
          const sPercent = catTotal > 0 ? Number(((s.currentMonth / catTotal) * 100).toFixed(1)) : 0;
          return {
            level: 2,
            levelName: 'Service',
            key: `service-${s.serviceName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
            name: s.serviceName,
            cost: s.currentMonth,
            percentOfParent: sPercent,
            changePercent: s.changePercent,
            explanation: s.plainEnglishExplanation,
            hasChildren: false
          };
        });

        catNodes.push({
          level: 1,
          levelName: 'Category',
          key: `cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: `${catName} Services`,
          cost: Number(catTotal.toFixed(2)),
          percentOfParent: percentOfTotal,
          explanation: `All AWS services grouped under ${catName}.`,
          hasChildren: serviceNodes.length > 0,
          children: serviceNodes
        });
      }

      catNodes.sort((a, b) => b.cost - a.cost);

      const { billingPeriodName } = getDatePeriods(validMonth);

      return {
        level: 0,
        levelName: 'Root',
        key: 'root-total',
        name: `Total AWS Spend (${billingPeriodName})`,
        cost: Number(totalAWS.toFixed(2)),
        percentOfParent: 100,
        explanation: 'Grand total AWS expenditure across all regions, accounts, and infrastructure components.',
        hasChildren: true,
        children: catNodes
      };
    } catch {
      return MockDataService.getDrillDownTree();
    }
  }

  public static async handleSearch(query: string, month?: string): Promise<SearchQueryResult> {
    const validMonth = normalizeMonthParam(month);
    const q = query.toLowerCase().trim();
    if (!q) {
      return {
        query,
        intent: 'general',
        title: 'Search AWS Billing & Infrastructure',
        summary: 'Enter an AWS service, category, region, or resource name to quickly navigate your FinOps dashboard.',
        relevantData: {}
      };
    }

    const auth = await this.getAuthStatus();
    if (auth.isDemoMode) {
      return MockDataService.handleSearch(query);
    }

    const [overview, services] = await Promise.all([
      this.getDashboardOverview(validMonth),
      this.getServices(validMonth)
    ]);
    const { billingPeriodName } = getDatePeriods(validMonth);

    if (q.includes('increase') || q.includes('change') || q.includes('why') || q.includes('spike') || q.includes('higher')) {
      const diff = Number((overview.currentMonthSpend - overview.previousMonthSpend).toFixed(2));
      const sign = diff >= 0 ? '+' : '-';
      return {
        query,
        intent: 'increase_explanation',
        title: `Billing Change Analysis (${billingPeriodName})`,
        summary: `Total spend for ${billingPeriodName} is $${overview.currentMonthSpend.toFixed(2)} (${sign}$${Math.abs(diff).toFixed(2)} / ${overview.spendChangePercent >= 0 ? '+' : ''}${overview.spendChangePercent}% vs previous period). The largest cost driver is ${overview.topService.name} at $${overview.topService.amount.toFixed(2)} (${overview.topService.percentage}% of total).`,
        highlightNumber: `${sign}$${Math.abs(diff).toFixed(2)} (${overview.spendChangePercent >= 0 ? '+' : ''}${overview.spendChangePercent}%)`,
        relevantData: {
          currentMonthSpend: overview.currentMonthSpend,
          previousMonthSpend: overview.previousMonthSpend,
          topService: overview.topService
        },
        suggestedAction: {
          page: 'anomalies',
          label: 'Inspect Cost Spikes & Savings'
        }
      };
    }

    if (q.includes('bedrock') || q.includes('claude') || q.includes('ai') || q.includes('llm') || q.includes('sonnet') || q.includes('haiku')) {
      const aiServices = services.filter(s => s.category === 'AI & ML');
      const aiTotal = aiServices.reduce((acc, s) => acc + s.currentMonth, 0);
      const breakdownStr = aiServices.length > 0
        ? aiServices.map(s => `${s.serviceName}: $${s.currentMonth.toFixed(2)}`).join(', ')
        : 'No Bedrock AI charges recorded in this period';
      return {
        query,
        intent: 'category_lookup',
        title: `Generative AI & Amazon Bedrock Spend (${billingPeriodName})`,
        summary: `Total AI & ML expenditure for ${billingPeriodName} is $${aiTotal.toFixed(2)} (${breakdownStr}).`,
        highlightNumber: `$${aiTotal.toFixed(2)} (${billingPeriodName})`,
        relevantData: { category: 'AI & ML', total: aiTotal, services: aiServices },
        suggestedAction: {
          page: 'ai',
          label: 'View AI & Bedrock Deep-Dive'
        }
      };
    }

    if (q.includes('ec2') || q.includes('server') || q.includes('compute') || q.includes('instance')) {
      const ec2Compute = services.find(s => s.serviceName.includes('Elastic Compute Cloud'))?.currentMonth || 0;
      const ec2Other = services.find(s => s.serviceName === 'EC2 - Other')?.currentMonth || 0;
      const lightsail = services.find(s => s.serviceName.includes('Lightsail'))?.currentMonth || 0;
      const totalCompute = Number((ec2Compute + ec2Other + lightsail).toFixed(2));
      return {
        query,
        intent: 'service_lookup',
        title: `EC2 & Compute Infrastructure (${billingPeriodName})`,
        summary: `In ${billingPeriodName}, EC2 Compute is $${ec2Compute.toFixed(2)}, EC2-Other (EBS disks/IPs) is $${ec2Other.toFixed(2)}${lightsail > 0 ? `, and Lightsail is $${lightsail.toFixed(2)}` : ''}. Combined compute infrastructure totals $${totalCompute.toFixed(2)}.`,
        highlightNumber: `$${totalCompute.toFixed(2)} Compute`,
        relevantData: { service: 'Amazon Elastic Compute Cloud - Compute', totalCompute },
        suggestedAction: {
          page: 'services',
          label: 'View EC2 Service Details',
          params: { service: 'Amazon Elastic Compute Cloud - Compute' }
        }
      };
    }

    if (q.includes('storage') || q.includes('s3') || q.includes('bucket') || q.includes('ebs') || q.includes('disk')) {
      const s3Cost = services.find(s => s.serviceName.includes('Simple Storage Service'))?.currentMonth || 0;
      const ebsCost = services.find(s => s.serviceName === 'EC2 - Other')?.currentMonth || 0;
      const totalStorage = Number((s3Cost + ebsCost).toFixed(2));
      return {
        query,
        intent: 'category_lookup',
        title: `Storage & S3 Buckets (${billingPeriodName})`,
        summary: `In ${billingPeriodName}, Amazon S3 storage is $${s3Cost.toFixed(2)} and EC2 supporting EBS disk/snapshot infrastructure is $${ebsCost.toFixed(2)} (Total: $${totalStorage.toFixed(2)}).`,
        highlightNumber: `$${totalStorage.toFixed(2)} Storage`,
        relevantData: { category: 'Storage', s3Cost, ebsCost },
        suggestedAction: {
          page: 'storage',
          label: 'View Storage Deep-Dive'
        }
      };
    }

    if (q.includes('database') || q.includes('rds') || q.includes('postgres') || q.includes('mysql') || q.includes('dynamo')) {
      const dbServices = services.filter(s => s.category === 'Database');
      const dbTotal = dbServices.reduce((acc, s) => acc + s.currentMonth, 0);
      return {
        query,
        intent: 'category_lookup',
        title: `Managed Databases (${billingPeriodName})`,
        summary: `Total database expenditure for ${billingPeriodName} is $${dbTotal.toFixed(2)} across ${dbServices.length} database service(s).`,
        highlightNumber: `$${dbTotal.toFixed(2)} Databases`,
        relevantData: { category: 'Database', total: dbTotal },
        suggestedAction: {
          page: 'databases',
          label: 'View Database Deep-Dive'
        }
      };
    }

    if (q.includes('region') || q.includes('mumbai') || q.includes('oregon') || q.includes('location') || q.includes('where')) {
      return {
        query,
        intent: 'region_lookup',
        title: `Regional Spend Distribution (${billingPeriodName})`,
        summary: `Your highest-spending region in ${billingPeriodName} is ${overview.topRegion.name} at $${overview.topRegion.amount.toFixed(2)} (${overview.topRegion.percentage}% of total bill).`,
        highlightNumber: `${overview.topRegion.name}: $${overview.topRegion.amount.toFixed(2)}`,
        relevantData: { topRegion: overview.topRegion },
        suggestedAction: {
          page: 'regions',
          label: 'Explore Regional Analysis'
        }
      };
    }

    if (q.includes('inventory') || q.includes('machine') || q.includes('name') || q.includes('ip') || q.includes('tag') || q.includes('running') || q.includes('stopped')) {
      return {
        query,
        intent: 'general',
        title: 'Cloud Machine Names & Inventory',
        summary: 'See human-readable server names, instance IDs, private/public IPs, RDS databases, and running states without logging into the AWS Console.',
        highlightNumber: 'Live Fleet',
        relevantData: {},
        suggestedAction: {
          page: 'inventory',
          label: 'Open Machine Inventory'
        }
      };
    }

    if (q.includes('activity') || q.includes('user') || q.includes('iam') || q.includes('who') || q.includes('audit')) {
      return {
        query,
        intent: 'general',
        title: 'IAM User Activity & Audit Trail',
        summary: 'Audit recent management API calls and see which IAM users or automation roles are interacting with your infrastructure.',
        highlightNumber: 'CloudTrail Audit',
        relevantData: {},
        suggestedAction: {
          page: 'activity',
          label: 'Open User Activity Logs'
        }
      };
    }

    if (q.includes('invoice') || q.includes('bill') || q.includes('tax') || q.includes('reconcil')) {
      return {
        query,
        intent: 'general',
        title: `Invoice Reconciliation (${billingPeriodName})`,
        summary: `Total invoiced amount for ${billingPeriodName} is $${overview.currentMonthSpend.toFixed(2)} across ${overview.activeServicesCount} active charge categories.`,
        highlightNumber: `$${overview.currentMonthSpend.toFixed(2)} Total`,
        relevantData: {},
        suggestedAction: {
          page: 'invoice',
          label: 'Open Bill Reconciliation'
        }
      };
    }

    return {
      query,
      intent: 'general',
      title: `Search Query: "${query}"`,
      summary: `Total spend in ${billingPeriodName} is $${overview.currentMonthSpend.toFixed(2)} across ${overview.activeServicesCount} active AWS services, led by ${overview.topService.name} ($${overview.topService.amount.toFixed(2)}).`,
      highlightNumber: `$${overview.currentMonthSpend.toFixed(2)}`,
      relevantData: { query },
      suggestedAction: {
        page: 'glossary',
        label: 'Search Plain English Glossary'
      }
    };
  }
}
