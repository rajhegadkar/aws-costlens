import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  HelpCircle,
  Layers,
  Globe2,
  Cpu,
  HardDrive,
  Lightbulb,
  ShieldCheck
} from 'lucide-react';
import { fetchServiceDetail } from '../api/client.js';
import { ServiceDetailBreakdown } from '../../shared/types.js';
import { MetricCard } from '../components/common/MetricCard.js';
import { ExplainModal } from '../components/common/ExplainModal.js';

interface ServiceDetailPageProps {
  serviceName: string;
  selectedMonth?: string;
  onBack: () => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  serviceName,
  selectedMonth,
  onBack
}) => {
  const [detail, setDetail] = useState<ServiceDetailBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subcategories' | 'usageTypes' | 'operations' | 'regions'>('subcategories');
  const [explainModalOpen, setExplainModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchServiceDetail(serviceName, selectedMonth)
      .then((data) => {
        if (isMounted) {
          setDetail(data);
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
  }, [serviceName, selectedMonth]);

  if (loading || !detail) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <div className="animate-pulse flex flex-col items-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
          <span className="text-xs">Analyzing {serviceName} spending dimensions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Back button & Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Service Detail Analysis
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {detail.serviceName}
          </h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Current Month Spend"
          value={`$${detail.totalCost.toFixed(2)}`}
          subtitle={`Previous month: $${detail.previousMonthCost.toFixed(2)}`}
          changePercent={detail.changePercent}
          changeDirection={detail.changePercent > 0 ? 'up' : 'down'}
          icon={<DollarSign className="w-5 h-5 text-brand-500" />}
        />
        <MetricCard
          title="MoM Spending Trend"
          value={detail.changePercent > 0 ? `+${detail.changePercent}%` : `${detail.changePercent}%`}
          subtitle={detail.changePercent > 0 ? 'Increased vs last month' : 'Savings vs last month'}
          icon={<TrendingUp className="w-5 h-5 text-indigo-500" />}
        />
        <div
          onClick={() => setExplainModalOpen(true)}
          className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 cursor-pointer hover:bg-amber-500/15 transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Plain English Guide
            </div>
            <div className="text-base font-extrabold mt-1">
              "What is {detail.serviceName.split(' - ')[0]}?"
            </div>
            <div className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Click to view non-technical explanation
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Plain English Explanation Summary Card */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start space-x-3.5">
        <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            What is this service and why am I paying for it?
          </div>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            {detail.explanation}
          </p>
        </div>
      </div>

      {/* Detailed Dimensions Breakdown */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Where is the money going?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Explore deep cost components across usage types, operations, and regions.
            </p>
          </div>

          {/* Dimension Tabs */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-700/60 rounded-xl">
            {[
              { id: 'subcategories', label: 'Components' },
              { id: 'usageTypes', label: 'Usage Types' },
              { id: 'operations', label: 'Operations' },
              { id: 'regions', label: 'Regions' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: Subcategories */}
        {activeTab === 'subcategories' && (
          <div className="space-y-3 pt-2">
            {detail.subcategories.map((sub, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {sub.name}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold">
                      {sub.percent}% of service
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {sub.explanation}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    ${sub.cost.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Usage Types */}
        {activeTab === 'usageTypes' && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Usage Type</th>
                  <th className="py-2.5 px-3">Explanation</th>
                  <th className="py-2.5 px-3 text-right">Cost</th>
                  <th className="py-2.5 px-3 text-right">% of Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {detail.usageTypes.map((u, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-3 font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                      {u.usageType}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400">
                      {u.explanation}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      ${u.cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-300">
                      {u.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Operations */}
        {activeTab === 'operations' && (
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">AWS Operation</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Cost</th>
                  <th className="py-2.5 px-3 text-right">% of Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {detail.operations.map((op, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {op.operation}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400">
                      {op.explanation}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      ${op.cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-300">
                      {op.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: Regions */}
        {activeTab === 'regions' && (
          <div className="space-y-3 pt-2">
            {detail.regions.map((reg, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {reg.regionName}
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {reg.region}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    ${reg.cost.toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {reg.percent}% of service
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExplainModal
        isOpen={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        title={detail.serviceName}
        amount={detail.totalCost}
        serviceName={detail.serviceName}
        subcategories={detail.subcategories}
      />
    </div>
  );
};
