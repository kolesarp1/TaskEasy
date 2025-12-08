import type { Context } from '@netlify/functions';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma';
import { generateToken, verifyToken, getTokenFromCookies, createCookieHeader, createClearCookieHeader } from './lib/auth';

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace('/.netlify/functions/auth', '').replace('/api/auth', '');
  const method = req.method;

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // POST /auth/signup
    if (path === '/signup' && method === 'POST') {
      const { email, password } = await req.json();

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password required' }), {
          status: 400,
          headers,
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), {
          status: 400,
          headers,
        });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return new Response(JSON.stringify({ error: 'Email already registered' }), {
          status: 400,
          headers,
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword },
      });

      const token = generateToken(user.id);

      return new Response(JSON.stringify({ user: { id: user.id, email: user.email } }), {
        status: 201,
        headers: {
          ...headers,
          'Set-Cookie': createCookieHeader(token),
        },
      });
    }

    // POST /auth/signin
    if (path === '/signin' && method === 'POST') {
      const { email, password } = await req.json();

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password required' }), {
          status: 400,
          headers,
        });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
          status: 401,
          headers,
        });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
          status: 401,
          headers,
        });
      }

      const token = generateToken(user.id);

      return new Response(JSON.stringify({ user: { id: user.id, email: user.email } }), {
        status: 200,
        headers: {
          ...headers,
          'Set-Cookie': createCookieHeader(token),
        },
      });
    }

    // POST /auth/signout
    if (path === '/signout' && method === 'POST') {
      return new Response(JSON.stringify({ message: 'Signed out successfully' }), {
        status: 200,
        headers: {
          ...headers,
          'Set-Cookie': createClearCookieHeader(),
        },
      });
    }

    // GET /auth/me
    if (path === '/me' && method === 'GET') {
      const token = getTokenFromCookies(req.headers.get('cookie') || undefined);
      if (!token) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers,
        });
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401,
          headers,
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, createdAt: true },
      });

      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers,
        });
      }

      return new Response(JSON.stringify({ user }), {
        status: 200,
        headers,
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
};
