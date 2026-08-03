import { contextService } from '@/lib/server/context';
import { AppError } from '@/lib/server/errors';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const body = (await request.json()) as { name?: string; content?: string };

    if (!body.name?.trim() || !body.content?.trim()) {
      throw new AppError(400, 'Name and content are required');
    }

    return json(
      await contextService.addText(user.userId, id, {
        name: body.name,
        content: body.content,
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
