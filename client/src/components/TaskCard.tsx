import { useState, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task, Quadrant } from '../types';
import { useTasks } from '../context/TaskContext';

interface TaskCardProps {
  task: Task;
  onOpenPanel: () => void;
  style?: React.CSSProperties;
  isDragOverlay?: boolean;
}

const quadrantColors: Record<Quadrant, { bg: string; border: string; text: string }> = {
  do_first: {
    bg: 'bg-red-200',
    border: 'border-red-400',
    text: 'text-red-900',
  },
  schedule: {
    bg: 'bg-cyan-200',
    border: 'border-cyan-400',
    text: 'text-cyan-900',
  },
  delegate: {
    bg: 'bg-amber-200',
    border: 'border-amber-400',
    text: 'text-amber-900',
  },
  eliminate: {
    bg: 'bg-gray-300',
    border: 'border-gray-400',
    text: 'text-gray-900',
  },
  backlog: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-900',
  },
};

export function TaskCard({ task, onOpenPanel, style, isDragOverlay }: TaskCardProps) {
  const { updateTask } = useTasks();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: isDragOverlay,
  });

  const colors = quadrantColors[task.quadrant] || quadrantColors.backlog;

  const dragStyle = isDragOverlay
    ? { ...style }
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.8 : 1,
        ...style,
      };

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

  // Single click = start editing
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  // Double click = open detail panel
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    onOpenPanel();
  };

  const handleSave = async () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      await updateTask(task.id, { title: trimmed });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={dragStyle}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      className={`
        relative ${colors.bg} ${colors.border} border-2 rounded shadow-sm
        ${isDragOverlay ? 'cursor-grabbing shadow-lg rotate-2' : 'cursor-grab active:cursor-grabbing'}
        select-none hover:shadow-md transition-all
        ${isDragging && !isDragOverlay ? 'shadow-lg z-50 rotate-2' : ''}
      `}
      onClick={isDragOverlay ? undefined : handleClick}
      onDoubleClick={isDragOverlay ? undefined : handleDoubleClick}
    >
      <div className="p-2 min-w-[100px]">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`
              w-full bg-transparent border-none outline-none resize-none
              text-sm font-medium ${colors.text}
            `}
            rows={2}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <p className={`text-sm font-medium ${colors.text} whitespace-pre-wrap break-words`}>
            {task.title}
          </p>
        )}
        {task.description && !isEditing && (
          <p className={`text-xs ${colors.text} opacity-70 mt-1 truncate`}>
            {task.description}
          </p>
        )}
      </div>
      {/* Resize handle indicator */}
      <div className={`absolute bottom-0 right-0 w-3 h-3 ${colors.text} opacity-30`}>
        <svg viewBox="0 0 10 10" className="w-full h-full">
          <path d="M9 1L1 9M9 5L5 9" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
}
