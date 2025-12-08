const { supabase } = require('./lib/supabase');
const { verifyToken, getTokenFromCookies } = require('./lib/auth');

function getUserId(event) {
  const token = getTokenFromCookies(event.headers.cookie || event.headers.Cookie);
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

function formatTask(t) {
  return {
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
  };
}

exports.handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/tasks', '').replace('/api/tasks', '');
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
    // GET /tasks
    if ((path === '' || path === '/') && method === 'GET') {
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*, screenshots(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tasks:', error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch tasks' }) };
      }

      return { statusCode: 200, headers, body: JSON.stringify({ tasks: tasks.map(formatTask) }) };
    }

    // POST /tasks
    if ((path === '' || path === '/') && method === 'POST') {
      const { title, description, quadrant, positionX, positionY } = JSON.parse(event.body || '{}');

      if (!title) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Title is required' }) };
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
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to create task' }) };
      }

      return { statusCode: 201, headers, body: JSON.stringify({ task: formatTask(task) }) };
    }

    // POST /tasks/merge
    if (path === '/merge' && method === 'POST') {
      const { taskIds, title: customTitle } = JSON.parse(event.body || '{}');

      if (!taskIds || taskIds.length < 2) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'At least 2 tasks required' }) };
      }

      const { data: tasks, error: fetchError } = await supabase
        .from('tasks')
        .select('*, screenshots(*)')
        .in('id', taskIds)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (fetchError || !tasks || tasks.length !== taskIds.length) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Tasks not found' }) };
      }

      const baseTask = tasks[0];
      const combinedDescription = tasks.map(t => t.description).filter(Boolean).join('\n\n---\n\n');

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
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to merge' }) };
      }

      const allScreenshotIds = tasks.flatMap(t => (t.screenshots || []).map(s => s.id));
      if (allScreenshotIds.length > 0) {
        await supabase.from('screenshots').update({ task_id: mergedTask.id }).in('id', allScreenshotIds);
      }

      await supabase.from('tasks').delete().in('id', taskIds);

      const { data: finalTask } = await supabase
        .from('tasks')
        .select('*, screenshots(*)')
        .eq('id', mergedTask.id)
        .single();

      return { statusCode: 201, headers, body: JSON.stringify({ task: formatTask(finalTask) }) };
    }

    // Routes with ID
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
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Task not found' }) };
        }

        return { statusCode: 200, headers, body: JSON.stringify({ task: formatTask(task) }) };
      }

      // PATCH /tasks/:id
      if (method === 'PATCH') {
        const body = JSON.parse(event.body || '{}');
        const updateData = {};

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
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Task not found' }) };
        }

        return { statusCode: 200, headers, body: JSON.stringify({ task: formatTask(task) }) };
      }

      // DELETE /tasks/:id
      if (method === 'DELETE') {
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('user_id', userId);

        if (error) {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Task not found' }) };
        }

        return { statusCode: 200, headers, body: JSON.stringify({ message: 'Deleted' }) };
      }
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    console.error('Tasks error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
