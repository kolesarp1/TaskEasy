import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { tasksApi, screenshotsApi } from '../api';
import { useAuth } from './AuthContext';
import type { Task, Quadrant, Screenshot } from '../types';

const GUEST_TASKS_KEY = 'guestTasks';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  selectedTasks: Set<string>;
  createTask: (data: {
    title: string;
    description?: string;
    quadrant?: Quadrant;
    positionX?: number | null;
    positionY?: number | null;
  }) => Promise<Task>;
  updateTask: (
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      quadrant: Quadrant;
      positionX: number | null;
      positionY: number | null;
    }>
  ) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  mergeTasks: (taskIds: string[], title?: string) => Promise<Task>;
  toggleTaskSelection: (id: string) => void;
  clearSelection: () => void;
  uploadScreenshot: (taskId: string, file: File) => Promise<Screenshot>;
  deleteScreenshot: (taskId: string, screenshotId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  getGuestTasks: () => Task[];
  clearGuestTasks: () => void;
}

const TaskContext = createContext<TaskContextType | null>(null);

function generateId(): string {
  return 'local-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function loadGuestTasks(): Task[] {
  try {
    const stored = localStorage.getItem(GUEST_TASKS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveGuestTasks(tasks: Task[]): void {
  localStorage.setItem(GUEST_TASKS_KEY, JSON.stringify(tasks));
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const refreshTasks = useCallback(async () => {
    if (isGuest) {
      setTasks(loadGuestTasks());
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const { tasks } = await tasksApi.getAll();
      setTasks(tasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest]);

  useEffect(() => {
    if (user) {
      refreshTasks();
    } else if (isGuest) {
      setTasks(loadGuestTasks());
    } else {
      setTasks([]);
    }
  }, [user, isGuest, refreshTasks]);

  const createTask = async (data: {
    title: string;
    description?: string;
    quadrant?: Quadrant;
    positionX?: number | null;
    positionY?: number | null;
  }) => {
    if (isGuest && !user) {
      const now = new Date().toISOString();
      const newTask: Task = {
        id: generateId(),
        title: data.title,
        description: data.description || null,
        quadrant: data.quadrant || 'backlog',
        positionX: data.positionX ?? null,
        positionY: data.positionY ?? null,
        createdAt: now,
        updatedAt: now,
        userId: 'guest',
        screenshots: [],
      };
      setTasks((prev) => {
        const updated = [newTask, ...prev];
        saveGuestTasks(updated);
        return updated;
      });
      return newTask;
    }
    const { task } = await tasksApi.create(data);
    setTasks((prev) => [task, ...prev]);
    return task;
  };

  const updateTask = async (
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      quadrant: Quadrant;
      positionX: number | null;
      positionY: number | null;
    }>
  ) => {
    if (isGuest && !user) {
      let updatedTask: Task | null = null;
      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id === id) {
            updatedTask = { ...t, ...data, updatedAt: new Date().toISOString() };
            return updatedTask;
          }
          return t;
        });
        saveGuestTasks(updated);
        return updated;
      });
      return updatedTask!;
    }
    const { task } = await tasksApi.update(id, data);
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    return task;
  };

  const deleteTask = async (id: string) => {
    if (isGuest && !user) {
      setTasks((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        saveGuestTasks(updated);
        return updated;
      });
      setSelectedTasks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    await tasksApi.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const mergeTasks = async (taskIds: string[], title?: string) => {
    if (isGuest && !user) {
      const tasksToMerge = tasks.filter((t) => taskIds.includes(t.id));
      if (tasksToMerge.length < 2) throw new Error('Need 2+ tasks to merge');

      const base = tasksToMerge[0];
      const desc = tasksToMerge.map((t) => t.description).filter(Boolean).join('\n\n---\n\n');
      const allScreenshots = tasksToMerge.flatMap((t) => t.screenshots);
      const now = new Date().toISOString();

      const mergedTask: Task = {
        id: generateId(),
        title: title || base.title,
        description: desc || null,
        quadrant: base.quadrant,
        positionX: base.positionX,
        positionY: base.positionY,
        createdAt: now,
        updatedAt: now,
        userId: 'guest',
        screenshots: allScreenshots,
      };

      setTasks((prev) => {
        const updated = [mergedTask, ...prev.filter((t) => !taskIds.includes(t.id))];
        saveGuestTasks(updated);
        return updated;
      });
      setSelectedTasks(new Set());
      return mergedTask;
    }
    const { task } = await tasksApi.merge(taskIds, title);
    setTasks((prev) => [task, ...prev.filter((t) => !taskIds.includes(t.id))]);
    setSelectedTasks(new Set());
    return task;
  };

  const toggleTaskSelection = (id: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
  };

  const uploadScreenshot = async (taskId: string, file: File) => {
    if (isGuest && !user) {
      // For guests, store screenshot as base64 in localStorage
      const reader = new FileReader();
      return new Promise<Screenshot>((resolve) => {
        reader.onload = () => {
          const screenshot: Screenshot = {
            id: generateId(),
            path: reader.result as string,
            filename: file.name,
            taskId,
            createdAt: new Date().toISOString(),
          };
          setTasks((prev) => {
            const updated = prev.map((t) =>
              t.id === taskId
                ? { ...t, screenshots: [...t.screenshots, screenshot] }
                : t
            );
            saveGuestTasks(updated);
            return updated;
          });
          resolve(screenshot);
        };
        reader.readAsDataURL(file);
      });
    }
    const { screenshot } = await screenshotsApi.upload(taskId, file);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, screenshots: [...t.screenshots, screenshot] }
          : t
      )
    );
    return screenshot;
  };

  const deleteScreenshot = async (taskId: string, screenshotId: string) => {
    if (isGuest && !user) {
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId
            ? { ...t, screenshots: t.screenshots.filter((s) => s.id !== screenshotId) }
            : t
        );
        saveGuestTasks(updated);
        return updated;
      });
      return;
    }
    await screenshotsApi.delete(screenshotId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, screenshots: t.screenshots.filter((s) => s.id !== screenshotId) }
          : t
      )
    );
  };

  const getGuestTasks = () => loadGuestTasks();

  const clearGuestTasks = () => {
    localStorage.removeItem(GUEST_TASKS_KEY);
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        loading,
        selectedTasks,
        createTask,
        updateTask,
        deleteTask,
        mergeTasks,
        toggleTaskSelection,
        clearSelection,
        uploadScreenshot,
        deleteScreenshot,
        refreshTasks,
        getGuestTasks,
        clearGuestTasks,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
