import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
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

  const handleDragStart = (event: { active: { data: { current?: { task?: Task } } } }) => {
    const task = event.active.data.current?.task;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as string;
      const targetQuadrant = over.id as QuadrantType;

      if (!QUADRANTS.includes(targetQuadrant as Exclude<QuadrantType, 'backlog'>)) return;

      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      let posX = task.positionX ?? 20;
      let posY = task.positionY ?? 20;

      // If moving to a different quadrant, reset position
      if (task.quadrant !== targetQuadrant) {
        posX = 20 + Math.random() * 30;
        posY = 20 + Math.random() * 30;
      }

      await updateTask(taskId, {
        quadrant: targetQuadrant,
        positionX: posX,
        positionY: posY,
      });
    },
    [tasks, updateTask]
  );

  const getQuadrantTasks = (quadrant: Exclude<QuadrantType, 'backlog'>) => {
    return matrixTasks.filter((t) => t.quadrant === quadrant);
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
              />

              {/* Top-right: Schedule (Not Urgent & Important) */}
              <Quadrant
                quadrant="schedule"
                tasks={getQuadrantTasks('schedule')}
                onTaskClick={setSelectedTask}
              />

              {/* Bottom-left: Delegate (Urgent & Not Important) */}
              <Quadrant
                quadrant="delegate"
                tasks={getQuadrantTasks('delegate')}
                onTaskClick={setSelectedTask}
              />

              {/* Bottom-right: Eliminate (Not Urgent & Not Important) */}
              <Quadrant
                quadrant="eliminate"
                tasks={getQuadrantTasks('eliminate')}
                onTaskClick={setSelectedTask}
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
              style={{ width: '180px' }}
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
