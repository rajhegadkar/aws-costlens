import React, { useState } from 'react';
import { Download, FileText, FileJson, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DashboardOverview, ServiceCostItem } from '../../shared/types.js';

interface ExportPageProps {
  overview: DashboardOverview;
  services: ServiceCostItem[];
  selectedMonth?: string;
}

function escapeCsvField(val: string | number): string {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? String(val) : '0';
  }
  let str = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export const ExportPage: React.FC<ExportPageProps> = ({
  overview,
  services,
  selectedMonth
}) => {
  const [downloading, setDownloading] = useState(false);
  const [exportedFormat, setExportedFormat] = useState<string | null>(null);

  const periodSuffix = selectedMonth && selectedMonth !== 'current'
    ? selectedMonth
    : new Date().toISOString().split('T')[0];

  const handleDownloadCsv = () => {
    setDownloading(true);
    let csv = 'Service Name,Current Month ($),Previous Month ($),Change ($),Change (%),% of Total,Category,Description\n';
    for (const s of services) {
      csv += [
        escapeCsvField(s.serviceName),
        escapeCsvField(s.currentMonth),
        escapeCsvField(s.previousMonth),
        escapeCsvField(s.changeAmount),
        escapeCsvField(`${s.changePercent}%`),
        escapeCsvField(`${s.percentOfTotal}%`),
        escapeCsvField(s.category),
        escapeCsvField(s.description)
      ].join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `aws-cost-report-${periodSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloading(false);
    setExportedFormat('CSV');
  };

  const handleDownloadJson = () => {
    setDownloading(true);
    const exportPayload = {
      reportDate: new Date().toISOString(),
      billingPeriod: selectedMonth || 'Current Month',
      accountSpend: overview.currentMonthSpend,
      previousSpend: overview.previousMonthSpend,
      currency: overview.currency,
      topService: overview.topService,
      topRegion: overview.topRegion,
      activeServicesCount: overview.activeServicesCount,
      services
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `aws-cost-report-${periodSuffix}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloading(false);
    setExportedFormat('JSON');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Export & Reports
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Generate local spreadsheets and structured data files for accounting and financial analysis.
        </p>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 flex items-center space-x-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <span className="font-bold">100% Local Privacy:</span> All report generation happens inside your local browser and computer. Zero billing data is uploaded to any external server, AI model, or third-party cloud.
        </div>
      </div>

      {exportedFormat && (
        <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-brand-900 dark:text-brand-200 flex items-center space-x-2 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-brand-600" />
          <span>Successfully exported {exportedFormat} report to your downloads folder!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CSV Export Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 w-fit">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              CSV Spreadsheet Export
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Export all service costs, month-over-month changes, categories, and plain-English descriptions into a standard spreadsheet compatible with Microsoft Excel, Google Sheets, and Numbers.
            </p>
          </div>
          <button
            onClick={handleDownloadCsv}
            disabled={downloading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Spreadsheet</span>
          </button>
        </div>

        {/* JSON Export Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-4">
          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-fit">
            <FileJson className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Structured JSON Export
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Export full hierarchical cost data, regional summaries, active service counts, and timeline points in machine-readable JSON format for scripting or automated internal auditing.
            </p>
          </div>
          <button
            onClick={handleDownloadJson}
            disabled={downloading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download Structured JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
