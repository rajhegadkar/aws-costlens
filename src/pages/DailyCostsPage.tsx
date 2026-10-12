import React from 'react';
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { DailyCostSummary } from '../../shared/types.js';
import { MetricCard } from '../components/common/MetricCard.js';

interface DailyCostsPageProps {
  dailySummary: DailyCostSummary;
}

export const DailyCostsPage: React.FC<DailyCostsPageProps> = ({ dailySummary }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Daily Spending & Burn Rate
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track day-by-day AWS charges and identify high-spending weekdays versus weekends.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Estimated Spend"
          value={`$${dailySummary.todayCost.toFixed(2)}`}
          subtitle="Estimated run-rate for today"
          icon={<DollarSign className="w-5 h-5 text-brand-500" />}
        />
        <MetricCard
          title="Yesterday's Total"
          value={`$${dailySummary.yesterdayCost.toFixed(2)}`}
          subtitle="Finalized billed cost for yesterday"
          icon={<Clock className="w-5 h-5 text-indigo-500" />}
        />
        <MetricCard
          title="7-Day Moving Average"
          value={`$${dailySummary.sevenDayAverage.toFixed(2)}`}
          subtitle="Average daily spend over the past week"
          icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
        />
        <MetricCard
          title="30-Day Moving Average"
          value={`$${dailySummary.thirtyDayAverage.toFixed(2)}`}
          subtitle="Long-term daily baseline"
          icon={<CalendarDays className="w-5 h-5 text-purple-500" />}
        />
      </div>

      {/* High / Low Day Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Highest Spending Day (Last 30 Days)
            </div>
            <div className="text-xl font-black text-rose-950 dark:text-rose-200 mt-0.5">
              ${dailySummary.highestDay.amount.toFixed(2)}
            </div>
            <div className="text-xs text-rose-700/80 dark:text-rose-400">
              Occurred on: {dailySummary.highestDay.date}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-200/50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Lowest Spending Day (Last 30 Days)
            </div>
            <div className="text-xl font-black text-emerald-950 dark:text-emerald-200 mt-0.5">
              ${dailySummary.lowestDay.amount.toFixed(2)}
            </div>
            <div className="text-xs text-emerald-700/80 dark:text-emerald-400">
              Occurred on: {dailySummary.lowestDay.date}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-200/50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Daily Bar Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Daily Cost History (Last 30 Days)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bar height represents total AWS spending for each individual calendar day.
          </p>
        </div>

        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailySummary.dailyPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={(val) => {
                  const parts = val.split('-');
                  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : val;
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
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs min-w-[180px]">
                      <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1.5 flex justify-between">
                        <span>{label}</span>
                        <span className="text-brand-400">{item.dayOfWeek}</span>
                      </div>
                      <div className="text-base font-black text-white">
                        ${item.amount.toFixed(2)}
                      </div>
                      {item.isToday && (
                        <span className="mt-1 inline-block text-[10px] text-amber-400 font-bold uppercase">
                          (Today's estimated run-rate)
                        </span>
                      )}
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="amount"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
