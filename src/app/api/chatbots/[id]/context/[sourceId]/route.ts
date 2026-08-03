import { contextService } from '@/lib/server/context';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; sourceId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id, sourceId } = await params;
    return json(await contextService.getOne(user.userId, id, sourceId));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id, sourceId } = await params;
    return json(await contextService.remove(user.userId, id, sourceId));
  } catch (err) {
    return errorResponse(err);
  }
}
