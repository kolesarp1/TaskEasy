import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
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

export function MatrixPage() {
  const { tasks, updateTask } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const quadrantRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over, delta } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as string;
      const targetQuadrant = over.id as QuadrantType;

      if (!QUADRANTS.includes(targetQuadrant as Exclude<QuadrantType, 'backlog'>)) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Get the quadrant element to calculate percentage position
      const quadrantEl = quadrantRefs.current.get(targetQuadrant);
      if (!quadrantEl) return;

      const rect = quadrantEl.getBoundingClientRect();

      let newPosX: number;
      let newPosY: number;

      if (task.quadrant === targetQuadrant) {
        // Moving within same quadrant - apply delta to current position
        const currentX = task.positionX ?? 20;
        const currentY = task.positionY ?? 20;

        // Convert delta pixels to percentage
        const deltaXPercent = (delta.x / rect.width) * 100;
        const deltaYPercent = (delta.y / rect.height) * 100;

        newPosX = Math.max(2, Math.min(85, currentX + deltaXPercent));
        newPosY = Math.max(2, Math.min(85, currentY + deltaYPercent));
      } else {
        // Moving to different quadrant - place in a reasonable position
        newPosX = 20 + Math.random() * 30;
        newPosY = 20 + Math.random() * 30;
      }

      await updateTask(taskId, {
        quadrant: targetQuadrant,
        positionX: newPosX,
        positionY: newPosY,
      });
    },
    [tasks, updateTask]
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

        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={activeTask}
              onClick={() => {}}
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
