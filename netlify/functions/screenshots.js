const { supabase } = require('./lib/supabase');
const { verifyToken, getTokenFromCookies } = require('./lib/auth');

function getUserId(event) {
  const token = getTokenFromCookies(event.headers.cookie || event.headers.Cookie);
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

exports.handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/screenshots', '').replace('/api/screenshots', '');
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

  const userId = getUserId(event);
  if (!userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
  }

  try {
    // POST /screenshots/task/:taskId
    const uploadMatch = path.match(/^\/task\/([a-f0-9-]+)$/i);
    if (uploadMatch && method === 'POST') {
      return {
        statusCode: 501,
        headers,
        body: JSON.stringify({ error: 'Screenshot upload coming soon' })
      };
    }

    // DELETE /screenshots/:id
    const deleteMatch = path.match(/^\/([a-f0-9-]+)$/i);
    if (deleteMatch && method === 'DELETE') {
      const screenshotId = deleteMatch[1];

      const { data: screenshot } = await supabase
        .from('screenshots')
        .select('*, tasks!inner(user_id)')
        .eq('id', screenshotId)
        .single();

      if (!screenshot || screenshot.tasks.user_id !== userId) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
      }

      await supabase.from('screenshots').delete().eq('id', screenshotId);

      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted' }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    console.error('Screenshots error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
