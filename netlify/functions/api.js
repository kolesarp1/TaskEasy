const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Auth helpers
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function getToken(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
  const cookies = cookie.parse(cookieHeader);
  return cookies.token || null;
}

function getUserId(event) {
  const token = getToken(event);
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

function setCookie(token) {
  return `token=${token}; HttpOnly; Path=/; Max-Age=${7*24*60*60}; SameSite=Lax`;
}

function clearCookie() {
  return 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
}

function formatTask(t) {
  return {
    id: t.id, title: t.title, description: t.description, quadrant: t.quadrant,
    positionX: t.position_x, positionY: t.position_y,
    createdAt: t.created_at, updatedAt: t.updated_at, userId: t.user_id,
    screenshots: t.screenshots || [],
  };
}

exports.handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/api', '');
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
    // AUTH ROUTES
    if (path === '/auth/signup' && method === 'POST') {
      const { email, password } = JSON.parse(event.body || '{}');
      if (!email || !password) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email and password required' }) };
      if (password.length < 6) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password must be at least 6 characters' }) };

      const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
      if (existing) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email already registered' }) };

      const hashedPassword = await bcrypt.hash(password, 10);
      const { data: user, error } = await supabase.from('users').insert({ email, password: hashedPassword }).select('id, email').single();
      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create account' }) };

      headers['Set-Cookie'] = setCookie(generateToken(user.id));
      return { statusCode: 201, headers, body: JSON.stringify({ user }) };
    }

    if (path === '/auth/signin' && method === 'POST') {
      const { email, password } = JSON.parse(event.body || '{}');
      if (!email || !password) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email and password required' }) };

      const { data: user } = await supabase.from('users').select('id, email, password').eq('email', email).single();
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid email or password' }) };
      }

      headers['Set-Cookie'] = setCookie(generateToken(user.id));
      return { statusCode: 200, headers, body: JSON.stringify({ user: { id: user.id, email: user.email } }) };
    }

    if (path === '/auth/signout' && method === 'POST') {
      headers['Set-Cookie'] = clearCookie();
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Signed out' }) };
    }

    if (path === '/auth/me' && method === 'GET') {
      const userId = getUserId(event);
      if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Not authenticated' }) };

      const { data: user } = await supabase.from('users').select('id, email, created_at').eq('id', userId).single();
      if (!user) return { statusCode: 404, headers, body: JSON.stringify({ error: 'User not found' }) };

      return { statusCode: 200, headers, body: JSON.stringify({ user }) };
    }

    // TASK ROUTES (require auth)
    const userId = getUserId(event);
    if (path.startsWith('/tasks') && !userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
    }

    if (path === '/tasks' && method === 'GET') {
      const { data: tasks } = await supabase.from('tasks').select('*, screenshots(*)').eq('user_id', userId).order('created_at', { ascending: false });
      return { statusCode: 200, headers, body: JSON.stringify({ tasks: (tasks || []).map(formatTask) }) };
    }

    if (path === '/tasks' && method === 'POST') {
      const { title, description, quadrant, positionX, positionY } = JSON.parse(event.body || '{}');
      if (!title) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Title required' }) };

      const { data: task, error } = await supabase.from('tasks').insert({
        title, description, quadrant: quadrant || 'backlog',
        position_x: positionX, position_y: positionY, user_id: userId,
      }).select('*, screenshots(*)').single();

      if (error) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create task' }) };
      return { statusCode: 201, headers, body: JSON.stringify({ task: formatTask(task) }) };
    }

    if (path === '/tasks/merge' && method === 'POST') {
      const { taskIds, title: customTitle } = JSON.parse(event.body || '{}');
      if (!taskIds || taskIds.length < 2) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Need 2+ tasks' }) };

      const { data: tasks } = await supabase.from('tasks').select('*, screenshots(*)').in('id', taskIds).eq('user_id', userId);
      if (!tasks || tasks.length !== taskIds.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Tasks not found' }) };

      const base = tasks[0];
      const desc = tasks.map(t => t.description).filter(Boolean).join('\n\n---\n\n');
      const { data: merged } = await supabase.from('tasks').insert({
        title: customTitle || base.title, description: desc || null,
        quadrant: base.quadrant, position_x: base.position_x, position_y: base.position_y, user_id: userId,
      }).select().single();

      const ssIds = tasks.flatMap(t => (t.screenshots || []).map(s => s.id));
      if (ssIds.length) await supabase.from('screenshots').update({ task_id: merged.id }).in('id', ssIds);
      await supabase.from('tasks').delete().in('id', taskIds);

      const { data: final } = await supabase.from('tasks').select('*, screenshots(*)').eq('id', merged.id).single();
      return { statusCode: 201, headers, body: JSON.stringify({ task: formatTask(final) }) };
    }

    const taskMatch = path.match(/^\/tasks\/([a-f0-9-]+)$/i);
    if (taskMatch) {
      const taskId = taskMatch[1];

      if (method === 'GET') {
        const { data: task } = await supabase.from('tasks').select('*, screenshots(*)').eq('id', taskId).eq('user_id', userId).single();
        if (!task) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify({ task: formatTask(task) }) };
      }

      if (method === 'PATCH') {
        const body = JSON.parse(event.body || '{}');
        const upd = {};
        if (body.title !== undefined) upd.title = body.title;
        if (body.description !== undefined) upd.description = body.description;
        if (body.quadrant !== undefined) upd.quadrant = body.quadrant;
        if (body.positionX !== undefined) upd.position_x = body.positionX;
        if (body.positionY !== undefined) upd.position_y = body.positionY;

        const { data: task } = await supabase.from('tasks').update(upd).eq('id', taskId).eq('user_id', userId).select('*, screenshots(*)').single();
        if (!task) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, headers, body: JSON.stringify({ task: formatTask(task) }) };
      }

      if (method === 'DELETE') {
        await supabase.from('tasks').delete().eq('id', taskId).eq('user_id', userId);
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted' }) };
      }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    console.error('API error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
