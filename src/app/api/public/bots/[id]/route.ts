import { chatbotsService } from '@/lib/server/chatbots';
import { errorResponse, json } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    return json(await chatbotsService.getPublicBot(id));
  } catch (err) {
    return errorResponse(err);
  }
}
