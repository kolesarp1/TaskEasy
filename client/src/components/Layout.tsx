import { useState } from 'react';
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { LayoutGrid, List, LogOut, Merge, Menu, X, User, AlertCircle, HelpCircle } from 'lucide-react';

export function Layout() {
  const { user, isGuest, signOut } = useAuth();
  const { selectedTasks, mergeTasks, clearSelection, tasks } = useTasks();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const handleMerge = async () => {
    if (selectedTasks.size < 2) return;
    const taskIds = Array.from(selectedTasks);
    await mergeTasks(taskIds);
  };

  const isMatrixPage = location.pathname === '/';

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* Floating corner menu button */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {/* Merge controls when tasks selected */}
        {selectedTasks.size >= 2 && (
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-lg px-3 py-2 mr-2">
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
              className="px-2 py-1.5 text-gray-600 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="fixed top-16 right-4 z-50 bg-white rounded-xl shadow-xl border border-gray-200 py-2 w-56">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Navigation</p>
            </div>
            <NavLink
              to="/"
              end
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <LayoutGrid size={18} />
              Matrix View
            </NavLink>
            <NavLink
              to="/backlog"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <List size={18} />
              Backlog
            </NavLink>
            <NavLink
              to="/about"
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <HelpCircle size={18} />
              About This Method
            </NavLink>

            <div className="border-t border-gray-100 mt-2 pt-2">
              <div className="px-4 py-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Account</p>
              </div>
              {user ? (
                <>
                  <div className="px-4 py-2 flex items-center gap-3 text-sm text-gray-600">
                    <User size={18} />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <LogOut size={18} />
                    Sign out
                  </button>
                </>
              ) : isGuest ? (
                <Link
                  to="/auth"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <User size={18} />
                  Sign up to save
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* Guest mode banner - only show on non-matrix pages or as a subtle indicator */}
      {isGuest && !user && !isMatrixPage && (
        <div className="fixed top-0 left-0 right-0 bg-amber-50 border-b border-amber-200 px-4 py-2 z-30">
          <div className="flex items-center justify-center gap-2 text-sm text-amber-800">
            <AlertCircle size={16} />
            <span>
              Guest mode.{' '}
              {tasks.length > 0 && (
                <span className="font-medium">{tasks.length} task{tasks.length !== 1 ? 's' : ''} stored locally. </span>
              )}
              <Link to="/auth" className="underline font-medium hover:text-amber-900">
                Sign up
              </Link>{' '}
              to save permanently.
            </span>
          </div>
        </div>
      )}

      <main className="h-full w-full">
        <Outlet />
      </main>
    </div>
  );
}
