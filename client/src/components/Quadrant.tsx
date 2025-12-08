import { useDroppable } from '@dnd-kit/core';
import { useState, useCallback } from 'react';
import { CheckCircle2, Calendar, Users, Trash2 } from 'lucide-react';
import type { Task, Quadrant as QuadrantType } from '../types';
import { QUADRANT_INFO } from '../types';
import { TaskCard } from './TaskCard';
import { useTasks } from '../context/TaskContext';

// Icon map for each quadrant
const quadrantIcons = {
  do_first: CheckCircle2,
  schedule: Calendar,
  delegate: Users,
  eliminate: Trash2,
} as const;

interface QuadrantProps {
  quadrant: Exclude<QuadrantType, 'backlog'>;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onRegisterRef?: (el: HTMLDivElement | null) => void;
  activeTaskId?: string;
}

// Shared color map for quadrants - export for use in other components
export const quadrantColorMap: Record<string, { bg: string; inputBg: string; label: string; border: string; cardBg: string; cardBorder: string }> = {
  'do-first': {
    bg: 'bg-red-100',
    inputBg: 'bg-red-200',
    label: 'text-red-700',
    border: 'border-red-400',
    cardBg: 'bg-red-200',
    cardBorder: 'border-red-400',
  },
  schedule: {
    bg: 'bg-amber-100',
    inputBg: 'bg-amber-200',
    label: 'text-amber-700',
    border: 'border-amber-400',
    cardBg: 'bg-amber-200',
    cardBorder: 'border-amber-400',
  },
  delegate: {
    bg: 'bg-cyan-100',
    inputBg: 'bg-cyan-200',
    label: 'text-cyan-700',
    border: 'border-cyan-400',
    cardBg: 'bg-cyan-200',
    cardBorder: 'border-cyan-400',
  },
  eliminate: {
    bg: 'bg-gray-200',
    inputBg: 'bg-gray-300',
    label: 'text-gray-600',
    border: 'border-gray-400',
    cardBg: 'bg-gray-300',
    cardBorder: 'border-gray-400',
  },
};

export function Quadrant({ quadrant, tasks, onTaskClick, onRegisterRef, activeTaskId }: QuadrantProps) {
  const { createTask } = useTasks();
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [createPosition, setCreatePosition] = useState({ x: 0, y: 0 });

  const { setNodeRef, isOver } = useDroppable({
    id: quadrant,
    data: { quadrant },
  });

  // Combine the droppable ref with the parent ref registration
  const combinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      onRegisterRef?.(el);
    },
    [setNodeRef, onRegisterRef]
  );

  const info = QUADRANT_INFO[quadrant];
  const colorClasses = quadrantColorMap[info.color] ?? quadrantColorMap['do-first'];

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Allow creating task when clicking on the quadrant itself
    const target = e.target as HTMLElement;
    if (target.closest('.task-card') || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(5, Math.min(85, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(85, ((e.clientY - rect.top) / rect.height) * 100));

    setCreatePosition({ x, y });
    setIsCreating(true);
    setNewTaskTitle('');
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      setIsCreating(false);
      return;
    }

    await createTask({
      title: newTaskTitle.trim(),
      quadrant,
      positionX: createPosition.x,
      positionY: createPosition.y,
    });

    setIsCreating(false);
    setNewTaskTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateTask();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
    }
  };

  return (
    <div
      ref={combinedRef}
      className={`
        relative h-full overflow-hidden transition-all duration-200
        ${colorClasses.bg}
        ${isOver ? 'ring-4 ring-inset ring-indigo-400/50' : ''}
      `}
      onDoubleClick={handleDoubleClick}
    >
      {/* Quadrant label - centered like reference image */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`${colorClasses.label} text-center`}>
          {(() => {
            const Icon = quadrantIcons[quadrant];
            return <Icon size={48} className="mx-auto mb-2 opacity-30" />;
          })()}
          <span className="block text-5xl font-black uppercase tracking-tight leading-none opacity-40">
            {info.label}
          </span>
          <span className="block text-sm font-medium mt-2 opacity-30">
            {info.subtitle}
          </span>
        </div>
      </div>

      {/* Tasks container */}
      <div className="absolute inset-0">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="absolute task-card"
            style={{
              left: `${task.positionX ?? 10}%`,
              top: `${task.positionY ?? 10}%`,
              maxWidth: 'min(180px, 45%)',
              opacity: task.id === activeTaskId ? 0 : 1,
            }}
          >
            <TaskCard task={task} onOpenPanel={() => onTaskClick(task)} />
          </div>
        ))}

        {isCreating && (
          <div
            className="absolute z-50"
            style={{
              left: `${createPosition.x}%`,
              top: `${createPosition.y}%`,
              transform: 'translate(-10px, -10px)',
            }}
          >
            <input
              type="text"
              autoFocus
              className={`w-40 px-3 py-2 text-sm border-2 ${colorClasses.border} ${colorClasses.inputBg} rounded shadow-lg focus:outline-none ${colorClasses.label} placeholder-gray-600`}
              placeholder="New task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onBlur={handleCreateTask}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}
      </div>

    </div>
  );
}
