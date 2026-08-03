import { chatService } from '@/lib/server/chat';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return json(await chatService.listSessions(user.userId, id));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    let body: { greeting?: string } = {};
    try {
      body = (await request.json()) as { greeting?: string };
    } catch {
      body = {};
    }

    return json(await chatService.createSession(user.userId, id, body));
  } catch (err) {
    return errorResponse(err);
  }
}
