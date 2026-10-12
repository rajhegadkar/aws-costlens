import React from 'react';
import {
  LayoutDashboard,
  Layers,
  GitFork,
  Globe2,
  CalendarDays,
  Cpu,
  HardDrive,
  Database,
  ArrowLeftRight,
  Bot,
  Tags,
  Users,
  AlertTriangle,
  BookOpen,
  Download,
  ShieldCheck,
  Server,
  Receipt,
  Activity,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import type { DeepDiveCategory } from '../../../shared/types.js';

interface SidebarProps {
  currentPage: string;
  selectedCategory?: DeepDiveCategory;
  onNavigate: (page: string, params?: Record<string, string>) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  selectedCategory,
  onNavigate,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const NAV_ITEMS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, category: 'Core' },
    { id: 'ask', label: 'Ask CostLens (Q&A)', icon: Sparkles, category: 'Core', badge: 'Q&A' },
    { id: 'invoice', label: 'Bill & Reconciliation', icon: Receipt, category: 'Core' },
    { id: 'services', label: 'AWS Services', icon: Layers, category: 'Core' },
    { id: 'drilldown', label: 'Cost Drill-Down', icon: GitFork, category: 'Core' },
    { id: 'regions', label: 'Regions', icon: Globe2, category: 'Core' },
    { id: 'daily', label: 'Daily Costs', icon: CalendarDays, category: 'Core' },

    { id: 'inventory', label: 'Machine Names & Inventory', icon: Server, category: 'Cloud Resources' },
    { id: 'activity', label: 'IAM User Activity Logs', icon: Activity, category: 'Cloud Resources' },

    { id: 'compute', label: 'Compute', icon: Cpu, category: 'Deep Dives' },
    { id: 'storage', label: 'Storage', icon: HardDrive, category: 'Deep Dives' },
    { id: 'databases', label: 'Databases', icon: Database, category: 'Deep Dives' },
    { id: 'datatransfer', label: 'Data Transfer', icon: ArrowLeftRight, category: 'Deep Dives' },
    { id: 'ai', label: 'AI & Bedrock', icon: Bot, category: 'Deep Dives' },

    { id: 'tags', label: 'Cost Tags', icon: Tags, category: 'Allocation' },
    { id: 'accounts', label: 'Linked Accounts', icon: Users, category: 'Allocation' },

    { id: 'anomalies', label: 'Anomalies & Savings', icon: AlertTriangle, category: 'Insights' },
    { id: 'glossary', label: 'Plain English Glossary', icon: BookOpen, category: 'Insights' },

    { id: 'export', label: 'Export & Reports', icon: Download, category: 'System' },
    { id: 'settings', label: 'Safety & Permissions', icon: ShieldCheck, category: 'System' }
  ];

  const categories = ['Core', 'Cloud Resources', 'Deep Dives', 'Allocation', 'Insights', 'System'];

  const handleItemClick = (id: string) => {
    onNavigate(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const navContent = (
    <div className="space-y-6">
      {categories.map((cat) => {
        const items = NAV_ITEMS.filter((item) => item.category === cat);
        return (
          <div key={cat}>
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              {cat}
            </div>
            <nav className="space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isCategoryMatch =
                  (currentPage === 'categories' ||
                    currentPage === 'compute' ||
                    currentPage === 'storage' ||
                    currentPage === 'databases' ||
                    currentPage === 'datatransfer' ||
                    currentPage === 'ai') &&
                  ((item.id === 'compute' && (!selectedCategory || selectedCategory === 'Compute')) ||
                   (item.id === 'storage' && selectedCategory === 'Storage') ||
                   (item.id === 'databases' && selectedCategory === 'Database') ||
                   (item.id === 'datatransfer' && selectedCategory === 'Networking') ||
                   (item.id === 'ai' && selectedCategory === 'AI & ML'));

                const isActive = currentPage === item.id || isCategoryMatch;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="truncate flex-1 text-left">{item.label}</span>
                    {(item as any).badge && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30'
                      }`}>
                        {(item as any).badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 shrink-0 hidden md:block bg-slate-50/70 dark:bg-slate-900/70 border-r border-slate-200 dark:border-slate-800 p-4 min-h-[calc(100vh-4rem)]">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onCloseMobile}
          />

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full p-4 overflow-y-auto shadow-2xl flex flex-col z-10">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                Navigation
              </span>
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 pb-6">{navContent}</div>
          </div>
        </div>
      )}
    </>
  );
};
