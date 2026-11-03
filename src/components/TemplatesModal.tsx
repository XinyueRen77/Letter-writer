import React, { useState } from 'react';
import { LETTER_TEMPLATES } from '../data/templates';
import { LetterTemplate, LetterData } from '../types/letter';
import { BookOpen, X, ArrowRight, Check } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: LetterTemplate) => void;
  currentLetter: LetterData;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentLetter,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTemplate, setActiveTemplate] = useState<LetterTemplate>(LETTER_TEMPLATES[0]);

  if (!isOpen) return null;

  const categories = ['All', 'Gratitude', 'Professional', 'Personal', 'Formal'];

  const filtered =
    selectedCategory === 'All'
      ? LETTER_TEMPLATES
      : LETTER_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleUse = (template: LetterTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-stone-50 border border-stone-200 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-700" />
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Curated Letter Templates
              </h2>
              <p className="text-xs text-stone-500">
                Start from authentic, time-tested letters for any personal or professional occasion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Navigation */}
        <div className="px-6 py-2.5 bg-stone-100 border-b border-stone-200 flex items-center gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 2-Column Split: List on Left, Preview on Right */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          {/* List */}
          <div className="md:col-span-5 p-4 space-y-2 overflow-y-auto border-r border-stone-200 bg-stone-50/50">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTemplate(t)}
                className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                  activeTemplate.id === t.id
                    ? 'border-amber-700 bg-white shadow-xs'
                    : 'border-stone-200 bg-white/70 hover:bg-white hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-stone-900">{t.title}</span>
                  <span className="text-[10px] text-stone-500 font-sans-ui uppercase tracking-wider">
                    {t.category}
                  </span>
                </div>
                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                  {t.description}
                </p>
              </button>
            ))}
          </div>

          {/* Preview & Action */}
          <div className="md:col-span-7 p-6 bg-white overflow-y-auto flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-stone-200 pb-3">
                <span className="text-[11px] text-amber-800 font-semibold uppercase tracking-wider">
                  {activeTemplate.category} Template
                </span>
                <h3 className="text-lg font-serif-cormorant font-bold text-stone-900 mt-0.5">
                  {activeTemplate.title}
                </h3>
                <p className="text-xs text-stone-600 mt-1">{activeTemplate.description}</p>
              </div>

              {/* Sample Excerpt */}
              <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-lg font-serif-cormorant text-stone-800 text-sm leading-relaxed space-y-3">
                <div className="font-semibold">{activeTemplate.initialLetter.salutation}</div>
                {activeTemplate.initialLetter.paragraphs.map((p, idx) => (
                  <p key={idx} className="text-stone-700">
                    {p}
                  </p>
                ))}
                <div className="pt-2 font-medium">
                  {activeTemplate.initialLetter.complimentaryClose}
                  <br />
                  <span className="text-stone-500 text-xs italic">
                    {activeTemplate.initialLetter.signatureName}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-stone-200 flex items-center justify-between gap-3">
              <span className="text-xs text-stone-500">
                Tone: <strong className="capitalize text-stone-800">{activeTemplate.defaultTone}</strong>
              </span>

              <button
                onClick={() => handleUse(activeTemplate)}
                className="px-5 py-2 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-md transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <span>Load This Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
