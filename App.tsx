import React, { createContext, useContext, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { User, AppData, Task, TaskLog } from './types';
import { backend } from './services/mockBackend';
import { Layout } from './components/Layout';
import { getMotivationalQuote } from './services/geminiService';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Todos from './pages/Todos';
import Expenses from './pages/Expenses';
import CalendarPage from './pages/CalendarPage';
import Journal from './pages/Journal';
import ProofWall from './pages/ProofWall';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { playSound } from './constants';

// Context
interface AppContextType {
  user: User | null;
  data: AppData;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  loginUser: (u: User) => void;
  updateUser: (u: User) => void;
  logoutUser: () => void;
  dailyQuote: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, isLoading } = useApp();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const AppContent = () => {
   // Location listener for sound effects
   const location = useLocation();
   useEffect(() => {
     playSound('click');
   }, [location.pathname]);

   return (
    <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/todos" element={<ProtectedRoute><Todos /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
        <Route path="/proof" element={<ProtectedRoute><ProofWall /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
   )
}

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData>({ tasks: [], logs: [], todos: [], expenses: [], journal: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [dailyQuote, setDailyQuote] = useState("Loading inspiration...");

  const refreshData = async () => {
    if (user) {
      const d = await backend.getData(user.id);
      setData(d);
    }
  };

  useEffect(() => {
    // Check session
    const storedUser = localStorage.getItem('glasshabit_user');
    if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        backend.getData(parsedUser.id).then(setData).finally(() => setIsLoading(false));
    } else {
        setIsLoading(false);
    }

    getMotivationalQuote().then(setDailyQuote);
  }, []);

  const loginUser = (u: User) => {
    setUser(u);
    localStorage.setItem('glasshabit_user', JSON.stringify(u));
    setIsLoading(true);
    backend.getData(u.id).then((d) => {
        setData(d);
        setIsLoading(false);
    });
  };

  const updateUser = (u: User) => {
      setUser(u);
      localStorage.setItem('glasshabit_user', JSON.stringify(u));
  }

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('glasshabit_user');
  };

  return (
    <AppContext.Provider value={{ user, data, isLoading, refreshData, loginUser, updateUser, logoutUser, dailyQuote }}>
      <HashRouter>
         <AppContent />
      </HashRouter>
    </AppContext.Provider>
  );
};

export default App;
