import React, { useState, useEffect } from 'react';
import {
  GitFork,
  ChevronRight,
  ChevronDown,
  Layers,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info
} from 'lucide-react';
import { fetchDrillDown } from '../api/client.js';
import { DrillDownNode } from '../../shared/types.js';
import { ExplainModal } from '../components/common/ExplainModal.js';

interface DrillDownPageProps {
  selectedMonth?: string;
}

export const DrillDownPage: React.FC<DrillDownPageProps> = ({ selectedMonth }) => {
  const [tree, setTree] = useState<DrillDownNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(['root-total', 'cat-compute']));
  const [selectedNode, setSelectedNode] = useState<DrillDownNode | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchDrillDown(selectedMonth)
      .then((data) => {
        setTree(data);
        setSelectedNode(data);
        if (data.children && data.children.length > 0) {
          setExpandedKeys(new Set(['root-total', data.children[0].key]));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedMonth]);

  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const renderNode = (node: DrillDownNode, depth: number = 0) => {
    const isExpanded = expandedKeys.has(node.key);
    const isSelected = selectedNode?.key === node.key;

    return (
      <div key={node.key} className="space-y-1">
        <div
          onClick={() => setSelectedNode(node)}
          style={{ paddingLeft: `${Math.max(12, depth * 24)}px` }}
          className={`flex items-center justify-between py-2.5 pr-4 rounded-xl cursor-pointer transition-all ${
            isSelected
              ? 'bg-brand-500/10 border border-brand-500/30 text-brand-900 dark:text-brand-200 font-bold'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className="flex items-center space-x-2 truncate">
            {node.hasChildren ? (
              <button
                onClick={(e) => toggleExpand(node.key, e)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <span className="w-6 text-center text-slate-400 text-xs">•</span>
            )}
            <span className="text-xs uppercase font-bold text-slate-400 mr-1">
              [{node.levelName}]
            </span>
            <span className="text-sm truncate">
              {node.name}
            </span>
          </div>

          <div className="flex items-center space-x-3 shrink-0 ml-2">
            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
              ${node.cost.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({node.percentOfParent}% of parent)
            </span>
          </div>
        </div>

        {node.hasChildren && isExpanded && node.children && (
          <div className="space-y-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading || !tree) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse">
        Building progressive spending tree...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Cost Drill-Down Explorer
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Progressively navigate from high-level account spending down to individual servers and disks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tree Navigation */}
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <GitFork className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Hierarchical Hierarchy
              </h2>
            </div>
            <span className="text-xs text-slate-400">Click any level to inspect</span>
          </div>

          <div className="space-y-1 overflow-x-auto py-2">
            {renderNode(tree, 0)}
          </div>
        </div>

        {/* Right: Selected Node Detail Panel */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-5 h-fit sticky top-24">
          {selectedNode ? (
            <>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Level {selectedNode.level}: {selectedNode.levelName}
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                  {selectedNode.name}
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-700 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Total Billed:</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    ${selectedNode.cost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Share of Parent:</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    {selectedNode.percentOfParent}%
                  </span>
                </div>
                {selectedNode.changePercent !== undefined && (
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>MoM Change:</span>
                    <span className={`font-bold ${selectedNode.changePercent > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {selectedNode.changePercent > 0 ? `+${selectedNode.changePercent}%` : `${selectedNode.changePercent}%`}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <Info className="w-4 h-4 text-brand-500" />
                  <span>Plain-English Explanation</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-700/20 p-3.5 rounded-xl">
                  {selectedNode.explanation}
                </p>
              </div>
            </>
          ) : (
            <div className="text-center text-sm text-slate-400 py-12">
              Select any level in the hierarchy to inspect its cost drivers.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
