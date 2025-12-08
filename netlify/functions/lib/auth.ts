import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function getTokenFromCookies(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const cookies = parse(cookieHeader);
  return cookies.token || null;
}

export function createCookieHeader(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return `token=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function createClearCookieHeader(): string {
  return 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
}
