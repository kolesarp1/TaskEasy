export type Quadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate' | 'backlog';

export interface Screenshot {
  id: string;
  filename: string;
  path: string;
  taskId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  quadrant: Quadrant;
  positionX: number | null;
  positionY: number | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  screenshots: Screenshot[];
}

export interface User {
  id: string;
  email: string;
  createdAt?: string;
}

export const QUADRANT_INFO: Record<Exclude<Quadrant, 'backlog'>, { label: string; subtitle: string; description: string; color: string }> = {
  do_first: {
    label: 'Do',
    subtitle: 'Do it now.',
    description: 'Urgent & Important',
    color: 'do-first',
  },
  schedule: {
    label: 'Decide',
    subtitle: 'Schedule a time to do it.',
    description: 'Not Urgent & Important',
    color: 'schedule',
  },
  delegate: {
    label: 'Delegate',
    subtitle: 'Who can do it for you?',
    description: 'Urgent & Not Important',
    color: 'delegate',
  },
  eliminate: {
    label: 'Delete',
    subtitle: 'Eliminate it.',
    description: 'Not Urgent & Not Important',
    color: 'eliminate',
  },
};
