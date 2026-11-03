export type StationeryStyle = 'linen' | 'parchment' | 'modern' | 'slate';
export type FontChoice = 'serif-cormorant' | 'serif-lora' | 'sans';

export type LetterTone =
  | 'warm'
  | 'formal'
  | 'poetic'
  | 'diplomatic'
  | 'persuasive'
  | 'assertive';

export interface LetterData {
  id: string;
  title: string;
  date: string;
  senderBlock: string;
  recipientBlock: string;
  subject: string;
  salutation: string;
  paragraphs: string[];
  complimentaryClose: string;
  signatureName: string;
  postscript: string;
  aiWritingNote?: string;
  stationery: StationeryStyle;
  font: FontChoice;
  updatedAt: number;
}

export interface LetterTemplate {
  id: string;
  category: 'Personal' | 'Professional' | 'Formal' | 'Gratitude';
  title: string;
  description: string;
  purpose: string;
  defaultTone: LetterTone;
  sampleKeyPoints: string;
  initialLetter: {
    salutation: string;
    paragraphs: string[];
    complimentaryClose: string;
    signatureName: string;
    subject?: string;
    postscript?: string;
  };
}

export interface LetterCritique {
  overallVerdict: string;
  toneAnalysis: string;
  strengths: string[];
  suggestions: string[];
  alternativeSalutations?: string[];
  alternativeClosings?: string[];
}
