import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Layers,
  Globe2,
  Server,
  Zap,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { MetricCard } from '../components/common/MetricCard.js';
import { ExplainModal } from '../components/common/ExplainModal.js';
import {
  DashboardOverview,
  CostTimelinePoint,
  ServiceCostItem
} from '../../shared/types.js';

interface OverviewPageProps {
  overview: DashboardOverview;
  timeline: CostTimelinePoint[];
  services: ServiceCostItem[];
  timelinePeriod: 'daily' | 'weekly' | 'monthly';
  onPeriodChange: (p: 'daily' | 'weekly' | 'monthly') => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  overview,
  timeline,
  services,
  timelinePeriod,
  onPeriodChange,
  onNavigate
}) => {
  const [explainModal, setExplainModal] = useState<{
    isOpen: boolean;
    title: string;
    amount?: number;
    serviceName?: string;
    customExplanation?: string;
  }>({
    isOpen: false,
    title: ''
  });

  const currencySymbol = overview.currency === 'USD' ? '$' : `${overview.currency} `;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Read-Only Guarantee Top Banner */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              100% Read-Only Safety Guarantee
            </div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              This dashboard only reads cost data and metadata. It has zero ability to create, stop, or delete AWS resources.
            </div>
          </div>
        </div>
        <div className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
          Status: ACTIVE & ENFORCED
        </div>
      </div>

      {/* Hero Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          AWS Spend Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Real-time, plain-English breakdown of your AWS cloud billing.
        </p>
      </div>

      {/* Auto-Generated Dashboard Insights */}
      {overview.insights && overview.insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {overview.insights.map((ins) => {
            const isWarning = ins.type === 'warning' || ins.type === 'increase';
            const isSavings = ins.type === 'savings';
            return (
              <div
                key={ins.id}
                className={`p-4 rounded-2xl border transition-all flex items-start space-x-3.5 ${
                  isSavings
                    ? 'bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-200'
                    : isWarning
                    ? 'bg-amber-500/5 border-amber-500/20 dark:bg-amber-950/20 dark:border-amber-900/40 text-amber-950 dark:text-amber-200'
                    : 'bg-brand-500/5 border-brand-500/20 dark:bg-brand-950/20 dark:border-brand-900/40 text-slate-900 dark:text-slate-200'
                }`}
              >
                <div className="mt-0.5 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm shrink-0">
                  {isSavings ? (
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider opacity-80">
                    {ins.title}
                  </div>
                  <div className="text-sm font-medium mt-0.5 leading-relaxed">
                    {ins.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Month */}
        <MetricCard
          title="Current Month Spend"
          value={`${currencySymbol}${overview.currentMonthSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`Previous month: ${currencySymbol}${overview.previousMonthSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          changePercent={overview.spendChangePercent}
          changeDirection={overview.spendChangePercent > 0 ? 'up' : 'down'}
          invertChangeColor={true}
          tooltip="Total unblended amount invoiced for the current month to date"
          icon={<DollarSign className="w-5 h-5 text-brand-500" />}
        />

        {/* Card 2: Projected Month-End */}
        <MetricCard
          title="Projected Month-End"
          value={`${currencySymbol}${overview.projectedMonthEnd.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          subtitle={`Expected range: ${currencySymbol}${overview.projectedRange.min.toLocaleString('en-US', { minimumFractionDigits: 0 })} – ${currencySymbol}${overview.projectedRange.max.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          badgeText="Estimate"
          badgeColor="amber"
          tooltip="Estimated month-end bill based on your daily run-rate and historical spending patterns"
          icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
        />

        {/* Card 3: Average Daily Spend */}
        <MetricCard
          title="Average Daily Spend"
          value={`${currencySymbol}${overview.avgDailySpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle={`Today's estimated run-rate: ${currencySymbol}${overview.todayEstimated.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          tooltip="Average dollars spent per day in the current billing period"
          icon={<Calendar className="w-5 h-5 text-indigo-500" />}
        />

        {/* Card 4: Top Service */}
        <div
          onClick={() => onNavigate('services', { service: overview.topService.name })}
          className="cursor-pointer"
        >
          <MetricCard
            title="Highest Cost Service"
            value={`${currencySymbol}${overview.topService.amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
            subtitle={`${overview.topService.name.split(' - ')[0]} (${overview.topService.percentage}% of total)`}
            badgeText="Top Driver"
            badgeColor="rose"
            tooltip="Click to view detailed breakdown for your highest-cost service"
            icon={<Server className="w-5 h-5 text-rose-500" />}
          />
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Top Region */}
        <div
          onClick={() => onNavigate('regions')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm cursor-pointer hover:border-brand-500 transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Top Spending Region
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {overview.topRegion.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {currencySymbol}{overview.topRegion.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({overview.topRegion.percentage}% of total)
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Globe2 className="w-5 h-5" />
          </div>
        </div>

        {/* Active Services Generating Charges */}
        <div
          onClick={() => onNavigate('services')}
          className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-sm cursor-pointer hover:border-brand-500 transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Active Charging Services
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              {overview.activeServicesCount} AWS Services
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click to view complete services directory
            </div>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Quick Action: Explain My Costs */}
        <div
          onClick={() =>
            setExplainModal({
              isOpen: true,
              title: 'Total AWS Bill Explanation',
              amount: overview.currentMonthSpend,
              customExplanation: `Your current monthly spend of $${overview.currentMonthSpend.toFixed(2)} spans ${overview.activeServicesCount} active AWS services. Your largest cost driver is ${overview.topService.name} ($${overview.topService.amount.toFixed(2)}, ${overview.topService.percentage}% of total spend), and your highest-spend region is ${overview.topRegion.name} ($${overview.topRegion.amount.toFixed(2)}, ${overview.topRegion.percentage}% of total spend).`
            })
          }
          className="p-5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-sm cursor-pointer hover:opacity-95 transition-all flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-100">
              Non-Technical Assistant
            </div>
            <div className="text-lg font-bold mt-1">
              "Explain This Bill"
            </div>
            <div className="text-xs text-brand-100/90 mt-0.5">
              Plain-English guidance on where money goes
            </div>
          </div>
          <div className="p-3 rounded-xl bg-white/20 text-white backdrop-blur-sm">
            <HelpCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FinOps Q&A Quick Access Helper Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-white dark:to-slate-800/80 border border-orange-200/80 dark:border-orange-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-500/20 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              Interactive FinOps Q&A Assistant
            </div>
            <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              Have questions about this month's bill, EC2 servers, or storage spend?
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate('ask')}
          className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center space-x-2 shrink-0"
        >
          <span>Ask CostLens Anything</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cost Timeline Chart Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Spending Timeline & Trends
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Hover over any point to inspect service breakdowns.
            </p>
          </div>

          {/* Period Toggles: Daily, Weekly, Monthly */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600 self-start sm:self-auto">
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => onPeriodChange(period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  timelinePeriod === period
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorEc2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => {
                  if (timelinePeriod === 'daily') {
                    const parts = val.split('-');
                    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
                  }
                  return val;
                }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => `$${val}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as CostTimelinePoint;
                  return (
                    <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs min-w-[200px]">
                      <div className="font-bold text-slate-300 border-b border-slate-800 pb-1.5 mb-2">
                        {label}
                      </div>
                      <div className="flex justify-between font-extrabold text-sm text-brand-400 mb-2">
                        <span>Total Cost:</span>
                        <span>${data.total.toFixed(2)}</span>
                      </div>
                      <div className="space-y-1 text-slate-400">
                        {Object.entries(data.services || {}).map(([sName, sCost]) => (
                          <div key={sName} className="flex justify-between">
                            <span className="truncate max-w-[120px]">{sName}:</span>
                            <span className="text-white font-medium">${sCost.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTotal)"
                name="Total Cost"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Services Mini-Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Top Cost Contributors
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Services generating the majority of your bill this month.
            </p>
          </div>
          <button
            onClick={() => onNavigate('services')}
            className="flex items-center space-x-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 hover:underline"
          >
            <span>View All Services</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3">Service</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Current Month</th>
                <th className="py-3 px-3 text-right">MoM Change</th>
                <th className="py-3 px-3 text-right">% of Total</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {services.slice(0, 5).map((s) => {
                const isPositive = s.changeAmount > 0;
                return (
                  <tr
                    key={s.serviceName}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                    onClick={() => onNavigate('services', { service: s.serviceName })}
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {s.serviceName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                        {s.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                      ${s.currentMonth.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                          isPositive
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                        }`}
                      >
                        {isPositive ? `+$${s.changeAmount.toFixed(2)}` : `-$${Math.abs(s.changeAmount).toFixed(2)}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                      {s.percentOfTotal}%
                    </td>
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() =>
                          setExplainModal({
                            isOpen: true,
                            title: s.serviceName,
                            amount: s.currentMonth,
                            serviceName: s.serviceName
                          })
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                        title="Explain this cost"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explain Cost Modal */}
      <ExplainModal
        isOpen={explainModal.isOpen}
        onClose={() => setExplainModal({ isOpen: false, title: '' })}
        title={explainModal.title}
        amount={explainModal.amount}
        serviceName={explainModal.serviceName}
        customExplanation={explainModal.customExplanation}
      />
    </div>
  );
};
