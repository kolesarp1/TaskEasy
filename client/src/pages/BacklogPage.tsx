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
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, ArrowUpDown } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { BacklogTaskItem } from '../components/BacklogTaskItem';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { TaskCard } from '../components/TaskCard';
import type { Task } from '../types';

type SortOption = 'created' | 'title' | 'updated';

export function BacklogPage() {
  const { tasks, createTask, updateTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const backlogTasks = useMemo(() => {
    const filtered = tasks.filter((t) => t.quadrant === 'backlog');

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [tasks, sortBy]);

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
    setActiveTask(null);
    // Sorting within backlog doesn't need persistence
    // Tasks are sorted by the selected sort option
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

  const handleMoveToMatrix = async (task: Task, quadrant: string) => {
    await updateTask(task.id, {
      quadrant: quadrant as Task['quadrant'],
      positionX: 20 + Math.random() * 30,
      positionY: 20 + Math.random() * 30,
    });
  };

  return (
    <div className="h-full p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Backlog</h2>
            <p className="text-sm text-gray-500">
              {backlogTasks.length} task{backlogTasks.length !== 1 ? 's' : ''} waiting to be prioritized
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <ArrowUpDown size={14} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="border-0 bg-transparent focus:ring-0 cursor-pointer"
              >
                <option value="created">Created date</option>
                <option value="updated">Last modified</option>
                <option value="title">Title</option>
              </select>
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              Add task
            </button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-2">
            {isCreating && (
              <div className="bg-white rounded-lg border-2 border-indigo-500 shadow-sm">
                <input
                  type="text"
                  autoFocus
                  className="w-full px-4 py-3 text-sm rounded-lg focus:outline-none"
                  placeholder="Task title..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onBlur={handleCreateTask}
                  onKeyDown={handleKeyDown}
                />
              </div>
            )}

            <SortableContext
              items={backlogTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {backlogTasks.map((task) => (
                <BacklogTaskItem
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                  onMoveToQuadrant={(quadrant) => handleMoveToMatrix(task, quadrant)}
                />
              ))}
            </SortableContext>

            {backlogTasks.length === 0 && !isCreating && (
              <div className="text-center py-12 text-gray-500">
                <p>No tasks in backlog</p>
                <p className="text-sm mt-1">
                  Click "Add task" or double-click on the matrix to create tasks
                </p>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeTask && (
              <div className="bg-white rounded-lg shadow-lg border p-4">
                <span className="text-sm font-medium">{activeTask.title}</span>
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
