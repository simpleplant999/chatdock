import { contextService } from '@/lib/server/context';
import { AppError } from '@/lib/server/errors';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new AppError(400, 'File is required');
    }

    if (file.size > 8 * 1024 * 1024) {
      throw new AppError(400, 'File must be 8MB or smaller');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    return json(
      await contextService.addFile(user.userId, id, {
        buffer,
        originalname: file.name,
        mimetype: file.type || 'application/octet-stream',
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
