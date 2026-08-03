import { libraryFilesService } from '@/lib/server/library-files';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id, fileId } = await params;
    return json(await libraryFilesService.remove(user.userId, id, fileId));
  } catch (err) {
    return errorResponse(err);
  }
}
