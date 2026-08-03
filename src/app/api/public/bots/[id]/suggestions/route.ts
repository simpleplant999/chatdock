import { getPublicSuggestions } from '@/lib/server/suggestions';
import { errorResponse, json } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return json(await getPublicSuggestions(id));
  } catch (err) {
    return errorResponse(err);
  }
}
