import { libraryFilesService } from '@/lib/server/library-files';
import { AppError } from '@/lib/server/errors';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

function originFromRequest(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (env) return env;
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  return host ? `${proto}://${host}` : '';
}

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return json(
      await libraryFilesService.list(user.userId, id, originFromRequest(request)),
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const formData = await request.formData();
    const title = String(formData.get('title') || '');
    const description = String(formData.get('description') || '');
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new AppError(400, 'File is required');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    return json(
      await libraryFilesService.upload(
        user.userId,
        id,
        {
          title,
          description,
          buffer,
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
        },
        originFromRequest(request),
      ),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
