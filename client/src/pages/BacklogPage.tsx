import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Plus, GripVertical } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { QUADRANT_INFO } from '../types';
import type { Task, Quadrant } from '../types';

const QUADRANT_ORDER: Quadrant[] = ['do_first', 'schedule', 'delegate', 'eliminate', 'backlog'];

const quadrantStyles: Record<Quadrant, { bg: string; border: string; text: string; headerBg: string; itemBg: string }> = {
  do_first: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    headerBg: 'bg-red-100',
    itemBg: 'bg-red-100 hover:bg-red-200',
  },
  schedule: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-300',
    text: 'text-cyan-800',
    headerBg: 'bg-cyan-100',
    itemBg: 'bg-cyan-100 hover:bg-cyan-200',
  },
  delegate: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    headerBg: 'bg-amber-100',
    itemBg: 'bg-amber-100 hover:bg-amber-200',
  },
  eliminate: {
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    text: 'text-gray-700',
    headerBg: 'bg-gray-200',
    itemBg: 'bg-gray-200 hover:bg-gray-300',
  },
  backlog: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    headerBg: 'bg-gray-100',
    itemBg: 'bg-gray-100 hover:bg-gray-200',
  },
};

interface TaskLineItemProps {
  task: Task;
  onOpenPanel: () => void;
}

function TaskLineItem({ task, onOpenPanel }: TaskLineItemProps) {
  const styles = quadrantStyles[task.quadrant];

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 px-3 py-2 rounded ${styles.itemBg}
        cursor-pointer transition-colors
        ${isDragging ? 'opacity-50' : ''}
      `}
      onClick={onOpenPanel}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </button>
      <span className={`text-sm ${styles.text} flex-1 truncate`}>{task.title}</span>
    </div>
  );
}

interface QuadrantSectionProps {
  quadrant: Quadrant;
  tasks: Task[];
  onOpenPanel: (task: Task) => void;
}

function QuadrantSection({ quadrant, tasks, onOpenPanel }: QuadrantSectionProps) {
  const styles = quadrantStyles[quadrant];

  const { setNodeRef, isOver } = useDroppable({
    id: quadrant,
    data: { quadrant },
  });

  const getQuadrantLabel = (q: Quadrant) => {
    if (q === 'backlog') return 'Backlog';
    const info = QUADRANT_INFO[q];
    return info ? info.label : q;
  };

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border ${styles.border} overflow-hidden ${isOver ? 'ring-2 ring-indigo-400' : ''}`}
    >
      <div className={`px-4 py-2 ${styles.headerBg}`}>
        <h3 className={`font-semibold ${styles.text} text-sm`}>
          {getQuadrantLabel(quadrant)}
          <span className="ml-2 font-normal opacity-70">
            ({tasks.length})
          </span>
        </h3>
      </div>
      <div className={`p-2 ${styles.bg} min-h-[60px]`}>
        {tasks.length > 0 ? (
          <div className="space-y-1">
            {tasks.map((task) => (
              <TaskLineItem
                key={task.id}
                task={task}
                onOpenPanel={() => onOpenPanel(task)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-4">Drop tasks here</p>
        )}
      </div>
    </div>
  );
}

export function BacklogPage() {
  const { tasks, createTask, updateTask, uploadScreenshot } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Handle paste to create new task
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Don't handle if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      // Check for images first
      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            // Create task with generic title in Schedule quadrant
            const task = await createTask({
              title: 'Pasted image',
              quadrant: 'schedule',
              positionX: 30 + Math.random() * 20,
              positionY: 30 + Math.random() * 20,
            });
            await uploadScreenshot(task.id, file);
            setSelectedTask(task);
          }
          return;
        }
      }

      // Check for text
      const text = clipboardData.getData('text/plain');
      if (text && text.trim()) {
        e.preventDefault();
        const title = text.trim().slice(0, 200); // Limit title length
        const task = await createTask({
          title,
          quadrant: 'schedule',
          positionX: 30 + Math.random() * 20,
          positionY: 30 + Math.random() * 20,
        });
        setSelectedTask(task);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [createTask, uploadScreenshot]);

  const tasksByQuadrant = useMemo(() => {
    const grouped: Record<Quadrant, Task[]> = {
      do_first: [],
      schedule: [],
      delegate: [],
      eliminate: [],
      backlog: [],
    };

    tasks.forEach((task) => {
      if (grouped[task.quadrant]) {
        grouped[task.quadrant].push(task);
      }
    });

    // Sort each group by creation date
    Object.keys(grouped).forEach((key) => {
      grouped[key as Quadrant].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return grouped;
  }, [tasks]);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200,
      tolerance: 8,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetQuadrant = over.id as Quadrant;

    // Check if valid quadrant
    if (!QUADRANT_ORDER.includes(targetQuadrant)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.quadrant === targetQuadrant) return;

    // Move task to new quadrant
    await updateTask(taskId, {
      quadrant: targetQuadrant,
      // Reset position for matrix quadrants
      positionX: targetQuadrant !== 'backlog' ? 30 + Math.random() * 20 : null,
      positionY: targetQuadrant !== 'backlog' ? 30 + Math.random() * 20 : null,
    });
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) {
      setIsCreating(false);
      return;
    }

    await createTask({
      title: newTaskTitle.trim(),
      quadrant: 'backlog',
    });

    setIsCreating(false);
    setNewTaskTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateTask();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewTaskTitle('');
    }
  };

  return (
    <div className="h-full p-6 pt-16 overflow-auto bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">All Tasks</h2>
            <p className="text-sm text-gray-500">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Add to Backlog
          </button>
        </div>

        {isCreating && (
          <div className="mb-4 bg-white rounded-lg border-2 border-indigo-500 shadow-sm">
            <input
              type="text"
              autoFocus
              className="w-full px-4 py-3 text-sm rounded-lg focus:outline-none"
              placeholder="New task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onBlur={handleCreateTask}
              onKeyDown={handleKeyDown}
            />
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-4">
            {QUADRANT_ORDER.map((quadrant) => (
              <QuadrantSection
                key={quadrant}
                quadrant={quadrant}
                tasks={tasksByQuadrant[quadrant]}
                onOpenPanel={setSelectedTask}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask && (
              <div className={`px-3 py-2 rounded shadow-lg ${quadrantStyles[activeTask.quadrant].itemBg}`}>
                <span className={`text-sm ${quadrantStyles[activeTask.quadrant].text}`}>
                  {activeTask.title}
                </span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updated) => setSelectedTask(updated)}
        />
      )}
    </div>
  );
}
