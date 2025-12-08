import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { LayoutGrid, List, LogOut, Merge } from 'lucide-react';

export function Layout() {
  const { user, signOut } = useAuth();
  const { selectedTasks, mergeTasks, clearSelection } = useTasks();

  const handleMerge = async () => {
    if (selectedTasks.size < 2) return;
    const taskIds = Array.from(selectedTasks);
    await mergeTasks(taskIds);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-gray-900">TaskCanvas</h1>
            <nav className="flex gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <LayoutGrid size={18} />
                Matrix
              </NavLink>
              <NavLink
                to="/backlog"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <List size={18} />
                Backlog
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {selectedTasks.size >= 2 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedTasks.size} selected
                </span>
                <button
                  onClick={handleMerge}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <Merge size={16} />
                  Merge
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1.5 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
