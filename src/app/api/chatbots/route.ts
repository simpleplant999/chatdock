import { chatbotsService } from '@/lib/server/chatbots';
import { AppError } from '@/lib/server/errors';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return json(await chatbotsService.findAll(user.userId));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      systemPrompt?: string;
    };

    if (!body.name?.trim()) {
      throw new AppError(400, 'Name is required');
    }

    return json(
      await chatbotsService.create(user.userId, {
        name: body.name,
        description: body.description,
        systemPrompt: body.systemPrompt,
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
