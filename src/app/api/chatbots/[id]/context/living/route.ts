import { contextService } from '@/lib/server/context';
import { AppError } from '@/lib/server/errors';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/** Append knowledge into the chatbot's single Living Knowledge.md source. */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const body = (await request.json()) as { content?: string };

    if (!body.content?.trim()) {
      throw new AppError(400, 'Content is required');
    }

    return json(
      await contextService.feedLivingKnowledge(user.userId, id, body.content),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
