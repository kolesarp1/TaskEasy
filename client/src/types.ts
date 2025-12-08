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
    subtitle: 'Tasks with deadlines or consequences.',
    description: 'Urgent & Important',
    color: 'do-first',
  },
  schedule: {
    label: 'Schedule',
    subtitle: 'Tasks with unclear deadlines that contribute to long-term success.',
    description: 'Not Urgent & Important',
    color: 'schedule',
  },
  delegate: {
    label: 'Delegate',
    subtitle: "Tasks that must get done but don't require your specific skill set.",
    description: 'Urgent & Not Important',
    color: 'delegate',
  },
  eliminate: {
    label: 'Delete',
    subtitle: 'Distractions and unnecessary tasks.',
    description: 'Not Urgent & Not Important',
    color: 'eliminate',
  },
};
