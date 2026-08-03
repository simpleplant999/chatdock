import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { verifyToken } from './jwt';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json({ message: err.message }, { status: err.status });
  }

  console.error(err);

  const message = err instanceof Error ? err.message : String(err);
  const isMongo =
    /mongo|ENOTFOUND|ECONNREFUSED|authentication failed|whitelist|IP/i.test(
      message,
    );

  return NextResponse.json(
    {
      message: isMongo
        ? `Database connection failed: ${message}`
        : 'Internal server error',
    },
    { status: 500 },
  );
}

export async function requireUser(request: Request): Promise<{
  userId: string;
  email: string;
}> {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new AppError(401, 'Unauthorized');
  }

  try {
    return await verifyToken(match[1].trim());
  } catch {
    throw new AppError(401, 'Unauthorized');
  }
}
