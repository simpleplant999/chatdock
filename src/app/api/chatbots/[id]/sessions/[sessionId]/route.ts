import { chatService } from '@/lib/server/chat';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; sessionId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id, sessionId } = await params;
    return json(await chatService.getSession(user.userId, id, sessionId));
  } catch (err) {
    return errorResponse(err);
  }
}
