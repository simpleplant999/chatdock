import { getOwnedSuggestions } from '@/lib/server/suggestions';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser(_request);
    const { id } = await params;
    return json(await getOwnedSuggestions(user.userId, id));
  } catch (err) {
    return errorResponse(err);
  }
}
