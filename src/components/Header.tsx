import React from 'react';
import { Printer, Copy, Check, Sparkles, BookOpen, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  onOpenCompose: () => void;
  onOpenTemplates: () => void;
  onOpenCritique: () => void;
  onPrint: () => void;
  onCopy: () => void;
  copied: boolean;
  wordCount: number;
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCompose,
  onOpenTemplates,
  onOpenCritique,
  onPrint,
  onCopy,
  copied,
  wordCount,
  activeNav,
  setActiveNav,
}) => {
  return (
    <header className="no-print bg-stone-50 border-b border-stone-200 sticky top-0 z-30 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => setActiveNav('editor')}
            className="text-xl font-serif-cormorant font-bold tracking-tight text-stone-900 whitespace-nowrap hover:text-amber-900 transition-colors text-left"
          >
            Epistle
          </button>
          <span className="hidden sm:inline text-xs text-stone-400 font-normal">·</span>
          <span className="hidden sm:inline text-xs text-stone-500 font-normal">
            Letter Assistant
          </span>
        </div>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          <button
            onClick={onOpenCompose}
            className="flex items-center gap-1.5 hover:text-stone-950 transition-colors whitespace-nowrap shrink-0 text-amber-900 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>AI Compose</span>
          </button>

          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 hover:text-stone-950 transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-stone-500" />
            <span>Letter Templates</span>
          </button>

          <button
            onClick={onOpenCritique}
            className="flex items-center gap-1.5 hover:text-stone-950 transition-colors whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
            <span>AI Critique & Tone</span>
          </button>

          <span className="text-xs text-stone-400 tabular-nums whitespace-nowrap shrink-0">
            {wordCount} words
          </span>
        </nav>

        {/* Zone 3: 1 primary action with secondary copy button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onCopy}
            className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-md hover:bg-stone-50 hover:text-stone-900 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-xs"
            title="Copy letter to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span className="hidden sm:inline">Copy Text</span>
              </>
            )}
          </button>

          <button
            onClick={onPrint}
            className="px-4 py-1.5 text-xs font-medium text-stone-50 bg-stone-900 rounded-md hover:bg-stone-800 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-stone-300" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>
    </header>
  );
};
