import { useDroppable } from '@dnd-kit/core';
import { useState, useCallback } from 'react';
import type { Task, Quadrant as QuadrantType } from '../types';
import { QUADRANT_INFO } from '../types';
import { TaskCard } from './TaskCard';
import { useTasks } from '../context/TaskContext';

interface QuadrantProps {
  quadrant: Exclude<QuadrantType, 'backlog'>;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onRegisterRef?: (el: HTMLDivElement | null) => void;
}

export function Quadrant({ quadrant, tasks, onTaskClick, onRegisterRef }: QuadrantProps) {
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

  const colorMap: Record<string, { bg: string; label: string; labelBg: string }> = {
    'do-first': {
      bg: 'bg-red-100',
      label: 'text-red-800',
      labelBg: 'bg-red-200/80',
    },
    schedule: {
      bg: 'bg-green-100',
      label: 'text-green-800',
      labelBg: 'bg-green-200/80',
    },
    delegate: {
      bg: 'bg-purple-100',
      label: 'text-purple-800',
      labelBg: 'bg-purple-200/80',
    },
    eliminate: {
      bg: 'bg-amber-100',
      label: 'text-amber-800',
      labelBg: 'bg-amber-200/80',
    },
  };

  const colorClasses = colorMap[info.color] ?? colorMap['do-first'];

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
      {/* Quadrant label - large watermark style like reference */}
      <div className="absolute inset-0 flex items-end justify-start p-4 pointer-events-none">
        <div className={`${colorClasses.label} opacity-20`}>
          <span className="text-4xl font-black uppercase tracking-tight leading-none">
            {info.label.split(' ')[0]}
          </span>
          {info.label.split(' ')[1] && (
            <span className="block text-4xl font-black uppercase tracking-tight leading-none">
              {info.label.split(' ')[1]}
            </span>
          )}
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
              className="w-40 px-3 py-2 text-sm border-2 border-indigo-500 rounded shadow-lg focus:outline-none bg-white"
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
          <p className="text-gray-500 text-sm opacity-60">Double-click to add</p>
        </div>
      )}
    </div>
  );
}
