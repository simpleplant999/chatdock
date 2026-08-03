import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { getDb } from './db';
import { AppError } from './errors';
import { signToken } from './jwt';

export class AuthService {
  async register(dto: { email: string; password: string }) {
    const email = dto.email.trim().toLowerCase();
    const db = await getDb();
    const existing = await db.users.findOne({ email });

    if (existing) {
      throw new AppError(409, 'An account with this email already exists');
    }

    const id = uuid();
    const now = new Date().toISOString();
    const passwordHash = bcrypt.hashSync(dto.password, 10);

    await db.users.insertOne({
      _id: id,
      email,
      passwordHash,
      createdAt: now,
    });

    return this.tokenResponse(id, email);
  }

  async login(dto: { email: string; password: string }) {
    const email = dto.email.trim().toLowerCase();
    const db = await getDb();
    const user = await db.users.findOne({ email });

    if (!user || !bcrypt.compareSync(dto.password, user.passwordHash)) {
      throw new AppError(401, 'Invalid email or password');
    }

    return this.tokenResponse(user._id, user.email);
  }

  async me(userId: string) {
    const db = await getDb();
    const user = await db.users.findOne(
      { _id: userId },
      { projection: { email: 1, createdAt: 1 } },
    );

    if (!user) throw new AppError(401, 'Unauthorized');

    return {
      id: user._id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  private async tokenResponse(userId: string, email: string) {
    const accessToken = await signToken({ sub: userId, email });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: userId,
        email,
      },
    };
  }
}

export const authService = new AuthService();
