import type { Context } from '@netlify/functions';
import { prisma } from './lib/prisma';
import { verifyToken, getTokenFromCookies } from './lib/auth';

async function getUserId(req: Request): Promise<string | null> {
  const token = getTokenFromCookies(req.headers.get('cookie') || undefined);
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace('/.netlify/functions/screenshots', '').replace('/api/screenshots', '');
  const method = req.method;

  const headers = {
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
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers,
    });
  }

  try {
    // POST /screenshots/task/:taskId - Upload screenshot
    // Note: For serverless, we'd need to use a cloud storage service like Cloudinary or S3
    // For now, we'll return an error indicating this needs to be configured
    const uploadMatch = path.match(/^\/task\/([a-f0-9-]+)$/i);
    if (uploadMatch && method === 'POST') {
      return new Response(JSON.stringify({
        error: 'Screenshot upload requires cloud storage configuration. Please set up Cloudinary or S3.'
      }), {
        status: 501,
        headers,
      });
    }

    // DELETE /screenshots/:id
    const deleteMatch = path.match(/^\/([a-f0-9-]+)$/i);
    if (deleteMatch && method === 'DELETE') {
      const screenshotId = deleteMatch[1];

      const screenshot = await prisma.screenshot.findUnique({
        where: { id: screenshotId },
        include: { task: true },
      });

      if (!screenshot || screenshot.task.userId !== userId) {
        return new Response(JSON.stringify({ error: 'Screenshot not found' }), {
          status: 404,
          headers,
        });
      }

      await prisma.screenshot.delete({ where: { id: screenshotId } });

      return new Response(JSON.stringify({ message: 'Screenshot deleted successfully' }), {
        status: 200,
        headers,
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers,
    });
  } catch (error) {
    console.error('Screenshots error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
};
