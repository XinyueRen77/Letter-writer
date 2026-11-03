import React, { useState } from 'react';
import { LetterData } from '../types/letter';
import {
  Sparkles,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Wand2,
  Feather,
  RefreshCw,
} from 'lucide-react';

interface LetterCanvasProps {
  letter: LetterData;
  onChange: (updated: LetterData) => void;
  onRefineParagraph: (index: number, action: 'polish' | 'expand' | 'shorten') => Promise<void>;
  onOpenAlternatives: (type: 'openings' | 'closings' | 'postscripts') => void;
  isRefining: boolean;
}

export const LetterCanvas: React.FC<LetterCanvasProps> = ({
  letter,
  onChange,
  onRefineParagraph,
  onOpenAlternatives,
  isRefining,
}) => {
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const fontClass =
    letter.font === 'serif-cormorant'
      ? 'font-serif-cormorant'
      : letter.font === 'serif-lora'
      ? 'font-serif-lora'
      : 'font-sans-ui';

  const stationeryClass =
    letter.stationery === 'linen'
      ? 'stationery-linen'
      : letter.stationery === 'parchment'
      ? 'stationery-parchment'
      : letter.stationery === 'slate'
      ? 'stationery-slate'
      : 'stationery-modern';

  const handleParagraphChange = (index: number, newText: string) => {
    const nextParagraphs = [...letter.paragraphs];
    nextParagraphs[index] = newText;
    onChange({
      ...letter,
      paragraphs: nextParagraphs,
      updatedAt: Date.now(),
    });
  };

  const handleAddParagraph = (afterIndex?: number) => {
    const nextParagraphs = [...letter.paragraphs];
    if (afterIndex !== undefined) {
      nextParagraphs.splice(afterIndex + 1, 0, 'New paragraph...');
    } else {
      nextParagraphs.push('New paragraph...');
    }
    onChange({
      ...letter,
      paragraphs: nextParagraphs,
      updatedAt: Date.now(),
    });
  };

  const handleDeleteParagraph = (index: number) => {
    if (letter.paragraphs.length <= 1) return;
    const nextParagraphs = letter.paragraphs.filter((_, i) => i !== index);
    onChange({
      ...letter,
      paragraphs: nextParagraphs,
      updatedAt: Date.now(),
    });
  };

  const handleMoveParagraph = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= letter.paragraphs.length) return;
    const nextParagraphs = [...letter.paragraphs];
    const temp = nextParagraphs[index];
    nextParagraphs[index] = nextParagraphs[targetIndex];
    nextParagraphs[targetIndex] = temp;
    onChange({
      ...letter,
      paragraphs: nextParagraphs,
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="w-full flex justify-center py-6 px-4">
      {/* Stationery Paper Container */}
      <article
        className={`print-only-sheet w-full max-w-[820px] min-h-[1050px] ${stationeryClass} border border-stone-200/80 rounded-xl shadow-md p-8 sm:p-14 lg:p-16 flex flex-col justify-between transition-all duration-200 relative`}
        style={{
          boxShadow:
            letter.stationery === 'parchment'
              ? '0 10px 30px -10px rgba(120, 95, 60, 0.15), 0 2px 6px -1px rgba(0, 0, 0, 0.05)'
              : '0 10px 30px -10px rgba(0, 0, 0, 0.07), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Subtle Watermark Monogram */}
        <div
          aria-hidden="true"
          className="no-print absolute top-8 right-8 text-stone-300/40 pointer-events-none select-none flex items-center gap-1.5"
        >
          <Feather className="w-5 h-5" />
          <span className="font-serif-cormorant text-xs tracking-widest uppercase">Epistle</span>
        </div>

        {/* Top Letter Section: Sender, Date, Recipient */}
        <div>
          {/* Sender Header Block (optional) */}
          {letter.senderBlock && (
            <div className="mb-6 pb-4 border-b border-stone-200/60 text-xs text-stone-600 font-sans-ui whitespace-pre-line leading-relaxed">
              <input
                type="text"
                value={letter.senderBlock}
                onChange={(e) => onChange({ ...letter, senderBlock: e.target.value })}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded px-1 text-stone-600"
                placeholder="Sender info (e.g. Julian Mercer · New York, NY)"
              />
            </div>
          )}

          {/* Date Line */}
          <div className="flex justify-between items-center mb-8">
            <input
              type="text"
              value={letter.date}
              onChange={(e) => onChange({ ...letter, date: e.target.value })}
              className={`bg-transparent border-none text-sm text-stone-700 ${fontClass} focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded px-1 w-64`}
              placeholder="November 3, 2026"
            />
          </div>

          {/* Recipient Block (if present) */}
          {letter.recipientBlock && (
            <div className="mb-6 text-sm text-stone-700 font-sans-ui whitespace-pre-line leading-relaxed">
              <textarea
                value={letter.recipientBlock}
                rows={2}
                onChange={(e) => onChange({ ...letter, recipientBlock: e.target.value })}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded px-1 resize-none text-stone-700"
                placeholder="Recipient name and address..."
              />
            </div>
          )}

          {/* Subject Line (optional) */}
          {letter.subject && (
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-stone-900 border-b border-stone-300 pb-2">
                <span className="text-xs uppercase tracking-wider text-stone-500 font-sans-ui">
                  Subject:
                </span>
                <input
                  type="text"
                  value={letter.subject}
                  onChange={(e) => onChange({ ...letter, subject: e.target.value })}
                  className="w-full bg-transparent border-none focus:outline-none text-stone-900 font-medium"
                />
              </div>
            </div>
          )}

          {/* Salutation Greeting */}
          <div className="group relative mb-6 flex items-center justify-between">
            <input
              type="text"
              value={letter.salutation}
              onChange={(e) => onChange({ ...letter, salutation: e.target.value })}
              className={`w-full text-base sm:text-lg text-stone-900 font-semibold ${fontClass} bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded px-1`}
              placeholder="Dear Eleanor,"
            />
            <button
              onClick={() => onOpenAlternatives('openings')}
              className="no-print opacity-0 group-hover:opacity-100 transition-opacity ml-2 px-2 py-1 text-xs text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded flex items-center gap-1 shrink-0"
              title="Browse alternative greetings"
            >
              <RefreshCw className="w-3 h-3 text-stone-600" />
              <span className="hidden sm:inline">Alternatives</span>
            </button>
          </div>

          {/* Body Paragraphs */}
          <div className="space-y-6">
            {letter.paragraphs.map((paragraph, index) => (
              <div
                key={index}
                className="group relative transition-all rounded-lg p-1 -m-1 hover:bg-stone-200/20"
                onMouseEnter={() => setActiveParagraphIndex(index)}
                onMouseLeave={() => setActiveParagraphIndex(null)}
              >
                {/* Paragraph Content Area */}
                <textarea
                  value={paragraph}
                  rows={Math.max(3, Math.ceil(paragraph.length / 75))}
                  onChange={(e) => handleParagraphChange(index, e.target.value)}
                  className={`w-full bg-transparent border-none text-stone-800 ${fontClass} text-base sm:text-lg leading-[1.8] focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded-md p-1 resize-y`}
                  placeholder="Compose your paragraph..."
                />

                {/* Floating Quick Paragraph Action Toolbar (Hover state) */}
                <div
                  className={`no-print absolute -top-3.5 right-2 flex items-center gap-1 bg-stone-900 text-stone-100 rounded-md px-2 py-0.5 shadow-md text-xs transition-all duration-150 ${
                    activeParagraphIndex === index ? 'opacity-100 visible' : 'opacity-0 invisible'
                  }`}
                >
                  <span className="text-[10px] text-stone-400 mr-1 select-none">
                    § {index + 1}
                  </span>

                  <button
                    onClick={() => onRefineParagraph(index, 'polish')}
                    disabled={isRefining}
                    className="px-1.5 py-1 hover:text-amber-300 transition-colors flex items-center gap-1"
                    title="Polish cadence & grammar with AI"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Polish</span>
                  </button>

                  <button
                    onClick={() => onRefineParagraph(index, 'shorten')}
                    disabled={isRefining}
                    className="px-1.5 py-1 hover:text-amber-300 transition-colors"
                    title="Condense paragraph"
                  >
                    Shorten
                  </button>

                  <button
                    onClick={() => onRefineParagraph(index, 'expand')}
                    disabled={isRefining}
                    className="px-1.5 py-1 hover:text-amber-300 transition-colors"
                    title="Expand with more detail"
                  >
                    Expand
                  </button>

                  <div className="w-[1px] h-3 bg-stone-700 mx-0.5" />

                  <button
                    onClick={() => handleMoveParagraph(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-stone-300 hover:text-white disabled:opacity-30"
                    title="Move up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleMoveParagraph(index, 'down')}
                    disabled={index === letter.paragraphs.length - 1}
                    className="p-1 text-stone-300 hover:text-white disabled:opacity-30"
                    title="Move down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => handleAddParagraph(index)}
                    className="p-1 text-stone-300 hover:text-amber-300"
                    title="Add paragraph below"
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  {letter.paragraphs.length > 1 && (
                    <button
                      onClick={() => handleDeleteParagraph(index)}
                      className="p-1 text-stone-300 hover:text-red-400"
                      title="Delete paragraph"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Paragraph Button */}
          <div className="no-print mt-4 pt-2">
            <button
              onClick={() => handleAddParagraph()}
              className="px-3 py-1 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Paragraph</span>
            </button>
          </div>
        </div>

        {/* Bottom Letter Section: Sign-off, Signature, Postscript */}
        <div className="mt-12 pt-8">
          {/* Complimentary Close */}
          <div className="group relative flex items-center justify-between max-w-sm mb-2">
            <input
              type="text"
              value={letter.complimentaryClose}
              onChange={(e) => onChange({ ...letter, complimentaryClose: e.target.value })}
              className={`w-full text-base sm:text-lg text-stone-900 ${fontClass} bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded px-1`}
              placeholder="With warmest regards,"
            />
            <button
              onClick={() => onOpenAlternatives('closings')}
              className="no-print opacity-0 group-hover:opacity-100 transition-opacity ml-2 px-2 py-1 text-xs text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded flex items-center gap-1 shrink-0"
              title="Browse alternative sign-offs"
            >
              <RefreshCw className="w-3 h-3 text-stone-600" />
              <span className="hidden sm:inline">Alternatives</span>
            </button>
          </div>

          {/* Signature Line */}
          <div className="mt-6 mb-8 max-w-sm">
            <div className="font-serif-cormorant text-2xl sm:text-3xl italic text-stone-800 pl-1 select-none font-normal">
              {letter.signatureName || 'Your Signature'}
            </div>
            <input
              type="text"
              value={letter.signatureName}
              onChange={(e) => onChange({ ...letter, signatureName: e.target.value })}
              className="mt-2 text-xs text-stone-600 tracking-wider uppercase font-sans-ui bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded px-1 w-full"
              placeholder="Printed Full Name"
            />
          </div>

          {/* Postscript (P.S.) */}
          {(letter.postscript || editingIndex === 999) && (
            <div className="pt-6 border-t border-stone-200/60 flex items-start gap-2">
              <span className={`text-sm font-semibold text-stone-700 ${fontClass} select-none`}>
                P.S.
              </span>
              <textarea
                value={letter.postscript.replace(/^P\.S\.\s*/i, '')}
                rows={2}
                onChange={(e) =>
                  onChange({
                    ...letter,
                    postscript: e.target.value ? `P.S. ${e.target.value.replace(/^P\.S\.\s*/i, '')}` : '',
                  })
                }
                className={`w-full bg-transparent border-none text-stone-700 ${fontClass} text-sm sm:text-base italic leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500/50 rounded px-1 resize-none`}
                placeholder="A warm lingering postscript thought..."
              />
            </div>
          )}

          {/* Add P.S. toggle if not already present */}
          {!letter.postscript && editingIndex !== 999 && (
            <div className="no-print pt-2">
              <button
                onClick={() => {
                  onChange({
                    ...letter,
                    postscript: 'P.S. Hope to see you soon!',
                  });
                }}
                className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
              >
                + Add Postscript (P.S.)
              </button>
            </div>
          )}
        </div>
      </article>
    </div>
  );
};
