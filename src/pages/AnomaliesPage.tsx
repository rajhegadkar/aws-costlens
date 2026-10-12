import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import { fetchAnomalies, fetchSavings } from '../api/client.js';
import { CostAnomaly, CostSavings } from '../../shared/types.js';

interface AnomaliesPageProps {
  onSelectService: (serviceName: string) => void;
  selectedMonth?: string;
}

export const AnomaliesPage: React.FC<AnomaliesPageProps> = ({ onSelectService, selectedMonth }) => {
  const [anomalies, setAnomalies] = useState<CostAnomaly[]>([]);
  const [savings, setSavings] = useState<CostSavings[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAnomalies(selectedMonth), fetchSavings(selectedMonth)])
      .then(([aData, sData]) => {
        setAnomalies(aData);
        setSavings(sData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Scanning for spending spikes and savings...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Cost Anomalies & Savings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Automated statistical detection of sudden spending spikes, plus positive cost reductions ("Good News").
        </p>
      </div>

      {/* Section 1: Cost Spikes & Anomalies */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Unusual Spending Spikes Detected
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {anomalies.map((anom) => (
            <div
              key={anom.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-amber-200/80 dark:border-amber-900/40 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                    {anom.deviationMultiplier}× Higher Than Avg
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {anom.date}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-3">
                  {anom.title}
                </h3>
                <div className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                  {anom.service}
                </div>

                <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/30 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {anom.explanation}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Day's Spend:</div>
                  <div className="text-base font-black text-rose-600 dark:text-rose-400">
                    ${anom.currentCost.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-400">(avg: ${anom.expectedCost.toFixed(2)})</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectService(anom.service)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-brand-600 hover:text-white transition-colors"
                  title="Drill into this service"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Good News / Savings Detection */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Good News — Cost Reductions & Savings
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {savings.map((sav) => (
            <div
              key={sav.id}
              className="p-6 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                  ↓ {sav.savedPercent.toFixed(1)}% Saved
                </span>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                  -${sav.savedAmount.toFixed(2)} / mo
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {sav.service}
              </h3>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {sav.explanation}
              </p>

              <div className="pt-2 text-[11px] text-slate-400">
                Last month: ${sav.previousCost.toFixed(2)} → This month: ${sav.currentCost.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
