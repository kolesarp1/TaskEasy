import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { useTasks } from '../context/TaskContext';
import type { Task, Quadrant } from '../types';
import { QUADRANT_INFO } from '../types';

interface TaskDetailPanelProps {
  task: Task;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

export function TaskDetailPanel({ task, onClose, onUpdate }: TaskDetailPanelProps) {
  const { updateTask, deleteTask, uploadScreenshot, deleteScreenshot } = useTasks();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Update local state when task prop changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
  }, [task]);

  const handleSave = useCallback(async () => {
    if (title !== task.title || description !== (task.description || '')) {
      const updated = await updateTask(task.id, {
        title,
        description: description || null,
      });
      onUpdate(updated);
    }
  }, [title, description, task, updateTask, onUpdate]);

  const handleQuadrantChange = async (quadrant: Quadrant) => {
    const updated = await updateTask(task.id, {
      quadrant,
      positionX: quadrant === 'backlog' ? null : 20,
      positionY: quadrant === 'backlog' ? null : 20,
    });
    onUpdate(updated);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(task.id);
      onClose();
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await uploadScreenshot(task.id, file);
        // Refresh task data
        const { tasks } = await import('../api').then(m => m.tasksApi.getAll());
        const updated = tasks.find(t => t.id === task.id);
        if (updated) onUpdate(updated);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      handleFileUpload(files);
    }
  }, [task.id]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDeleteScreenshot = async (screenshotId: string) => {
    await deleteScreenshot(task.id, screenshotId);
    // Refresh task data
    const { tasks } = await import('../api').then(m => m.tasksApi.getAll());
    const updated = tasks.find(t => t.id === task.id);
    if (updated) onUpdate(updated);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 flex flex-col"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Task Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete task"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => {
                handleSave();
                onClose();
              }}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
            />
          </div>

          {/* Quadrant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quadrant
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={task.quadrant}
              onChange={(e) => handleQuadrantChange(e.target.value as Quadrant)}
            >
              <option value="backlog">Backlog</option>
              {Object.entries(QUADRANT_INFO).map(([key, info]) => (
                <option key={key} value={key}>
                  {info.label} - {info.description}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[120px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              placeholder="Add a description..."
            />
          </div>

          {/* Screenshots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Screenshots
            </label>

            {/* Upload area */}
            <div
              className={`
                border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer
                ${isDraggingFile ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}
              `}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-1 text-sm text-gray-600">
                Drop images here, paste from clipboard, or click to upload
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </div>

            {/* Screenshot grid */}
            {task.screenshots.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {task.screenshots.map((screenshot) => (
                  <div
                    key={screenshot.id}
                    className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100"
                  >
                    <img
                      src={screenshot.path}
                      alt={screenshot.filename}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedImage(screenshot.path)}
                    />
                    <button
                      onClick={() => handleDeleteScreenshot(screenshot.id)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {task.screenshots.length === 0 && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <ImageIcon size={16} />
                <span>No screenshots yet</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full"
            onClick={() => setSelectedImage(null)}
          >
            <X size={24} />
          </button>
          <img
            src={selectedImage}
            alt="Screenshot"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}
