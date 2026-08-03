import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET =
  process.env.JWT_SECRET || 'contextchat-dev-secret-change-me';

function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET);
}

export async function signToken(payload: {
  sub: string;
  email: string;
}): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

export async function verifyToken(
  token: string,
): Promise<{ userId: string; email: string }> {
  const { payload } = await jwtVerify(token, getSecretKey());
  const userId = payload.sub;
  const email = payload.email;

  if (!userId || typeof email !== 'string') {
    throw new Error('Invalid token payload');
  }

  return { userId, email };
}
