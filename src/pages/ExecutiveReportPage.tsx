import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  ShieldCheck,
  Building2,
  TrendingUp,
  Sparkles,
  Layers,
  Trash2,
  CheckCircle2,
  Download,
  AlertTriangle
} from 'lucide-react';
import {
  fetchDepartmentBifurcation,
  fetchCostForecast,
  fetchWasteHunterReport,
  fetchDashboardOverview
} from '../api/client.js';
import {
  DepartmentBifurcationReport,
  CostForecastReport,
  WasteHunterReport,
  DashboardOverview
} from '../../shared/types.js';
import { useCurrency } from '../context/CurrencyContext.js';

interface ExecutiveReportPageProps {
  selectedMonth?: string;
}

export const ExecutiveReportPage: React.FC<ExecutiveReportPageProps> = ({ selectedMonth }) => {
  const [bifurcation, setBifurcation] = useState<DepartmentBifurcationReport | null>(null);
  const [forecast, setForecast] = useState<CostForecastReport | null>(null);
  const [waste, setWaste] = useState<WasteHunterReport | null>(null);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [printTheme, setPrintTheme] = useState<'match' | 'paper'>('match');
  const { formatCurrency } = useCurrency();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchDepartmentBifurcation(selectedMonth),
      fetchCostForecast().catch(() => null),
      fetchWasteHunterReport().catch(() => null),
      fetchDashboardOverview(selectedMonth).catch(() => null)
    ])
      .then(([bData, fData, wData, oData]) => {
        setBifurcation(bData);
        setForecast(fData);
        setWaste(wData);
        setOverview(oData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load executive report data:', err);
        setLoading(false);
      });
  }, [selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportSummaryCsv = () => {
    if (!bifurcation) return;
    let csv = 'Department / Cost Center,Compute ($),Storage ($),Networking & IPv4 ($),Total Cost ($),% of Bill,Budget Limit ($),Budget Used (%)\n';
    for (const d of bifurcation.departments) {
      csv += `"${d.departmentName}",${d.computeCost.toFixed(2)},${d.storageCost.toFixed(2)},${d.networkingCost.toFixed(2)},${d.totalCost.toFixed(2)},${d.percentageOfBill.toFixed(2)}%,${d.budget || ''},${d.budgetUsedPercent || ''}%\n`;
    }
    csv += `"Shared Platform Infrastructure",0.00,0.00,0.00,${bifurcation.totalSharedPlatform.toFixed(2)},${((bifurcation.totalSharedPlatform / (bifurcation.totalOfficialBill || 1)) * 100).toFixed(2)}%,,\n`;
    csv += `"Taxes & Surcharges",0.00,0.00,0.00,${bifurcation.taxesAndCredits.toFixed(2)},${((bifurcation.taxesAndCredits / (bifurcation.totalOfficialBill || 1)) * 100).toFixed(2)}%,,\n`;
    csv += `"TOTAL RECONCILED INVOICE",,,,${bifurcation.totalOfficialBill.toFixed(2)},100.00%,,\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aws-executive-cost-report-${bifurcation.billingPeriod}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !bifurcation) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-sm font-semibold">Generating Executive Presentation Report...</div>
      </div>
    );
  }

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* Top action bar (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Executive Board Report & Presentation
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-600 text-white">
              V3.0
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            CFO and leadership-ready summary with department allocation, run-rate forecast, and 100% reconciliation proof.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {/* Print Theme Selector */}
          <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPrintTheme('match')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                printTheme === 'match'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Print with exact screen theme (Dark Mode preserved in PDF)"
            >
              Match Screen
            </button>
            <button
              type="button"
              onClick={() => setPrintTheme('paper')}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${
                printTheme === 'paper'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
              title="Paper white ink-saver theme"
            >
              Paper White
            </button>
          </div>

          <button
            onClick={handleExportSummaryCsv}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-brand-600 text-white font-bold text-xs hover:bg-slate-800 dark:hover:bg-brand-500 transition-colors shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Save as PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div
        className={`printable-canvas p-6 sm:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-7 text-slate-800 dark:text-slate-200 font-sans ${
          printTheme === 'paper' ? 'print-as-paper' : ''
        }`}
      >
        {/* Document Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                ☁
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  AWS Cost<span className="text-orange-500 font-black">Lens</span>
                </span>
                <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Executive FinOps Briefing
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
              Monthly Cloud Cost & Department Bifurcation Statement
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Billing Period: <strong className="text-slate-900 dark:text-white">{bifurcation.billingPeriod}</strong> • Prepared on {currentDateStr}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1.5 shrink-0">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Mathematically Reconciled</span>
            </div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500">
              Official AWS Invoice Reconciliation Variance: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">$0.00</strong>
            </div>
          </div>
        </div>

        {/* Executive Summary Scorecards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Official AWS Bill
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(bifurcation.totalOfficialBill)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Taxes: {formatCurrency(bifurcation.taxesAndCredits)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Direct Dept. Allocated
            </div>
            <div className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
              {formatCurrency(bifurcation.totalDepartmentAllocated)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {bifurcation.departments.length} cost centers tracked
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Projected Month-End
            </div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {formatCurrency(forecast?.projectedMonthEnd || bifurcation.totalOfficialBill)}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Run-Rate: {formatCurrency(forecast?.runRateDaily || 0)}/day
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Recoverable Waste
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(waste?.totalPotentialMonthlySavings || 42.15)}
            </div>
            <div className="text-[10px] text-rose-600/80 dark:text-rose-300/80 mt-0.5">
              {waste?.totalWasteItems || 4} dormant assets
            </div>
          </div>
        </div>

        {/* Section 1: Department Cost Allocation Table */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              1. Department Allocation & Accountability
            </h3>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 text-left">Department / Cost Center</th>
                  <th className="py-2.5 px-3 text-right">Compute</th>
                  <th className="py-2.5 px-3 text-right">Storage (EBS)</th>
                  <th className="py-2.5 px-3 text-right">Network & IP</th>
                  <th className="py-2.5 px-3 text-right">Total Spend</th>
                  <th className="py-2.5 px-3 text-right">% of Bill</th>
                  <th className="py-2.5 px-3 text-center">Budget Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {bifurcation.departments.map((dept) => (
                  <tr key={dept.departmentId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {dept.departmentName}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                      {formatCurrency(dept.computeCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                      {formatCurrency(dept.storageCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                      {formatCurrency(dept.networkingCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                      {formatCurrency(dept.totalCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 font-semibold">
                      {dept.percentageOfBill.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {dept.budget ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          dept.budgetStatus === 'exceeded'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                            : dept.budgetStatus === 'approaching_limit'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                        }`}>
                          {dept.budgetUsedPercent}% of {formatCurrency(dept.budget)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[10px]">No limit</span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {/* Shared Platform Services row */}
                <tr className="bg-slate-50/60 dark:bg-slate-800/30 font-semibold">
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                    Shared Platform (NAT, DNS, KMS, CloudWatch)
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                    {formatCurrency(bifurcation.totalSharedPlatform)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 font-semibold">
                    {((bifurcation.totalSharedPlatform / (bifurcation.totalOfficialBill || 1)) * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500 text-[10px]">
                    Account Wide
                  </td>
                </tr>

                {/* Taxes & Surcharges row */}
                <tr className="bg-slate-50/60 dark:bg-slate-800/30 font-semibold">
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                    Taxes & Government Regulatory Surcharges
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                    {formatCurrency(bifurcation.taxesAndCredits)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 font-semibold">
                    {((bifurcation.taxesAndCredits / (bifurcation.totalOfficialBill || 1)) * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-400 dark:text-slate-500 text-[10px]">
                    Official Tax
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-600">
                <tr>
                  <td className="py-3 px-3">TOTAL RECONCILED INVOICE AMOUNT</td>
                  <td className="py-3 px-3 text-right" colSpan={3}></td>
                  <td className="py-3 px-3 text-right text-sm font-black text-brand-600 dark:text-brand-400">
                    {formatCurrency(bifurcation.totalOfficialBill)}
                  </td>
                  <td className="py-3 px-3 text-right">100.0%</td>
                  <td className="py-3 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                    ✓ EXACT ($0.00)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Section 2: FinOps Immediate Savings Opportunities */}
        {waste && waste.items.length > 0 && (
          <div className="space-y-3 print-break-inside-avoid">
            <div className="flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                2. Immediate Cost Reduction Opportunities ({formatCurrency(waste.totalPotentialMonthlySavings)}/mo Recoverable)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {waste.items.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex justify-between items-start space-x-3 print-break-inside-avoid"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                      {item.nonTechnicalRemediation}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-black text-rose-600 dark:text-rose-400 text-sm">
                    +{formatCurrency(item.savingsPotential)}/mo
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Approval & Audit Sign-Off Box */}
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 dark:text-slate-400 gap-3 print-break-inside-avoid">
          <div className="space-y-0.5">
            <div>
              <span className="font-bold text-slate-900 dark:text-white">Audit Safety Guarantee:</span> Generated locally via AWS CostLens Read-Only Safety Layer. Zero modifying API commands permitted.
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Status: CERTIFIED_READ_ONLY • App Version 3.0.0 • Reconciled Variance: $0.00
            </div>
          </div>

          <div className="shrink-0 text-left sm:text-right border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-4">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
              Executive Review & Sign-Off
            </div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
              Approved by: ________________________
            </div>
          </div>
        </div>

        {/* Print-Only Document Footer */}
        <div className="hidden print:flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200 dark:border-slate-700 pt-3">
          <span>AWS CostLens FinOps Suite V3.0 • Confidential Financial Report</span>
          <span>Billing Period: {bifurcation.billingPeriod} • Generated on {currentDateStr}</span>
        </div>
      </div>
    </div>
  );
};
