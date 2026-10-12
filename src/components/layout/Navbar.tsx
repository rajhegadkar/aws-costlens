import React, { useState, useRef, useEffect } from 'react';
import {
  RefreshCw,
  Sun,
  Moon,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
  ShieldCheck,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { ReadOnlyBadge } from '../common/ReadOnlyBadge.js';
import { MonthSelector } from '../common/MonthSelector.js';
import { AuthStatus, MonthOption } from '../../../shared/types.js';

interface NavbarProps {
  authStatus: AuthStatus | null;
  lastUpdated: string;
  availableMonths: MonthOption[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onRefresh: () => Promise<void>;
  onProfileChange: (profile: string, demoMode?: boolean) => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  currentUser?: string | null;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  authStatus,
  lastUpdated,
  availableMonths,
  selectedMonth,
  onMonthChange,
  onRefresh,
  onProfileChange,
  onNavigate,
  darkMode,
  setDarkMode,
  currentUser = 'admin',
  onLogout,
  onToggleMobileMenu,
  isMobileMenuOpen = false
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const actionsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        actionsContainerRef.current &&
        !actionsContainerRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
        setShowUserMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowProfileMenu(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleRefreshClick = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : 'Just now';

  return (
    <header className="sticky top-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu Toggle + App Logo & Read-Only Badge */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Mobile Hamburger Button */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-150 dark:hover:bg-slate-800 md:hidden transition-colors"
              title="Open Navigation Menu"
              aria-label="Toggle navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div
            className="flex items-center space-x-2.5 cursor-pointer"
            onClick={() => onNavigate('overview')}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white font-black text-base sm:text-lg shrink-0">
              ☁
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base">
                AWS Cost<span className="text-orange-500 font-black">Lens</span>
              </span>
              <span className="block text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                FinOps Analytics
              </span>
            </div>
          </div>

          <div className="hidden xl:block">
            <ReadOnlyBadge />
          </div>
        </div>

        {/* Center: Clean Month Selector with comfortable breathing room */}
        <div className="flex items-center justify-center flex-1 min-w-0 px-1 sm:px-3">
          <MonthSelector
            availableMonths={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={onMonthChange}
          />
        </div>

        {/* Right: Actions, Profile, Refresh, Dark Mode, User */}
        <div ref={actionsContainerRef} className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          {/* Connection Status Pill / Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowUserMenu(false);
              }}
              className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all"
            >
              {authStatus?.isDemoMode ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="hidden sm:inline">Demo Mode</span>
                  <span className="sm:hidden text-[10px]">Demo</span>
                </>
              ) : authStatus?.isAuthenticated ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="truncate max-w-[90px] sm:max-w-[130px]">
                    {authStatus.accountId ? `Acct: ${authStatus.accountId}` : authStatus.profile || 'Connected'}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="hidden sm:inline">No AWS Key</span>
                  <span className="sm:hidden text-[10px]">Offline</span>
                </>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="pb-2 mb-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    AWS Connection Settings
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {authStatus?.arn ? authStatus.arn : 'Select AWS profile or toggle demo mode'}
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onProfileChange('default', true);
                      setShowProfileMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between ${
                      authStatus?.isDemoMode
                        ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>🎯 Demo Mode (Sample Data)</span>
                    {authStatus?.isDemoMode && <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" />}
                  </button>

                  <button
                    onClick={() => {
                      onProfileChange('default', false);
                      setShowProfileMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between ${
                      !authStatus?.isDemoMode
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>⚡ Live AWS Credential Chain</span>
                    {!authStatus?.isDemoMode && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full text-center text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline py-1"
                  >
                    View Permissions & Setup Guide →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefreshClick}
            disabled={refreshing}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 disabled:opacity-50 transition-all shadow-sm group"
            title="Invalidate cache and retrieve latest read-only data from AWS"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 ${
                refreshing ? 'animate-spin text-orange-500' : ''
              }`}
            />
            <span className="hidden md:inline">Refresh</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 transition-colors"
            title="Toggle Dark / Light theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Authenticated User Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowProfileMenu(false);
              }}
              className="flex items-center space-x-1 sm:space-x-1.5 p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 transition-all"
              title="User Account"
            >
              <div className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs uppercase">
                {currentUser?.charAt(0) || 'A'}
              </div>
              <span className="hidden md:inline font-bold">{currentUser || 'admin'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 p-2 bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Signed in as <span className="text-orange-500">{currentUser}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Local FinOps Session
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('settings');
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <span>Safety & Permissions</span>
                  </button>

                  {onLogout && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Log Out</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
