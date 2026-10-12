import React, { useState, useEffect } from 'react';
import {
  Users,
  Activity,
  Search,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Filter
} from 'lucide-react';
import { fetchCloudTrailActivity } from '../api/client.js';
import { CloudTrailActivityItem } from '../../shared/types.js';

export const ActivityPage: React.FC = () => {
  const [data, setData] = useState<{
    events: CloudTrailActivityItem[];
    topUsers: { username: string; count: number }[];
    topActions: { action: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  useEffect(() => {
    fetchCloudTrailActivity(80)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredEvents = (data?.events || []).filter((ev) => {
    const matchesUser = selectedUser === 'all' || ev.username === selectedUser;
    const matchesSearch =
      ev.username.toLowerCase().includes(search.toLowerCase()) ||
      ev.eventName.toLowerCase().includes(search.toLowerCase()) ||
      (ev.resourceName && ev.resourceName.toLowerCase().includes(search.toLowerCase()));
    return matchesUser && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          IAM User Activity & Audit Logs
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track which IAM users or automation roles are calling AWS APIs, touching servers, and generating operational activity.
        </p>
      </div>

      {/* Top Active Users Callout */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-brand-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Most Active IAM Users
              </h2>
            </div>
            <div className="space-y-2">
              {data.topUsers.slice(0, 4).map((u, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedUser(selectedUser === u.username ? 'all' : u.username)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedUser === u.username
                      ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-500 font-bold'
                      : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200/60 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                    {u.username}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white dark:bg-slate-800 text-brand-600 shadow-sm">
                    {u.count} events
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Top AWS API Actions Invoked
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {data.topActions.slice(0, 10).map((act, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200/60 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center space-x-2"
                >
                  <strong className="text-slate-900 dark:text-white font-mono">{act.action}</strong>
                  <span className="text-[10px] text-slate-400">({act.count} calls)</span>
                </span>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
              Retrieved safely via read-only AWS CloudTrail lookup. Zero logs or resources are modified.
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">Filter user:</span>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 border-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Users & Roles</option>
            {data?.topUsers.map((u) => (
              <option key={u.username} value={u.username}>
                {u.username} ({u.count})
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or resource name..."
            className="w-full pl-10 pr-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-transparent focus:border-brand-500 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            Loading recent AWS audit activity...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No activity events found matching your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 dark:bg-slate-700/40 border-b border-slate-100 dark:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">IAM User / Actor</th>
                  <th className="py-3.5 px-4">Action Invoked</th>
                  <th className="py-3.5 px-4">Target Resource</th>
                  <th className="py-3.5 px-4">Region</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredEvents.map((ev) => (
                  <tr key={ev.eventId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(ev.eventTime).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">
                        {ev.username}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                      {ev.eventName}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 font-mono truncate max-w-xs">
                      {ev.resourceName || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {ev.region}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
