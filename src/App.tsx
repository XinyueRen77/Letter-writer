import React, { useState, useEffect, useMemo } from 'react';
import { LetterData, LetterTemplate } from './types/letter';
import { LETTER_TEMPLATES } from './data/templates';
import { Header } from './components/Header';
import { LetterCanvas } from './components/LetterCanvas';
import { RefineToolbar } from './components/RefineToolbar';
import { PromptDesk } from './components/PromptDesk';
import { FollowUpBox } from './components/FollowUpBox';
import { CritiqueModal } from './components/CritiqueModal';
import { TemplatesModal } from './components/TemplatesModal';
import { AlternativesModal } from './components/AlternativesModal';
import { fetchWithRetry } from './utils/api';
import {
  FolderOpen,
  FilePlus2,
  Trash2,
  Check,
  Info,
} from 'lucide-react';

const STORAGE_KEY = 'epistle_current_letter';
const DRAFTS_KEY = 'epistle_saved_drafts';

const INITIAL_LETTER: LetterData = {
  id: 'default_1',
  title: 'Notice of Resignation',
  date: new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }),
  senderBlock: '[Your Name] · Senior Specialist',
  recipientBlock: '[Manager\'s Name]\nDepartment Director',
  subject: 'Formal Notice of Resignation — [Your Name]',
  salutation: 'Dear [Manager\'s Name],',
  paragraphs: [
    'Please accept this letter as formal notification that I am resigning from my position, effective two weeks from today.',
    'Over recent months, navigating sustained project demands has led to significant exhaustion and personal strain. While this decision was difficult, it has become essential for me to prioritize my well-being and health.',
    'I remain committed to ensuring a smooth and organized transition. I will document all in-progress tasks, organize system handovers, and assist in transferring project responsibilities to ensure uninterrupted momentum for the team.',
    'Thank you for the opportunities and professional experience gained during my time here. I wish you and the team continued success.',
  ],
  complimentaryClose: 'Sincerely,',
  signatureName: '[Your Name]',
  postscript: '',
  aiWritingNote: 'Crafted with dignified boundary-setting, calm professional poise, and clear handover commitments.',
  stationery: 'linen',
  font: 'serif-cormorant',
  updatedAt: Date.now(),
};

export default function App() {
  const [letter, setLetter] = useState<LetterData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LETTER;
  });

  const [history, setHistory] = useState<LetterData[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<LetterData[]>(() => {
    try {
      const saved = localStorage.getItem(DRAFTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Modals & Panels
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isCritiqueOpen, setIsCritiqueOpen] = useState(false);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  const [alternativesModal, setAlternativesModal] = useState<{
    isOpen: boolean;
    type: 'openings' | 'closings' | 'postscripts';
  }>({ isOpen: false, type: 'openings' });

  // Processing & Feedback state
  const [isRefining, setIsRefining] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeNav, setActiveNav] = useState('editor');

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(letter));
    } catch (e) {
      console.error(e);
    }
  }, [letter]);

  // Save drafts list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(savedDrafts));
    } catch (e) {
      console.error(e);
    }
  }, [savedDrafts]);

  // Compute Word Count & Reading Time
  const wordCount = useMemo(() => {
    const text = [
      letter.salutation,
      ...letter.paragraphs,
      letter.complimentaryClose,
      letter.signatureName,
      letter.postscript,
    ].join(' ');
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [letter]);

  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  // Push state to undo history
  const updateLetterWithHistory = (updated: LetterData, summary?: string) => {
    setHistory((prev) => [letter, ...prev.slice(0, 10)]);
    setLetter(updated);
    if (summary) {
      setStatusMessage(summary);
      setTimeout(() => setStatusMessage(null), 4500);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const [previous, ...rest] = history;
    setLetter(previous);
    setHistory(rest);
    setStatusMessage('Reverted to previous revision.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Refine single paragraph with AI using retry wrapper
  const handleRefineParagraph = async (
    index: number,
    action: 'polish' | 'expand' | 'shorten'
  ) => {
    setIsRefining(true);
    try {
      const targetParagraph = letter.paragraphs[index];
      const promptInstruction =
        action === 'polish'
          ? 'Polish cadence, tone, and eloquence while keeping facts identical'
          : action === 'expand'
          ? 'Expand with vivid, graceful descriptive detail while maintaining the same voice'
          : 'Make concise, removing wordiness';

      const response = await fetchWithRetry('/api/letter/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letter: {
            ...letter,
            paragraphs: [targetParagraph],
          },
          instruction: 'custom',
          customPrompt: promptInstruction,
        }),
        maxRetries: 3,
        initialDelayMs: 1500,
        onRetry: (attempt, maxRetries) => {
          setStatusMessage(`AI service busy (503). Retrying paragraph automatically (${attempt}/${maxRetries})...`);
        },
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to refine paragraph.');
      }

      const refinedParagraph =
        data.letter?.paragraphs?.[0] || targetParagraph;
      const nextParagraphs = [...letter.paragraphs];
      nextParagraphs[index] = refinedParagraph;

      updateLetterWithHistory(
        {
          ...letter,
          paragraphs: nextParagraphs,
          updatedAt: Date.now(),
        },
        `Paragraph ${index + 1} refined: ${action}`
      );
    } catch (err: any) {
      console.error(err);
      setStatusMessage(err.message || 'Error refining paragraph. Service busy.');
    } finally {
      setIsRefining(false);
    }
  };

  // Handle Load Template
  const handleSelectTemplate = (template: LetterTemplate) => {
    const updated: LetterData = {
      id: 'template_' + Date.now(),
      title: template.title,
      date: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      senderBlock: letter.senderBlock,
      recipientBlock: '',
      subject: template.initialLetter.subject || '',
      salutation: template.initialLetter.salutation,
      paragraphs: [...template.initialLetter.paragraphs],
      complimentaryClose: template.initialLetter.complimentaryClose,
      signatureName: letter.signatureName || template.initialLetter.signatureName,
      postscript: template.initialLetter.postscript || '',
      aiWritingNote: `Loaded template: ${template.title} (${template.defaultTone} tone)`,
      stationery: letter.stationery,
      font: letter.font,
      updatedAt: Date.now(),
    };
    updateLetterWithHistory(updated, `Loaded "${template.title}" template`);
  };

  // Copy letter to clipboard
  const handleCopy = async () => {
    try {
      const fullText = [
        letter.senderBlock ? `${letter.senderBlock}\n` : '',
        letter.date,
        letter.recipientBlock ? `\n${letter.recipientBlock}` : '',
        letter.subject ? `\nSubject: ${letter.subject}\n` : '',
        `\n${letter.salutation}\n`,
        letter.paragraphs.join('\n\n'),
        `\n${letter.complimentaryClose}`,
        letter.signatureName,
        letter.postscript ? `\n${letter.postscript}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setStatusMessage('Letter text copied to clipboard.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.error(e);
      setStatusMessage('Could not copy automatically. Please select text manually.');
    }
  };

  // Print letter
  const handlePrint = () => {
    window.print();
  };

  // Save current letter to drafts collection
  const handleSaveDraft = () => {
    const existingIndex = savedDrafts.findIndex((d) => d.id === letter.id);
    let nextDrafts: LetterData[];
    if (existingIndex >= 0) {
      nextDrafts = [...savedDrafts];
      nextDrafts[existingIndex] = { ...letter, updatedAt: Date.now() };
    } else {
      nextDrafts = [{ ...letter, updatedAt: Date.now() }, ...savedDrafts];
    }
    setSavedDrafts(nextDrafts);
    setStatusMessage('Letter saved to drafts collection.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Start fresh letter
  const handleConfirmNew = () => {
    const freshLetter: LetterData = {
      id: 'draft_' + Date.now(),
      title: 'Untitled Letter',
      date: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      senderBlock: letter.senderBlock,
      recipientBlock: '',
      subject: '',
      salutation: 'Dear Friend,',
      paragraphs: ['Write your message here or describe what you want in the prompt above...'],
      complimentaryClose: 'Warmest regards,',
      signatureName: letter.signatureName || 'Sender',
      postscript: '',
      stationery: letter.stationery,
      font: letter.font,
      updatedAt: Date.now(),
    };
    updateLetterWithHistory(freshLetter, 'Started a fresh letter.');
    setShowConfirmNew(false);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans-ui selection:bg-amber-200 selection:text-amber-950">
      {/* Top Bar adhering to strict Top Bar Contract */}
      <Header
        onOpenCompose={() => {
          // Scroll smoothly to the prompt box at the top of the desk
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenCritique={() => setIsCritiqueOpen(true)}
        onPrint={handlePrint}
        onCopy={handleCopy}
        copied={copied}
        wordCount={wordCount}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
      />

      {/* AI Refine & Stationery Toolbar */}
      <RefineToolbar
        letter={letter}
        onLetterUpdated={(updated, summary) => updateLetterWithHistory(updated, summary)}
        isRefining={isRefining}
        setIsRefining={setIsRefining}
        canUndo={history.length > 0}
        onUndo={handleUndo}
        statusMessage={statusMessage}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 flex flex-col items-center relative pb-16">
        {/* The One Primary Prompt Box */}
        <PromptDesk
          onLetterGenerated={(newLetter, summary) => {
            updateLetterWithHistory(newLetter, summary);
          }}
          currentLetter={letter}
        />

        {/* Sub-header Context Bar with Stationery & Metadata */}
        <div className="no-print w-full max-w-[820px] px-4 pt-4 pb-2 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-800">{letter.title || 'Untitled Letter'}</span>
            <span aria-hidden="true">·</span>
            <span>{wordCount} words</span>
            <span aria-hidden="true">·</span>
            <span>~{readingTimeMinutes} min read</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1"
              title="Save snapshot to browser storage"
            >
              <Check className="w-3.5 h-3.5 text-stone-400" />
              <span>Save Draft</span>
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setIsDraftsOpen(!isDraftsOpen)}
              className="text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1"
            >
              <FolderOpen className="w-3.5 h-3.5 text-stone-400" />
              <span>Drafts ({savedDrafts.length})</span>
            </button>
            <span aria-hidden="true">·</span>
            {showConfirmNew ? (
              <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <span className="text-[11px] text-amber-900">Start new?</span>
                <button
                  onClick={handleConfirmNew}
                  className="text-[11px] font-bold text-amber-950 underline"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowConfirmNew(false)}
                  className="text-[11px] text-stone-500 hover:text-stone-800 ml-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmNew(true)}
                className="text-stone-600 hover:text-stone-900 transition-colors flex items-center gap-1"
              >
                <FilePlus2 className="w-3.5 h-3.5 text-stone-400" />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Saved Drafts Drawer if open */}
        {isDraftsOpen && (
          <div className="no-print w-full max-w-[820px] px-4 mb-3">
            <div className="p-4 bg-white border border-stone-200 rounded-lg shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-semibold text-stone-800">
                  Saved Drafts ({savedDrafts.length})
                </span>
                <button
                  onClick={() => setIsDraftsOpen(false)}
                  className="text-xs text-stone-400 hover:text-stone-700"
                >
                  Close
                </button>
              </div>

              {savedDrafts.length === 0 ? (
                <p className="text-xs text-stone-500 py-2">
                  No saved drafts yet. Click "Save Draft" to bookmark any letter version.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {savedDrafts.map((d) => (
                    <div
                      key={d.id}
                      className="p-2.5 border border-stone-200 rounded-md hover:border-amber-400 bg-stone-50/50 flex items-center justify-between gap-2 text-xs"
                    >
                      <button
                        onClick={() => {
                          updateLetterWithHistory(d, `Loaded draft: ${d.title}`);
                          setIsDraftsOpen(false);
                        }}
                        className="text-left flex-1 truncate"
                      >
                        <div className="font-semibold text-stone-800 truncate">{d.title}</div>
                        <div className="text-[11px] text-stone-500">{d.date}</div>
                      </button>
                      <button
                        onClick={() => {
                          setSavedDrafts(savedDrafts.filter((item) => item.id !== d.id));
                        }}
                        className="text-stone-400 hover:text-red-600 p-1"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* The Letter Sheet on the Desk */}
        <LetterCanvas
          letter={letter}
          onChange={(updated) => setLetter(updated)}
          onRefineParagraph={handleRefineParagraph}
          onOpenAlternatives={(type) => setAlternativesModal({ isOpen: true, type })}
          isRefining={isRefining}
        />

        {/* Follow-up Revisions Box (User can request revisions in own words) */}
        <FollowUpBox
          letter={letter}
          onLetterRevised={(revised, summary) => {
            updateLetterWithHistory(revised, summary);
          }}
          isRefining={isRefining}
          setIsRefining={setIsRefining}
        />

        {/* AI Writing Note footer */}
        {letter.aiWritingNote && (
          <div className="no-print w-full max-w-[820px] px-4 mt-1">
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs text-amber-950 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">AI Editorial Note: </span>
                <span>{letter.aiWritingNote}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Templates Modal */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        currentLetter={letter}
      />

      {/* Critique & Tone Modal */}
      <CritiqueModal
        isOpen={isCritiqueOpen}
        onClose={() => setIsCritiqueOpen(false)}
        letter={letter}
        onApplySalutation={(sal) => {
          updateLetterWithHistory({ ...letter, salutation: sal }, 'Updated salutation');
        }}
        onApplyClose={(close) => {
          updateLetterWithHistory({ ...letter, complimentaryClose: close }, 'Updated sign-off');
        }}
      />

      {/* Alternatives Modal */}
      <AlternativesModal
        isOpen={alternativesModal.isOpen}
        onClose={() => setAlternativesModal({ ...alternativesModal, isOpen: false })}
        type={alternativesModal.type}
        letter={letter}
        onSelectOption={(text) => {
          if (alternativesModal.type === 'openings') {
            updateLetterWithHistory({ ...letter, salutation: text }, 'Updated greeting');
          } else if (alternativesModal.type === 'closings') {
            updateLetterWithHistory({ ...letter, complimentaryClose: text }, 'Updated closing');
          } else if (alternativesModal.type === 'postscripts') {
            updateLetterWithHistory({ ...letter, postscript: text }, 'Updated P.S.');
          }
        }}
      />
    </div>
  );
}
