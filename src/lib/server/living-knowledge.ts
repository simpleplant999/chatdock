/** Single rolling knowledge file per chatbot (fed via chat or Sources). */
export const LIVING_KNOWLEDGE_NAME = 'Living Knowledge.md';

const FEED_PATTERNS = [
  /^\/learn\s+([\s\S]+)$/i,
  /^\/remember\s+([\s\S]+)$/i,
  /^\/feed\s+([\s\S]+)$/i,
  /^learn:\s*([\s\S]+)$/i,
  /^remember:\s*([\s\S]+)$/i,
  /^feed:\s*([\s\S]+)$/i,
];

/** If the message is a knowledge-feed command, return the fact to save. */
export function parseFeedIntent(content: string): string | null {
  const trimmed = content.trim();
  for (const pattern of FEED_PATTERNS) {
    const match = trimmed.match(pattern);
    const knowledge = match?.[1]?.trim();
    if (knowledge) return knowledge;
  }
  return null;
}
