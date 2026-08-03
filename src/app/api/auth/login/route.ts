import { authService } from '@/lib/server/auth-service';
import { AppError } from '@/lib/server/errors';
import { errorResponse, json } from '@/lib/server/http';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
// test
    const email = (body.email || '').trim();
    const password = body.password || '';

    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }

    return json(await authService.login({ email, password }));
  } catch (err) {
    return errorResponse(err);
  }
}
