import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  HardDrive,
  Server,
  Globe,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Copy,
  Download,
  Filter,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { fetchWasteHunterReport } from '../api/client.js';
import { WasteHunterReport, WasteResourceItem, WasteResourceType } from '../../shared/types.js';
import { useCurrency } from '../context/CurrencyContext.js';

export const WasteHunterPage: React.FC = () => {
  const [report, setReport] = useState<WasteHunterReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { formatCurrency } = useCurrency();

  const loadData = async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchWasteHunterReport(force);
      setReport(data);
    } catch (err) {
      console.error('Failed to load waste hunter report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = () => {
    if (!report) return;
    let csv = 'Resource ID,Resource Name,Type,Region,Monthly Cost ($),Potential Monthly Savings ($),Severity,Recommended Remediation\n';
    for (const item of report.items) {
      const clean = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      csv += [
        clean(item.resourceId),
        clean(item.name),
        clean(item.typeName),
        clean(item.region),
        item.monthlyCost.toFixed(2),
        item.savingsPotential.toFixed(2),
        item.severity.toUpperCase(),
        clean(item.nonTechnicalRemediation)
      ].join(',') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aws-finops-waste-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !report) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-sm font-semibold">Scanning AWS environment for unattached disks, stopped servers & idle IPs...</div>
      </div>
    );
  }

  const items = report?.items || [];
  const filteredItems = filterType === 'ALL'
    ? items
    : items.filter(i => i.resourceType === filterType);

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'high':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              FinOps Waste Hunter
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
              V3.0
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Automatically identifies unattached EBS storage, stopped instances, and unused Elastic IPs incurring monthly waste.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            disabled={!report || report.items.length === 0}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Waste CSV</span>
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Rescanning...' : 'Rescan Account'}</span>
          </button>
        </div>
      </div>

      {/* Hero Metric Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recoverable Savings */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-500 to-amber-600 text-white shadow-lg shadow-rose-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider opacity-90">
              Total Recoverable Savings
            </span>
            <Sparkles className="w-5 h-5 opacity-90" />
          </div>
          <div className="text-3xl sm:text-4xl font-black tracking-tight">
            {formatCurrency(report?.totalPotentialMonthlySavings || 0)}
            <span className="text-sm font-semibold opacity-80"> / mo</span>
          </div>
          <div className="text-xs font-medium opacity-90">
            {report?.totalWasteItems || 0} reclaimable opportunities found
          </div>
        </div>

        {/* Unattached EBS Volumes */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Unattached EBS Disks</span>
            <HardDrive className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(report?.summaryByCategory.unattachedEbs.savings || 0)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {report?.summaryByCategory.unattachedEbs.count || 0} orphaned disk volumes
          </div>
        </div>

        {/* Stopped Virtual Servers */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Stopped EC2 Storage</span>
            <Server className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(report?.summaryByCategory.stoppedEc2.savings || 0)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {report?.summaryByCategory.stoppedEc2.count || 0} stopped machines retaining disks
          </div>
        </div>

        {/* Idle Elastic IPs */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Unused Elastic IPs</span>
            <Globe className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {formatCurrency(report?.summaryByCategory.unusedElasticIps.savings || 0)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {report?.summaryByCategory.unusedElasticIps.count || 0} unassociated public IPs
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL', label: `All Opportunities (${items.length})` },
          { id: 'EBS_UNATTACHED', label: `Unattached Disks (${report?.summaryByCategory.unattachedEbs.count || 0})` },
          { id: 'EC2_STOPPED', label: `Stopped Servers (${report?.summaryByCategory.stoppedEc2.count || 0})` },
          { id: 'UNUSED_ELASTIC_IP', label: `Unused Elastic IPs (${report?.summaryByCategory.unusedElasticIps.count || 0})` },
          { id: 'S3_INACTIVE_TIER', label: `S3 Lifecycle (${report?.summaryByCategory.s3Inefficient.count || 0})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
              filterType === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List of Waste Resources */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Zero Waste Detected in Category</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your AWS cloud environment is optimized for this resource type.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getSeverityBadge(item.severity)}`}>
                      {item.severity} Priority
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 font-mono">
                      {item.typeName}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                      • {item.region}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{item.name}</span>
                    <button
                      onClick={() => handleCopy(item.resourceId)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Copy Resource ID"
                    >
                      {copiedId === item.resourceId ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </h3>

                  {item.details && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {item.details}
                    </p>
                  )}
                </div>

                <div className="text-left sm:text-right shrink-0 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Recoverable Savings
                  </div>
                  <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    +{formatCurrency(item.savingsPotential)}
                    <span className="text-xs font-normal text-slate-400">/mo</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Current Spend: {formatCurrency(item.monthlyCost)}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Remediation Box */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase tracking-wide text-[10px] text-amber-700 dark:text-amber-300 block mb-0.5">
                    How to Fix & Save:
                  </span>
                  <span>{item.nonTechnicalRemediation}</span>
                </div>
              </div>

              {/* Tags preview if present */}
              {item.tags && Object.keys(item.tags).length > 0 && (
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tags:</span>
                  {Object.entries(item.tags).map(([k, v]) => (
                    <span
                      key={k}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-[10px] font-mono text-slate-600 dark:text-slate-300"
                    >
                      {k}={v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
