import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check, ArrowRight, Image } from 'lucide-react';
import type { Task } from '../types';
import { useTasks } from '../context/TaskContext';
import { QUADRANT_INFO } from '../types';

interface BacklogTaskItemProps {
  task: Task;
  onClick: () => void;
  onMoveToQuadrant: (quadrant: string) => void;
}

export function BacklogTaskItem({ task, onClick, onMoveToQuadrant }: BacklogTaskItemProps) {
  const { selectedTasks, toggleTaskSelection } = useTasks();
  const isSelected = selectedTasks.has(task.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSelectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskSelection(task.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group bg-white rounded-lg shadow-sm border-2 transition-all cursor-pointer
        hover:shadow-md
        ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent'}
        ${isDragging ? 'shadow-lg opacity-50' : ''}
      `}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </button>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{task.title}</p>
            {task.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>
                Created {new Date(task.createdAt).toLocaleDateString()}
              </span>
              {task.screenshots.length > 0 && (
                <span className="flex items-center gap-1">
                  <Image size={12} />
                  {task.screenshots.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Quick move buttons */}
            <div className="relative group/move">
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Move to quadrant"
              >
                <ArrowRight size={16} />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 hidden group-hover/move:block z-10 min-w-[160px]">
                {Object.entries(QUADRANT_INFO).map(([key, info]) => (
                  <button
                    key={key}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveToQuadrant(key);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        {
                          'do-first': 'bg-red-500',
                          schedule: 'bg-yellow-500',
                          delegate: 'bg-blue-500',
                          eliminate: 'bg-green-500',
                        }[info.color]
                      }`}
                    />
                    {info.label}
                  </button>
                ))}
              </div>
            </div>

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
