import { contextService } from '@/lib/server/context';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return json(await contextService.list(user.userId, id));
  } catch (err) {
    return errorResponse(err);
  }
}
