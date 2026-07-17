import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import {
  Menu,
  Clock,
  WifiOff
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [activeCampName, setActiveCampName] = React.useState<string | null>(null);
  const [timeLeft, setTimeLeft] = React.useState(250); // 15 minutes session
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    const cached = localStorage.getItem('akk_active_camp_no');
    if (cached) {
      setActiveCampName(`Camp #${cached}`);
    }
  }, [location.pathname]);

  // Session timeout handler
  React.useEffect(() => {
    if (timeLeft <= 0) {
      logout();
      window.location.replace('/login');
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, logout]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getBreadcrumb = () => {
    switch (location.pathname) {
      case '/':
        return { group: 'Operations', page: 'Check-in Desk' };
      case '/calling':
        return { group: 'Operations', page: 'Calling Screen' };
      case '/database':
        return { group: 'Patients', page: 'Patient Directory' };
      case '/barcodes':
        return { group: 'Patients', page: 'Barcode Printer' };
      case '/camps':
        return { group: 'Administration', page: 'Camp Sessions' };
      case '/doctors':
        return { group: 'Administration', page: 'Doctors Roster' };
      default:
        return { group: 'Dashboard', page: 'Home' };
    }
  };

  const bc = getBreadcrumb();

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-700 font-sans relative overflow-x-hidden">

      {/* ── Mobile Drawer Overlay ── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Modern Premium Sidebar */}
      <div className={`fixed top-0 bottom-0 left-0 z-40 transition-transform duration-300 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <Sidebar />
      </div>

      {/* ── Main Canvas Wrapper ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden min-h-screen md:ml-64">
        {/* Top Header telemetry bar */}
        <header className="h-16 bg-white/70 glass px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center select-none">
            {/* Hamburger trigger for mobile screens */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer shrink-0 mr-2"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">
                {bc.group}
              </span>
              <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none m-0 p-0">
                {bc.page}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Session Timer */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-3 py-1.5 rounded-full text-slate-600 text-[10.5px] font-mono select-none shadow-sm">
              <Clock className="h-3.5 w-3.5 text-teal-500" />
              <span className="font-bold">Session: {formatTime(timeLeft)}</span>
            </div>

            {/* Active camp pulsing badge tag */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100 shadow-sm">
                {activeCampName || 'Active Session'}
              </span>
            </div>
          </div>
        </header>

        {/* Content body screen content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 bg-transparent">
          {children}
        </main>
      </div>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="fixed bottom-6 right-6 bg-rose-650/95 backdrop-blur-md text-white font-bold text-xs py-3.5 px-5 rounded-2xl shadow-xl border border-rose-500/20 flex items-center gap-3 z-50 animate-bounce select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <div className="flex items-center gap-1.5">
            <WifiOff className="h-4 w-4 shrink-0 text-white" />
            <span>Connection Interrupted — Working Offline</span>
          </div>
        </div>
      )}
    </div>
  );
}
