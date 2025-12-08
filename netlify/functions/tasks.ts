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
  const path = url.pathname.replace('/.netlify/functions/tasks', '').replace('/api/tasks', '');
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
    // GET /tasks - List all tasks
    if ((path === '' || path === '/') && method === 'GET') {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*, screenshots(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), { status: 500, headers });
      }

      // Transform to match expected format
      const formattedTasks = tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        quadrant: t.quadrant,
        positionX: t.position_x,
        positionY: t.position_y,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        userId: t.user_id,
        screenshots: t.screenshots || [],
      }));

      return new Response(JSON.stringify({ tasks: formattedTasks }), { status: 200, headers });
    }

    // POST /tasks - Create task
    if ((path === '' || path === '/') && method === 'POST') {
      const { title, description, quadrant, positionX, positionY } = await req.json();

      if (!title) {
        return new Response(JSON.stringify({ error: 'Title is required' }), { status: 400, headers });
      }

      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          title,
          description,
          quadrant: quadrant || 'backlog',
          position_x: positionX,
          position_y: positionY,
          user_id: userId,
        })
        .select('*, screenshots(*)')
        .single();

      if (error) {
        console.error('Error creating task:', error);
        return new Response(JSON.stringify({ error: 'Failed to create task' }), { status: 500, headers });
      }

      const formattedTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        quadrant: task.quadrant,
        positionX: task.position_x,
        positionY: task.position_y,
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        userId: task.user_id,
        screenshots: task.screenshots || [],
      };

      return new Response(JSON.stringify({ task: formattedTask }), { status: 201, headers });
    }

    // POST /tasks/merge - Merge tasks
    if (path === '/merge' && method === 'POST') {
      const { taskIds, title: customTitle } = await req.json();

      if (!taskIds || taskIds.length < 2) {
        return new Response(JSON.stringify({ error: 'At least 2 tasks required for merge' }), { status: 400, headers });
      }

      const { data: tasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*, screenshots(*)')
        .in('id', taskIds)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError || !tasks || tasks.length !== taskIds.length) {
        return new Response(JSON.stringify({ error: 'One or more tasks not found' }), { status: 404, headers });
      }

      const baseTask = tasks[0];
      const combinedDescription = tasks
        .map((t) => t.description)
        .filter(Boolean)
        .join('\n\n---\n\n');

      // Create merged task
      const { data: mergedTask, error: createError } = await supabase
        .from('tasks')
        .insert({
          title: customTitle || baseTask.title,
          description: combinedDescription || null,
          quadrant: baseTask.quadrant,
          position_x: baseTask.position_x,
          position_y: baseTask.position_y,
          user_id: userId,
        })
        .select()
        .single();

      if (createError) {
        return new Response(JSON.stringify({ error: 'Failed to merge tasks' }), { status: 500, headers });
      }

      // Move screenshots to merged task
      const allScreenshotIds = tasks.flatMap((t) => (t.screenshots || []).map((s: { id: string }) => s.id));
      if (allScreenshotIds.length > 0) {
        await supabase
          .from('screenshots')
          .update({ task_id: mergedTask.id })
          .in('id', allScreenshotIds);
      }

      // Delete original tasks
      await supabase.from('tasks').delete().in('id', taskIds);

      // Fetch final task with screenshots
      const { data: finalTask } = await supabase
        .from('tasks')
        .select('*, screenshots(*)')
        .eq('id', mergedTask.id)
        .single();

      const formattedTask = {
        id: finalTask.id,
        title: finalTask.title,
        description: finalTask.description,
        quadrant: finalTask.quadrant,
        positionX: finalTask.position_x,
        positionY: finalTask.position_y,
        createdAt: finalTask.created_at,
        updatedAt: finalTask.updated_at,
        userId: finalTask.user_id,
        screenshots: finalTask.screenshots || [],
      };

      return new Response(JSON.stringify({ task: formattedTask }), { status: 201, headers });
    }

    // Match /:id routes
    const idMatch = path.match(/^\/([a-f0-9-]+)$/i);
    if (idMatch) {
      const taskId = idMatch[1];

      // GET /tasks/:id
      if (method === 'GET') {
        const { data: task, error } = await supabase
          .from('tasks')
          .select('*, screenshots(*)')
          .eq('id', taskId)
          .eq('user_id', userId)
          .single();

        if (error || !task) {
          return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404, headers });
        }

        const formattedTask = {
          id: task.id,
          title: task.title,
          description: task.description,
          quadrant: task.quadrant,
          positionX: task.position_x,
          positionY: task.position_y,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          userId: task.user_id,
          screenshots: task.screenshots || [],
        };

        return new Response(JSON.stringify({ task: formattedTask }), { status: 200, headers });
      }

      // PATCH /tasks/:id
      if (method === 'PATCH') {
        const body = await req.json();
        const updateData: Record<string, unknown> = {};

        if (body.title !== undefined) updateData.title = body.title;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.quadrant !== undefined) updateData.quadrant = body.quadrant;
        if (body.positionX !== undefined) updateData.position_x = body.positionX;
        if (body.positionY !== undefined) updateData.position_y = body.positionY;

        const { data: task, error } = await supabase
          .from('tasks')
          .update(updateData)
          .eq('id', taskId)
          .eq('user_id', userId)
          .select('*, screenshots(*)')
          .single();

        if (error || !task) {
          return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404, headers });
        }

        const formattedTask = {
          id: task.id,
          title: task.title,
          description: task.description,
          quadrant: task.quadrant,
          positionX: task.position_x,
          positionY: task.position_y,
          createdAt: task.created_at,
          updatedAt: task.updated_at,
          userId: task.user_id,
          screenshots: task.screenshots || [],
        };

        return new Response(JSON.stringify({ task: formattedTask }), { status: 200, headers });
      }

      // DELETE /tasks/:id
      if (method === 'DELETE') {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) {
          return new Response(JSON.stringify({ error: 'Task not found' }), { status: 404, headers });
        }

        return new Response(JSON.stringify({ message: 'Task deleted successfully' }), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });
  } catch (error) {
    console.error('Tasks error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
};
