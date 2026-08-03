import { contextService } from '@/lib/server/context';
import { AppError } from '@/lib/server/errors';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const body = (await request.json()) as { url?: string; name?: string };

    if (!body.url?.trim()) {
      throw new AppError(400, 'URL is required');
    }

    return json(
      await contextService.addLink(user.userId, id, {
        url: body.url.trim(),
        name: body.name,
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
