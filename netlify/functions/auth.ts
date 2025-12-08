import bcrypt from 'bcryptjs';
import { supabase } from './lib/supabase.js';
import { generateToken, verifyToken, getTokenFromCookies, createCookieHeader, createClearCookieHeader } from './lib/auth.js';

export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace('/.netlify/functions/auth', '').replace('/api/auth', '');
  const method = req.method;

  const headers: Record<string, string> = {
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
        return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'Password must be at least 6 characters' }), { status: 400, headers });
      }

      // Check if user exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 400, headers });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: user, error } = await supabase
        .from('users')
        .insert({ email, password: hashedPassword })
        .select('id, email')
        .single();

      if (error) {
        console.error('Signup error:', error);
        return new Response(JSON.stringify({ error: 'Failed to create account' }), { status: 500, headers });
      }

      const token = generateToken(user.id);
      headers['Set-Cookie'] = createCookieHeader(token);

      return new Response(JSON.stringify({ user: { id: user.id, email: user.email } }), { status: 201, headers });
    }

    // POST /auth/signin
    if (path === '/signin' && method === 'POST') {
      const { email, password } = await req.json();

      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, password')
        .eq('email', email)
        .single();

      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers });
      }

      const token = generateToken(user.id);
      headers['Set-Cookie'] = createCookieHeader(token);

      return new Response(JSON.stringify({ user: { id: user.id, email: user.email } }), { status: 200, headers });
    }

    // POST /auth/signout
    if (path === '/signout' && method === 'POST') {
      headers['Set-Cookie'] = createClearCookieHeader();
      return new Response(JSON.stringify({ message: 'Signed out successfully' }), { status: 200, headers });
    }

    // GET /auth/me
    if (path === '/me' && method === 'GET') {
      const token = getTokenFromCookies(req.headers.get('cookie') || undefined);
      if (!token) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers });
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers });
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, created_at')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers });
      }

      return new Response(JSON.stringify({ user }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  } catch (error) {
    console.error('Auth error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
};
