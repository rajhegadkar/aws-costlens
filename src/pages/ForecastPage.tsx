import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sparkles,
  Calendar,
  Layers,
  Sliders,
  DollarSign,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { fetchCostForecast } from '../api/client.js';
import { CostForecastReport } from '../../shared/types.js';
import { useCurrency } from '../context/CurrencyContext.js';

export const ForecastPage: React.FC = () => {
  const [forecast, setForecast] = useState<CostForecastReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekendSavingsScenario, setWeekendSavingsScenario] = useState(false);
  const [additionalServersScenario, setAdditionalServersScenario] = useState(0); // 0, 1, 2, 3
  const { formatCurrency, convertAmount, activeConfig } = useCurrency();

  useEffect(() => {
    fetchCostForecast()
      .then(data => {
        setForecast(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load forecast:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !forecast) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-sm font-semibold">Calculating run-rate projections and confidence intervals...</div>
      </div>
    );
  }

  // Calculate Scenario Modifiers
  const scenarioMonthlyDelta =
    (weekendSavingsScenario ? -28.50 : 0) +
    (additionalServersScenario * 32.40);

  const adjustedProjectedTotal = Math.max(0, forecast.projectedMonthEnd + scenarioMonthlyDelta);
  const adjustedMin = Math.max(0, forecast.confidenceInterval.min + scenarioMonthlyDelta);
  const adjustedMax = Math.max(0, forecast.confidenceInterval.max + scenarioMonthlyDelta);

  // Prepare chart data with currency conversion
  const chartData = forecast.dailyPoints.map(p => ({
    date: p.date.slice(5), // MM-DD
    actual: p.actualSpend !== undefined ? convertAmount(p.actualSpend) : null,
    projected: p.projectedSpend !== undefined ? convertAmount(p.projectedSpend) : null,
    confidenceRange: p.maxConfidence !== undefined && p.minConfidence !== undefined
      ? [convertAmount(p.minConfidence), convertAmount(p.maxConfidence)]
      : null
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Cost Forecasting & Projections
          </h1>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
            V3.0
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Predictive machine run-rate projection for {forecast.billingPeriod} with statistical confidence intervals.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expected Month-End Total */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider opacity-90">
              Projected Month-End
            </span>
            <Sparkles className="w-5 h-5 opacity-90" />
          </div>
          <div className="text-3xl sm:text-4xl font-black tracking-tight">
            {formatCurrency(adjustedProjectedTotal)}
          </div>
          <div className="text-xs font-medium opacity-90 flex items-center space-x-1">
            {forecast.projectedGrowthPercent >= 0 ? (
              <span className="flex items-center text-amber-200 font-bold">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                +{forecast.projectedGrowthPercent}%
              </span>
            ) : (
              <span className="flex items-center text-emerald-200 font-bold">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                {forecast.projectedGrowthPercent}%
              </span>
            )}
            <span>vs previous month</span>
          </div>
        </div>

        {/* Current Month-to-Date */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Spent To Date</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(forecast.currentMonthSpend)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Day {forecast.daysElapsed} of {forecast.daysInMonth} days elapsed
          </div>
        </div>

        {/* Daily Burn Rate */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Daily Run-Rate</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(forecast.runRateDaily)}
            <span className="text-xs font-normal text-slate-400">/day</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {forecast.daysInMonth - forecast.daysElapsed} days remaining in cycle
          </div>
        </div>

        {/* Confidence Interval */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Confidence Range</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white leading-tight">
            {formatCurrency(adjustedMin)} – {formatCurrency(adjustedMax)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Conservative (-10%) to Peak (+18%)
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Daily Spend Trajectory & Forecast Line
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Solid line indicates recorded daily charges; dotted line projects remainder of cycle.
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-slate-300">Actual Spend</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-slate-600 dark:text-slate-300">Projected Run-Rate</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(val) => `${activeConfig.symbol}${val}`}
              />
              <Tooltip
                formatter={(value: any) => [`${activeConfig.symbol}${Number(value).toFixed(2)}`, '']}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px'
                }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 3, fill: '#10b981' }}
                connectNulls={false}
                name="Actual Spend"
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2, fill: '#6366f1' }}
                name="Projected"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* "What-If" Scenario Simulator */}
      <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-brand-600" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            "What-If" FinOps Scenario Sandbox
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Simulate architectural changes or schedule policies to see immediate impact on projected month-end bill.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Toggle: Weekend Server Shutdown */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Turn Off Staging / QA On Weekends
              </div>
              <div className="text-[11px] text-slate-400">
                Saves ~64 hours of compute per instance each weekend
              </div>
            </div>
            <button
              onClick={() => setWeekendSavingsScenario(!weekendSavingsScenario)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                weekendSavingsScenario
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {weekendSavingsScenario ? '✓ Applied (-$28.50)' : 'Apply Scenario'}
            </button>
          </div>

          {/* Stepper: Additional Compute Capacity */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Simulate Adding New Workloads
              </div>
              <div className="text-[11px] text-slate-400">
                Each t3.large adds approx. +$32.40/mo
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAdditionalServersScenario(Math.max(0, additionalServersScenario - 1))}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm"
              >
                -
              </button>
              <span className="text-xs font-black px-1 text-slate-900 dark:text-white">
                +{additionalServersScenario} VMs
              </span>
              <button
                onClick={() => setAdditionalServersScenario(Math.min(5, additionalServersScenario + 1))}
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {scenarioMonthlyDelta !== 0 && (
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
            <span>
              Net Scenario Impact: <strong className="font-bold">{scenarioMonthlyDelta > 0 ? `+${formatCurrency(scenarioMonthlyDelta)}` : formatCurrency(scenarioMonthlyDelta)}</strong> / mo
            </span>
            <button
              onClick={() => {
                setWeekendSavingsScenario(false);
                setAdditionalServersScenario(0);
              }}
              className="text-[11px] underline font-bold"
            >
              Reset to Base Forecast
            </button>
          </div>
        )}
      </div>

      {/* Key Cost Drivers */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Key Projected Cost Drivers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forecast.keyDrivers.map((driver, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {driver.serviceName}
                </span>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(driver.projectedCost)} proj.
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {driver.driverSummary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
