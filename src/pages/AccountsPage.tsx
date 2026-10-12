import React, { useState, useEffect } from 'react';
import { Users, Building, TrendingUp, TrendingDown, Layers, ShieldCheck } from 'lucide-react';
import { fetchAccounts } from '../api/client.js';
import { AccountSpendingItem } from '../../shared/types.js';

interface AccountsPageProps {
  selectedMonth?: string;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({ selectedMonth }) => {
  const [accounts, setAccounts] = useState<AccountSpendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAccounts(selectedMonth)
      .then((data) => {
        setAccounts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading AWS Organizations linked accounts...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          AWS Linked Accounts
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Consolidated billing across all member and linked AWS accounts in your Organization.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((acct) => (
          <div
            key={acct.accountId}
            className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {acct.accountName}
                    </h3>
                    <span className="font-mono text-xs text-slate-400">
                      ID: {acct.accountId}
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-4 space-y-1">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  ${acct.cost.toFixed(2)}
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Previous: ${acct.previousCost.toFixed(2)}</span>
                  <span
                    className={`font-bold ${
                      acct.changePercent > 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                  >
                    {acct.changePercent > 0 ? `+${acct.changePercent}%` : `${acct.changePercent}%`}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium pt-1">
                  Represents {acct.percentOfTotal}% of total consolidated billing
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Top Services:
                </span>
                <div className="space-y-1">
                  {acct.topServices.map((s, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>{s.name}</span>
                      <span className="font-bold text-slate-900 dark:text-white">${s.cost.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
