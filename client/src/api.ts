import type { Task, User, Screenshot } from './types';

const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });
  } catch (error) {
    throw new ApiError(0, 'Network error. Please check your connection.');
  }

  let data: T & { error?: string };

  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(res.status, 'Invalid response from server');
  }

  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'Something went wrong');
  }

  return data;
}

// Auth API
export const authApi = {
  signUp: (email: string, password: string) =>
    request<{ user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signIn: (email: string, password: string) =>
    request<{ user: User }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signOut: () =>
    request<{ message: string }>('/auth/signout', {
      method: 'POST',
    }),

  getMe: () => request<{ user: User }>('/auth/me'),
};

// Tasks API
export const tasksApi = {
  getAll: () => request<{ tasks: Task[] }>('/tasks'),

  getOne: (id: string) => request<{ task: Task }>(`/tasks/${id}`),

  create: (data: {
    title: string;
    description?: string;
    quadrant?: string;
    positionX?: number | null;
    positionY?: number | null;
  }) =>
    request<{ task: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (
    id: string,
    data: Partial<{
      title: string;
      description: string | null;
      quadrant: string;
      positionX: number | null;
      positionY: number | null;
    }>
  ) =>
    request<{ task: Task }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  merge: (taskIds: string[], title?: string) =>
    request<{ task: Task }>('/tasks/merge', {
      method: 'POST',
      body: JSON.stringify({ taskIds, title }),
    }),
};

// Screenshots API
export const screenshotsApi = {
  upload: async (taskId: string, file: File): Promise<{ screenshot: Screenshot }> => {
    const formData = new FormData();
    formData.append('screenshot', file);

    let res: Response;

    try {
      res = await fetch(`${API_BASE}/screenshots/task/${taskId}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
    } catch {
      throw new ApiError(0, 'Network error. Please check your connection.');
    }

    let data: { screenshot: Screenshot; error?: string };

    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new ApiError(res.status, 'Invalid response from server');
    }

    if (!res.ok) {
      throw new ApiError(res.status, data.error || 'Upload failed');
    }

    return data;
  },

  delete: (id: string) =>
    request<{ message: string }>(`/screenshots/${id}`, {
      method: 'DELETE',
    }),
};
