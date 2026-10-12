import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Filter,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { ServiceCostItem } from '../../shared/types.js';
import { ExplainModal } from '../components/common/ExplainModal.js';

interface ServicesPageProps {
  services: ServiceCostItem[];
  onSelectService: (serviceName: string) => void;
}

type SortField = 'currentMonth' | 'previousMonth' | 'changeAmount' | 'changePercent' | 'percentOfTotal' | 'serviceName';

export const ServicesPage: React.FC<ServicesPageProps> = ({ services, onSelectService }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('currentMonth');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [explainModal, setExplainModal] = useState<{
    isOpen: boolean;
    serviceName: string;
    amount?: number;
  }>({
    isOpen: false,
    serviceName: ''
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => set.add(s.category));
    return ['All', ...Array.from(set)];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services
      .filter(s => {
        const matchesSearch = s.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (typeof valA === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? valA - valB : valB - valA;
      });
  }, [services, searchTerm, selectedCategory, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for costs
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          AWS Services Breakdown
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Inspect, sort, and understand every AWS service generating charges on your account.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by service name or description..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-transparent focus:border-brand-500 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th
                  onClick={() => handleSort('serviceName')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Service</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-3">Category</th>
                <th
                  onClick={() => handleSort('currentMonth')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Current Month</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('previousMonth')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Previous Month</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('changeAmount')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Change ($)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('changePercent')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Change (%)</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('percentOfTotal')}
                  className="py-3.5 px-3 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>% Total</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">Explain</th>
                <th className="py-3.5 px-4 text-center">Drill Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredServices.map((s) => {
                const isIncrease = s.changeAmount > 0;
                return (
                  <tr
                    key={s.serviceName}
                    onClick={() => onSelectService(s.serviceName)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {s.serviceName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 max-w-md">
                        {s.description}
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {s.category}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right font-black text-slate-900 dark:text-white">
                      ${s.currentMonth.toFixed(2)}
                    </td>
                    <td className="py-4 px-3 text-right text-slate-500 dark:text-slate-400">
                      ${s.previousMonth.toFixed(2)}
                    </td>
                    <td className="py-4 px-3 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                          isIncrease
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'
                            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                        }`}
                      >
                        {isIncrease ? `+$${s.changeAmount.toFixed(2)}` : `-$${Math.abs(s.changeAmount).toFixed(2)}`}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold ${
                          isIncrease
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isIncrease ? `+${s.changePercent}%` : `${s.changePercent}%`}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                      {s.percentOfTotal}%
                    </td>
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() =>
                          setExplainModal({
                            isOpen: true,
                            serviceName: s.serviceName,
                            amount: s.currentMonth
                          })
                        }
                        className="p-1.5 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                        title="Explain this cost in plain English"
                      >
                        <HelpCircle className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex p-1.5 rounded-xl text-slate-400 group-hover:text-brand-600 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/40 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ExplainModal
        isOpen={explainModal.isOpen}
        onClose={() => setExplainModal({ isOpen: false, serviceName: '' })}
        title={explainModal.serviceName}
        amount={explainModal.amount}
        serviceName={explainModal.serviceName}
      />
    </div>
  );
};
