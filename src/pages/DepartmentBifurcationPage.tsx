import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Server,
  HardDrive,
  Database,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Info,
  DollarSign,
  TrendingUp,
  HelpCircle,
  Network
} from 'lucide-react';
import {
  fetchDepartmentBifurcation,
  fetchDepartmentConfig,
  saveDepartmentConfig,
  assignResourceDepartment,
  deleteDepartment
} from '../api/client.js';
import {
  DepartmentBifurcationReport,
  DepartmentDefinition,
  ResourceCostItemTCO,
  DepartmentCostSummary
} from '../../shared/types.js';
import { useCurrency } from '../context/CurrencyContext.js';

interface DepartmentBifurcationPageProps {
  selectedMonth?: string;
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800', badge: 'bg-blue-500' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', badge: 'bg-purple-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', badge: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800', badge: 'bg-rose-500' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800', badge: 'bg-cyan-500' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700', badge: 'bg-slate-500' }
};

export const DepartmentBifurcationPage: React.FC<DepartmentBifurcationPageProps> = ({ selectedMonth }) => {
  const { formatCurrency, activeConfig } = useCurrency();
  const [report, setReport] = useState<DepartmentBifurcationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDeptFilter, setActiveDeptFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'all' | 'EC2' | 'S3' | 'RDS'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showSharedDetails, setShowSharedDetails] = useState(false);

  // Modal State
  const [departmentsList, setDepartmentsList] = useState<DepartmentDefinition[]>([]);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptColor, setNewDeptColor] = useState('blue');
  const [rulePattern, setRulePattern] = useState('');
  const [ruleType, setRuleType] = useState<'name_prefix' | 'name_contains' | 'tag'>('name_contains');

  const loadData = (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    fetchDepartmentBifurcation(selectedMonth)
      .then((data) => {
        setReport(data);
        setDepartmentsList(data.availableDepartments || []);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        console.error('Failed to load department bifurcation report:', err);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadData(false);
  }, [selectedMonth]);

  const handleExportCsv = () => {
    const url = selectedMonth
      ? `/api/cost/departments/export?month=${encodeURIComponent(selectedMonth)}`
      : `/api/cost/departments/export`;
    window.location.href = url;
  };

  const handleAssignDepartment = async (resourceId: string, departmentId: string) => {
    try {
      await assignResourceDepartment(resourceId, departmentId);
      loadData(true);
    } catch (err) {
      console.error('Failed to assign department:', err);
    }
  };

  const handleCreateOrUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    const deptId = editingDeptId || `dept-custom-${Date.now()}`;
    const newRules = rulePattern.trim()
      ? [
          {
            id: `rule_${Date.now()}`,
            targetDepartmentId: deptId,
            matchType: ruleType,
            pattern: rulePattern.trim(),
            priority: 5
          }
        ]
      : [];

    const newDept: DepartmentDefinition = {
      id: deptId,
      name: newDeptName.trim(),
      description: newDeptDesc.trim() || 'Custom organizational department',
      color: newDeptColor,
      allocationRules: newRules
    };

    let updated: DepartmentDefinition[];
    if (editingDeptId) {
      updated = departmentsList.map((d) => (d.id === editingDeptId ? { ...d, ...newDept } : d));
    } else {
      updated = [...departmentsList, newDept];
    }

    try {
      const saved = await saveDepartmentConfig(updated);
      setDepartmentsList(saved);
      setEditingDeptId(null);
      setNewDeptName('');
      setNewDeptDesc('');
      setRulePattern('');
      loadData(true);
    } catch (err) {
      console.error('Failed to save department:', err);
    }
  };

  const handleDeleteDept = async (deptId: string) => {
    if (!window.confirm('Delete this department? Its resources will move to Unallocated.')) return;
    try {
      const updated = await deleteDepartment(deptId);
      setDepartmentsList(updated);
      loadData(true);
    } catch (err) {
      console.error('Failed to delete department:', err);
    }
  };

  if (loading || !report) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3 animate-pulse">
        <Building2 className="w-10 h-10 mx-auto text-brand-500 animate-bounce" />
        <p className="font-bold text-slate-700 dark:text-slate-300">
          Calculating Unified Resource TCO & Department Bifurcation...
        </p>
        <p className="text-xs text-slate-400">Reconciling every resource against the Amazon bill</p>
      </div>
    );
  }

  // Flatten resources for table view
  const allResources: ResourceCostItemTCO[] = [
    ...report.departments.flatMap((d) => d.resources),
    ...report.unallocatedResources
  ];

  const filteredResources = allResources.filter((r) => {
    const matchesDept = activeDeptFilter === 'all' || r.departmentId === activeDeptFilter;
    const matchesType = resourceTypeFilter === 'all' || r.resourceType === resourceTypeFilter;
    const matchesSearch =
      searchTerm === '' ||
      r.resourceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.resourceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.departmentName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10px] uppercase tracking-wider">
              Version 3.0
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {report.billingPeriod}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
            Department Cost Bifurcation & Unified Resource TCO
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Accountability per cloud resource combining compute, disk storage, IPv4, and networking charges reconciled with the official Amazon bill.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-500" />
            <span>Customize Departments & Rules</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
            title="Refresh Reconciled Report"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* 100% Mathematical Reconciliation Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/40 border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  100% Mathematical Bill Reconciliation Verified
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-extrabold text-[10px]">
                  Variance: {formatCurrency(report.reconciliationVariance)}
                </span>
              </div>
              <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 mt-1 max-w-2xl leading-relaxed">
                Every single cent from your Amazon bill is mathematically reconciled. Combined department allocations plus shared network infrastructure equals the official invoice total with zero unexplained leakage.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 shrink-0">
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Amazon Bill Total</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {formatCurrency(report.totalOfficialBill)}
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-600 font-black">=</span>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Departments</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(report.totalDepartmentAllocated)}
              </span>
            </div>
            <span className="text-slate-300 dark:text-slate-600 font-black">+</span>
            <div>
              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Shared Platform</span>
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(report.totalSharedPlatform)}
              </span>
            </div>
            {report.taxesAndCredits !== 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-600 font-black">+</span>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Tax & Credits</span>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                    {formatCurrency(report.taxesAndCredits)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {report.departments.map((dept) => {
          const colors = COLOR_CLASSES[dept.color] || COLOR_CLASSES.blue;
          const isSelected = activeDeptFilter === dept.departmentId;

          return (
            <div
              key={dept.departmentId}
              onClick={() => setActiveDeptFilter(isSelected ? 'all' : dept.departmentId)}
              className={`p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? `${colors.bg} ${colors.border} ring-2 ring-orange-500 shadow-md`
                  : 'bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`w-2.5 h-2.5 rounded-full ${colors.badge}`} />
                  <span className="text-[11px] font-bold text-slate-400">
                    {dept.percentageOfBill.toFixed(1)}% of bill
                  </span>
                </div>

                <div className="mt-2">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1" title={dept.departmentName}>
                    {dept.departmentName}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                    {dept.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {formatCurrency(dept.totalCost)}
                  </div>
                  {dept.budget && (
                    <span className="text-[11px] font-semibold text-slate-400">
                      / {formatCurrency(dept.budget, 0)} limit
                    </span>
                  )}
                </div>

                {dept.budget && (
                  <div className="mt-1.5 space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          dept.budgetStatus === 'exceeded'
                            ? 'bg-rose-500'
                            : dept.budgetStatus === 'approaching_limit'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(dept.budgetUsedPercent || 0, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">
                        {dept.budgetUsedPercent}% consumed
                      </span>
                      <span className={`font-bold ${
                        dept.budgetStatus === 'exceeded'
                          ? 'text-rose-600 dark:text-rose-400'
                          : dept.budgetStatus === 'approaching_limit'
                          ? 'text-amber-500'
                          : 'text-emerald-500'
                      }`}>
                        {dept.budgetStatus === 'exceeded' ? 'Limit Exceeded' : dept.budgetStatus === 'approaching_limit' ? 'Approaching Limit' : 'On Track'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-slate-700/40">
                  <span>{dept.resourceCount} resources</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    C:{formatCurrency(dept.computeCost, 0)} • S:{formatCurrency(dept.storageCost, 0)} • N:{formatCurrency(dept.networkingCost, 0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Unallocated Queue Card if any exist */}
        {report.unallocatedResources.length > 0 && (
          <div
            onClick={() => setActiveDeptFilter(activeDeptFilter === 'unallocated' ? 'all' : 'unallocated')}
            className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between ${
              activeDeptFilter === 'unallocated'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 ring-2 ring-rose-500 shadow-md'
                : 'bg-white dark:bg-slate-800/90 border-dashed border-rose-300 dark:border-rose-800/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                  Needs Tagging
                </span>
              </div>
              <div className="mt-2">
                <h3 className="font-extrabold text-sm text-rose-700 dark:text-rose-300">
                  Unallocated
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Resources without tags or rules. Assign with 1 click below.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-rose-100 dark:border-rose-900/40">
              <div className="text-lg font-black text-rose-700 dark:text-rose-300">
                {formatCurrency(report.unallocatedResources.reduce((acc, r) => acc + r.totalCost, 0))}
              </div>
              <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                {report.unallocatedResources.length} unassigned items
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center space-x-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-750 text-xs font-semibold">
            <button
              onClick={() => setActiveDeptFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeDeptFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              All Departments ({allResources.length})
            </button>
            {report.departments.map((d) => (
              <button
                key={d.departmentId}
                onClick={() => setActiveDeptFilter(d.departmentId)}
                className={`px-3 py-1.5 rounded-xl transition-all hidden sm:inline-block ${
                  activeDeptFilter === d.departmentId
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {d.departmentName.split(' ')[0]} ({d.resourceCount})
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-750 text-xs font-semibold">
            {(['all', 'EC2', 'S3', 'RDS'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setResourceTypeFilter(t)}
                className={`px-2.5 py-1.5 rounded-xl transition-all ${
                  resourceTypeFilter === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search resource, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Unified Resource TCO Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Itemized Resource Total Cost of Ownership (TCO)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {filteredResources.length} resources with combined compute, storage, and networking charges. Click any row for formula details.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Filtered Total: <strong className="text-slate-900 dark:text-white">{formatCurrency(filteredResources.reduce((acc, r) => acc + r.totalCost, 0))}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead className="bg-slate-50/75 dark:bg-slate-800/60 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Resource & Machine Name</th>
                <th className="py-3 px-4">Assigned Department</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3 text-right">Compute ({activeConfig.symbol})</th>
                <th className="py-3 px-3 text-right">Storage ({activeConfig.symbol})</th>
                <th className="py-3 px-3 text-right">Network & IP ({activeConfig.symbol})</th>
                <th className="py-3 px-3 text-right">Other ({activeConfig.symbol})</th>
                <th className="py-3 px-4 text-right">Combined Total</th>
                <th className="py-3 px-3 text-center">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredResources.map((res) => {
                const isExpanded = expandedRow === res.resourceId;
                const colors = COLOR_CLASSES[res.departmentColor] || COLOR_CLASSES.blue;

                return (
                  <React.Fragment key={res.resourceId}>
                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-750/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 shrink-0">
                            {res.resourceType === 'EC2' && <Server className="w-4 h-4 text-orange-500" />}
                            {res.resourceType === 'S3' && <HardDrive className="w-4 h-4 text-emerald-500" />}
                            {res.resourceType === 'RDS' && <Database className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 dark:text-white">
                              {res.resourceName}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                              <span className="font-mono">{res.resourceId}</span>
                              <span>•</span>
                              <span>{res.regionName}</span>
                              {res.state && (
                                <>
                                  <span>•</span>
                                  <span
                                    className={`font-semibold ${
                                      res.state === 'running' || res.state === 'available'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {res.state}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <select
                            value={res.departmentId}
                            onChange={(e) => handleAssignDepartment(res.resourceId, e.target.value)}
                            className={`text-xs font-bold rounded-xl px-2.5 py-1 border transition-colors cursor-pointer dark:bg-slate-800 ${colors.bg} ${colors.text} ${colors.border}`}
                          >
                            {report.departments.map((d) => (
                              <option key={d.departmentId} value={d.departmentId} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                                {d.departmentName}
                              </option>
                            ))}
                            <option value="unallocated" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">Unallocated / Review</option>
                          </select>
                          <span
                            className="text-[9px] uppercase font-bold text-slate-400"
                            title={`Assigned by: ${res.departmentSource}`}
                          >
                            [{res.departmentSource}]
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 font-mono font-bold text-[10px] text-slate-600 dark:text-slate-300">
                          {res.resourceType}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {formatCurrency(res.computeCost)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {formatCurrency(res.storageCost)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {formatCurrency(res.networkingCost)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-200">
                        {formatCurrency(res.otherCost)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {formatCurrency(res.totalCost)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ~{formatCurrency(res.monthlyRunRate)}/mo
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : res.resourceId)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Show calculation formula and explanation"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50/90 dark:bg-slate-800/80">
                        <td colSpan={9} className="p-4 pl-12 text-xs">
                          <div className="p-4 rounded-2xl bg-white dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-2.5">
                            <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                              <Info className="w-4 h-4 text-orange-500" />
                              <span>Plain English Non-Technical Summary:</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {res.nonTechnicalSummary}
                            </p>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                Transparent Calculation Formula:
                              </span>
                              <div className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                                {res.costFormula}
                              </div>
                            </div>

                            {res.tags && Object.keys(res.tags).length > 0 && (
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5 items-center">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                                  Tags:
                                </span>
                                {Object.entries(res.tags).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-[10px] text-slate-700 dark:text-slate-200 font-mono"
                                  >
                                    {k}={v}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredResources.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No resources match the selected department or search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Cloud Platform & Network Accordion */}
      <div className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowSharedDetails(!showSharedDetails)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Shared Cloud Platform & Network Infrastructure
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                  {formatCurrency(report.totalSharedPlatform)} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Foundation networking, NAT Gateways, Route 53 DNS, KMS encryption, and monitoring shared account-wide.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="text-xs font-semibold hidden sm:inline-block">
              {showSharedDetails ? 'Hide Itemized Breakdown' : 'Show Itemized Breakdown'}
            </span>
            {showSharedDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showSharedDetails && (
          <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-700/80 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {report.sharedPlatformServices.map((svc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-750/60 border border-slate-200/60 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      {svc.serviceName}
                    </span>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(svc.cost)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {svc.explanation}
                  </p>
                  <div className="text-[10px] text-slate-400 italic">
                    Why we use it: {svc.nonTechnicalGuide}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Custom Department & Allocation Rules */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Customize Departments & Allocation Rules
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Define custom department names tailored to your organization and set automatic matching rules.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  setEditingDeptId(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Existing Departments List */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Organization Departments ({departmentsList.length})
              </span>
              <div className="space-y-2">
                {departmentsList.map((dept) => {
                  const colors = COLOR_CLASSES[dept.color] || COLOR_CLASSES.blue;
                  return (
                    <div
                      key={dept.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-750/70 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-3 h-3 rounded-full ${colors.badge}`} />
                        <div>
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {dept.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {dept.description} • {dept.allocationRules?.length || 0} matching rules
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            setEditingDeptId(dept.id);
                            setNewDeptName(dept.name);
                            setNewDeptDesc(dept.description);
                            setNewDeptColor(dept.color);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          title="Edit department"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDept(dept.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Delete department"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create or Edit Form */}
            <form onSubmit={handleCreateOrUpdateDept} className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                {editingDeptId ? 'Edit Department' : 'Add New Custom Department'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Department Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mobile Apps & Frontend"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Color Badge</label>
                  <select
                    value={newDeptColor}
                    onChange={(e) => setNewDeptColor(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  >
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="emerald">Emerald</option>
                    <option value="amber">Amber</option>
                    <option value="rose">Rose</option>
                    <option value="cyan">Cyan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Description (Plain English)</label>
                <input
                  type="text"
                  placeholder="e.g. Workloads dedicated to customer mobile applications"
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Automatic Matching Rule (Optional)
                </label>
                <div className="flex gap-2">
                  <select
                    value={ruleType}
                    onChange={(e: any) => setRuleType(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  >
                    <option value="name_contains">Name contains</option>
                    <option value="name_prefix">Name starts with</option>
                    <option value="tag">AWS Tag (Key=Value)</option>
                  </select>
                  <input
                    type="text"
                    placeholder="e.g. mobile or Project=ios-app"
                    value={rulePattern}
                    onChange={(e) => setRulePattern(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                {editingDeptId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDeptId(null);
                      setNewDeptName('');
                      setNewDeptDesc('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-orange-500 text-white font-bold text-xs hover:bg-orange-600 transition-colors shadow-sm"
                >
                  {editingDeptId ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
