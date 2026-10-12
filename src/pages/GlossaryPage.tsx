import React, { useState } from 'react';
import { BookOpen, Search, HelpCircle, Info } from 'lucide-react';
import {
  AWS_TERMINOLOGY_MAP,
  SERVICE_EXPLANATIONS,
  COMMON_USAGE_TYPES
} from '../../shared/explanationDictionary.js';

export const GlossaryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const terms = Object.values(AWS_TERMINOLOGY_MAP);
  const services = Object.entries(SERVICE_EXPLANATIONS);
  const usageTypes = Object.entries(COMMON_USAGE_TYPES);

  const filteredTerms = terms.filter(
    (t) =>
      t.friendlyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.technicalTerm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.simpleExplanation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredServices = services.filter(
    ([k, v]) =>
      k.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.friendlyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.shortSummary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          AWS Billing Dictionary (Plain English)
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Decodes confusing cloud billing codes, metrics, and abbreviations into simple human terms.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search technical term or service..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-brand-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none shadow-sm"
        />
      </div>

      {/* Section 1: Billing Concepts & Metrics */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Billing Concepts & Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTerms.map((t) => (
            <div
              key={t.technicalTerm}
              className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {t.friendlyName}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                  {t.technicalTerm}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.simpleExplanation}
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-400">
                <strong>Why it costs money:</strong> {t.whyItCostsMoney}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Services Decoded */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          AWS Services Explained
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map(([key, s]) => (
            <div
              key={key}
              className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {s.friendlyName}
                  </h3>
                  <span className="font-mono text-[11px] text-slate-400 truncate block max-w-xs">
                    {key}
                  </span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                  {s.category}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {s.detailedExplanation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
