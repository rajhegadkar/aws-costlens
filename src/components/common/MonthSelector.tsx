import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check, Sparkles } from 'lucide-react';
import { MonthOption } from '../../../shared/types.js';

interface MonthSelectorProps {
  availableMonths: MonthOption[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  availableMonths,
  selectedMonth,
  onMonthChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const currentOption = availableMonths.find((m) => m.value === selectedMonth) || availableMonths[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 bg-orange-50/80 dark:bg-slate-800 border-orange-200 dark:border-slate-700 text-orange-950 dark:text-slate-100 hover:bg-orange-100/70 dark:hover:bg-slate-700/80"
        title="Select billing month or historical period"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Calendar className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
        <span className="truncate max-w-[150px] sm:max-w-[200px]">
          {currentOption ? currentOption.label : 'Select Month'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-orange-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-2xl z-50 p-1.5 focus:outline-none animate-in fade-in zoom-in-95 duration-150 scrollbar-thin"
        >
          <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>Billing Period / Invoice Month</span>
            <span>12 Months Available</span>
          </div>

          <div className="py-1 space-y-0.5">
            {availableMonths.map((month) => {
              const isSelected = month.value === selectedMonth;
              return (
                <button
                  key={month.value}
                  type="button"
                  onClick={() => {
                    onMonthChange(month.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isSelected
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 font-bold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="truncate">{month.label}</span>
                    {month.isCurrent && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        Live MTD
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
