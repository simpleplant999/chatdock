import { libraryFilesService } from '@/lib/server/library-files';
import { Binary } from 'mongodb';
import { errorResponse } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ token: string }> };

/** Public tokenized download — safe to share in chat replies. */
export async function GET(request: Request, { params }: Params) {
  try {
    const { token } = await params;
    if (!token?.trim()) {
      return new Response('Not found', { status: 404 });
    }

    const inline = new URL(request.url).searchParams.get('inline') === '1';
    const doc = await libraryFilesService.getByDownloadToken(token.trim());
    const raw =
      doc.data instanceof Binary
        ? Buffer.from(doc.data.buffer)
        : Buffer.from(doc.data as unknown as ArrayBuffer);

    const safeName = doc.originalName.replace(/[^\w.\- ()[\]]+/g, '_') || 'file';
    const disposition = inline
      ? `inline; filename="${safeName}"`
      : `attachment; filename="${safeName}"`;

    return new Response(new Uint8Array(raw), {
      status: 200,
      headers: {
        'Content-Type': doc.mimeType || 'application/octet-stream',
        'Content-Length': String(raw.length),
        'Content-Disposition': disposition,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
