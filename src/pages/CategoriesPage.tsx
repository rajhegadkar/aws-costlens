import React, { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  Database,
  ArrowLeftRight,
  Bot,
  DollarSign,
  Lightbulb,
  CheckCircle2,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { fetchCategory } from '../api/client.js';
import { CategoryBreakdown, DeepDiveCategory } from '../../shared/types.js';
import { MetricCard } from '../components/common/MetricCard.js';

interface CategoriesPageProps {
  initialCategory?: DeepDiveCategory;
  selectedMonth?: string;
  onSelectCategory?: (cat: DeepDiveCategory) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  initialCategory = 'Compute',
  selectedMonth,
  onSelectCategory
}) => {
  const [selectedCat, setSelectedCat] = useState<DeepDiveCategory>(initialCategory);
  const [breakdown, setBreakdown] = useState<CategoryBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync state if initialCategory changes via navigation
  useEffect(() => {
    if (initialCategory) {
      setSelectedCat(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchCategory(selectedCat, selectedMonth)
      .then((data) => {
        if (isMounted) {
          setBreakdown(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCat, selectedMonth]);

  const CATEGORY_TABS: { id: DeepDiveCategory; label: string; icon: any }[] = [
    { id: 'Compute', label: '⚡ Compute', icon: Cpu },
    { id: 'Storage', label: '💾 Storage', icon: HardDrive },
    { id: 'Database', label: '🗄️ Database', icon: Database },
    { id: 'Networking', label: '🌐 Data Transfer', icon: ArrowLeftRight },
    { id: 'AI & ML', label: '🤖 AI & Bedrock', icon: Bot }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Cost Category Deep-Dives
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Targeted analysis for Compute, Storage, Database, Data Transfer, and Generative AI (Bedrock/Claude) charges.
        </p>
      </div>

      {/* Responsive Tabs */}
      <div className="overflow-x-auto pb-1 max-w-full">
        <div className="flex items-center space-x-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl w-max">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedCat(tab.id);
                onSelectCategory?.(tab.id);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCat === tab.id
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !breakdown ? (
        <div className="p-12 text-center text-slate-400 animate-pulse">
          Loading {selectedCat} analysis...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header KPI Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title={`${breakdown.category} Total Spend`}
              value={`$${breakdown.totalCost.toFixed(2)}`}
              subtitle={`${breakdown.percentOfTotalSpend}% of your entire monthly AWS bill`}
              icon={<DollarSign className="w-5 h-5 text-brand-500" />}
            />

            <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col justify-center">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Non-Technical Summary
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
                {breakdown.plainEnglishGuide}
              </p>
            </div>
          </div>

          {/* Service & Component Breakdowns */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Contributing Services & Components
            </h2>

            {breakdown.services.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 text-center text-sm text-slate-500 dark:text-slate-400">
                No charges recorded in the <strong>{breakdown.category}</strong> category for this billing period.
              </div>
            ) : (
              breakdown.services.map((s, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {s.serviceName}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {s.percentOfCategory}% of {breakdown.category} category spend
                      </span>
                    </div>
                    <div className="text-xl font-black text-slate-900 dark:text-white">
                      ${s.cost.toFixed(2)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {s.components.map((comp, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 space-y-1"
                      >
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {comp.name}
                          </span>
                          <span className="text-sm font-extrabold text-brand-600 dark:text-brand-400">
                            ${comp.cost.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {comp.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actionable Recommendations */}
          <div className="p-6 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-3">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-200">
                Safe Cost Optimization Opportunities ({breakdown.category})
              </h3>
            </div>
            <ul className="space-y-2">
              {breakdown.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start space-x-2 text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
