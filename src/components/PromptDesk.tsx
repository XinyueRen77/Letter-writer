import React, { useState } from 'react';
import { LetterData } from '../types/letter';
import { Sparkles, Loader2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchWithRetry } from '../utils/api';

interface PromptDeskProps {
  onLetterGenerated: (letter: LetterData, summary?: string) => void;
  currentLetter: LetterData;
}

export const PromptDesk: React.FC<PromptDeskProps> = ({
  onLetterGenerated,
  currentLetter,
}) => {
  const [promptText, setPromptText] = useState(
    'Write a resignation letter to my manager. I feel stressed, exhausted, and unappreciated at work.'
  );
  const [loading, setLoading] = useState(false);
  const [retryInfo, setRetryInfo] = useState<{
    attempt: number;
    maxRetries: number;
    delayMs: number;
    reason: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const samplePrompts = [
    'Write a resignation letter to my manager. I feel stressed, exhausted, and unappreciated at work.',
    'Warm thank-you letter to my hosts for a weekend stay and homemade Sunday dinner.',
    'Courteous follow-up to a freelance client regarding an overdue payment for October.',
    'Enthusiastic letter of recommendation for a senior designer applying for a director role.',
    'Firm but polite notice to my landlord requesting urgent repair of a leaking radiator.',
  ];

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptText.trim()) return;

    setLoading(true);
    setError(null);
    setRetryInfo(null);

    try {
      const response = await fetchWithRetry('/api/letter/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText.trim(),
        }),
        maxRetries: 3,
        initialDelayMs: 1500,
        onRetry: (attempt, maxRetries, delayMs, reason) => {
          setRetryInfo({ attempt, maxRetries, delayMs, reason });
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate letter draft');
      }

      const generated = data.letter;

      const newLetter: LetterData = {
        id: 'draft_' + Date.now(),
        title: generated.title || 'Generated Letter',
        date:
          generated.date ||
          new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
        senderBlock: generated.senderBlock || '',
        recipientBlock: generated.recipientBlock || '',
        subject: generated.subject || '',
        salutation: generated.salutation || 'Dear Manager,',
        paragraphs:
          generated.paragraphs && generated.paragraphs.length > 0
            ? generated.paragraphs
            : ['Please accept this letter as formal notice of my resignation.'],
        complimentaryClose: generated.complimentaryClose || 'Sincerely,',
        signatureName: generated.signatureName || currentLetter.signatureName || '[Your Name]',
        postscript: generated.postscript || '',
        aiWritingNote: generated.aiWritingNote || '',
        stationery: currentLetter.stationery,
        font: currentLetter.font,
        updatedAt: Date.now(),
      };

      onLetterGenerated(newLetter, `Drafted letter based on: "${promptText.slice(0, 45)}..."`);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 'Unable to generate letter at this moment. Please check your Gemini API connection.'
      );
    } finally {
      setLoading(false);
      setRetryInfo(null);
    }
  };

  return (
    <div className="no-print w-full max-w-[820px] px-4 pt-6 pb-2">
      <div className="bg-white border border-stone-200/90 rounded-xl shadow-xs p-5 transition-all">
        {/* Label */}
        <div className="flex items-center justify-between mb-2.5">
          <label className="text-xs font-semibold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Describe the letter you want in your own words</span>
          </label>
          <span className="text-[11px] text-stone-400">One prompt does everything</span>
        </div>

        {/* The One Prompt Box */}
        <form onSubmit={handleGenerate} className="space-y-3">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 text-sm sm:text-base text-stone-900 bg-stone-50/60 border border-stone-300/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-700 transition-all placeholder:text-stone-400 resize-y leading-relaxed"
            placeholder="e.g. Write a resignation letter to my manager. I feel stressed, exhausted, and unappreciated at work, but want to keep it professional..."
            disabled={loading}
          />

          {/* 503 Retry Status Alert */}
          {retryInfo && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-950 flex items-start gap-2.5 animate-pulse">
              <RefreshCw className="w-4 h-4 text-amber-700 animate-spin shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  AI service is temporarily busy (503 UNAVAILABLE)
                </p>
                <p className="mt-0.5 text-amber-800">
                  Retrying automatically (Attempt {retryInfo.attempt} of {retryInfo.maxRetries} in {Math.round(retryInfo.delayMs / 1000)}s)...
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Letter Generation Error</p>
                <p className="mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  className="mt-2 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded text-[11px] font-semibold"
                >
                  Retry Now
                </button>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Quick Inspiration Prompts */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
              <span className="text-[11px] text-stone-400 select-none">Quick ideas:</span>
              {samplePrompts.slice(0, 3).map((sp, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setPromptText(sp)}
                  className="text-[11px] text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded transition-colors truncate max-w-[220px]"
                  title={sp}
                >
                  {sp}
                </button>
              ))}
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={loading || !promptText.trim()}
              className="px-5 py-2.5 text-xs font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2 shadow-xs ml-auto shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>
                    {retryInfo
                      ? `Retrying (${retryInfo.attempt}/${retryInfo.maxRetries})...`
                      : 'Generating Letter...'}
                  </span>
                </>
              ) : (
                <>
                  <span>Generate Letter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
