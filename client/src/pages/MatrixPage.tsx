import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  useDroppable,
} from '@dnd-kit/core';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import { Quadrant } from '../components/Quadrant';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import type { Task, Quadrant as QuadrantType } from '../types';

const QUADRANTS: Exclude<QuadrantType, 'backlog'>[] = [
  'do_first',
  'schedule',
  'delegate',
  'eliminate',
];

function DoneDropZone({ isOver, isDragging }: { isOver: boolean; isDragging: boolean }) {
  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        transition-all duration-200
        ${isDragging ? 'opacity-100' : 'opacity-60'}
        ${isOver
          ? 'bg-green-500/90 text-white scale-110 shadow-lg backdrop-blur-sm'
          : 'bg-green-100 text-green-700 border-2 border-green-300'
        }
      `}
    >
      <CheckCircle2 size={18} />
      <span className="text-sm font-medium">
        {isOver ? 'Release to complete' : 'Done'}
      </span>
    </div>
  );
}

function TrashDropZone({ isOver, isDragging }: { isOver: boolean; isDragging: boolean }) {
  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        transition-all duration-200
        ${isDragging ? 'opacity-100' : 'opacity-60'}
        ${isOver
          ? 'bg-red-500/90 text-white scale-110 shadow-lg backdrop-blur-sm'
          : 'bg-red-100 text-red-700 border-2 border-red-300'
        }
      `}
    >
      <Trash2 size={18} />
      <span className="text-sm font-medium">
        {isOver ? 'Release to delete' : 'Delete'}
      </span>
    </div>
  );
}

function DoneDroppable({ children, isDragging }: { children: (isOver: boolean) => React.ReactNode; isDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'done',
    data: { type: 'done' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`fixed top-4 left-4 transition-opacity ${isDragging ? 'pointer-events-auto' : 'pointer-events-none'} ${isOver ? 'z-[1000]' : 'z-40'}`}
    >
      {children(isOver)}
    </div>
  );
}

function TrashDroppable({ children, isDragging }: { children: (isOver: boolean) => React.ReactNode; isDragging: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash',
    data: { type: 'trash' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`fixed bottom-4 right-4 transition-opacity ${isDragging ? 'pointer-events-auto' : 'pointer-events-none'} ${isOver ? 'z-[1000]' : 'z-40'}`}
    >
      {children(isOver)}
    </div>
  );
}

export function MatrixPage() {
  const { tasks, updateTask, deleteTask, completeTask, createTask, uploadScreenshot } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverQuadrant, setHoverQuadrant] = useState<QuadrantType | null>(null);
  const quadrantRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragStartInfo = useRef<{ taskId: string; startX: number; startY: number } | null>(null);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const matrixTasks = tasks.filter((t) => t.quadrant !== 'backlog' && !t.completedAt);

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

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
      setIsDragging(true);
      setHoverQuadrant(task.quadrant);
      dragStartInfo.current = {
        taskId: task.id,
        startX: task.positionX ?? 20,
        startY: task.positionY ?? 20,
      };
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, activatorEvent } = event;

    // Track mouse position
    if (activatorEvent && 'clientX' in activatorEvent) {
      lastMousePos.current = {
        x: (activatorEvent as MouseEvent).clientX,
        y: (activatorEvent as MouseEvent).clientY,
      };
    }

    if (over) {
      const overId = over.id as string;
      if (QUADRANTS.includes(overId as Exclude<QuadrantType, 'backlog'>)) {
        setHoverQuadrant(overId as QuadrantType);
      } else if (overId === 'trash' || overId === 'done') {
        setHoverQuadrant(null);
      }
    }
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over, delta } = event;
      setIsDragging(false);
      setHoverQuadrant(null);

      const cleanup = () => {
        setActiveTask(null);
        dragStartInfo.current = null;
        lastMousePos.current = null;
      };

      if (!over) {
        cleanup();
        return;
      }

      const taskId = active.id as string;
      const targetId = over.id as string;

      // Check if dropped on trash or done
      if (targetId === 'trash') {
        await deleteTask(taskId);
        cleanup();
        return;
      }

      if (targetId === 'done') {
        await completeTask(taskId);
        cleanup();
        return;
      }

      const targetQuadrant = targetId as QuadrantType;
      if (!QUADRANTS.includes(targetQuadrant as Exclude<QuadrantType, 'backlog'>)) {
        cleanup();
        return;
      }

      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        cleanup();
        return;
      }

      // Get the quadrant element to calculate percentage position
      const quadrantEl = quadrantRefs.current.get(targetQuadrant);
      if (!quadrantEl) {
        cleanup();
        return;
      }

      const rect = quadrantEl.getBoundingClientRect();

      let newPosX: number;
      let newPosY: number;

      if (task.quadrant === targetQuadrant && dragStartInfo.current) {
        // Same quadrant - apply delta to starting position
        const deltaXPercent = (delta.x / rect.width) * 100;
        const deltaYPercent = (delta.y / rect.height) * 100;
        newPosX = Math.max(2, Math.min(85, dragStartInfo.current.startX + deltaXPercent));
        newPosY = Math.max(2, Math.min(85, dragStartInfo.current.startY + deltaYPercent));
      } else {
        // Different quadrant - calculate position from current mouse position
        // Use the drag event's final position relative to the target quadrant
        const activeRect = event.active.rect.current.translated;
        if (activeRect) {
          const cardCenterX = activeRect.left + activeRect.width / 2;
          const cardCenterY = activeRect.top + activeRect.height / 2;
          newPosX = Math.max(2, Math.min(85, ((cardCenterX - rect.left) / rect.width) * 100));
          newPosY = Math.max(2, Math.min(85, ((cardCenterY - rect.top) / rect.height) * 100));
        } else {
          newPosX = 30 + Math.random() * 20;
          newPosY = 30 + Math.random() * 20;
        }
      }

      await updateTask(taskId, {
        quadrant: targetQuadrant,
        positionX: newPosX,
        positionY: newPosY,
      });

      cleanup();
    },
    [tasks, updateTask, deleteTask, completeTask]
  );

  const getQuadrantTasks = (quadrant: Exclude<QuadrantType, 'backlog'>) => {
    return matrixTasks.filter((t) => t.quadrant === quadrant);
  };

  const registerQuadrantRef = (quadrant: string, el: HTMLDivElement | null) => {
    if (el) {
      quadrantRefs.current.set(quadrant, el);
    } else {
      quadrantRefs.current.delete(quadrant);
    }
  };

  return (
    <div className="h-full w-full relative bg-gray-100">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Main container with axis labels like reference image */}
        <div className="h-full w-full flex flex-col">
          {/* Top row: spacer + column headers + spacer */}
          <div className="h-6 flex-shrink-0 flex">
            <div className="w-20 flex-shrink-0" /> {/* Left spacer for row labels */}
            <div className="flex-1 flex">
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  Urgent
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  Not Urgent
                </span>
              </div>
            </div>
            <div className="w-20 flex-shrink-0" /> {/* Right spacer for symmetry */}
          </div>

          {/* Main content row */}
          <div className="flex-1 flex min-h-0">
            {/* Left column: row labels */}
            <div className="w-20 flex-shrink-0 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <span
                  className="text-sm font-medium text-gray-600 whitespace-nowrap"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  Important
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span
                  className="text-sm font-medium text-gray-600 whitespace-nowrap"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  Not Important
                </span>
              </div>
            </div>

            {/* Matrix grid */}
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 min-h-0">
              {/* Top-left: Do First (Urgent & Important) */}
              <Quadrant
                quadrant="do_first"
                tasks={getQuadrantTasks('do_first')}
                onTaskClick={setSelectedTask}
                onRegisterRef={(el) => registerQuadrantRef('do_first', el)}
                activeTaskId={activeTask?.id}
              />

              {/* Top-right: Schedule (Not Urgent & Important) */}
              <Quadrant
                quadrant="schedule"
                tasks={getQuadrantTasks('schedule')}
                onTaskClick={setSelectedTask}
                onRegisterRef={(el) => registerQuadrantRef('schedule', el)}
                activeTaskId={activeTask?.id}
              />

              {/* Bottom-left: Delegate (Urgent & Not Important) */}
              <Quadrant
                quadrant="delegate"
                tasks={getQuadrantTasks('delegate')}
                onTaskClick={setSelectedTask}
                onRegisterRef={(el) => registerQuadrantRef('delegate', el)}
                activeTaskId={activeTask?.id}
              />

              {/* Bottom-right: Eliminate (Not Urgent & Not Important) */}
              <Quadrant
                quadrant="eliminate"
                tasks={getQuadrantTasks('eliminate')}
                onTaskClick={setSelectedTask}
                onRegisterRef={(el) => registerQuadrantRef('eliminate', el)}
                activeTaskId={activeTask?.id}
              />
            </div>

            {/* Right spacer for symmetry */}
            <div className="w-20 flex-shrink-0" />
          </div>

          {/* Bottom spacer for symmetry */}
          <div className="h-6 flex-shrink-0" />
        </div>

        {/* Done drop zone - top left, always visible */}
        <DoneDroppable isDragging={isDragging}>
          {(isOver) => <DoneDropZone isOver={isOver} isDragging={isDragging} />}
        </DoneDroppable>

        {/* Trash drop zone - bottom right, always visible */}
        <TrashDroppable isDragging={isDragging}>
          {(isOver) => <TrashDropZone isOver={isOver} isDragging={isDragging} />}
        </TrashDroppable>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <TaskCard
              task={hoverQuadrant ? { ...activeTask, quadrant: hoverQuadrant } : activeTask}
              onOpenPanel={() => {}}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>

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
