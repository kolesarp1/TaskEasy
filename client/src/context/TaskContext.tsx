import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { tasksApi, screenshotsApi } from '../api';
import { useAuth } from './AuthContext';
import type { Task, Quadrant, Screenshot } from '../types';

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
}

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const refreshTasks = useCallback(async () => {
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
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshTasks();
    } else {
      setTasks([]);
    }
  }, [user, refreshTasks]);

  const createTask = async (data: {
    title: string;
    description?: string;
    quadrant?: Quadrant;
    positionX?: number | null;
    positionY?: number | null;
  }) => {
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
    const { task } = await tasksApi.update(id, data);
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    return task;
  };

  const deleteTask = async (id: string) => {
    await tasksApi.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const mergeTasks = async (taskIds: string[], title?: string) => {
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
    await screenshotsApi.delete(screenshotId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, screenshots: t.screenshots.filter((s) => s.id !== screenshotId) }
          : t
      )
    );
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
