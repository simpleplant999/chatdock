import { chatService } from '@/lib/server/chat';
import { AppError } from '@/lib/server/errors';
import { errorResponse, json } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; sessionId: string }> };

function originFromRequest(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (env) return env;
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  return host ? `${proto}://${host}` : '';
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id, sessionId } = await params;
    const body = (await request.json()) as { content?: string };
    if (!body.content?.trim()) {
      throw new AppError(400, 'Message content is required');
    }
    return json(
      await chatService.sendPublicMessage(id, sessionId, {
        content: body.content,
        baseUrl: originFromRequest(request),
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
