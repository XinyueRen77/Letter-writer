import React, { useState } from 'react';
import { LetterData } from '../types/letter';
import { MessageSquarePlus, Send, Loader2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { fetchWithRetry } from '../utils/api';

interface FollowUpBoxProps {
  letter: LetterData;
  onLetterRevised: (revised: LetterData, summary?: string) => void;
  isRefining: boolean;
  setIsRefining: (val: boolean) => void;
}

export const FollowUpBox: React.FC<FollowUpBoxProps> = ({
  letter,
  onLetterRevised,
  isRefining,
  setIsRefining,
}) => {
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [retryInfo, setRetryInfo] = useState<{
    attempt: number;
    maxRetries: number;
    delayMs: number;
    reason: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quickRevisions = [
    'Make it softer and more diplomatic',
    'Make it firmer and more assertive',
    'Add a clear 2-week notice transition plan',
    'Shorten and make more concise',
    'Keep it strictly professional and dignified',
    'Add a sincere expression of gratitude for the team',
  ];

  const handleRevise = async (customText?: string) => {
    const textToApply = customText || revisionPrompt;
    if (!textToApply.trim()) return;

    setIsRefining(true);
    setError(null);
    setRetryInfo(null);

    try {
      const response = await fetchWithRetry('/api/letter/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter,
          revision: textToApply.trim(),
        }),
        maxRetries: 3,
        initialDelayMs: 1500,
        onRetry: (attempt, maxRetries, delayMs, reason) => {
          setRetryInfo({ attempt, maxRetries, delayMs, reason });
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply revision.');
      }

      const refined = data.letter;
      const updated: LetterData = {
        ...letter,
        date: refined.date || letter.date,
        senderBlock: refined.senderBlock !== undefined ? refined.senderBlock : letter.senderBlock,
        recipientBlock: refined.recipientBlock !== undefined ? refined.recipientBlock : letter.recipientBlock,
        subject: refined.subject !== undefined ? refined.subject : letter.subject,
        salutation: refined.salutation || letter.salutation,
        paragraphs: refined.paragraphs || letter.paragraphs,
        complimentaryClose: refined.complimentaryClose || letter.complimentaryClose,
        signatureName: refined.signatureName || letter.signatureName,
        postscript: refined.postscript !== undefined ? refined.postscript : letter.postscript,
        aiWritingNote: refined.changeSummary || 'Revision applied.',
        updatedAt: Date.now(),
      };

      onLetterRevised(updated, data.summary || `Applied revision: "${textToApply.slice(0, 35)}..."`);
      setRevisionPrompt('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to apply revision. Service busy.');
    } finally {
      setIsRefining(false);
      setRetryInfo(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRevise();
  };

  return (
    <div className="no-print w-full max-w-[820px] px-4 mt-6 mb-8">
      <div className="bg-white border border-stone-200/90 rounded-xl shadow-xs p-5 transition-all">
        {/* Label */}
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <MessageSquarePlus className="w-3.5 h-3.5 text-amber-700" />
            <span>Ask for revisions & adjustments</span>
          </label>
          <span className="text-[11px] text-stone-400">Describe what to change</span>
        </div>

        {/* Revision Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={revisionPrompt}
              onChange={(e) => setRevisionPrompt(e.target.value)}
              disabled={isRefining}
              placeholder="e.g. 'Make it firmer and specify a 2-week notice period', 'Soften the tone', 'Add a paragraph thanking them for the early mentorship'..."
              className="flex-1 px-3.5 py-2.5 text-sm bg-stone-50/60 border border-stone-300/80 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600/30 focus:border-amber-700 text-stone-900 placeholder:text-stone-400"
            />
            <button
              type="submit"
              disabled={isRefining || !revisionPrompt.trim()}
              className="px-4 py-2.5 text-xs font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
            >
              {isRefining ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                  <span>
                    {retryInfo
                      ? `Retrying (${retryInfo.attempt}/${retryInfo.maxRetries})...`
                      : 'Revising...'}
                  </span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Revise</span>
                </>
              )}
            </button>
          </div>

          {/* 503 Retry Notification */}
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

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Revision Error</p>
                <p className="mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={() => handleRevise()}
                  className="mt-1.5 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded text-[11px] font-semibold"
                >
                  Retry Revision
                </button>
              </div>
            </div>
          )}

          {/* Quick Revision Suggestion Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] text-stone-400 select-none flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Quick tweaks:</span>
            </span>
            {quickRevisions.map((qr, idx) => (
              <button
                type="button"
                key={idx}
                disabled={isRefining}
                onClick={() => handleRevise(qr)}
                className="text-[11px] text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-md transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
};
