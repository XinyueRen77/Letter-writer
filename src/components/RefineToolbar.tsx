import React, { useState } from 'react';
import { LetterData, LetterTone, StationeryStyle, FontChoice } from '../types/letter';
import {
  Wand2,
  Sparkles,
  Heart,
  Briefcase,
  Minimize2,
  Send,
  Loader2,
  Palette,
  Type as TypeIcon,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { fetchWithRetry } from '../utils/api';

interface RefineToolbarProps {
  letter: LetterData;
  onLetterUpdated: (updated: LetterData, summary?: string) => void;
  isRefining: boolean;
  setIsRefining: (val: boolean) => void;
  canUndo: boolean;
  onUndo: () => void;
  statusMessage: string | null;
}

export const RefineToolbar: React.FC<RefineToolbarProps> = ({
  letter,
  onLetterUpdated,
  isRefining,
  setIsRefining,
  canUndo,
  onUndo,
  statusMessage,
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);

  const handleRefine = async (instruction: string, customText?: string) => {
    setIsRefining(true);
    setRetryStatus(null);

    try {
      const response = await fetchWithRetry('/api/letter/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter,
          instruction,
          customPrompt: customText || '',
        }),
        maxRetries: 3,
        initialDelayMs: 1500,
        onRetry: (attempt, maxRetries) => {
          setRetryStatus(`Service busy (503). Retrying automatically (${attempt}/${maxRetries})...`);
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to refine letter.');
      }

      const refined = data.letter;
      const updated: LetterData = {
        ...letter,
        date: refined.date || letter.date,
        salutation: refined.salutation || letter.salutation,
        paragraphs: refined.paragraphs || letter.paragraphs,
        complimentaryClose: refined.complimentaryClose || letter.complimentaryClose,
        signatureName: refined.signatureName || letter.signatureName,
        postscript: refined.postscript !== undefined ? refined.postscript : letter.postscript,
        aiWritingNote: refined.changeSummary || 'Refined with AI.',
        updatedAt: Date.now(),
      };

      onLetterUpdated(updated, data.summary);
      setCustomPrompt('');
      setShowCustomInput(false);
    } catch (err: any) {
      console.error(err);
      onLetterUpdated(letter, err.message || 'Unable to complete refinement. Service busy.');
    } finally {
      setIsRefining(false);
      setRetryStatus(null);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    handleRefine('custom', customPrompt.trim());
  };

  return (
    <div className="no-print bg-stone-50 border-b border-stone-200 px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Quick AI Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-stone-400 font-medium mr-1 select-none flex items-center gap-1">
            <Wand2 className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">AI Refine:</span>
          </span>

          <button
            onClick={() => handleRefine('polish')}
            disabled={isRefining}
            className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-stone-700 hover:text-stone-900 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
            title="Fix grammar, enhance eloquence & rhythm"
          >
            <span>Polish & Flow</span>
          </button>

          <button
            onClick={() => handleRefine('more_warm')}
            disabled={isRefining}
            className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-stone-700 hover:text-stone-900 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
            title="Make warmer & more personal"
          >
            <Heart className="w-3 h-3 text-rose-500" />
            <span>More Warmth</span>
          </button>

          <button
            onClick={() => handleRefine('more_formal')}
            disabled={isRefining}
            className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-stone-700 hover:text-stone-900 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
            title="Make more formal & executive"
          >
            <Briefcase className="w-3 h-3 text-stone-600" />
            <span>More Formal</span>
          </button>

          <button
            onClick={() => handleRefine('more_concise')}
            disabled={isRefining}
            className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-stone-700 hover:text-stone-900 transition-colors flex items-center gap-1 font-medium disabled:opacity-50"
            title="Condense and remove fluff"
          >
            <Minimize2 className="w-3 h-3 text-stone-600" />
            <span>Shorten</span>
          </button>

          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            disabled={isRefining}
            className={`px-2.5 py-1.5 border rounded-md transition-colors flex items-center gap-1 font-medium ${
              showCustomInput
                ? 'bg-amber-100/70 border-amber-300 text-amber-900'
                : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-700" />
            <span>Custom Prompt</span>
          </button>

          {canUndo && (
            <button
              onClick={onUndo}
              className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-md transition-colors flex items-center gap-1 font-medium ml-1"
              title="Undo last AI revision"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}

          {isRefining && (
            <span className="flex items-center gap-1.5 text-amber-900 text-xs font-medium ml-2 animate-pulse bg-amber-50 px-2 py-1 rounded border border-amber-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
              <span>{retryStatus || 'Refining letter...'}</span>
            </span>
          )}
        </div>

        {/* Right: Stationery & Typography controls */}
        <div className="flex items-center gap-3">
          {/* Paper Texture Selector */}
          <div className="flex items-center gap-1 text-stone-600">
            <Palette className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden lg:inline text-stone-500">Paper:</span>
            <div className="flex p-0.5 bg-stone-200/60 rounded-md gap-0.5">
              {(
                [
                  { id: 'linen', label: 'Linen' },
                  { id: 'parchment', label: 'Parchment' },
                  { id: 'modern', label: 'White' },
                  { id: 'slate', label: 'Slate' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onLetterUpdated({ ...letter, stationery: s.id })}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    letter.stationery === s.id
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Selector */}
          <div className="flex items-center gap-1 text-stone-600">
            <TypeIcon className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden lg:inline text-stone-500">Font:</span>
            <div className="flex p-0.5 bg-stone-200/60 rounded-md gap-0.5">
              {(
                [
                  { id: 'serif-cormorant', label: 'Garamond' },
                  { id: 'serif-lora', label: 'Lora' },
                  { id: 'sans', label: 'Sans' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => onLetterUpdated({ ...letter, font: f.id })}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    letter.font === f.id
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Custom Instruction Input Bar */}
      {showCustomInput && (
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-stone-200">
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. 'Add a sentence mentioning our upcoming trip', 'Make it sound more poetic', 'Emphasize deadline politely'"
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-stone-900"
              autoFocus
            />
            <button
              type="submit"
              disabled={isRefining || !customPrompt.trim()}
              className="px-3 py-1.5 text-xs font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-md transition-colors flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>Apply Instruction</span>
            </button>
          </form>
        </div>
      )}

      {/* Status Summary notification */}
      {statusMessage && (
        <div className="max-w-7xl mx-auto mt-1.5 text-[11px] text-amber-900 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
