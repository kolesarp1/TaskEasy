import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const screenshotRouter = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

// All screenshot routes require authentication
screenshotRouter.use(authenticate);

// Upload screenshot to a task
screenshotRouter.post(
  '/task/:taskId',
  upload.single('screenshot'),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { taskId } = req.params;

      // Verify task belongs to user
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          userId: req.userId,
        },
      });

      if (!task) {
        // Clean up uploaded file if task not found
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        throw new AppError(404, 'Task not found');
      }

      if (!req.file) {
        throw new AppError(400, 'No file uploaded');
      }

      const screenshot = await prisma.screenshot.create({
        data: {
          filename: req.file.originalname,
          path: `/uploads/${req.file.filename}`,
          taskId,
        },
      });

      res.status(201).json({ screenshot });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a screenshot
screenshotRouter.delete('/:id', async (req: AuthRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    // Find screenshot and verify ownership through task
    const screenshot = await prisma.screenshot.findUnique({
      where: { id },
      include: {
        task: true,
      },
    });

    if (!screenshot || screenshot.task.userId !== req.userId) {
      throw new AppError(404, 'Screenshot not found');
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), screenshot.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await prisma.screenshot.delete({
      where: { id },
    });

    res.json({ message: 'Screenshot deleted successfully' });
  } catch (error) {
    next(error);
  }
});
