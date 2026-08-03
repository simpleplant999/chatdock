import { chatbotsService } from './chatbots';
import { getDb } from './db';

const MAX_SUGGESTIONS = 4;

function toQuestion(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim().replace(/[.?:!]+$/, '');
  if (!cleaned) return '';
  if (/^(what|how|why|when|where|who|which|can|do|does|is|are)\b/i.test(cleaned)) {
    return cleaned.endsWith('?') ? cleaned : `${cleaned}?`;
  }
  const label =
    cleaned.length <= 60 ? cleaned : `${cleaned.slice(0, 57).trim()}…`;
  return `Tell me about ${label}`;
}

function extractHeadings(content: string): string[] {
  const headings: string[] = [];
  for (const line of content.split(/\r?\n/)) {
    const md = line.match(/^#{1,3}\s+(.+)$/);
    if (md?.[1]) {
      headings.push(md[1].trim());
      continue;
    }
    // Title-like lines: short, no ending period, starts with capital
    const plain = line.trim();
    if (
      plain.length >= 4 &&
      plain.length <= 60 &&
      !/[.?!]$/.test(plain) &&
      /^[A-Z]/.test(plain) &&
      !/^(http|www\.)/i.test(plain)
    ) {
      headings.push(plain);
    }
  }
  return headings;
}

function extractTopicPhrases(content: string): string[] {
  const phrases: string[] = [];
  const sentences = content.match(/[^.!?\n]+[.!?]+/g) || [];
  for (const sentence of sentences.slice(0, 12)) {
    const s = sentence.replace(/\s+/g, ' ').trim();
    // "X is …" / "X offers …" → topic X
    const m = s.match(
      /^([A-Z][\w\s/-]{2,40}?)\s+(is|are|offers|provides|includes|helps)\b/,
    );
    if (m?.[1]) phrases.push(m[1].trim());
  }
  return phrases;
}

function uniqueQuestions(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const q = toQuestion(raw);
    if (!q || q.length < 12 || q.length > 90) continue;
    const key = q.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
    if (out.length >= limit) break;
  }
  return out;
}

/** Build clickable starter questions from a bot's knowledge sources. */
export async function getSuggestionsForChatbot(
  chatbotId: string,
): Promise<string[]> {
  const db = await getDb();
  const sources = await db.contextSources
    .find({ chatbotId })
    .sort({ createdAt: -1 })
    .limit(12)
    .toArray();

  if (!sources.length) {
    return [
      'What can you help me with?',
      'What topics are in your knowledge base?',
    ];
  }

  const candidates: string[] = [];

  for (const source of sources) {
    candidates.push(...extractHeadings(source.content));
    candidates.push(...extractTopicPhrases(source.content.slice(0, 4000)));
  }

  // Source names as softer fallbacks (skip generic filenames)
  for (const source of sources) {
    const name = source.name
      .replace(/\.(md|txt|pdf|docx?|html?)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    if (name.length >= 4 && name.length <= 48 && !/^[a-f0-9-]{16,}$/i.test(name)) {
      candidates.push(name);
    }
  }

  const suggestions = uniqueQuestions(candidates, MAX_SUGGESTIONS);
  if (suggestions.length > 0) return suggestions;

  return sources.slice(0, MAX_SUGGESTIONS).map((s) => {
    const name = s.name.replace(/\.(md|txt|pdf|docx?)$/i, '').trim();
    return `What does ${name} cover?`;
  });
}

export async function getOwnedSuggestions(userId: string, chatbotId: string) {
  await chatbotsService.assertOwned(userId, chatbotId);
  return { suggestions: await getSuggestionsForChatbot(chatbotId) };
}

export async function getPublicSuggestions(chatbotId: string) {
  await chatbotsService.assertPublished(chatbotId);
  return { suggestions: await getSuggestionsForChatbot(chatbotId) };
}
