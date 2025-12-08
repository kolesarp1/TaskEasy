const bcrypt = require('bcryptjs');
const { supabase } = require('./lib/supabase');
const { generateToken, verifyToken, getTokenFromCookies, createCookieHeader, createClearCookieHeader } = require('./lib/auth');

exports.handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/auth', '').replace('/api/auth', '');
  const method = event.httpMethod;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // POST /auth/signup
    if (path === '/signup' && method === 'POST') {
      const { email, password } = JSON.parse(event.body || '{}');

      if (!email || !password) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email and password required' }) };
      }

      if (password.length < 6) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 6 characters' }) };
      }

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email already registered' }) };
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const { data: user, error } = await supabase
        .from('users')
        .insert({ email, password: hashedPassword })
        .select('id, email')
        .single();

      if (error) {
        console.error('Signup error:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create account' }) };
      }

      const token = generateToken(user.id);
      headers['Set-Cookie'] = createCookieHeader(token);

      return { statusCode: 201, headers, body: JSON.stringify({ user: { id: user.id, email: user.email } }) };
    }

    // POST /auth/signin
    if (path === '/signin' && method === 'POST') {
      const { email, password } = JSON.parse(event.body || '{}');

      if (!email || !password) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email and password required' }) };
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, password')
        .eq('email', email)
        .single();

      if (error || !user) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid email or password' }) };
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid email or password' }) };
      }

      const token = generateToken(user.id);
      headers['Set-Cookie'] = createCookieHeader(token);

      return { statusCode: 200, headers, body: JSON.stringify({ user: { id: user.id, email: user.email } }) };
    }

    // POST /auth/signout
    if (path === '/signout' && method === 'POST') {
      headers['Set-Cookie'] = createClearCookieHeader();
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Signed out successfully' }) };
    }

    // GET /auth/me
    if (path === '/me' && method === 'GET') {
      const token = getTokenFromCookies(event.headers.cookie || event.headers.Cookie);
      if (!token) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, created_at')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ user }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    console.error('Auth error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
