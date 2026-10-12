import React, { useState, useEffect } from 'react';
import {
  Server,
  HardDrive,
  Database,
  Search,
  RefreshCw,
  Tag,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Globe2,
  Cpu,
  Layers
} from 'lucide-react';
import { fetchResourceInventory } from '../api/client.js';
import { ResourceInventorySummary } from '../../shared/types.js';

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<ResourceInventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ec2' | 's3' | 'rds'>('ec2');
  const [stateFilter, setStateFilter] = useState<'all' | 'running' | 'stopped'>('all');

  const loadData = (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    fetchResourceInventory(force)
      .then((data) => {
        setInventory(data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadData(false);
  }, []);

  const filteredEc2 = (inventory?.ec2Instances || []).filter((inst) => {
    const matchesSearch =
      inst.name.toLowerCase().includes(search.toLowerCase()) ||
      inst.instanceId.toLowerCase().includes(search.toLowerCase()) ||
      inst.instanceType.toLowerCase().includes(search.toLowerCase()) ||
      inst.region.toLowerCase().includes(search.toLowerCase()) ||
      (inst.privateIp && inst.privateIp.includes(search));

    const matchesState = stateFilter === 'all' || inst.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const filteredS3 = (inventory?.s3Buckets || []).filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRds = (inventory?.rdsInstances || []).filter(
    (db) =>
      db.dbInstanceIdentifier.toLowerCase().includes(search.toLowerCase()) ||
      db.engine.toLowerCase().includes(search.toLowerCase()) ||
      db.dbInstanceClass.toLowerCase().includes(search.toLowerCase()) ||
      db.region.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Active Cloud Inventory & Machine Names
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time live identification of your EC2 machines, S3 storage buckets, and databases across all regions.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-sm shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-400' : ''}`} />
          <span>Re-Scan Cloud Resources</span>
        </button>
      </div>

      {/* KPI Cards */}
      {inventory && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total EC2 Virtual Machines
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {inventory.totalEc2Instances} Instances
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {inventory.runningEc2Instances} Running • {inventory.stoppedEc2Instances} Stopped
              </div>
            </div>
            <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
              <Server className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Running Instances (Active Burn)
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {inventory.runningEc2Instances} Machines
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                Generating hourly compute charges
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Stopped Instances (Disk Only)
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {inventory.stoppedEc2Instances} Machines
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Only billing for EBS hard drive storage
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <XCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total S3 Storage Buckets
              </div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {inventory.totalS3Buckets} Buckets
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Across account cloud storage
              </div>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => setActiveTab('ec2')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ec2'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'
            }`}
          >
            EC2 Machines ({inventory?.totalEc2Instances || 0})
          </button>
          <button
            onClick={() => setActiveTab('s3')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 's3'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'
            }`}
          >
            S3 Buckets ({inventory?.totalS3Buckets || 0})
          </button>
          <button
            onClick={() => setActiveTab('rds')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'rds'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300'
            }`}
          >
            RDS Databases ({inventory?.rdsInstances?.length || 0})
          </button>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          {activeTab === 'ec2' && (
            <div className="flex items-center space-x-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl">
              {(['all', 'running', 'stopped'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStateFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    stateFilter === st
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search machine name, ID, IP..."
              className="w-full pl-10 pr-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-transparent focus:border-brand-500 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* EC2 Machine Cards / Table */}
      {activeTab === 'ec2' && (
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center text-slate-400 animate-pulse">
              Scanning EC2 instances across active regions...
            </div>
          ) : filteredEc2.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200 dark:border-slate-700">
              No EC2 instances match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEc2.map((inst) => {
                const isRunning = inst.state === 'running';
                return (
                  <div
                    key={inst.instanceId}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3 flex flex-col justify-between hover:border-brand-500 transition-all"
                  >
                    <div>
                      {/* Name & State */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate">
                            {inst.name}
                          </h3>
                          <span className="font-mono text-xs text-slate-400 block truncate">
                            {inst.instanceId}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                            isRunning
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span className="capitalize">{inst.state}</span>
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Instance Size</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{inst.instanceType}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Region</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{inst.region}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Private IP</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{inst.privateIp || 'N/A'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/30">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Public IP</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{inst.publicIp || 'None'}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      {Object.keys(inst.tags).length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Resource Tags:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(inst.tags).map(([k, v]) => {
                              if (k === 'Name') return null;
                              return (
                                <span
                                  key={k}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px]"
                                  title={`${k}: ${v}`}
                                >
                                  <strong>{k}</strong>: {v}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* S3 Buckets Directory */}
      {activeTab === 's3' && (
        <div className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">#</th>
                  <th className="py-3.5 px-4">S3 Bucket Name</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4">Storage Service</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredS3.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs text-slate-400">
                      No S3 buckets match your search.
                    </td>
                  </tr>
                ) : (
                  filteredS3.map((b, idx) => (
                    <tr key={b.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {b.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {b.creationDate ? new Date(b.creationDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-xs text-brand-600 font-medium">
                        Amazon Simple Storage Service (S3)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RDS Databases Directory */}
      {activeTab === 'rds' && (
        <div className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 animate-pulse">
              Scanning RDS relational database instances across active regions...
            </div>
          ) : filteredRds.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Database className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No active RDS Database instances found
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {search
                  ? 'No RDS databases match your search filter.'
                  : 'Your AWS account currently has 0 provisioned RDS database instances in the scanned regions.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/70 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">DB Identifier</th>
                    <th className="py-3.5 px-4">Engine</th>
                    <th className="py-3.5 px-4">Instance Class</th>
                    <th className="py-3.5 px-4">Region</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredRds.map((db) => (
                    <tr key={`${db.region}:${db.dbInstanceIdentifier}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {db.dbInstanceIdentifier}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                        {db.engine}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {db.dbInstanceClass}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {db.region}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            db.status === 'available'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              db.status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                          <span className="capitalize">{db.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
