import React, { useState, useEffect } from 'react';
import { Tags, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { fetchTags } from '../api/client.js';
import { TagSpendingItem } from '../../shared/types.js';

interface TagsPageProps {
  selectedMonth?: string;
}

export const TagsPage: React.FC<TagsPageProps> = ({ selectedMonth }) => {
  const [tagData, setTagData] = useState<{
    tags: TagSpendingItem[];
    tagsAvailable: boolean;
    explanation: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchTags(selectedMonth)
      .then((data) => {
        setTagData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth]);

  if (loading || !tagData) {
    return <div className="p-12 text-center text-slate-400">Loading cost allocation tags...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Cost Allocation Tags
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Analyze cloud spending segmented by Environment, Project, Team, or Business Unit.
        </p>
      </div>

      {/* Explanation Banner */}
      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 flex items-start space-x-3 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Important AWS Cost Allocation Tag Requirement:</span> In AWS, simply adding tags to resources in the console is not enough. You must explicitly activate tags in the <span className="font-semibold underline">AWS Billing Console &gt; Cost Allocation Tags</span> section before Cost Explorer can track them.
        </div>
      </div>

      {/* Tags Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tagData.tags.map((t, idx) => (
          <div
            key={idx}
            className="p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 font-bold text-xs">
                  {t.tagKey}
                </span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                  = {t.tagValue}
                </span>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-slate-900 dark:text-white">
                  ${t.cost.toFixed(2)}
                </div>
                <div className="text-xs text-slate-400">
                  {t.percentOfTotal}% of spend
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Top Services Charged Under This Tag:
              </span>
              <div className="flex flex-wrap gap-2">
                {t.services.map((srv, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200/60 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200"
                  >
                    {srv.name}: <strong className="text-slate-900 dark:text-white">${srv.cost.toFixed(2)}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
