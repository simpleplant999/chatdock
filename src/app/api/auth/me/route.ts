import { authService } from '@/lib/server/auth-service';
import { errorResponse, json, requireUser } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return json(await authService.me(user.userId));
  } catch (err) {
    return errorResponse(err);
  }
}
