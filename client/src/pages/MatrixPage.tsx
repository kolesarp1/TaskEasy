import { useState, useCallback, useRef, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
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
  const { tasks, updateTask, deleteTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const quadrantRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastMousePosition = useRef({ x: 0, y: 0 });

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

  // Track mouse position during drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task;
    if (task) {
      setActiveTask(task);
      setShowTrash(true);
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    // Update mouse position from drag event if available
    if (event.activatorEvent && 'clientX' in event.activatorEvent) {
      const e = event.activatorEvent as MouseEvent;
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setShowTrash(false);

      if (!over) return;

      const taskId = active.id as string;
      const targetId = over.id as string;

      // Check if dropped on trash
      if (targetId === 'trash') {
        await deleteTask(taskId);
        return;
      }

      const targetQuadrant = targetId as QuadrantType;
      if (!QUADRANTS.includes(targetQuadrant as Exclude<QuadrantType, 'backlog'>)) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Get the quadrant element to calculate percentage position
      const quadrantEl = quadrantRefs.current.get(targetQuadrant);
      if (!quadrantEl) return;

      const rect = quadrantEl.getBoundingClientRect();
      const mouseX = lastMousePosition.current.x;
      const mouseY = lastMousePosition.current.y;

      // Calculate position as percentage within the quadrant
      const newPosX = Math.max(2, Math.min(85, ((mouseX - rect.left) / rect.width) * 100));
      const newPosY = Math.max(2, Math.min(85, ((mouseY - rect.top) / rect.height) * 100));

      await updateTask(taskId, {
        quadrant: targetQuadrant,
        positionX: newPosX,
        positionY: newPosY,
      });
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
        onDragMove={handleDragMove}
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
              />

              {/* Top-right: Schedule (Not Urgent & Important) */}
              <Quadrant
                quadrant="schedule"
                tasks={getQuadrantTasks('schedule')}
                onTaskClick={setSelectedTask}
                onRegisterRef={(el) => registerQuadrantRef('schedule', el)}
              />

              {/* Bottom-left: Delegate (Urgent & Not Important) */}
              <Quadrant
                quadrant="delegate"
                tasks={getQuadrantTasks('delegate')}
                onTaskClick={setSelectedTask}
                onRegisterRef={(el) => registerQuadrantRef('delegate', el)}
              />

              {/* Bottom-right: Eliminate (Not Urgent & Not Important) */}
              <Quadrant
                quadrant="eliminate"
                tasks={getQuadrantTasks('eliminate')}
                onTaskClick={setSelectedTask}
                onRegisterRef={(el) => registerQuadrantRef('eliminate', el)}
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

        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              onOpenPanel={() => {}}
              style={{ width: '150px' }}
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
