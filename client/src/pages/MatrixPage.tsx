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
import { Trash2 } from 'lucide-react';
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

function TrashDropZone({ isOver }: { isOver: boolean }) {
  return (
    <div
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

function TrashDroppable({ children }: { children: (isOver: boolean) => React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'trash',
    data: { type: 'trash' },
  });

  return (
    <div ref={setNodeRef}>
      {children(isOver)}
    </div>
  );
}

export function MatrixPage() {
  const { tasks, updateTask, deleteTask, createTask, uploadScreenshot } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [hoverQuadrant, setHoverQuadrant] = useState<QuadrantType | null>(null);
  const quadrantRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragStartInfo = useRef<{ taskId: string; startX: number; startY: number } | null>(null);
  const lastMousePos = useRef<{ x: number; y: number } | null>(null);

  const matrixTasks = tasks.filter((t) => t.quadrant !== 'backlog');

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
      setShowTrash(true);
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
      } else if (overId === 'trash') {
        setHoverQuadrant(null);
      }
    }
  };

  const handleDragMove = (event: { activatorEvent: Event }) => {
    // Update mouse position during drag
    if (event.activatorEvent && 'clientX' in event.activatorEvent) {
      lastMousePos.current = {
        x: (event.activatorEvent as MouseEvent).clientX,
        y: (event.activatorEvent as MouseEvent).clientY,
      };
    }
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over, delta } = event;
      setActiveTask(null);
      setShowTrash(false);
      setHoverQuadrant(null);

      if (!over) {
        dragStartInfo.current = null;
        lastMousePos.current = null;
        return;
      }

      const taskId = active.id as string;
      const targetId = over.id as string;

      // Check if dropped on trash
      if (targetId === 'trash') {
        await deleteTask(taskId);
        dragStartInfo.current = null;
        lastMousePos.current = null;
        return;
      }

      const targetQuadrant = targetId as QuadrantType;
      if (!QUADRANTS.includes(targetQuadrant as Exclude<QuadrantType, 'backlog'>)) {
        dragStartInfo.current = null;
        lastMousePos.current = null;
        return;
      }

      const task = tasks.find((t) => t.id === taskId);
      if (!task) {
        dragStartInfo.current = null;
        lastMousePos.current = null;
        return;
      }

      // Get the quadrant element to calculate percentage position
      const quadrantEl = quadrantRefs.current.get(targetQuadrant);
      if (!quadrantEl) {
        dragStartInfo.current = null;
        lastMousePos.current = null;
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

      dragStartInfo.current = null;
      lastMousePos.current = null;
    },
    [tasks, updateTask, deleteTask]
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
        {/* Main container with axis labels */}
        <div className="h-full w-full flex">
          {/* Left axis label - IMPORTANT */}
          <div className="w-8 flex-shrink-0 flex items-center justify-center">
            <span
              className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Important
            </span>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top axis label - URGENT */}
            <div className="h-8 flex-shrink-0 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Urgent
              </span>
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

            {/* Bottom axis label - NOT URGENT */}
            <div className="h-8 flex-shrink-0 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Not Urgent
              </span>
            </div>
          </div>

          {/* Right axis label - NOT IMPORTANT */}
          <div className="w-8 flex-shrink-0 flex items-center justify-center">
            <span
              className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap"
              style={{ writingMode: 'vertical-rl' }}
            >
              Not Important
            </span>
          </div>
        </div>

        {/* Trash drop zone - only visible when dragging */}
        {showTrash && (
          <TrashDroppable>
            {(isOver) => <TrashDropZone isOver={isOver} />}
          </TrashDroppable>
        )}

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="w-[140px]">
              <TaskCard
                task={hoverQuadrant ? { ...activeTask, quadrant: hoverQuadrant } : activeTask}
                onOpenPanel={() => {}}
                isDragOverlay
              />
            </div>
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
