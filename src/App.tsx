import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { LoginPage } from './pages/LoginPage.js';
import { OverviewPage } from './pages/OverviewPage.js';
import { ServicesPage } from './pages/ServicesPage.js';
import { ServiceDetailPage } from './pages/ServiceDetailPage.js';
import { DrillDownPage } from './pages/DrillDownPage.js';
import { RegionsPage } from './pages/RegionsPage.js';
import { DailyCostsPage } from './pages/DailyCostsPage.js';
import { CategoriesPage } from './pages/CategoriesPage.js';
import { TagsPage } from './pages/TagsPage.js';
import { AccountsPage } from './pages/AccountsPage.js';
import { AnomaliesPage } from './pages/AnomaliesPage.js';
import { GlossaryPage } from './pages/GlossaryPage.js';
import { ExportPage } from './pages/ExportPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { InventoryPage } from './pages/InventoryPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { InvoiceReconciliationPage } from './pages/InvoiceReconciliationPage.js';
import { AskQuestionPage } from './pages/AskQuestionPage.js';
import { FloatingAskButton } from './components/common/FloatingAskButton.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import {
  fetchDashboardOverview,
  fetchCostTimeline,
  fetchServices,
  fetchRegions,
  fetchDailySummary,
  fetchAuthStatus,
  fetchAvailableMonths,
  refreshBillingData,
  switchProfile,
  verifyUserSession,
  logoutUser
} from './api/client.js';
import {
  DashboardOverview,
  CostTimelinePoint,
  ServiceCostItem,
  RegionCostItem,
  DailyCostSummary,
  AuthStatus,
  MonthOption,
  DeepDiveCategory
} from '../shared/types.js';

function getInitialPageFromHash(): string {
  if (typeof window === 'undefined') return 'overview';
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
  return rawHash || 'overview';
}

export function App() {
  // Session & Authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>('admin');
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Navigation & UI state
  const [currentPage, setCurrentPage] = useState<string>(getInitialPageFromHash);
  const [selectedService, setSelectedService] = useState<string>('Amazon Elastic Compute Cloud - Compute');
  const [selectedCategory, setSelectedCategory] = useState<DeepDiveCategory>('Compute');
  const [timelinePeriod, setTimelinePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Month filtering
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('current');

  // Billing Data States
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [timeline, setTimeline] = useState<CostTimelinePoint[]>([]);
  const [services, setServices] = useState<ServiceCostItem[]>([]);
  const [regions, setRegions] = useState<RegionCostItem[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyCostSummary | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('costlens_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  // 1. Check local session token on mount & listen for 401 unauthorized events
  useEffect(() => {
    verifyUserSession()
      .then((res) => {
        if (res.valid && res.username) {
          setIsAuthenticated(true);
          setCurrentUser(res.username);
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => {
        setAuthChecking(false);
      });

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setOverview(null);
    };
    window.addEventListener('costlens:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('costlens:unauthorized', handleUnauthorized);
  }, []);

  // Sync browser back/forward hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const next = getInitialPageFromHash();
      if (next === 'compute') setSelectedCategory('Compute');
      else if (next === 'storage') setSelectedCategory('Storage');
      else if (next === 'databases') setSelectedCategory('Database');
      else if (next === 'datatransfer') setSelectedCategory('Networking');
      else if (next === 'ai') setSelectedCategory('AI & ML');
      setCurrentPage(next);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 2. Initialize & Persist Theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('costlens_dark_mode', String(darkMode));
    } catch {
      // Ignore storage errors in private browsing
    }
  }, [darkMode]);

  // 3. Load available months once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchAvailableMonths()
      .then((months) => {
        setAvailableMonths(months);
        if (months.length > 0 && selectedMonth === 'current') {
          setSelectedMonth(months[0].value);
        }
      })
      .catch(console.error);
  }, [isAuthenticated]);

  // 4. Load billing data based on selected month
  const loadData = async (monthToLoad?: string) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);
    const month = monthToLoad || selectedMonth;
    try {
      const [ov, tl, sv, rg, dl, auth] = await Promise.all([
        fetchDashboardOverview(month),
        fetchCostTimeline(timelinePeriod),
        fetchServices(month),
        fetchRegions(month),
        fetchDailySummary(month),
        fetchAuthStatus()
      ]);

      setOverview(ov);
      setTimeline(tl);
      setServices(sv);
      setRegions(rg);
      setDailySummary(dl);
      setAuthStatus(auth);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && selectedMonth) {
      loadData(selectedMonth);
    }
  }, [isAuthenticated, selectedMonth]);

  // Reload timeline when period changes
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCostTimeline(timelinePeriod)
      .then(setTimeline)
      .catch(console.error);
  }, [timelinePeriod, isAuthenticated]);

  const handleRefresh = async () => {
    try {
      const updatedOverview = await refreshBillingData(selectedMonth);
      setOverview(updatedOverview);
      const [tl, sv, rg, dl] = await Promise.all([
        fetchCostTimeline(timelinePeriod),
        fetchServices(selectedMonth),
        fetchRegions(selectedMonth),
        fetchDailySummary(selectedMonth)
      ]);
      setTimeline(tl);
      setServices(sv);
      setRegions(rg);
      setDailySummary(dl);
    } catch (err: any) {
      console.error('Refresh error:', err);
    }
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  const handleProfileChange = async (profile: string, demoMode?: boolean) => {
    try {
      setLoading(true);
      await switchProfile(profile, demoMode);
      await loadData();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await logoutUser();
    setIsAuthenticated(false);
    setOverview(null);
  };

  const setPageAndHash = (page: string) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined' && window.location.hash !== `#${page}`) {
      window.history.replaceState(null, '', `#${page}`);
    }
  };

  const handleCategoryTabSelect = (cat: DeepDiveCategory) => {
    setSelectedCategory(cat);
    if (cat === 'Compute') setPageAndHash('compute');
    else if (cat === 'Storage') setPageAndHash('storage');
    else if (cat === 'Database') setPageAndHash('databases');
    else if (cat === 'Networking') setPageAndHash('datatransfer');
    else if (cat === 'AI & ML') setPageAndHash('ai');
  };

  const handleNavigate = (page: string, params?: Record<string, string>) => {
    setIsMobileMenuOpen(false);
    if (params?.service) {
      setSelectedService(params.service);
      setPageAndHash('serviceDetail');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (page === 'categories') {
      if (params?.category) {
        const cat = params.category.toLowerCase();
        if (cat.includes('storage')) {
          handleCategoryTabSelect('Storage');
        } else if (cat.includes('database') || cat.includes('db')) {
          handleCategoryTabSelect('Database');
        } else if (cat.includes('transfer') || cat.includes('network')) {
          handleCategoryTabSelect('Networking');
        } else if (cat.includes('ai') || cat.includes('bedrock') || cat.includes('ml')) {
          handleCategoryTabSelect('AI & ML');
        } else {
          handleCategoryTabSelect('Compute');
        }
      } else {
        handleCategoryTabSelect('Compute');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (page === 'compute') {
      setSelectedCategory('Compute');
    } else if (page === 'storage') {
      setSelectedCategory('Storage');
    } else if (page === 'databases') {
      setSelectedCategory('Database');
    } else if (page === 'datatransfer') {
      setSelectedCategory('Networking');
    } else if (page === 'ai') {
      setSelectedCategory('AI & ML');
    }
    setPageAndHash(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If verifying session, show clean loading state
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-300 space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
        <div className="text-sm font-semibold tracking-wide text-slate-400">
          Initializing AWS CostLens session...
        </div>
      </div>
    );
  }

  // If not logged in, render the secure Login Page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    if (loading && !overview) {
      return (
        <div className="flex flex-col items-center justify-center p-24 text-slate-400 space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Analyzing AWS Cost Explorer records & live resources safely...
          </div>
        </div>
      );
    }

    if (error && !overview) {
      return (
        <div className="p-8 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 max-w-lg mx-auto text-center space-y-3">
          <div className="text-xl font-bold">Failed to Connect to AWS</div>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => handleProfileChange('default', true)}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md"
          >
            Switch to Demo Mode
          </button>
        </div>
      );
    }

    if (!overview) return null;

    switch (currentPage) {
      case 'overview':
        return (
          <OverviewPage
            overview={overview}
            timeline={timeline}
            services={services}
            timelinePeriod={timelinePeriod}
            onPeriodChange={setTimelinePeriod}
            onNavigate={handleNavigate}
          />
        );

      case 'invoice':
        return <InvoiceReconciliationPage selectedMonth={selectedMonth} />;

      case 'inventory':
        return <InventoryPage selectedMonth={selectedMonth} />;

      case 'activity':
        return <ActivityPage />;

      case 'services':
        return (
          <ServicesPage
            services={services}
            onSelectService={(sName) => {
              setSelectedService(sName);
              setPageAndHash('serviceDetail');
            }}
          />
        );

      case 'serviceDetail':
        return (
          <ServiceDetailPage
            serviceName={selectedService}
            selectedMonth={selectedMonth}
            onBack={() => setPageAndHash('services')}
          />
        );

      case 'drilldown':
        return <DrillDownPage selectedMonth={selectedMonth} />;

      case 'regions':
        return <RegionsPage regions={regions} />;

      case 'daily':
        return dailySummary ? <DailyCostsPage dailySummary={dailySummary} /> : null;

      case 'ask':
        return (
          <AskQuestionPage
            onNavigate={handleNavigate}
            selectedMonth={selectedMonth}
            overview={overview}
            services={services}
          />
        );

      case 'categories':
      case 'compute':
        return (
          <CategoriesPage
            key="Compute"
            initialCategory="Compute"
            selectedMonth={selectedMonth}
            onSelectCategory={handleCategoryTabSelect}
          />
        );

      case 'storage':
        return (
          <CategoriesPage
            key="Storage"
            initialCategory="Storage"
            selectedMonth={selectedMonth}
            onSelectCategory={handleCategoryTabSelect}
          />
        );

      case 'databases':
        return (
          <CategoriesPage
            key="Database"
            initialCategory="Database"
            selectedMonth={selectedMonth}
            onSelectCategory={handleCategoryTabSelect}
          />
        );

      case 'datatransfer':
        return (
          <CategoriesPage
            key="Networking"
            initialCategory="Networking"
            selectedMonth={selectedMonth}
            onSelectCategory={handleCategoryTabSelect}
          />
        );

      case 'ai':
        return (
          <CategoriesPage
            key="AI & ML"
            initialCategory="AI & ML"
            selectedMonth={selectedMonth}
            onSelectCategory={handleCategoryTabSelect}
          />
        );

      case 'tags':
        return <TagsPage selectedMonth={selectedMonth} />;

      case 'accounts':
        return <AccountsPage selectedMonth={selectedMonth} />;

      case 'anomalies':
        return (
          <AnomaliesPage
            selectedMonth={selectedMonth}
            onSelectService={(sName) => {
              setSelectedService(sName);
              setPageAndHash('serviceDetail');
            }}
          />
        );

      case 'glossary':
        return <GlossaryPage />;

      case 'export':
        return (
          <ExportPage
            overview={overview}
            services={services}
            selectedMonth={selectedMonth}
          />
        );

      case 'settings':
        return (
          <SettingsPage
            authStatus={authStatus}
            onProfileChange={handleProfileChange}
            onRefreshAuth={(newStatus) => setAuthStatus(newStatus)}
          />
        );

      default:
        return (
          <OverviewPage
            overview={overview}
            timeline={timeline}
            services={services}
            timelinePeriod={timelinePeriod}
            onPeriodChange={setTimelinePeriod}
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        authStatus={authStatus}
        lastUpdated={overview?.lastUpdated || ''}
        availableMonths={availableMonths}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        onRefresh={handleRefresh}
        onProfileChange={handleProfileChange}
        onNavigate={handleNavigate}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentUser={currentUser}
        onLogout={handleLogout}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      <div className="flex-1 flex max-w-[1700px] w-full mx-auto">
        <Sidebar
          currentPage={currentPage}
          selectedCategory={selectedCategory}
          onNavigate={handleNavigate}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0 max-w-7xl mx-auto w-full">
          <ErrorBoundary onResetPage={() => handleNavigate('overview')}>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>

      <FloatingAskButton currentPage={currentPage} onNavigate={handleNavigate} />
    </div>
  );
}

