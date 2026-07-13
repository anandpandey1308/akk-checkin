import * as React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { LogOut, LayoutDashboard, HeartPulse } from 'lucide-react';

/**
 * Route guard for pages requiring authentication
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-bg text-slate-600 gap-4">
        <div className="h-10 w-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-semibold text-sm">Verifying secure session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Route guard to prevent logged-in users from seeing login again
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-brand-bg text-slate-600 gap-4">
        <div className="h-10 w-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-semibold text-sm">Verifying secure session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Temp placeholder Dashboard page to demonstrate session & logout functionality
 */
function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-brand-bg">
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-teal-900 p-2 rounded-xl text-white">
            <HeartPulse className="h-6 w-6 text-brand-secondary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight m-0 p-0">
              Asha Ki Kiran Camps
            </h1>
            <p className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">
              Gopal Kiran Nyaas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            isLoading={isLoggingOut}
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 sm:p-12 max-w-4xl mx-auto w-full flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-brand-primary mb-6 shadow-sm">
          <LayoutDashboard className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
          Dashboard Work In Progress
        </h2>
        <p className="text-slate-500 max-w-md mb-8">
          Welcome, <span className="font-semibold text-slate-700">{user?.name}</span>. You have successfully authenticated into your <span className="font-semibold text-slate-700 capitalize">{user?.role}</span> account. The login session works with 100% backend compatibility.
        </p>
      </main>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          </PublicRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <DashboardPlaceholder />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
