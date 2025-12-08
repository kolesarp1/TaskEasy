import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import type { Task, Quadrant as QuadrantType } from '../types';
import { QUADRANT_INFO } from '../types';
import { TaskCard } from './TaskCard';
import { useTasks } from '../context/TaskContext';

interface QuadrantProps {
  quadrant: Exclude<QuadrantType, 'backlog'>;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function Quadrant({ quadrant, tasks, onTaskClick }: QuadrantProps) {
  const { createTask } = useTasks();
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [createPosition, setCreatePosition] = useState({ x: 0, y: 0 });

  const { setNodeRef, isOver } = useDroppable({
    id: quadrant,
    data: { quadrant },
  });

  const info = QUADRANT_INFO[quadrant];

  const colorMap: Record<string, { bg: string; label: string; labelBg: string }> = {
    'do-first': {
      bg: 'bg-red-50',
      label: 'text-red-700',
      labelBg: 'bg-red-100/80',
    },
    schedule: {
      bg: 'bg-amber-50',
      label: 'text-amber-700',
      labelBg: 'bg-amber-100/80',
    },
    delegate: {
      bg: 'bg-blue-50',
      label: 'text-blue-700',
      labelBg: 'bg-blue-100/80',
    },
    eliminate: {
      bg: 'bg-emerald-50',
      label: 'text-emerald-700',
      labelBg: 'bg-emerald-100/80',
    },
  };

  const colorClasses = colorMap[info.color] ?? colorMap['do-first'];

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Allow creating task when clicking on the quadrant itself
    const target = e.target as HTMLElement;
    if (target.closest('.task-card') || target.tagName === 'INPUT') return;

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
      ref={setNodeRef}
      className={`
        relative h-full overflow-hidden transition-all duration-200
        ${colorClasses.bg}
        ${isOver ? 'ring-4 ring-inset ring-indigo-400/50' : ''}
      `}
      onDoubleClick={handleDoubleClick}
    >
      {/* Quadrant label - small in corner */}
      <div className={`absolute top-2 left-2 px-2 py-1 rounded ${colorClasses.labelBg} z-10`}>
        <span className={`text-xs font-semibold ${colorClasses.label}`}>
          {info.label}
        </span>
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
              maxWidth: 'min(200px, 40%)',
            }}
          >
            <TaskCard task={task} onClick={() => onTaskClick(task)} />
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
              className="w-48 px-3 py-2 text-sm border-2 border-indigo-500 rounded-lg shadow-lg focus:outline-none bg-white"
              placeholder="New task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onBlur={handleCreateTask}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}
      </div>

      {/* Empty state hint */}
      {tasks.length === 0 && !isCreating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 text-sm opacity-50">Double-click to add</p>
        </div>
      )}
    </div>
  );
}
