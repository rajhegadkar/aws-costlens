import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface FloatingAskButtonProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const FloatingAskButton: React.FC<FloatingAskButtonProps> = ({
  currentPage,
  onNavigate
}) => {
  // Hide if already on the Ask Question page
  if (currentPage === 'ask') {
    return null;
  }

  return (
    <aside
      aria-label="FinOps Assistant Quick Access"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group"
    >
      <button
        onClick={() => onNavigate('ask')}
        className="flex items-center space-x-2.5 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm shadow-xl shadow-orange-500/30 hover:shadow-orange-500/45 hover:-translate-y-0.5 active:translate-y-0 transition-all border border-white/20 backdrop-blur-sm"
        title="Ask CostLens FinOps Questions & Instant Explanations"
      >
        <div className="relative flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-ping opacity-75" />
        </div>
        <span className="tracking-tight font-extrabold">Ask CostLens</span>
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-black/20 text-[10px] font-mono tracking-wider uppercase border border-white/10">
          Q&A
        </span>
        <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform hidden sm:inline" />
      </button>
    </aside>
  );
};
