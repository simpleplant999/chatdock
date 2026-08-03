import axios from 'axios';
import * as cheerio from 'cheerio';
import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { AppError } from './errors';

export class DocumentParserService {
  async extractFromFile(
    buffer: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<string> {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const type = (mimeType || '').toLowerCase();

    if (ext === 'txt' || type === 'text/plain') {
      return buffer.toString('utf-8');
    }

    if (
      ext === 'md' ||
      ext === 'markdown' ||
      type === 'text/markdown' ||
      type === 'text/x-markdown'
    ) {
      return buffer.toString('utf-8');
    }

    if (ext === 'pdf' || type === 'application/pdf') {
      const parser = new PDFParse({ data: buffer });
      try {
        const parsed = await parser.getText();
        return (parsed.text || '').trim();
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    }

    if (
      ext === 'docx' ||
      type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return (result.value || '').trim();
    }

    if (ext === 'doc' || type === 'application/msword') {
      const asText = buffer.toString('utf-8').replace(/\0/g, '');
      const printable = asText.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ');
      const cleaned = printable.replace(/\s+/g, ' ').trim();
      if (cleaned.length < 40) {
        throw new AppError(
          400,
          'Legacy .doc parsing is limited. Please convert to .docx, .pdf, .md, or .txt.',
        );
      }
      return cleaned;
    }

    throw new AppError(
      400,
      `Unsupported file type "${ext || mimeType}". Use md, pdf, txt, doc, or docx.`,
    );
  }

  async extractFromUrl(
    url: string,
  ): Promise<{ title: string; content: string }> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new AppError(400, 'Invalid URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new AppError(400, 'Only http/https URLs are allowed');
    }

    const response = await axios.get(url, {
      timeout: 15000,
      responseType: 'text',
      maxContentLength: 2_000_000,
      headers: {
        'User-Agent':
          'ChatbaseCloneBot/0.1 (+local MVP; context ingestion)',
        Accept: 'text/html,application/xhtml+xml,text/plain,text/markdown,*/*',
      },
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const contentType = String(response.headers['content-type'] || '');
    const raw =
      typeof response.data === 'string' ? response.data : String(response.data);

    if (
      contentType.includes('text/plain') ||
      contentType.includes('text/markdown') ||
      url.endsWith('.md') ||
      url.endsWith('.txt')
    ) {
      return {
        title: parsed.hostname + parsed.pathname,
        content: raw.trim(),
      };
    }

    const $ = cheerio.load(raw);
    $('script, style, noscript, nav, footer, header, iframe, svg').remove();
    const title =
      $('title').first().text().trim() ||
      $('h1').first().text().trim() ||
      parsed.hostname;
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    if (!text || text.length < 40) {
      throw new AppError(400, 'Could not extract useful text from that URL.');
    }

    return { title, content: text.slice(0, 100_000) };
  }
}
