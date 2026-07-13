import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { 
  HeartPulse, 
  LogOut, 
  UserCheck, 
  PhoneCall, 
  Database, 
  Barcode, 
  ChevronLeft, 
  Calendar 
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // We fetch active camp header dynamically from state. Polling will keep it synced.
  const [activeCampName, setActiveCampName] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Read the active camp cache if it was set in state
    const cached = localStorage.getItem('akk_active_camp_no');
    if (cached) {
      setActiveCampName(`Camp #${cached}`);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      window.location.replace('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems: SidebarItem[] = [
    { name: 'Check-in Desk', path: '/', icon: UserCheck },
    { name: 'Calling Screen', path: '/calling', icon: PhoneCall },
    { name: 'Patient Directory', path: '/database', icon: Database },
    { name: 'Barcode Printer', path: '/barcodes', icon: Barcode },
    { name: 'Camp Sessions', path: '/camps', icon: Calendar },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50/50 text-slate-700 font-sans">
      {/* ── Left Sidebar Navigation ── */}
      <aside 
        className={`bg-teal-950 text-white flex flex-col transition-all duration-300 ease-in-out border-r border-teal-900 shadow-xl z-20 shrink-0 ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {/* Sidebar Header branding */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-teal-900 bg-teal-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-teal-700/80 p-2 rounded-xl text-teal-100 shadow-inner flex items-center justify-center">
              <HeartPulse className="h-5 w-5 animate-pulse text-teal-300" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col select-none">
                <span className="font-bold text-sm tracking-tight text-slate-100 whitespace-nowrap">
                  Asha Ki Kiran
                </span>
                <span className="text-[9px] text-teal-400 font-bold uppercase tracking-wider whitespace-nowrap">
                  Gopal Kiran Nyaas
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-teal-400 hover:text-white p-1 hover:bg-teal-900/40 rounded-lg transition-colors cursor-pointer hidden md:block"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Sidebar Menu Items */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-teal-800 text-white shadow-md shadow-teal-950/20' 
                    : 'text-teal-200/80 hover:text-white hover:bg-teal-900/40'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-teal-300' : 'text-teal-300/60'}`} />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer User profile info */}
        <div className="p-3 border-t border-teal-900 bg-teal-950/40">
          <div className="flex items-center gap-3 overflow-hidden mb-3">
            <div className="h-9 w-9 bg-teal-800 border border-teal-700/80 rounded-xl flex items-center justify-center font-bold text-sm text-teal-200 uppercase shrink-0">
              {user?.name?.slice(0, 2) || 'US'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden select-none">
                <span className="font-semibold text-xs text-slate-100 truncate">{user?.name}</span>
                <span className="text-[10px] text-teal-400 capitalize truncate">{user?.role}</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            className="w-full text-teal-300 hover:text-white hover:bg-teal-900/40 py-2 rounded-xl text-xs flex justify-center items-center gap-2"
            onClick={handleLogout}
            isLoading={isLoggingOut}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* ── Main Canvas Wrapper ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header telemetry bar */}
        <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight capitalize select-none">
              {location.pathname === '/' ? 'Check-in Desk' : location.pathname.slice(1).replace('-', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Active camp pulsing badge tag */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
              </span>
              <span className="text-xs font-bold text-teal-800 uppercase tracking-wide bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
                {activeCampName || 'Active Session'}
              </span>
            </div>
          </div>
        </header>

        {/* Content body screen content */}
        <main className="flex-1 p-6 overflow-y-auto min-h-0 bg-slate-50/40">
          {children}
        </main>
      </div>
    </div>
  );
}
