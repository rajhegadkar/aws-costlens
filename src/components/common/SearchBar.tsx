import React, { useState } from 'react';
import { Search, Sparkles, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { executeSearch } from '../../api/client.js';
import { SearchQueryResult } from '../../../shared/types.js';

interface SearchBarProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchQueryResult | null>(null);

  const SUGGESTED_QUERIES = [
    'Why did my AWS bill increase?',
    'How much am I spending on EC2?',
    'Where is my storage spending going?',
    'Which region is costing me the most?',
    'Are my database costs going down?'
  ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setIsOpen(true);
    try {
      const res = await executeSearch(searchQuery);
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    }
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything (e.g. 'Why did my bill increase?', 'EC2 spend')..."
          className="w-full pl-10 pr-24 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResult(null);
                setIsOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => handleSearch(query)}
            className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors flex items-center space-x-1"
          >
            <span>Ask</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      {!isOpen && !query && (
        <div className="hidden lg:flex items-center space-x-1.5 mt-1.5 text-xs text-slate-400 dark:text-slate-500 overflow-x-auto py-0.5">
          <Sparkles className="w-3 h-3 text-brand-500 shrink-0" />
          <span className="shrink-0 font-medium">Try asking:</span>
          {SUGGESTED_QUERIES.slice(0, 3).map((sq, i) => (
            <button
              key={i}
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              className="hover:text-brand-600 dark:hover:text-brand-400 truncate underline underline-offset-2 shrink-0 text-left transition-colors"
            >
              "{sq}"
            </button>
          ))}
        </div>
      )}

      {/* Results Dropdown */}
      {isOpen && result && (
        <div className="absolute left-0 right-0 top-full mt-2 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {result.title}
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3">
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {result.summary}
            </p>

            {result.highlightNumber && (
              <div className="mt-2.5 inline-block px-3 py-1 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-extrabold text-sm border border-brand-200 dark:border-brand-800">
                Key Figure: {result.highlightNumber}
              </div>
            )}
          </div>

          {result.suggestedAction && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate(result.suggestedAction!.page, result.suggestedAction!.params);
                }}
                className="flex items-center space-x-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 hover:underline"
              >
                <span>{result.suggestedAction.label}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
