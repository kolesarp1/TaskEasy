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
    <div className="h-full p-4">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="h-full max-w-6xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="font-medium text-gray-700">URGENT</span>
              <span className="text-gray-400">|</span>
              <span>NOT URGENT</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 h-[calc(100%-3rem)]">
            <div className="flex flex-col gap-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Important
              </div>
              <Quadrant
                quadrant="do_first"
                tasks={getQuadrantTasks('do_first')}
                onTaskClick={setSelectedTask}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide opacity-0">
                Important
              </div>
              <Quadrant
                quadrant="schedule"
                tasks={getQuadrantTasks('schedule')}
                onTaskClick={setSelectedTask}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Not Important
              </div>
              <Quadrant
                quadrant="delegate"
                tasks={getQuadrantTasks('delegate')}
                onTaskClick={setSelectedTask}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide opacity-0">
                Not Important
              </div>
              <Quadrant
                quadrant="eliminate"
                tasks={getQuadrantTasks('eliminate')}
                onTaskClick={setSelectedTask}
              />
            </div>
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
