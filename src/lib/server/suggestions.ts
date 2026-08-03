import { chatbotsService } from './chatbots';
import { getDb } from './db';

const MAX_SUGGESTIONS = 5;
const MAX_PILL_CHARS = 56;

const SKIP_HEADING =
  /^(terms|answering|audience|common questions|what each|on the hub|the five categories|the six call lists|the patient account page|not a developer)/i;

const TOPIC_NOUNS =
  /^(pricing|price|plans?|refunds?|support|billing|security|privacy|features?|overview|introduction|faq)$/i;

type Heading = {
  level: 2 | 3;
  text: string;
  parent?: string;
};

function cleanHeading(raw: string): string {
  return raw
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripParenNote(text: string): string {
  return text.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function normalizeQuestion(q: string): string {
  return q
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[?？]+$/g, '')
    .replace(/\?+/g, '?')
    .trim()
    .concat('?')
    .replace(/\?\?+/g, '?');
}

function shouldSkip(text: string): boolean {
  const t = text.replace(/[.?:!]+$/, '').trim();
  if (!t || t.length < 3 || t.length > 80) return true;
  if (SKIP_HEADING.test(t)) return true;
  if (/knowledge base$/i.test(t)) return true;
  return false;
}

function isAlreadyQuestion(text: string): boolean {
  const t = text.trim();
  if (/[?？]\s*$/.test(t)) return true;
  return /^(what|how|why|when|where|who|which|can|do|does|is|are)\b/i.test(t);
}

/** Proper product/module names vs plain topic labels. */
function isProductOrModule(text: string): boolean {
  const t = stripParenNote(text);
  if (TOPIC_NOUNS.test(t)) return false;
  if (/\b(policy|hours|plan|pricing|refund|support|started)\b/i.test(t)) {
    return false;
  }
  // CamelCase product: HyperCare
  if (/[a-z][A-Z]/.test(t)) return true;
  const words = t.split(/\s+/);
  // Multi-word title case names: "Acme Cloud", "HyperCare CS"
  if (
    words.length >= 2 &&
    words.every((w) => /^[A-Z0-9]/.test(w) || /^(CS|&|and|of|the)$/i.test(w))
  ) {
    return true;
  }
  // Single admin-module style noun
  if (/^(Maintenance|Patients|Accounts|Workspace)$/i.test(t)) return true;
  return false;
}

function topicToQuestion(raw: string): string | null {
  const text = stripParenNote(cleanHeading(raw)).replace(/[.?:!]+$/g, '').trim();
  if (!text) return null;

  // Already a natural question — keep it
  if (isAlreadyQuestion(raw) || isAlreadyQuestion(text)) {
    return clip(normalizeQuestion(text));
  }

  const lower = text.toLowerCase();

  // Common doc topics → natural phrasing
  if (/^(pricing|price|plans?)$/i.test(text)) return 'What are the pricing plans?';
  if (/refund/i.test(text)) return 'How do refunds work?';
  if (/support/i.test(text)) return 'What are the support hours?';
  if (/getting started|quick start|get started/i.test(text)) {
    return 'How do I get started?';
  }
  if (/^what this app is$/i.test(text)) return 'What is this app for?';

  // "… policy" / "… hours"
  if (/\bpolicy$/i.test(text)) {
    return clip(normalizeQuestion(`How does the ${lower} work`));
  }
  if (/\bhours$/i.test(text)) {
    return clip(normalizeQuestion(`What are the ${lower}`));
  }

  // Product / module
  if (isProductOrModule(text)) {
    return clip(normalizeQuestion(`What can I do in ${text}`));
  }

  // Short noun topics
  if (text.length <= 32) {
    return clip(normalizeQuestion(`Tell me about ${lower}`));
  }

  return null;
}

/** Turn a doc heading into a short natural question. */
function headingToQuestion(heading: Heading): string | null {
  const text = cleanHeading(heading.text);
  if (shouldSkip(text)) return null;

  const parent = heading.parent ? cleanHeading(heading.parent) : undefined;
  const bare = text.replace(/[.?:!]+$/g, '').trim();

  // Explicit how-to / troubleshooting headings
  if (/^signing in$/i.test(bare)) return 'How do I sign in?';
  if (/^getting around$/i.test(bare)) return 'How do I navigate the workspace?';
  if (/^getting there$/i.test(bare) && parent && isProductOrModule(parent)) {
    return clip(normalizeQuestion(`How do I open ${stripParenNote(parent)}`));
  }
  if (/^logging a call$/i.test(bare)) return 'How do I log a call?';
  if (/^if something won'?t load$/i.test(bare)) {
    return "What if a page won't load?";
  }
  if (/^the patient list$/i.test(bare)) return 'How do I find a patient?';
  if (/^reports\b/i.test(bare)) return 'How do I view call reports?';
  if (/^audit logs\b/i.test(bare)) return 'Where are the audit logs?';

  // "If …" troubleshooting
  if (/^if\b/i.test(bare)) {
    const rest = bare.replace(/^if\s+/i, '');
    return clip(
      normalizeQuestion(
        `What if ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`,
      ),
    );
  }

  // Gerund / action headings → How do I …?
  const howMatch = bare.match(
    /^(Signing|Logging|Adding|Creating|Opening|Finding|Using|Getting|Booking|Editing|Uploading)\s+(.+)$/i,
  );
  if (howMatch) {
    const verbMap: Record<string, string> = {
      signing: 'sign',
      logging: 'log',
      adding: 'add',
      creating: 'create',
      opening: 'open',
      finding: 'find',
      using: 'use',
      getting: 'get',
      booking: 'book',
      editing: 'edit',
      uploading: 'upload',
    };
    const v = verbMap[howMatch[1].toLowerCase()] || 'use';
    return clip(
      normalizeQuestion(`How do I ${v} ${howMatch[2].toLowerCase()}`),
    );
  }

  return topicToQuestion(text);
}

function clip(q: string): string {
  const cleaned = normalizeQuestion(q.replace(/\s+/g, ' ').trim());
  if (!cleaned || cleaned === '?') return '';
  if (cleaned.length <= MAX_PILL_CHARS) return cleaned;
  if (cleaned.length > MAX_PILL_CHARS + 8) return '';
  return `${cleaned.slice(0, MAX_PILL_CHARS - 1).trim()}…`;
}

function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  let currentH2: string | undefined;

  for (const line of content.split(/\r?\n/)) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2?.[1]) {
      const text = cleanHeading(h2[1]);
      currentH2 = text;
      headings.push({ level: 2, text });
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3?.[1]) {
      headings.push({
        level: 3,
        text: cleanHeading(h3[1]),
        parent: currentH2,
      });
    }
  }
  return headings;
}

function extractFaqQuestions(content: string): string[] {
  const out: string[] = [];
  const re = /\*\*(If [^:*]{4,70})\*\*:/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    const phrase = m[1].replace(/\s+/g, ' ').trim();
    const rest = phrase.replace(/^If\s+/i, '');
    out.push(
      clip(
        normalizeQuestion(
          `What if ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`,
        ),
      ),
    );
  }
  return out.filter(Boolean);
}

function extractModulePurpose(content: string): string[] {
  const out: string[] = [];
  const blocks = content.split(/^##\s+/m).slice(1);
  for (const block of blocks) {
    const nameLine = block.split(/\r?\n/)[0] || '';
    const name = stripParenNote(
      cleanHeading(nameLine).replace(/[.?:!]+$/g, ''),
    );
    if (!name || shouldSkip(name) || name.length > 36) continue;
    if (!isProductOrModule(name)) continue;
    if (/\*\*What it'?s for:\*\*/i.test(block.slice(0, 400))) {
      out.push(clip(normalizeQuestion(`What is ${name} for`)));
    }
  }
  return out.filter(Boolean);
}

function unique(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const q = clip(raw || '');
    if (!q || q.length < 10) continue;
    const key = q.toLowerCase().replace(/[^\w\s]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
    if (out.length >= limit) break;
  }
  return out;
}

/** Pure helper — build pills from raw source texts (used by API + tests). */
export function buildSuggestionsFromContents(contents: string[]): string[] {
  if (!contents.length) {
    return ['What can you help me with?', 'Where should I start?'];
  }

  const fromH3: string[] = [];
  const fromH2: string[] = [];
  const fromFaq: string[] = [];
  const fromPurpose: string[] = [];

  for (const content of contents) {
    if (!content) continue;
    for (const h of extractHeadings(content)) {
      const q = headingToQuestion(h);
      if (!q) continue;
      if (h.level === 3) fromH3.push(q);
      else fromH2.push(q);
    }
    fromFaq.push(...extractFaqQuestions(content));
    fromPurpose.push(...extractModulePurpose(content));
  }

  const ranked = [...fromH3, ...fromFaq, ...fromPurpose, ...fromH2];
  const suggestions = unique(ranked, MAX_SUGGESTIONS);
  if (suggestions.length > 0) return suggestions;

  return ['What can you help me with?', 'Where should I start?'];
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

  return buildSuggestionsFromContents(sources.map((s) => s.content || ''));
}

export async function getOwnedSuggestions(userId: string, chatbotId: string) {
  await chatbotsService.assertOwned(userId, chatbotId);
  return { suggestions: await getSuggestionsForChatbot(chatbotId) };
}

export async function getPublicSuggestions(chatbotId: string) {
  await chatbotsService.assertPublished(chatbotId);
  return { suggestions: await getSuggestionsForChatbot(chatbotId) };
}
