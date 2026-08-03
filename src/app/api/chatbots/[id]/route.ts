import { chatbotsService } from '@/lib/server/chatbots';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return json(await chatbotsService.findOne(user.userId, id));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      systemPrompt?: string;
      published?: boolean;
    };

    return json(await chatbotsService.update(user.userId, id, body));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return json(await chatbotsService.remove(user.userId, id));
  } catch (err) {
    return errorResponse(err);
  }
}
