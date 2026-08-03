import { chatService } from '@/lib/server/chat';
import { AppError } from '@/lib/server/errors';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; sessionId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id, sessionId } = await params;
    const body = (await request.json()) as { content?: string };

    if (!body.content?.trim()) {
      throw new AppError(400, 'Content is required');
    }

    return json(
      await chatService.sendMessage(user.userId, id, sessionId, {
        content: body.content,
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
