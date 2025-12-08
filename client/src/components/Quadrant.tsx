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

  const colorMap: Record<string, { bg: string; border: string; headerBg: string; text: string }> = {
    'do-first': {
      bg: 'bg-red-50',
      border: 'border-red-200',
      headerBg: 'bg-red-100',
      text: 'text-red-800',
    },
    schedule: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      headerBg: 'bg-yellow-100',
      text: 'text-yellow-800',
    },
    delegate: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      headerBg: 'bg-blue-100',
      text: 'text-blue-800',
    },
    eliminate: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      headerBg: 'bg-green-100',
      text: 'text-green-800',
    },
  };

  const colorClasses = colorMap[info.color] ?? colorMap['do-first'];

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

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
        relative flex flex-col rounded-lg border-2 overflow-hidden transition-colors
        ${colorClasses.bg} ${colorClasses.border}
        ${isOver ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}
      `}
    >
      <div className={`px-3 py-2 ${colorClasses.headerBg}`}>
        <h3 className={`font-semibold ${colorClasses.text}`}>{info.label}</h3>
        <p className={`text-xs ${colorClasses.text} opacity-75`}>
          {info.description}
        </p>
      </div>

      <div
        className="flex-1 relative p-2 min-h-[200px]"
        onDoubleClick={handleDoubleClick}
      >
        {tasks.map((task) => (
          <div
            key={task.id}
            className="absolute"
            style={{
              left: `${task.positionX ?? 10}%`,
              top: `${task.positionY ?? 10}%`,
              maxWidth: '200px',
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
            }}
          >
            <input
              type="text"
              autoFocus
              className="w-48 px-3 py-2 text-sm border-2 border-indigo-500 rounded-lg shadow-lg focus:outline-none"
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onBlur={handleCreateTask}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}

        {tasks.length === 0 && !isCreating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">Double-click to add task</p>
          </div>
        )}
      </div>
    </div>
  );
}
