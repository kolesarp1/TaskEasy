import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { Plus, Trash2 } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { TaskCard } from '../components/TaskCard';
import { QUADRANT_INFO } from '../types';
import type { Task, Quadrant } from '../types';

const QUADRANT_ORDER: Quadrant[] = ['do_first', 'schedule', 'delegate', 'eliminate', 'backlog'];

const quadrantStyles: Record<Quadrant, { bg: string; border: string; text: string; headerBg: string }> = {
  do_first: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    headerBg: 'bg-red-100',
  },
  schedule: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    headerBg: 'bg-green-100',
  },
  delegate: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    headerBg: 'bg-purple-100',
  },
  eliminate: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    headerBg: 'bg-amber-100',
  },
  backlog: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    headerBg: 'bg-gray-100',
  },
};

function TrashDropZone({ isVisible }: { isVisible: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash',
    data: { type: 'trash' },
  });

  if (!isVisible) return null;

  return (
    <div
      ref={setNodeRef}
      className={`
        fixed bottom-4 left-1/2 -translate-x-1/2 z-40
        flex items-center gap-2 px-6 py-3 rounded-full
        transition-all duration-200 shadow-lg
        ${isOver
          ? 'bg-red-500 text-white scale-110'
          : 'bg-gray-800 text-gray-300'
        }
      `}
    >
      <Trash2 size={20} />
      <span className="text-sm font-medium">
        {isOver ? 'Release to delete' : 'Drop here to delete'}
      </span>
    </div>
  );
}

export function BacklogPage() {
  const { tasks, createTask, deleteTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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

  const handleDragStart = (event: { active: { data: { current?: { task?: Task } } } }) => {
    const task = event.active.data.current?.task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetId = over.id as string;

    // Check if dropped on trash
    if (targetId === 'trash') {
      await deleteTask(taskId);
    }
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

  const getQuadrantLabel = (quadrant: Quadrant) => {
    if (quadrant === 'backlog') return 'Backlog';
    return QUADRANT_INFO[quadrant]?.label || quadrant;
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
          <div className="space-y-6">
            {QUADRANT_ORDER.map((quadrant) => {
              const quadrantTasks = tasksByQuadrant[quadrant];
              if (quadrantTasks.length === 0) return null;

              const styles = quadrantStyles[quadrant];

              return (
                <div
                  key={quadrant}
                  className={`rounded-lg border ${styles.border} overflow-hidden`}
                >
                  <div className={`px-4 py-2 ${styles.headerBg}`}>
                    <h3 className={`font-semibold ${styles.text}`}>
                      {getQuadrantLabel(quadrant)}
                      <span className="ml-2 text-sm font-normal opacity-70">
                        ({quadrantTasks.length})
                      </span>
                    </h3>
                  </div>
                  <div className={`p-3 ${styles.bg}`}>
                    <div className="flex flex-wrap gap-2">
                      {quadrantTasks.map((task) => (
                        <div key={task.id} className="w-40">
                          <TaskCard
                            task={task}
                            onOpenPanel={() => setSelectedTask(task)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {tasks.length === 0 && !isCreating && (
              <div className="text-center py-12 text-gray-500">
                <p>No tasks yet</p>
                <p className="text-sm mt-1">
                  Click "Add to Backlog" or double-click on the matrix to create tasks
                </p>
              </div>
            )}
          </div>

          <TrashDropZone isVisible={activeTask !== null} />

          <DragOverlay>
            {activeTask && (
              <div className="w-40">
                <TaskCard task={activeTask} onOpenPanel={() => {}} />
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
