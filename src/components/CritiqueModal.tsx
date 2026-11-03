import React, { useState, useEffect } from 'react';
import { LetterData, LetterCritique } from '../types/letter';
import { SlidersHorizontal, X, Loader2, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { fetchWithRetry } from '../utils/api';

interface CritiqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  letter: LetterData;
  onApplySalutation: (salutation: string) => void;
  onApplyClose: (close: string) => void;
}

export const CritiqueModal: React.FC<CritiqueModalProps> = ({
  isOpen,
  onClose,
  letter,
  onApplySalutation,
  onApplyClose,
}) => {
  const [critique, setCritique] = useState<LetterCritique | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      runCritique();
    }
  }, [isOpen]);

  const runCritique = async () => {
    setLoading(true);
    setError(null);
    setRetryStatus(null);
    try {
      const response = await fetchWithRetry('/api/letter/critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter,
          intendedAudience: letter.recipientBlock || 'Recipient',
        }),
        maxRetries: 3,
        initialDelayMs: 1500,
        onRetry: (attempt, maxRetries) => {
          setRetryStatus(`Service busy (503). Retrying automatically (${attempt}/${maxRetries})...`);
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze letter.');
      }

      setCritique(data.critique);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to review letter at this time.');
    } finally {
      setLoading(false);
      setRetryStatus(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-stone-50 border border-stone-200 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-700" />
            <h2 className="text-base font-semibold text-stone-900">
              AI Letter Critique & Tone Analysis
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-600">
              <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
              <p className="text-xs font-medium">
                {retryStatus || 'Analyzing tone, clarity, and emotional cadence...'}
              </p>
              {retryStatus && (
                <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                  <span>{retryStatus}</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              <p className="font-semibold mb-1">Critique temporarily unavailable</p>
              <p>{error}</p>
              <button
                onClick={runCritique}
                className="mt-2 text-xs underline font-semibold text-red-900"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && critique && (
            <>
              {/* Overall Verdict */}
              <div className="p-4 bg-white border border-stone-200 rounded-lg">
                <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1">
                  Editorial Verdict
                </div>
                <div className="text-lg font-serif-cormorant font-bold text-stone-900">
                  {critique.overallVerdict}
                </div>
                <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                  {critique.toneAnalysis}
                </p>
              </div>

              {/* Strengths */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Strengths</span>
                </div>
                <div className="space-y-1.5">
                  {critique.strengths.map((str, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-md text-xs text-stone-800 leading-relaxed"
                    >
                      {str}
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Suggestions for Greater Impact</span>
                </div>
                <div className="space-y-1.5">
                  {critique.suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-50/50 border border-amber-100 rounded-md text-xs text-stone-800 leading-relaxed"
                    >
                      {sug}
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternative Greetings */}
              {critique.alternativeSalutations && critique.alternativeSalutations.length > 0 && (
                <div className="pt-2 border-t border-stone-200">
                  <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Alternative Salutations
                  </div>
                  <div className="space-y-1.5">
                    {critique.alternativeSalutations.map((alt, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-white border border-stone-200 rounded-md text-xs text-stone-800 hover:border-amber-400 transition-colors"
                      >
                        <span className="font-serif-cormorant text-sm">{alt}</span>
                        <button
                          onClick={() => {
                            onApplySalutation(alt);
                            onClose();
                          }}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[11px] font-medium flex items-center gap-1"
                        >
                          <span>Apply</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Closings */}
              {critique.alternativeClosings && critique.alternativeClosings.length > 0 && (
                <div className="pt-2 border-t border-stone-200">
                  <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Alternative Complimentary Closings
                  </div>
                  <div className="space-y-1.5">
                    {critique.alternativeClosings.map((alt, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 bg-white border border-stone-200 rounded-md text-xs text-stone-800 hover:border-amber-400 transition-colors"
                      >
                        <span className="font-serif-cormorant text-sm">{alt}</span>
                        <button
                          onClick={() => {
                            onApplyClose(alt);
                            onClose();
                          }}
                          className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[11px] font-medium flex items-center gap-1"
                        >
                          <span>Apply</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
