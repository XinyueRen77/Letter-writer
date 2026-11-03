import React, { useState, useEffect } from 'react';
import { LetterData } from '../types/letter';
import { RefreshCw, X, Loader2, ArrowRight } from 'lucide-react';
import { fetchWithRetry } from '../utils/api';

interface AlternativesModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'openings' | 'closings' | 'postscripts';
  letter: LetterData;
  onSelectOption: (text: string) => void;
}

export const AlternativesModal: React.FC<AlternativesModalProps> = ({
  isOpen,
  onClose,
  type,
  letter,
  onSelectOption,
}) => {
  const [options, setOptions] = useState<{ label: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAlternatives();
    }
  }, [isOpen, type]);

  const title =
    type === 'openings'
      ? 'Alternative Salutations & Greetings'
      : type === 'closings'
      ? 'Alternative Complimentary Sign-Offs'
      : 'Alternative Postscripts (P.S.)';

  const fetchAlternatives = async () => {
    setLoading(true);
    setError(null);
    setRetryStatus(null);
    try {
      const context = `Salutation: ${letter.salutation}\nFirst paragraph: ${letter.paragraphs[0] || ''}\nClosing: ${letter.complimentaryClose}\nSignature: ${letter.signatureName}`;
      const response = await fetchWithRetry('/api/letter/alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
        maxRetries: 3,
        initialDelayMs: 1500,
        onRetry: (attempt, maxRetries) => {
          setRetryStatus(`Service busy (503). Retrying (${attempt}/${maxRetries})...`);
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch options.');
      }
      setOptions(data.options || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating alternatives.');
    } finally {
      setLoading(false);
      setRetryStatus(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-stone-50 border border-stone-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-700" />
            <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-stone-500">
              <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
              <span className="text-xs">
                {retryStatus || 'Generating tasteful phrasing options...'}
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md">
              <p>{error}</p>
              <button
                onClick={fetchAlternatives}
                className="mt-1 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && options.map((opt, i) => (
            <div
              key={i}
              className="p-3 bg-white border border-stone-200 rounded-lg hover:border-amber-400 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
            >
              <div>
                <span className="text-[10px] text-amber-900 font-semibold uppercase tracking-wider block">
                  {opt.label}
                </span>
                <span className="font-serif-cormorant text-base text-stone-900 block mt-0.5">
                  {opt.text}
                </span>
              </div>
              <button
                onClick={() => {
                  onSelectOption(opt.text);
                  onClose();
                }}
                className="px-2.5 py-1.5 bg-stone-900 text-white rounded text-xs font-medium hover:bg-stone-800 transition-colors flex items-center gap-1 shrink-0"
              >
                <span>Use</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-stone-200 bg-white flex justify-between items-center text-xs">
          <button
            onClick={fetchAlternatives}
            disabled={loading}
            className="text-stone-600 hover:text-stone-900 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Generate more</span>
          </button>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
