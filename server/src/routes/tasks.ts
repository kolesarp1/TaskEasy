import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const taskRouter = Router();

// All task routes require authentication
taskRouter.use(authenticate);

const quadrantEnum = z.enum(['do_first', 'schedule', 'delegate', 'eliminate', 'backlog']);

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  quadrant: quadrantEnum.default('backlog'),
  positionX: z.number().nullable().optional(),
  positionY: z.number().nullable().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().nullable().optional(),
  quadrant: quadrantEnum.optional(),
  positionX: z.number().nullable().optional(),
  positionY: z.number().nullable().optional(),
});

const mergeTasksSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(2, 'At least 2 tasks required for merge'),
  title: z.string().min(1, 'Title is required').optional(),
});

// Get all tasks for the current user
taskRouter.get('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      include: {
        screenshots: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

// Get a single task
taskRouter.get('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      include: {
        screenshots: true,
      },
    });

    if (!task) {
      throw new AppError(404, 'Task not found');
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

// Create a new task
taskRouter.post('/', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = createTaskSchema.parse(req.body);

    const task = await prisma.task.create({
      data: {
        ...data,
        userId: req.userId!,
      },
      include: {
        screenshots: true,
      },
    });

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

// Update a task
taskRouter.patch('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const data = updateTaskSchema.parse(req.body);

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!existingTask) {
      throw new AppError(404, 'Task not found');
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
      include: {
        screenshots: true,
      },
    });

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

// Delete a task
taskRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });

    if (!existingTask) {
      throw new AppError(404, 'Task not found');
    }

    await prisma.task.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Merge multiple tasks
taskRouter.post('/merge', async (req: AuthRequest, res: Response, next) => {
  try {
    const { taskIds, title: customTitle } = mergeTasksSchema.parse(req.body);

    // Get all tasks to merge
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId: req.userId,
      },
      include: {
        screenshots: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (tasks.length !== taskIds.length) {
      throw new AppError(404, 'One or more tasks not found');
    }

    // Use the first task as the base
    const baseTask = tasks[0];

    // Combine descriptions
    const combinedDescription = tasks
      .map((t) => t.description)
      .filter(Boolean)
      .join('\n\n---\n\n');

    // Collect all screenshot IDs
    const allScreenshotIds = tasks.flatMap((t) => t.screenshots.map((s) => s.id));

    // Create merged task
    const mergedTask = await prisma.task.create({
      data: {
        title: customTitle || baseTask.title,
        description: combinedDescription || null,
        quadrant: baseTask.quadrant,
        positionX: baseTask.positionX,
        positionY: baseTask.positionY,
        userId: req.userId!,
      },
      include: {
        screenshots: true,
      },
    });

    // Move screenshots to merged task
    if (allScreenshotIds.length > 0) {
      await prisma.screenshot.updateMany({
        where: { id: { in: allScreenshotIds } },
        data: { taskId: mergedTask.id },
      });
    }

    // Delete original tasks
    await prisma.task.deleteMany({
      where: { id: { in: taskIds } },
    });

    // Refetch with updated screenshots
    const finalTask = await prisma.task.findUnique({
      where: { id: mergedTask.id },
      include: { screenshots: true },
    });

    res.status(201).json({ task: finalTask });
  } catch (error) {
    next(error);
  }
});
