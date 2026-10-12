import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, HelpCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  changePercent?: number;
  changeDirection?: 'up' | 'down' | 'flat';
  invertChangeColor?: boolean; // For costs: up is red (bad), down is green (good/savings)
  icon?: React.ReactNode;
  tooltip?: string;
  badgeText?: string;
  badgeColor?: 'blue' | 'emerald' | 'rose' | 'amber';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  changePercent,
  changeDirection,
  invertChangeColor = true,
  icon,
  tooltip,
  badgeText,
  badgeColor = 'blue'
}) => {
  // Determine color based on FinOps context
  let changeClass = 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
  let IconComponent = Minus;

  if (changeDirection === 'up' || (changePercent !== undefined && changePercent > 0)) {
    IconComponent = ArrowUpRight;
    changeClass = invertChangeColor
      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40'
      : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40';
  } else if (changeDirection === 'down' || (changePercent !== undefined && changePercent < 0)) {
    IconComponent = ArrowDownRight;
    changeClass = invertChangeColor
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40'
      : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40';
  }

  const badgeColorMap = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          {tooltip && (
            <div className="relative group/tip" title={tooltip}>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer" />
            </div>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {value}
        </div>

        {changePercent !== undefined && (
          <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${changeClass}`}>
            <IconComponent className="w-3.5 h-3.5" />
            <span>{Math.abs(changePercent)}%</span>
          </div>
        )}

        {badgeText && (
          <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${badgeColorMap[badgeColor]}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
};
