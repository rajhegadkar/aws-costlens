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
  DrillDownNode,
  SearchQueryResult,
  AuthStatus,
  MonthOption,
  InvoiceReconciliation,
  ResourceInventorySummary,
  CloudTrailActivityItem,
  DeepDiveCategory
} from '../../shared/types.js';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('costlens_auth_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('costlens_auth_token', token);
  } else {
    localStorage.removeItem('costlens_auth_token');
  }
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401 && !url.includes('/auth/')) {
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('costlens:unauthorized'));
    }
  }
  return response;
}

// ==========================================
// AUTHENTICATION CLIENT METHODS
// ==========================================

export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: { username: string }; error?: string }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (res.ok && data.token) {
    setAuthToken(data.token);
    return data;
  }
  return { success: false, error: data.error || 'Login failed' };
}

export async function verifyUserSession(): Promise<{ valid: boolean; username?: string }> {
  const token = getAuthToken();
  if (!token) return { valid: false };

  try {
    const res = await apiFetch(`${API_BASE}/auth/verify`);
    if (!res.ok) {
      setAuthToken(null);
      return { valid: false };
    }
    return await res.json();
  } catch {
    return { valid: false };
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  } finally {
    setAuthToken(null);
  }
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await apiFetch(`${API_BASE}/auth/status`);
  if (!res.ok) throw new Error('Failed to fetch auth status');
  return res.json();
}

export async function refreshPermissions(): Promise<AuthStatus> {
  const res = await apiFetch(`${API_BASE}/auth/refresh-permissions`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh permissions');
  return res.json();
}

export async function switchProfile(profile: string, demoMode?: boolean): Promise<{ success: boolean; status: AuthStatus }> {
  const res = await apiFetch(`${API_BASE}/auth/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, demoMode })
  });
  if (!res.ok) throw new Error('Failed to update profile settings');
  return res.json();
}

// ==========================================
// CORE BILLING & INVOICE METHODS
// ==========================================

export async function fetchAvailableMonths(): Promise<MonthOption[]> {
  const res = await apiFetch(`${API_BASE}/cost/months`);
  if (!res.ok) throw new Error('Failed to fetch available months');
  return res.json();
}

export async function fetchDashboardOverview(month?: string): Promise<DashboardOverview> {
  const url = month ? `${API_BASE}/cost/overview?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/overview`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch dashboard overview');
  return res.json();
}

export async function fetchCostTimeline(period: 'daily' | 'weekly' | 'monthly'): Promise<CostTimelinePoint[]> {
  const res = await apiFetch(`${API_BASE}/cost/timeline?period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch timeline data');
  return res.json();
}

export async function fetchServices(month?: string): Promise<ServiceCostItem[]> {
  const url = month ? `${API_BASE}/cost/services?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/services`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch services');
  return res.json();
}

export async function fetchServiceDetail(serviceName: string, month?: string): Promise<ServiceDetailBreakdown> {
  const base = `${API_BASE}/cost/services/${encodeURIComponent(serviceName)}`;
  const url = month ? `${base}?month=${encodeURIComponent(month)}` : base;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch details for ${serviceName}`);
  return res.json();
}

export async function fetchRegions(month?: string): Promise<RegionCostItem[]> {
  const url = month ? `${API_BASE}/cost/regions?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/regions`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch regions');
  return res.json();
}

export async function fetchInvoiceReconciliation(month?: string): Promise<InvoiceReconciliation> {
  const url = month ? `${API_BASE}/cost/invoice?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/invoice`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch invoice reconciliation');
  return res.json();
}

export async function fetchResourceInventory(refresh = false, month?: string): Promise<ResourceInventorySummary> {
  const base = `${API_BASE}/inventory/resources?refresh=${refresh}`;
  const url = month ? `${base}&month=${encodeURIComponent(month)}` : base;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to scan machine inventory');
  return res.json();
}

export async function fetchCloudTrailActivity(limit = 60): Promise<{
  events: CloudTrailActivityItem[];
  topUsers: { username: string; count: number }[];
  topActions: { action: string; count: number }[];
}> {
  const res = await apiFetch(`${API_BASE}/inventory/activity?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch user activity logs');
  return res.json();
}

export async function fetchDailySummary(month?: string): Promise<DailyCostSummary> {
  const url = month ? `${API_BASE}/cost/daily?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/daily`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch daily summary');
  return res.json();
}

export async function fetchAnomalies(month?: string): Promise<CostAnomaly[]> {
  const url = month ? `${API_BASE}/cost/anomalies?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/anomalies`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch anomalies');
  return res.json();
}

export async function fetchSavings(month?: string): Promise<CostSavings[]> {
  const url = month ? `${API_BASE}/cost/savings?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/savings`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch savings data');
  return res.json();
}

export async function fetchAccounts(month?: string): Promise<AccountSpendingItem[]> {
  const url = month ? `${API_BASE}/cost/accounts?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/accounts`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch accounts data');
  return res.json();
}

export async function fetchTags(month?: string): Promise<{ tags: TagSpendingItem[]; tagsAvailable: boolean; explanation: string }> {
  const url = month ? `${API_BASE}/cost/tags?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/tags`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to fetch tags data');
  return res.json();
}

export async function fetchCategory(category: DeepDiveCategory, month?: string): Promise<CategoryBreakdown> {
  const encodedCat = encodeURIComponent(category);
  const url = month
    ? `${API_BASE}/cost/categories/${encodedCat}?month=${encodeURIComponent(month)}`
    : `${API_BASE}/cost/categories/${encodedCat}`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${category} breakdown`);
  return res.json();
}

export async function fetchDrillDown(month?: string): Promise<DrillDownNode> {
  const url = month ? `${API_BASE}/cost/drilldown?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/drilldown`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to drill down');
  return res.json();
}

export async function executeSearch(query: string, month?: string): Promise<SearchQueryResult> {
  const base = `${API_BASE}/cost/search?q=${encodeURIComponent(query)}`;
  const url = month ? `${base}&month=${encodeURIComponent(month)}` : base;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Failed to search');
  return res.json();
}

export async function refreshBillingData(month?: string): Promise<DashboardOverview> {
  const url = month ? `${API_BASE}/cost/refresh?month=${encodeURIComponent(month)}` : `${API_BASE}/cost/refresh`;
  const res = await apiFetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to refresh data');
  const data = await res.json();
  return data.overview;
}

export async function fetchDictionary(): Promise<any> {
  const res = await apiFetch(`${API_BASE}/cost/dictionary`);
  if (!res.ok) throw new Error('Failed to fetch glossary dictionary');
  return res.json();
}
