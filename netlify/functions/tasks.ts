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
  const path = url.pathname.replace('/.netlify/functions/tasks', '').replace('/api/tasks', '');
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
    // GET /tasks - List all tasks
    if ((path === '' || path === '/') && method === 'GET') {
      const tasks = await prisma.task.findMany({
        where: { userId },
        include: { screenshots: true },
        orderBy: { createdAt: 'desc' },
      });
      return new Response(JSON.stringify({ tasks }), { status: 200, headers });
    }

    // POST /tasks - Create task
    if ((path === '' || path === '/') && method === 'POST') {
      const { title, description, quadrant, positionX, positionY } = await req.json();

      if (!title) {
        return new Response(JSON.stringify({ error: 'Title is required' }), {
          status: 400,
          headers,
        });
      }

      const task = await prisma.task.create({
        data: {
          title,
          description,
          quadrant: quadrant || 'backlog',
          positionX,
          positionY,
          userId,
        },
        include: { screenshots: true },
      });

      return new Response(JSON.stringify({ task }), { status: 201, headers });
    }

    // POST /tasks/merge - Merge tasks
    if (path === '/merge' && method === 'POST') {
      const { taskIds, title: customTitle } = await req.json();

      if (!taskIds || taskIds.length < 2) {
        return new Response(JSON.stringify({ error: 'At least 2 tasks required for merge' }), {
          status: 400,
          headers,
        });
      }

      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds }, userId },
        include: { screenshots: true },
        orderBy: { createdAt: 'asc' },
      });

      if (tasks.length !== taskIds.length) {
        return new Response(JSON.stringify({ error: 'One or more tasks not found' }), {
          status: 404,
          headers,
        });
      }

      const baseTask = tasks[0];
      const combinedDescription = tasks
        .map((t) => t.description)
        .filter(Boolean)
        .join('\n\n---\n\n');

      const allScreenshotIds = tasks.flatMap((t) => t.screenshots.map((s) => s.id));

      const mergedTask = await prisma.task.create({
        data: {
          title: customTitle || baseTask.title,
          description: combinedDescription || null,
          quadrant: baseTask.quadrant,
          positionX: baseTask.positionX,
          positionY: baseTask.positionY,
          userId,
        },
      });

      if (allScreenshotIds.length > 0) {
        await prisma.screenshot.updateMany({
          where: { id: { in: allScreenshotIds } },
          data: { taskId: mergedTask.id },
        });
      }

      await prisma.task.deleteMany({
        where: { id: { in: taskIds } },
      });

      const finalTask = await prisma.task.findUnique({
        where: { id: mergedTask.id },
        include: { screenshots: true },
      });

      return new Response(JSON.stringify({ task: finalTask }), { status: 201, headers });
    }

    // Match /:id routes
    const idMatch = path.match(/^\/([a-f0-9-]+)$/i);
    if (idMatch) {
      const taskId = idMatch[1];

      // GET /tasks/:id
      if (method === 'GET') {
        const task = await prisma.task.findFirst({
          where: { id: taskId, userId },
          include: { screenshots: true },
        });

        if (!task) {
          return new Response(JSON.stringify({ error: 'Task not found' }), {
            status: 404,
            headers,
          });
        }

        return new Response(JSON.stringify({ task }), { status: 200, headers });
      }

      // PATCH /tasks/:id
      if (method === 'PATCH') {
        const existingTask = await prisma.task.findFirst({
          where: { id: taskId, userId },
        });

        if (!existingTask) {
          return new Response(JSON.stringify({ error: 'Task not found' }), {
            status: 404,
            headers,
          });
        }

        const data = await req.json();
        const task = await prisma.task.update({
          where: { id: taskId },
          data: {
            title: data.title,
            description: data.description,
            quadrant: data.quadrant,
            positionX: data.positionX,
            positionY: data.positionY,
          },
          include: { screenshots: true },
        });

        return new Response(JSON.stringify({ task }), { status: 200, headers });
      }

      // DELETE /tasks/:id
      if (method === 'DELETE') {
        const existingTask = await prisma.task.findFirst({
          where: { id: taskId, userId },
        });

        if (!existingTask) {
          return new Response(JSON.stringify({ error: 'Task not found' }), {
            status: 404,
            headers,
          });
        }

        await prisma.task.delete({ where: { id: taskId } });

        return new Response(JSON.stringify({ message: 'Task deleted successfully' }), {
          status: 200,
          headers,
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers,
    });
  } catch (error) {
    console.error('Tasks error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers,
    });
  }
};
