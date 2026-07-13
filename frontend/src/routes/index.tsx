import * as React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CheckinDesk } from '@/features/dashboard/pages/CheckinDesk';
import { CallingScreen } from '@/features/dashboard/pages/CallingScreen';
import { DatabaseManager } from '@/features/dashboard/pages/DatabaseManager';
import { BarcodePrinter } from '@/features/dashboard/pages/BarcodePrinter';
import { CampManager } from '@/features/dashboard/pages/CampManager';
import { DoctorManager } from '@/features/dashboard/pages/DoctorManager';

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
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<CheckinDesk />} />
                <Route path="/calling" element={<CallingScreen />} />
                <Route path="/database" element={<DatabaseManager />} />
                <Route path="/barcodes" element={<BarcodePrinter />} />
                <Route path="/camps" element={<CampManager />} />
                <Route path="/doctors" element={<DoctorManager />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
