import { supabase } from './lib/supabase.js';
import { verifyToken, getTokenFromCookies } from './lib/auth.js';

async function getUserId(req: Request): Promise<string | null> {
  const token = getTokenFromCookies(req.headers.get('cookie') || undefined);
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace('/.netlify/functions/screenshots', '').replace('/api/screenshots', '');
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

  const userId = await getUserId(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers });
  }

  try {
    // POST /screenshots/task/:taskId - Upload screenshot
    const uploadMatch = path.match(/^\/task\/([a-f0-9-]+)$/i);
    if (uploadMatch && method === 'POST') {
      return new Response(JSON.stringify({
        error: 'Screenshot upload requires cloud storage configuration (coming soon)'
      }), { status: 501, headers });
    }

    // DELETE /screenshots/:id
    const deleteMatch = path.match(/^\/([a-f0-9-]+)$/i);
    if (deleteMatch && method === 'DELETE') {
      const screenshotId = deleteMatch[1];

      // Find screenshot and verify ownership
      const { data: screenshot, error: fetchError } = await supabase
        .from('screenshots')
        .select('*, tasks!inner(user_id)')
        .eq('id', screenshotId)
        .single();

      if (fetchError || !screenshot || screenshot.tasks.user_id !== userId) {
        return new Response(JSON.stringify({ error: 'Screenshot not found' }), { status: 404, headers });
      }

      const { error } = await supabase
        .from('screenshots')
        .delete()
        .eq('id', screenshotId);

      if (error) {
        return new Response(JSON.stringify({ error: 'Failed to delete screenshot' }), { status: 500, headers });
      }

      return new Response(JSON.stringify({ message: 'Screenshot deleted successfully' }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  } catch (error) {
    console.error('Screenshots error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
};
