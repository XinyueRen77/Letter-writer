import React, { useState } from 'react';
import { LetterTone, LetterData } from '../types/letter';
import { Sparkles, X, Loader2, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';
import { fetchWithRetry } from '../utils/api';

interface ComposeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLetterGenerated: (letter: LetterData) => void;
  currentLetter: LetterData;
}

export const ComposeDrawer: React.FC<ComposeDrawerProps> = ({
  isOpen,
  onClose,
  onLetterGenerated,
  currentLetter,
}) => {
  const [purpose, setPurpose] = useState('Notice of Resignation');
  const [recipientName, setRecipientName] = useState('Manager');
  const [recipientTitle, setRecipientTitle] = useState('Team Lead / Director');
  const [senderName, setSenderName] = useState(currentLetter.signatureName || '');
  const [keyPoints, setKeyPoints] = useState(
    'Resigning from my current role. Express feelings of stress, exhaustion, and feeling unappreciated, while maintaining professional poise, self-respect, and clear boundary-setting.'
  );
  const [tone, setTone] = useState<LetterTone>('diplomatic');
  const [length, setLength] = useState<'concise' | 'balanced' | 'detailed'>('balanced');
  const [includeSubject, setIncludeSubject] = useState(true);
  const [includePs, setIncludePs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [retryInfo, setRetryInfo] = useState<{
    attempt: number;
    maxRetries: number;
    delayMs: number;
    reason: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const quickPurposes = [
    'Notice of Resignation',
    'Thank You Letter',
    'Reconnecting with Friend',
    'Letter of Recommendation',
    'Apology & Amends',
    'Condolence / Sympathy',
    'Landlord Maintenance Notice',
    'Client Follow-up / Overdue Invoice',
    'Job Application / Cover Letter',
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setRetryInfo(null);

    try {
      const response = await fetchWithRetry('/api/letter/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose,
          recipient: {
            name: recipientName,
            title: recipientTitle,
          },
          sender: {
            name: senderName,
          },
          keyPoints,
          tone,
          length,
          includeSubject,
          includePs,
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
        title: purpose || 'Generated Letter',
        date: generated.date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        senderBlock: generated.senderBlock || (senderName ? `${senderName}` : ''),
        recipientBlock: generated.recipientBlock || (recipientName ? `${recipientName}` : ''),
        subject: generated.subject || '',
        salutation: generated.salutation || `Dear ${recipientName || 'Manager'},`,
        paragraphs: generated.paragraphs && generated.paragraphs.length > 0
          ? generated.paragraphs
          : ['I am writing to formally submit my resignation.'],
        complimentaryClose: generated.complimentaryClose || 'Sincerely,',
        signatureName: generated.signatureName || senderName || 'Sender',
        postscript: generated.postscript || '',
        aiWritingNote: generated.aiWritingNote || '',
        stationery: currentLetter.stationery,
        font: currentLetter.font,
        updatedAt: Date.now(),
      };

      onLetterGenerated(newLetter);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Something went wrong while generating the letter.');
    } finally {
      setLoading(false);
      setRetryInfo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-stone-50 border border-stone-200 rounded-xl shadow-2xl w-full max-w-2xl my-8 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-700" />
            <h2 className="text-base font-semibold text-stone-900">
              Compose Letter with AI
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Retry Status Indicator */}
          {retryInfo && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2.5 animate-pulse">
              <RefreshCw className="w-4 h-4 text-amber-700 animate-spin shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-950">
                  AI service is temporarily busy (503 UNAVAILABLE)
                </p>
                <p className="mt-0.5 text-amber-800">
                  Retrying automatically (Attempt {retryInfo.attempt} of {retryInfo.maxRetries} in {Math.round(retryInfo.delayMs / 1000)}s)... Please wait.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Generation Error</p>
                <p className="mt-0.5">{errorMessage}</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="mt-2 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded text-[11px] font-semibold transition-colors"
                >
                  Retry Now
                </button>
              </div>
            </div>
          )}

          {/* Purpose / Occasion */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              Letter Purpose or Occasion
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-stone-900"
              placeholder="e.g. Notice of Resignation, Thank you letter"
              required
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickPurposes.slice(0, 5).map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setPurpose(q)}
                  className="text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded transition-colors whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient & Sender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-stone-900"
                placeholder="e.g. Sarah Jenkins (Manager)"
              />
              <input
                type="text"
                value={recipientTitle}
                onChange={(e) => setRecipientTitle(e.target.value)}
                className="w-full mt-2 px-3 py-1.5 text-xs bg-white border border-stone-200 rounded-md text-stone-600 focus:outline-none"
                placeholder="Title or Department (e.g. Engineering Director)"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Sender Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-stone-900"
                placeholder="e.g. Julian Mercer"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Used in sign-off and signature block
              </p>
            </div>
          </div>

          {/* Key Points / Core Message */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
              Key Thoughts, Context & Specifics
            </label>
            <textarea
              rows={4}
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-stone-900 placeholder:text-stone-400"
              placeholder="Jot down feelings, dates, notice period, handover intentions, or specific circumstances..."
            />
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              Letter Tone
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { value: 'diplomatic', label: 'Diplomatic & Balanced', desc: 'Tactful, fair, measured' },
                { value: 'assertive', label: 'Firm & Assertive', desc: 'Clear boundaries, self-respect' },
                { value: 'formal', label: 'Formal & Polite', desc: 'Courteous, dignified, professional' },
                { value: 'warm', label: 'Warm & Sincere', desc: 'Heartfelt, gracious, personal' },
                { value: 'poetic', label: 'Thoughtful & Poetic', desc: 'Literary, reflective' },
                { value: 'persuasive', label: 'Persuasive & Compelling', desc: 'Inspiring, value-driven' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setTone(t.value as LetterTone)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    tone === t.value
                      ? 'border-amber-700 bg-amber-50/70 text-stone-900 shadow-xs'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
                  <div className="text-xs font-semibold">{t.label}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Length & Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Length
              </label>
              <div className="flex rounded-md p-1 bg-stone-200/70 gap-1">
                {(['concise', 'balanced', 'detailed'] as const).map((l) => (
                  <button
                    type="button"
                    key={l}
                    onClick={() => setLength(l)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded capitalize transition-all ${
                      length === l
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-end gap-2 text-xs text-stone-700">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSubject}
                  onChange={(e) => setIncludeSubject(e.target.checked)}
                  className="rounded border-stone-300 text-amber-700 focus:ring-amber-500"
                />
                <span>Include formal subject line</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includePs}
                  onChange={(e) => setIncludePs(e.target.checked)}
                  className="rounded border-stone-300 text-amber-700 focus:ring-amber-500"
                />
                <span>Include lingering Postscript (P.S.)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold text-stone-50 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 rounded-md transition-colors flex items-center gap-2 shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>
                    {retryInfo
                      ? `Retrying (${retryInfo.attempt}/${retryInfo.maxRetries})...`
                      : 'Drafting Letter...'}
                  </span>
                </>
              ) : (
                <>
                  <span>Draft Letter</span>
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
