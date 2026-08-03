import { chatService } from '@/lib/server/chat';
import { errorResponse, json } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

/** Always creates a brand-new session (used by embed on every page load). */
export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return json(await chatService.createPublicSession(id));
  } catch (err) {
    return errorResponse(err);
  }
}
