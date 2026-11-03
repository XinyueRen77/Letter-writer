import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json({ limit: '2mb' }));

// Supported text models with prioritized reliability
const PRIMARY_MODEL = 'gemini-3.1-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';

// Initialize GoogleGenAI client (Server-side only)
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Automatic retry helper with multi-model fallback and backoff for 503 / transient errors
async function callGeminiWithFallback<T>(
  operation: (ai: GoogleGenAI, model: string) => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000
): Promise<T> {
  let delay = initialDelayMs;
  let lastError: any;
  const models = [PRIMARY_MODEL, FALLBACK_MODEL, PRIMARY_MODEL];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const selectedModel = models[attempt - 1] || PRIMARY_MODEL;
    try {
      const ai = getGenAI();
      return await operation(ai, selectedModel);
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || '';
      const message = String(err?.message || '');

      const isTransient =
        status === 503 ||
        status === 'UNAVAILABLE' ||
        message.includes('503') ||
        message.includes('UNAVAILABLE') ||
        message.includes('high demand') ||
        message.includes('overloaded') ||
        message.includes('Resource has been exhausted') ||
        status === 429 ||
        status === 504 ||
        message.includes('DEADLINE_EXCEEDED');

      console.warn(`[Gemini API] Attempt ${attempt}/${maxRetries} with ${selectedModel} failed: ${message}`);

      if (isTransient && attempt < maxRetries) {
        console.log(`[Gemini API] Retrying in ${delay}ms with fallback model... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 4000);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

// 1. Generate full letter draft from natural language prompt
app.post('/api/letter/draft', async (req: Request, res: Response) => {
  try {
    const {
      prompt: userPrompt = '',
      purpose = '',
      keyPoints = '',
      tone = '',
    } = req.body;

    const naturalDescription = userPrompt || keyPoints || purpose || 'A thoughtful personal letter';

    const systemInstruction = `You are a master letter writer with deep expertise in traditional epistolary etiquette, modern workplace communication, and emotional resonance.
You compose letters that feel human, authentic, beautifully paced, and devoid of cliché or robotic filler.
When drafting letters addressing difficult or emotional workplace situations (such as stress, burnout, resignation, or feeling unappreciated), strike an impeccable balance: honor the user's authentic feelings and self-respect while maintaining dignity, poise, clarity, and professionalism.
Format your output strictly using the provided JSON schema. Ensure the paragraphs are distinct, well-cadenced, and naturally flow from opening to conclusion.`;

    const prompt = `Compose a complete, beautifully written letter based on this user description:
"${naturalDescription}"

${tone ? `Desired tone: ${tone}` : ''}

Analyze the user's description to deduce the appropriate context, recipient, relationship, and core message. If specific names aren't provided in the prompt, use tasteful placeholders like "[Manager's Name]" or "[Your Name]" or realistic names that fit the context.
Return strictly the JSON object according to the schema.`;

    const parsed = await callGeminiWithFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Short descriptive title for this letter' },
              date: { type: Type.STRING, description: 'Formatted date string, e.g. November 3, 2026' },
              senderBlock: { type: Type.STRING, description: 'Sender address or contact header line (optional/empty if informal)' },
              recipientBlock: { type: Type.STRING, description: 'Recipient name, title, organization (optional/empty if informal)' },
              subject: { type: Type.STRING, description: 'Formal subject line if appropriate for this letter, or empty string' },
              salutation: { type: Type.STRING, description: 'Opening greeting, e.g. "Dear [Manager Name],"' },
              paragraphs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of prose paragraphs for the body of the letter',
              },
              complimentaryClose: { type: Type.STRING, description: 'Sign-off phrase, e.g. "Sincerely,", "With sincere gratitude,"' },
              signatureName: { type: Type.STRING, description: 'Sender name for signature line' },
              postscript: { type: Type.STRING, description: 'Optional P.S. note if appropriate or empty string' },
              aiWritingNote: { type: Type.STRING, description: 'Brief 1-2 sentence tip on why this tone and phrasing works for this context' },
            },
            required: ['date', 'salutation', 'paragraphs', 'complimentaryClose', 'signatureName'],
          },
        },
      });

      return JSON.parse(response.text || '{}');
    });

    return res.json({ success: true, letter: parsed });
  } catch (error: any) {
    console.error('Error generating letter draft:', error);
    const message = String(error?.message || '');
    const isUnavailable = message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand');

    return res.status(isUnavailable ? 503 : 500).json({
      success: false,
      isUnavailable,
      error: isUnavailable
        ? 'The letter generation service is temporarily busy (503 UNAVAILABLE). Automatic retries are in progress.'
        : error?.message || 'Failed to generate letter draft. Please verify your Gemini API key.',
    });
  }
});

// 2. Refine existing letter via follow-up revision request
app.post('/api/letter/refine', async (req: Request, res: Response) => {
  try {
    const { letter, instruction = '', revision = '', customPrompt = '' } = req.body;
    if (!letter) {
      return res.status(400).json({ error: 'Letter data is required.' });
    }

    const revisionDirective = revision || customPrompt || instruction || 'Improve clarity, flow, and emotional balance';

    const prompt = `You are revising this existing letter based on the following follow-up request from the user:
"${revisionDirective}"

Current Letter:
Date: ${letter.date}
Subject: ${letter.subject || 'None'}
Salutation: ${letter.salutation}
Body:
${Array.isArray(letter.paragraphs) ? letter.paragraphs.join('\n\n') : letter.body || ''}
Close: ${letter.complimentaryClose}
Signer: ${letter.signatureName}
P.S.: ${letter.postscript || 'None'}

Apply the user's revision thoughtfully. Keep the letter format intact. Return strictly the JSON response according to the schema.`;

    const parsed = await callGeminiWithFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: 'You are an elite epistolary editor. Return the edited letter strictly according to the specified JSON schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              senderBlock: { type: Type.STRING },
              recipientBlock: { type: Type.STRING },
              subject: { type: Type.STRING },
              salutation: { type: Type.STRING },
              paragraphs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              complimentaryClose: { type: Type.STRING },
              signatureName: { type: Type.STRING },
              postscript: { type: Type.STRING },
              changeSummary: { type: Type.STRING, description: '1 concise sentence describing the revision applied' },
            },
            required: ['date', 'salutation', 'paragraphs', 'complimentaryClose', 'signatureName'],
          },
        },
      });

      return JSON.parse(response.text || '{}');
    });

    return res.json({ success: true, letter: parsed, summary: parsed.changeSummary });
  } catch (error: any) {
    console.error('Error refining letter:', error);
    const message = String(error?.message || '');
    const isUnavailable = message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand');

    return res.status(isUnavailable ? 503 : 500).json({
      success: false,
      isUnavailable,
      error: isUnavailable
        ? 'The letter refinement service is temporarily busy (503 UNAVAILABLE). Automatic retries are in progress.'
        : error?.message || 'Failed to refine letter.',
    });
  }
});

// 3. Critique / Feedback on letter
app.post('/api/letter/critique', async (req: Request, res: Response) => {
  try {
    const { letter, intendedAudience = 'General', intendedTone = 'Warm' } = req.body;
    if (!letter) {
      return res.status(400).json({ error: 'Letter data is required.' });
    }

    const prompt = `Review and critique this letter intended for ${intendedAudience} with a ${intendedTone} tone:
Salutation: ${letter.salutation}
Body:
${Array.isArray(letter.paragraphs) ? letter.paragraphs.join('\n\n') : letter.body || ''}
Sign-off: ${letter.complimentaryClose} ${letter.signatureName}

Provide an honest, helpful editorial review evaluating tone, clarity, politeness, and effectiveness.`;

    const parsed = await callGeminiWithFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallVerdict: { type: Type.STRING, description: 'e.g. Ready to Send, Needs Minor Touch-up, or Needs Rewording' },
              toneAnalysis: { type: Type.STRING, description: '1-2 sentences on how the tone reads to a neutral recipient' },
              strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 key strengths of this draft',
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 specific suggestions for greater impact or grace',
              },
              alternativeSalutations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 alternative greetings',
              },
              alternativeClosings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 alternative complimentary closes',
              },
            },
            required: ['overallVerdict', 'toneAnalysis', 'strengths', 'suggestions'],
          },
        },
      });

      return JSON.parse(response.text || '{}');
    });

    return res.json({ success: true, critique: parsed });
  } catch (error: any) {
    console.error('Error reviewing letter:', error);
    const message = String(error?.message || '');
    const isUnavailable = message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand');

    return res.status(isUnavailable ? 503 : 500).json({
      success: false,
      isUnavailable,
      error: isUnavailable
        ? 'Review service is temporarily busy (503 UNAVAILABLE).'
        : error?.message || 'Failed to analyze letter.',
    });
  }
});

// 4. Generate Alternative Hooks or Sign-offs
app.post('/api/letter/alternatives', async (req: Request, res: Response) => {
  try {
    const { type, context } = req.body;

    const prompt = `Based on the following letter context:
${context || 'A thoughtful personal or professional letter'}
Generate 4 distinct, tastefully phrased ${type || 'opening hooks'} (e.g. from formal to heartfelt).`;

    const parsed = await callGeminiWithFallback(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: 'Tone descriptor, e.g. Gracious, Direct, Poetic, Formal' },
                    text: { type: Type.STRING, description: 'The text snippet' },
                  },
                  required: ['label', 'text'],
                },
              },
            },
            required: ['options'],
          },
        },
      });

      return JSON.parse(response.text || '{}');
    });

    return res.json({ success: true, options: parsed.options || [] });
  } catch (error: any) {
    console.error('Error generating alternatives:', error);
    const message = String(error?.message || '');
    const isUnavailable = message.includes('503') || message.includes('UNAVAILABLE') || message.includes('high demand');

    return res.status(isUnavailable ? 503 : 500).json({
      success: false,
      isUnavailable,
      error: isUnavailable
        ? 'Alternative suggestions are temporarily busy (503 UNAVAILABLE).'
        : error?.message || 'Failed to generate options.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
