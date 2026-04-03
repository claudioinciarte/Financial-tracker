import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MobileInput from './pages/MobileInput';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import Auth from './pages/Auth';
import Budgets from './pages/Budgets';
import History from './pages/History';
import CSVReconciler from './pages/CSVReconciler';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><MobileInput /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
            <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/reconcile" element={<ProtectedRoute><CSVReconciler /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
