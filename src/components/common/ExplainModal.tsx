import React, { useEffect } from 'react';
import { X, HelpCircle, DollarSign, Lightbulb, Shield, Layers } from 'lucide-react';
import { explainService } from '../../../shared/explanationDictionary.js';

interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  amount?: number;
  currency?: string;
  serviceName?: string;
  customExplanation?: string;
  subcategories?: { name: string; cost: number; percent: number; explanation: string }[];
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  isOpen,
  onClose,
  title,
  amount,
  currency = 'USD',
  serviceName,
  customExplanation,
  subcategories
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const serviceInfo = serviceName ? explainService(serviceName) : null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Cost Explanation (Plain English)
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {serviceInfo ? serviceInfo.friendlyName : title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Spend Summary Banner */}
          {amount !== undefined && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/80 dark:border-slate-700">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Total Monthly Charge
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Verified Read-Only Calculation</span>
              </div>
            </div>
          )}

          {/* Section 1: What is this? */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-brand-500" />
              <span>What does this mean?</span>
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              {customExplanation || serviceInfo?.detailedExplanation || 'AWS charges for this resource based on runtime hours, provisioned capacity, or data processed.'}
            </p>
          </div>

          {/* Section 2: Why it costs money */}
          {serviceInfo?.whyItCostsMoney && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <span>Why is AWS charging for this?</span>
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-800/30">
                {serviceInfo.whyItCostsMoney}
              </p>
            </div>
          )}

          {/* Section 3: Subcategories if available */}
          {subcategories && subcategories.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Where is the money going?
              </h3>
              <div className="space-y-2">
                {subcategories.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        {sub.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {sub.explanation}
                      </div>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        ${sub.cost.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {sub.percent}% of service
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Non-technical advice */}
          {serviceInfo?.howToControlCost && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center space-x-2">
                <Lightbulb className="w-4 h-4" />
                <span>How can you reduce this cost safely?</span>
              </h3>
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed">
                {serviceInfo.howToControlCost}
                <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 italic">
                  Note: Remember that this dashboard is strictly read-only. Any optimizations or changes must be made manually in your official AWS Management Console.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
