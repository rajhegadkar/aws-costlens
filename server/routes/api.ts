import { Router, Request, Response } from 'express';
import {
  CostExplorerService,
  setDemoMode,
  isDemoModeEnabled,
  getAvailableMonths
} from '../aws/costExplorerService.js';
import { InventoryService } from '../aws/inventoryService.js';
import {
  setCurrentProfile,
  getCurrentProfile,
  getAvailableAwsProfiles
} from '../aws/awsClients.js';
import { globalCache } from '../cache/fileCache.js';
import { getApprovedOperationsList } from '../security/awsGuard.js';
import {
  AWS_TERMINOLOGY_MAP,
  SERVICE_EXPLANATIONS,
  COMMON_USAGE_TYPES,
  AWS_REGIONS_DIRECTORY
} from '../../shared/explanationDictionary.js';
import {
  authenticateUser,
  verifyToken,
  invalidateToken,
  isUsingDefaultCredentials
} from '../security/auth.js';
import { loginRateLimiter } from '../security/rateLimiter.js';
import type { DeepDiveCategory } from '../../shared/types.js';

export const apiRouter = Router();

const VALID_CATEGORIES: DeepDiveCategory[] = [
  'Compute',
  'Storage',
  'Database',
  'Networking',
  'AI & ML'
];

function normalizeCategoryParam(raw: string): DeepDiveCategory | null {
  const decoded = decodeURIComponent(raw || '').trim();
  const match = VALID_CATEGORIES.find(c => c.toLowerCase() === decoded.toLowerCase());
  if (match) return match;
  if (decoded.toLowerCase() === 'ai' || decoded.toLowerCase() === 'ai-ml') {
    return 'AI & ML';
  }
  return null;
}

function escapeCsvCell(value: string | number): string {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0';
  }
  let str = String(value ?? '');
  // Prevent CSV spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

// ==========================================
// 1. AUTHENTICATION & SESSIONS
// ==========================================

apiRouter.post('/auth/login', loginRateLimiter, (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const result = authenticateUser(String(username), String(password));
  if (result.success && result.token) {
    return res.json({
      success: true,
      token: result.token,
      user: { username: String(username).trim() }
    });
  }

  return res.status(401).json({ error: result.error || 'Invalid credentials' });
});

apiRouter.get('/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token as string);
  const result = verifyToken(token);
  if (result.valid) {
    return res.json({ valid: true, username: result.username });
  }
  return res.status(401).json({ valid: false, error: 'Invalid or expired session' });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token as string);
  if (token) {
    invalidateToken(token);
  }
  return res.json({ success: true, message: 'Logged out successfully' });
});

apiRouter.get('/auth/status', async (req: Request, res: Response) => {
  try {
    const status = await CostExplorerService.getAuthStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/refresh-permissions', async (req: Request, res: Response) => {
  try {
    const status = await CostExplorerService.getAuthStatus(true);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/profile', async (req: Request, res: Response) => {
  try {
    const { profile, demoMode } = req.body || {};
    if (typeof demoMode === 'boolean') {
      setDemoMode(demoMode);
    }
    if (typeof profile === 'string') {
      const normalizedNext = profile === 'default' ? undefined : profile;
      const current = getCurrentProfile();
      if (normalizedNext !== current) {
        setCurrentProfile(normalizedNext);
      }
    }
    const status = await CostExplorerService.getAuthStatus(true);
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/auth/profiles', (req: Request, res: Response) => {
  res.json({
    currentProfile: getCurrentProfile() || 'default',
    profiles: getAvailableAwsProfiles(),
    demoMode: isDemoModeEnabled()
  });
});

// ==========================================
// 2. MONTHS, DASHBOARD & TIMELINE
// ==========================================

apiRouter.get('/cost/months', (req: Request, res: Response) => {
  res.json(getAvailableMonths());
});

apiRouter.get('/cost/overview', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const overview = await CostExplorerService.getDashboardOverview(month);
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/timeline', async (req: Request, res: Response) => {
  try {
    const rawPeriod = (req.query.period as string) || 'daily';
    const period: 'daily' | 'weekly' | 'monthly' =
      rawPeriod === 'weekly' || rawPeriod === 'monthly' ? rawPeriod : 'daily';
    const timeline = await CostExplorerService.getCostTimeline(period);
    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. SERVICES & SERVICE DETAIL
// ==========================================

apiRouter.get('/cost/services', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const services = await CostExplorerService.getServices(month);
    res.json(services);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/services/:serviceName', async (req: Request, res: Response) => {
  try {
    const rawParam = req.params.serviceName;
    const serviceName = decodeURIComponent(Array.isArray(rawParam) ? rawParam[0] : (rawParam || '')).trim();
    if (!serviceName) {
      return res.status(400).json({ error: 'Service name is required' });
    }
    const month = (req.query.month as string) || undefined;
    const detail = await CostExplorerService.getServiceDetail(serviceName, month);
    res.json(detail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. REGIONS & BILL/INVOICE RECONCILIATION
// ==========================================

apiRouter.get('/cost/regions', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const regions = await CostExplorerService.getRegions(month);
    res.json(regions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/invoice', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const invoice = await CostExplorerService.getInvoiceReconciliation(month);
    res.json(invoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/daily', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const daily = await CostExplorerService.getDailySummary(month);
    res.json(daily);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/accounts', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const accounts = await CostExplorerService.getAccounts(month);
    res.json(accounts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/tags', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const tags = await CostExplorerService.getTags(month);
    res.json(tags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. LIVE CLOUD INVENTORY & USER ACTIVITY
// ==========================================

apiRouter.get('/inventory/resources', async (req: Request, res: Response) => {
  try {
    const force = req.query.refresh === 'true';
    const inventory = await InventoryService.getInventory(force);
    res.json(inventory);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/inventory/activity', async (req: Request, res: Response) => {
  try {
    const parsedLimit = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 200) : 60;
    const activity = await InventoryService.getCloudTrailActivity(limit);
    res.json(activity);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. ANOMALIES & SAVINGS
// ==========================================

apiRouter.get('/cost/anomalies', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const anomalies = await CostExplorerService.getAnomalies(month);
    res.json(anomalies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/savings', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const savings = await CostExplorerService.getSavings(month);
    res.json(savings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. CATEGORY DEEP-DIVES & DRILLDOWN
// ==========================================

apiRouter.get(['/cost/categories/:category', '/cost/category/:category'], async (req: Request, res: Response) => {
  try {
    const rawCat = Array.isArray(req.params.category) ? req.params.category[0] : req.params.category;
    const cat = normalizeCategoryParam(rawCat);
    if (!cat) {
      return res.status(400).json({
        error: `Unsupported category "${rawCat}". Valid categories: ${VALID_CATEGORIES.join(', ')}`
      });
    }
    const month = (req.query.month as string) || undefined;
    const breakdown = await CostExplorerService.getCategoryDeepDive(cat, month);
    res.json(breakdown);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/drilldown', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const tree = await CostExplorerService.getDrillDownTree(month);
    res.json(tree);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. SEARCH & DICTIONARY
// ==========================================

apiRouter.get('/cost/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const month = (req.query.month as string) || undefined;
    const result = await CostExplorerService.handleSearch(q, month);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/dictionary', (req: Request, res: Response) => {
  res.json({
    terminology: AWS_TERMINOLOGY_MAP,
    services: SERVICE_EXPLANATIONS,
    usageTypes: COMMON_USAGE_TYPES,
    regions: AWS_REGIONS_DIRECTORY
  });
});

// ==========================================
// 9. DATA REFRESH & EXPORT
// ==========================================

apiRouter.post('/cost/refresh', async (req: Request, res: Response) => {
  try {
    const month = (req.query.month as string) || undefined;
    const status = await CostExplorerService.getAuthStatus(true);
    if (status.isAuthenticated && !status.isDemoMode) {
      const monthKey = month || 'current';
      const prefixes = [
        `overview:${monthKey}`,
        `services:${monthKey}`,
        `service-detail:${monthKey}`,
        `regions:${monthKey}`,
        `daily:${monthKey}`,
        `accounts:${monthKey}`,
        `tags:${monthKey}`,
        `anomalies:${monthKey}`,
        `savings:${monthKey}`,
        `invoice:${monthKey}`,
        'timeline:'
      ];
      for (const prefix of prefixes) {
        globalCache.invalidate(prefix);
      }
    }
    const overview = await CostExplorerService.getDashboardOverview(month);
    res.json({
      success: true,
      message: status.isAuthenticated && !status.isDemoMode
        ? 'Live AWS billing data refreshed'
        : 'Refreshed using cached / demo dataset',
      overview
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/cost/export', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'json';
    const month = (req.query.month as string) || undefined;
    const safeMonthSuffix = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : 'current';
    const services = await CostExplorerService.getServices(month);
    const overview = await CostExplorerService.getDashboardOverview(month);

    if (format === 'csv') {
      let csv = 'Service Name,Cost ($),Previous Month ($),Change ($),Change (%),% of Total,Category\n';
      for (const s of services) {
        csv += [
          escapeCsvCell(s.serviceName),
          escapeCsvCell(s.currentMonth),
          escapeCsvCell(s.previousMonth),
          escapeCsvCell(s.changeAmount),
          escapeCsvCell(`${s.changePercent}%`),
          escapeCsvCell(`${s.percentOfTotal}%`),
          escapeCsvCell(s.category)
        ].join(',') + '\n';
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="aws-cost-report-${safeMonthSuffix}.csv"`);
      return res.send(csv);
    }

    res.json({
      exportedAt: new Date().toISOString(),
      billingPeriod: month || 'Current Month',
      accountSpend: overview.currentMonthSpend,
      previousSpend: overview.previousMonthSpend,
      currency: overview.currency,
      topService: overview.topService,
      topRegion: overview.topRegion,
      services
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. SECURITY AUDIT & READ-ONLY VERIFICATION
// ==========================================

apiRouter.get('/security/audit', (req: Request, res: Response) => {
  res.json({
    status: 'ENFORCED',
    readOnlyMode: true,
    usingDefaultCredentials: isUsingDefaultCredentials(),
    cacheStats: globalCache.getStats(),
    guarantee: 'This application cannot modify, delete, create, or restart any AWS resources.',
    approvedOperations: getApprovedOperationsList(),
    mutationPolicy: 'All mutations, creates, updates, and deletes are strictly rejected before execution.'
  });
});

