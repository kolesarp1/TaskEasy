import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check, Image } from 'lucide-react';
import type { Task } from '../types';
import { useTasks } from '../context/TaskContext';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function TaskCard({ task, onClick, style }: TaskCardProps) {
  const { selectedTasks, toggleTaskSelection } = useTasks();
  const isSelected = selectedTasks.has(task.id);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    ...style,
  };

  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskSelection(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`
        group bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer
        hover:shadow-md
        ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent'}
        ${isDragging ? 'shadow-lg z-50' : ''}
      `}
      onClick={onClick}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={14} />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {task.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {task.screenshots.length > 0 && (
              <span className="flex items-center gap-0.5 text-gray-400 text-xs">
                <Image size={12} />
                {task.screenshots.length}
              </span>
            )}
            <button
              onClick={handleSelectionClick}
              className={`
                w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${
                  isSelected
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              {isSelected && <Check size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
