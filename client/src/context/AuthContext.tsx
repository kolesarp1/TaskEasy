import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, tasksApi } from '../api';
import type { User, Task } from '../types';

const GUEST_TASKS_KEY = 'guestTasks';

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('guestMode') === 'true';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .getMe()
      .then(({ user }) => {
        setUser(user);
        setIsGuest(false);
        localStorage.removeItem('guestMode');
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const signUp = async (email: string, password: string) => {
    // Get guest tasks before signing up
    const guestTasksJson = localStorage.getItem(GUEST_TASKS_KEY);
    const guestTasks: Task[] = guestTasksJson ? JSON.parse(guestTasksJson) : [];

    const { user } = await authApi.signUp(email, password);
    setUser(user);
    setIsGuest(false);
    localStorage.removeItem('guestMode');

    // Migrate guest tasks to the new account
    if (guestTasks.length > 0) {
      try {
        await Promise.all(
          guestTasks.map((task) =>
            tasksApi.create({
              title: task.title,
              description: task.description || undefined,
              quadrant: task.quadrant,
              positionX: task.positionX,
              positionY: task.positionY,
            })
          )
        );
        // Clear local guest tasks after successful migration
        localStorage.removeItem(GUEST_TASKS_KEY);
      } catch (error) {
        console.error('Failed to migrate some guest tasks:', error);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    // Get guest tasks before signing in
    const guestTasksJson = localStorage.getItem(GUEST_TASKS_KEY);
    const guestTasks: Task[] = guestTasksJson ? JSON.parse(guestTasksJson) : [];

    const { user } = await authApi.signIn(email, password);
    setUser(user);
    setIsGuest(false);
    localStorage.removeItem('guestMode');

    // Migrate guest tasks to the existing account
    if (guestTasks.length > 0) {
      try {
        await Promise.all(
          guestTasks.map((task) =>
            tasksApi.create({
              title: task.title,
              description: task.description || undefined,
              quadrant: task.quadrant,
              positionX: task.positionX,
              positionY: task.positionY,
            })
          )
        );
        // Clear local guest tasks after successful migration
        localStorage.removeItem(GUEST_TASKS_KEY);
      } catch (error) {
        console.error('Failed to migrate some guest tasks:', error);
      }
    }
  };

  const signOut = async () => {
    await authApi.signOut();
    setUser(null);
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('guestMode', 'true');
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, signUp, signIn, signOut, continueAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
