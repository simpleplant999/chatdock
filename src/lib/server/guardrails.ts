export type GuardrailVerdict =
  | { allowed: true }
  | {
      allowed: false;
      code:
        | 'empty'
        | 'too_long'
        | 'jailbreak'
        | 'unsafe'
        | 'off_policy'
        | 'ungrounded'
        | 'unsafe_output'
        | 'unsafe_context';
      message: string;
    };

const MAX_USER_MESSAGE_CHARS = 2000;
const MAX_ANSWER_CHARS = 8000;
const MAX_CONTEXT_CHARS = 100_000;

const JAILBREAK_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)/i,
  /disregard\s+(all\s+)?(previous|prior|your)\s+(instructions|rules|guidelines)/i,
  /forget\s+(everything|your\s+instructions|your\s+rules)/i,
  /you\s+are\s+now\s+(dan|unrestricted|jailbroken|evil)/i,
  /\bdo\s+anything\s+now\b/i,
  /\bjailbreak\b/i,
  /override\s+(your\s+)?(system|safety|content)\s+(prompt|rules|policy|filters)/i,
  /act\s+as\s+if\s+(you\s+have\s+)?no\s+(restrictions|limits|rules|guardrails)/i,
  /pretend\s+(you\s+)?(are\s+)?(not\s+bound|unrestricted)/i,
  /bypass\s+(your\s+)?(safety|content|moderation|guardrail)/i,
  /reveal\s+(your\s+)?(system\s+prompt|hidden\s+instructions|internal\s+rules)/i,
  /show\s+(me\s+)?(your\s+)?(system\s+prompt|instructions)/i,
  /developer\s+mode\s+(enabled|on)/i,
  /\bsudo\s+mode\b/i,
  /new\s+persona[:\s]/i,
  /respond\s+without\s+(using|relying\s+on)\s+(the\s+)?(context|knowledge\s+base|sources)/i,
  /answer\s+(even\s+if|whether\s+or\s+not)\s+(it('s| is)\s+)?(not\s+)?in\s+(the\s+)?(context|docs|knowledge)/i,
  /make\s+up\s+(an?\s+)?answer/i,
  /hallucinate|invent\s+(facts|details|an?\s+answer)/i,
];

const UNSAFE_PATTERNS: RegExp[] = [
  /\b(how\s+to\s+)?(make|build|create|assemble)\b.{0,40}\b(bomb|explosive|napalm|ricin|nerve\s+gas)\b/i,
  /\b(how\s+to\s+)?(hack|breach|phish|keylog)\b.{0,40}\b(account|password|bank|wifi|system)\b/i,
  /\bcredit\s*card\s*(numbers?|cvv|dump)\b/i,
  /\b(child\s*porn|csam|underage\s+sex|sexual\s+content\s+involving\s+(a\s+)?(minor|child))\b/i,
  /\b(kill|murder|assassinate)\b.{0,30}\b(someone|a\s+person|people|him|her)\b/i,
  /\b(how\s+to\s+)?(commit|get\s+away\s+with)\s+(murder|fraud|arson)\b/i,
  /\b(suicide\s+methods?|how\s+to\s+kill\s+myself|best\s+way\s+to\s+end\s+my\s+life)\b/i,
  /\b(synthesize|cook)\b.{0,30}\b(meth|fentanyl|heroin|cocaine)\b/i,
  /\b(steal|skimming)\b.{0,30}\b(identity|ssn|social\s+security)\b/i,
];

const UNSAFE_CONTEXT_PATTERNS: RegExp[] = [
  /\b(child\s*porn|csam|underage\s+sex)\b/i,
  /\b(detailed\s+instructions?\s+to\s+(build|make)\s+(a\s+)?bomb)\b/i,
];

const REFUSAL_MESSAGES = {
  empty: 'Go ahead and ask your question whenever you’re ready.',
  too_long: `Your message is too long. Please keep questions under ${MAX_USER_MESSAGE_CHARS} characters.`,
  jailbreak:
    "I can’t change how I work, but I’m happy to help with a normal question.",
  unsafe:
    "I can’t help with that request. If you have another question, I’m happy to try.",
  off_policy:
    "I’m not able to help with that. Try asking something else I can answer.",
  ungrounded:
    "I’m not sure about that — I don’t have enough info to answer confidently. Want to try another question?",
  unsafe_output:
    "I can’t share that response. Please try rephrasing your question.",
  unsafe_context:
    'This content was blocked by safety guardrails and was not added.',
} as const;

export class GuardrailsService {
  readonly limits = {
    maxUserMessageChars: MAX_USER_MESSAGE_CHARS,
    maxAnswerChars: MAX_ANSWER_CHARS,
    maxContextChars: MAX_CONTEXT_CHARS,
  };

  checkUserInput(raw: string): GuardrailVerdict {
    const content = (raw || '').trim();

    if (!content) {
      return {
        allowed: false,
        code: 'empty',
        message: REFUSAL_MESSAGES.empty,
      };
    }

    if (content.length > MAX_USER_MESSAGE_CHARS) {
      return {
        allowed: false,
        code: 'too_long',
        message: REFUSAL_MESSAGES.too_long,
      };
    }

    if (this.matchesAny(content, JAILBREAK_PATTERNS)) {
      return {
        allowed: false,
        code: 'jailbreak',
        message: REFUSAL_MESSAGES.jailbreak,
      };
    }

    if (this.matchesAny(content, UNSAFE_PATTERNS)) {
      return {
        allowed: false,
        code: 'unsafe',
        message: REFUSAL_MESSAGES.unsafe,
      };
    }

    // Block attempts to force answers outside the knowledge base
    if (
      /\b(without|outside|ignoring)\s+(the\s+)?(context|knowledge\s+base|sources|documents)\b/i.test(
        content,
      )
    ) {
      return {
        allowed: false,
        code: 'off_policy',
        message: REFUSAL_MESSAGES.off_policy,
      };
    }

    return { allowed: true };
  }

  checkContextContent(raw: string): GuardrailVerdict {
    const content = (raw || '').trim();

    if (!content) {
      return {
        allowed: false,
        code: 'empty',
        message: 'No usable text found to add as context.',
      };
    }

    if (content.length > MAX_CONTEXT_CHARS) {
      return {
        allowed: false,
        code: 'too_long',
        message: `Context is too large. Keep each source under ${MAX_CONTEXT_CHARS.toLocaleString()} characters.`,
      };
    }

    if (this.matchesAny(content, UNSAFE_CONTEXT_PATTERNS)) {
      return {
        allowed: false,
        code: 'unsafe_context',
        message: REFUSAL_MESSAGES.unsafe_context,
      };
    }

    return { allowed: true };
  }

  /**
   * Post-generation checks: safety + groundedness against retrieved context.
   */
  checkGeneratedAnswer(
    answer: string,
    retrievedContents: string[],
    options?: { requireGrounding?: boolean },
  ): GuardrailVerdict & { sanitizedAnswer?: string } {
    const requireGrounding = options?.requireGrounding ?? true;
    let text = (answer || '').trim();

    if (!text) {
      return {
        allowed: false,
        code: 'ungrounded',
        message: REFUSAL_MESSAGES.ungrounded,
      };
    }

    if (this.matchesAny(text, UNSAFE_PATTERNS)) {
      return {
        allowed: false,
        code: 'unsafe_output',
        message: REFUSAL_MESSAGES.unsafe_output,
      };
    }

    // Never echo jailbreak-style instructions in the answer
    if (this.matchesAny(text, JAILBREAK_PATTERNS)) {
      return {
        allowed: false,
        code: 'unsafe_output',
        message: REFUSAL_MESSAGES.unsafe_output,
      };
    }

    if (requireGrounding && retrievedContents.length > 0) {
      const grounded = this.isGrounded(text, retrievedContents);
      if (!grounded) {
        return {
          allowed: false,
          code: 'ungrounded',
          message: REFUSAL_MESSAGES.ungrounded,
        };
      }
    }

    if (requireGrounding && retrievedContents.length === 0) {
      // Allowed only when the answer is an explicit refusal we generated
      if (!this.isRefusalAnswer(text)) {
        return {
          allowed: false,
          code: 'ungrounded',
          message: REFUSAL_MESSAGES.ungrounded,
        };
      }
    }

    if (text.length > MAX_ANSWER_CHARS) {
      text = `${text.slice(0, MAX_ANSWER_CHARS).trim()}…`;
    }

    // Soft cleanup: strip role-play / system leakage markers
    text = text
      .replace(/^\s*(system|assistant|developer)\s*:\s*/gim, '')
      .replace(/\u0000/g, '')
      .trim();

    return { allowed: true, sanitizedAnswer: text };
  }

  sanitizeForStorage(text: string): string {
    return text.replace(/\u0000/g, '').trim();
  }

  private isRefusalAnswer(text: string): boolean {
    return /don'?t have enough (information|info)|not sure about that|can'?t help with that|can'?t change (my rules|how i work)|blocked by safety guardrails/i.test(
      text,
    );
  }

  /**
   * Lightweight groundedness: enough content tokens from the answer
   * must also appear in retrieved context (excluding stop-ish short tokens).
   */
  private isGrounded(answer: string, retrievedContents: string[]): boolean {
    // Strip leftover framing before checking overlap
    const body = answer.trim();

    // Explicit refusals are fine
    if (this.isRefusalAnswer(answer)) return true;

    const contextBlob = retrievedContents.join(' ').toLowerCase();
    const tokens = body
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 3);

    if (tokens.length === 0) return false;

    const unique = [...new Set(tokens)];
    const hits = unique.filter((t) => contextBlob.includes(t)).length;
    const ratio = hits / unique.length;

    // Solid overlap; slightly softer so paraphrased LLM answers still pass
    return ratio >= 0.32 || hits >= Math.min(5, unique.length);
  }

  private matchesAny(text: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(text));
  }
}

export const guardrailsService = new GuardrailsService();
