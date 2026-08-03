const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'its', 'our', 'their', 'what', 'which', 'who', 'whom', 'how', 'when',
  'where', 'why', 'with', 'from', 'by', 'about', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 'just', 'please', 'tell', 'me',
]);

export class RagService {
  chunkText(text: string, maxChars = 800): string[] {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    const paragraphs = normalized
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const chunks: string[] = [];
    let current = '';

    for (const paragraph of paragraphs) {
      if (paragraph.length > maxChars) {
        if (current) {
          chunks.push(current.trim());
          current = '';
        }
        const sentences = paragraph.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [
          paragraph,
        ];
        let sentenceBuf = '';
        for (const sentence of sentences) {
          if ((sentenceBuf + ' ' + sentence).trim().length > maxChars) {
            if (sentenceBuf) chunks.push(sentenceBuf.trim());
            sentenceBuf = sentence;
          } else {
            sentenceBuf = (sentenceBuf + ' ' + sentence).trim();
          }
        }
        if (sentenceBuf) chunks.push(sentenceBuf.trim());
        continue;
      }

      if ((current + '\n\n' + paragraph).trim().length > maxChars) {
        if (current) chunks.push(current.trim());
        current = paragraph;
      } else {
        current = current ? `${current}\n\n${paragraph}` : paragraph;
      }
    }

    if (current) chunks.push(current.trim());
    return chunks.filter((c) => c.length > 20);
  }

  tokenize(text: string): string[] {
    const raw = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

    const tokens: string[] = [];
    for (const token of raw) {
      tokens.push(token);
      // Light stemming so "refunds" matches "refund", "plans" matches "plan"
      if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) {
        tokens.push(token.slice(0, -1));
      }
      if (token.length > 4 && token.endsWith('ing')) {
        tokens.push(token.slice(0, -3));
      }
      if (token.length > 3 && token.endsWith('ed')) {
        tokens.push(token.slice(0, -2));
      }
    }
    return tokens;
  }

  score(query: string, document: string): number {
    const qTokens = this.tokenize(query);
    const dTokens = this.tokenize(document);
    if (!qTokens.length || !dTokens.length) return 0;

    const docFreq = new Map<string, number>();
    for (const token of dTokens) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1);
    }

    const docLen = dTokens.length;
    let score = 0;
    const uniqueQuery = [...new Set(qTokens)];

    for (const token of uniqueQuery) {
      const tf = docFreq.get(token) || 0;
      if (!tf) continue;
      const idf = 1 + Math.log(1 + docLen / tf);
      score += (tf / docLen) * idf * 10;
      score += Math.min(tf, 3) * 0.5;
    }

    const overlap = uniqueQuery.filter((t) => docFreq.has(t)).length;
    score += (overlap / uniqueQuery.length) * 2;

    return score;
  }

  retrieve(
    query: string,
    chunks: { id: string; sourceId: string; content: string }[],
    topK = 8,
    minScore = 0.25,
  ) {
    const ranked = chunks
      .map((chunk) => ({
        ...chunk,
        score: this.score(query, chunk.content),
      }))
      .filter((c) => c.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return ranked;
  }

  /**
   * Free offline answerer: grounded on retrieved chunks only.
   * Returns a readable, detailed answer with no extra framing.
   */
  answerFromContext(
    question: string,
    retrieved: { content: string; score: number }[],
  ): { answer: string; confident: boolean } {
    if (!retrieved.length) {
      return {
        confident: false,
        answer:
          "I don't have enough information in the knowledge base to answer that.",
      };
    }

    const scoredSections = retrieved
      .map((r) => {
        const content = this.cleanSection(r.content);
        return {
          content,
          score: Math.max(r.score, this.score(question, content)),
        };
      })
      .filter((s) => s.content.length > 20)
      .sort((a, b) => b.score - a.score);

    if (!scoredSections.length) {
      return {
        confident: false,
        answer:
          "I don't have enough information in the knowledge base to answer that.",
      };
    }

    const bestScore = scoredSections[0].score;
    let selected = scoredSections
      .filter((s) => s.score >= bestScore * 0.3)
      .slice(0, 4);

    // Prefer substance over short teasers (e.g. "see résumé for full timeline")
    const substantial = selected.filter(
      (s) => s.content.length >= 120 || !this.isTeaserLine(s.content),
    );
    if (substantial.length) {
      selected = substantial;
    } else {
      // Expand with more retrieved sections when everything is thin
      selected = scoredSections.slice(0, Math.min(4, scoredSections.length));
    }

    const passages = selected
      .map((s) => this.extractRelevantPassage(question, s.content))
      .map((passage) => this.stripTeasers(passage))
      .filter((passage) => passage.length > 20);

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const passage of passages) {
      const key = passage.toLowerCase().replace(/\s+/g, ' ').slice(0, 140);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(passage);
    }

    return {
      confident: true,
      answer: unique.join('\n\n'),
    };
  }

  private isTeaserLine(text: string): boolean {
    const compact = text.replace(/\s+/g, ' ').trim();
    if (compact.length > 180) return false;
    return /downloadable|(full )?timeline available|see (my |the )?(r[eé]sum[eé]|resume|cv)|highlights from my (cv|resume|r[eé]sum[eé])|click here|learn more|read more|view selected work/i.test(
      compact,
    );
  }

  private stripTeasers(text: string): string {
    return text
      .split(/\n+/)
      .map((line) =>
        line
          .split(/(?<=[.!?])\s+/)
          .map((part) => part.trim())
          .filter((part) => part && !this.isTeaserLine(part))
          .join(' ')
          .trim(),
      )
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }

  /**
   * Keep enough context around the best-matching parts of a long section.
   */
  private extractRelevantPassage(
    question: string,
    content: string,
    maxChars = 1100,
  ): string {
    if (content.length <= maxChars) return content;

    const blocks = content
      .split(/\n{2,}|\n(?=[-*•]|\d+\.)/)
      .map((b) => b.trim())
      .filter((b) => b.length > 15);

    if (blocks.length <= 1) {
      // Long unbroken text (common with HTML scrapes): window around best sentence
      const sentences =
        content.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()) || [
          content,
        ];
      const ranked = sentences
        .map((sentence, index) => ({
          sentence,
          index,
          score: this.score(question, sentence),
        }))
        .sort((a, b) => b.score - a.score);

      const anchor = ranked[0]?.index ?? 0;
      const window: string[] = [];
      let size = 0;
      for (
        let i = Math.max(0, anchor - 1);
        i < sentences.length && size < maxChars;
        i++
      ) {
        window.push(sentences[i]);
        size += sentences[i].length + 1;
        if (i >= anchor + 4 && size > 350) break;
      }
      return window.join(' ').trim();
    }

    const rankedBlocks = blocks
      .map((block, index) => ({
        block,
        index,
        score: this.score(question, block),
      }))
      .sort((a, b) => b.score - a.score);

    const topScore = rankedBlocks[0]?.score || 0;
    const keep = new Set<number>();
    for (const item of rankedBlocks) {
      if (item.score < topScore * 0.28 && keep.size >= 2) continue;
      keep.add(item.index);
      // Include neighbors for continuity
      if (item.index > 0) keep.add(item.index - 1);
      if (item.index < blocks.length - 1) keep.add(item.index + 1);
      if (keep.size >= 6) break;
    }

    const ordered = [...keep].sort((a, b) => a - b);
    let passage = '';
    for (const index of ordered) {
      const next = blocks[index];
      if ((passage + '\n\n' + next).length > maxChars && passage) break;
      passage = passage ? `${passage}\n\n${next}` : next;
    }

    return passage || content.slice(0, maxChars).trim();
  }

  private cleanSection(section: string): string {
    return section
      .replace(/\r\n/g, '\n')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

export const ragService = new RagService();
