import React from 'react';
import { Globe2, MapPin, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { RegionCostItem } from '../../shared/types.js';

interface RegionsPageProps {
  regions: RegionCostItem[];
}

export const RegionsPage: React.FC<RegionsPageProps> = ({ regions }) => {
  const topRegion = regions[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Regional AWS Spend
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Discover which physical geographic data centers are hosting your services and generating charges.
        </p>
      </div>

      {/* Top Region Banner */}
      {topRegion && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-sm text-blue-300">
              <Globe2 className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Primary Regional Hub
              </div>
              <div className="text-2xl font-black mt-0.5">
                {topRegion.regionName} ({topRegion.regionCode})
              </div>
              <div className="text-xs text-blue-200 mt-1">
                Generates {topRegion.percentOfTotal}% of your entire cloud bill (${topRegion.cost.toFixed(2)} this month)
              </div>
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-3xl font-black">
              ${topRegion.cost.toFixed(2)}
            </div>
            <div className="text-xs text-blue-300">
              {topRegion.country}
            </div>
          </div>
        </div>
      )}

      {/* Visual Regional Distribution Bars */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Geographic Spending Distribution
        </h3>
        <div className="space-y-3">
          {regions.map((reg) => (
            <div key={reg.regionCode} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                  <span>{reg.country}</span>
                  <span className="font-bold">{reg.regionName}</span>
                  <span className="text-slate-400 font-mono">({reg.regionCode})</span>
                </span>
                <span className="text-slate-900 dark:text-white font-extrabold">
                  ${reg.cost.toFixed(2)} ({reg.percentOfTotal}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, reg.percentOfTotal)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regional Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Region Code</th>
                <th className="py-3.5 px-4">Location / Friendly Name</th>
                <th className="py-3.5 px-4 text-right">Current Month</th>
                <th className="py-3.5 px-4 text-right">Previous Month</th>
                <th className="py-3.5 px-4 text-right">% of Total</th>
                <th className="py-3.5 px-4 text-right">MoM Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {regions.map((reg) => (
                <tr key={reg.regionCode} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                    {reg.regionCode}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {reg.regionName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {reg.country}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-white">
                    ${reg.cost.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-500 dark:text-slate-400">
                    ${reg.previousCost.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-800 dark:text-slate-200">
                    {reg.percentOfTotal}%
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                        reg.changePercent > 0
                          ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                          : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                      }`}
                    >
                      {reg.changePercent > 0 ? `+${reg.changePercent}%` : `${reg.changePercent}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
