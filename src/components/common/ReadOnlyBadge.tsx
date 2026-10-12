import React, { useState } from 'react';
import { ShieldCheck, Lock, Info, X } from 'lucide-react';

export const ReadOnlyBadge: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-semibold shadow-sm group"
        title="Click to view AWS Read-Only Safety Guarantee"
      >
        <Lock className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
        <span>READ-ONLY AWS MODE</span>
        <span className="hidden sm:inline text-emerald-500/80">• Zero Mutation Guarantee</span>
        <Info className="w-3 h-3 text-emerald-500/60 group-hover:text-emerald-500 ml-1" />
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Strict Read-Only Safety Layer</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Enforced application-wide by code</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <p className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                  This dashboard ONLY reads billing and metadata information from AWS.
                </p>
                <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                  Even if the active AWS credentials have AdministratorAccess or full write permissions, this application is physically incapable of making changes to your AWS environment.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-2">
                  Permanently Blocked Operations:
                </h4>
                <ul className="grid grid-cols-2 gap-2 text-xs">
                  <li className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                    <span>✕ Cannot create resources</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                    <span>✕ Cannot delete resources</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                    <span>✕ Cannot start or stop servers</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                    <span>✕ Cannot modify databases</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                    <span>✕ Cannot change IAM or permissions</span>
                  </li>
                  <li className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400">
                    <span>✕ Cannot modify billing or budgets</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All requests pass through an explicit code-level allowlist (<code className="text-emerald-600 dark:text-emerald-400 font-mono">awsGuard.ts</code>). Unapproved operations throw an immediate security exception.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
