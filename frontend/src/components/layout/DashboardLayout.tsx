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
  const [activeCampName, setActiveCampName] = React.useState<string | null>(null);

  React.useEffect(() => {
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

  // Grouped Navigation menu items
  const operationsGroup: SidebarItem[] = [
    { name: 'Check-in Desk', path: '/', icon: UserCheck },
    { name: 'Calling Screen', path: '/calling', icon: PhoneCall },
  ];
  const patientsGroup: SidebarItem[] = [
    { name: 'Patient Directory', path: '/database', icon: Database },
    { name: 'Barcode Printer', path: '/barcodes', icon: Barcode },
  ];
  const adminGroup: SidebarItem[] = [
    { name: 'Camp Sessions', path: '/camps', icon: Calendar },
  ];

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
      default:
        return { group: 'Dashboard', page: 'Home' };
    }
  };

  const bc = getBreadcrumb();

  const renderNavItem = (item: SidebarItem) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group border ${
          isActive 
            ? 'bg-teal-50 border-teal-100/60 text-teal-900 shadow-xs' 
            : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
        }`}
        title={isCollapsed ? item.name : undefined}
      >
        <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
        {!isCollapsed && <span className="truncate">{item.name}</span>}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-700 font-sans">
      {/* ── Left Sidebar Navigation (Premium Light Medical Theme) ── */}
      <aside 
        className={`bg-slate-50/90 backdrop-blur-md flex flex-col transition-all duration-300 ease-in-out border-r border-slate-200/70 shadow-xs z-20 shrink-0 ${
          isCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {/* Sidebar Header branding */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 bg-slate-50/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-teal-50 border border-teal-100 text-teal-600 p-2 rounded-xl flex items-center justify-center shadow-xs">
              <HeartPulse className="h-5 w-5 animate-pulse text-teal-600" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col select-none">
                <span className="font-bold text-xs tracking-tight text-slate-800 whitespace-nowrap">
                  Asha Ki Kiran
                </span>
                <span className="text-[9px] text-teal-600 font-bold uppercase tracking-wider whitespace-nowrap">
                  Gopal Kiran Nyaas
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer hidden md:block"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Sidebar Grouped Menu Items */}
        <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
          {/* Operations group */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Operations
              </p>
            )}
            {operationsGroup.map(renderNavItem)}
          </div>

          {/* Patients group */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Patients
              </p>
            )}
            {patientsGroup.map(renderNavItem)}
          </div>

          {/* Administration group */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Administration
              </p>
            )}
            {adminGroup.map(renderNavItem)}
          </div>
        </nav>

        {/* Sidebar Footer User profile info */}
        <div className="p-3 border-t border-slate-200 bg-slate-100/30">
          <div className="flex items-center gap-3 overflow-hidden mb-3">
            <div className="h-9 w-9 bg-teal-50 border border-teal-100 text-teal-700 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name?.slice(0, 2) || 'US'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden select-none">
                <span className="font-bold text-xs text-slate-800 truncate">{user?.name}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase truncate">{user?.role}</span>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            className="w-full text-slate-500 hover:text-rose-600 hover:bg-rose-50/60 hover:border-rose-100/50 py-2 rounded-xl text-xs flex justify-center items-center gap-2 border-slate-200 bg-white"
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
        <header className="h-16 bg-white border-b border-slate-200/50 px-6 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex flex-col select-none">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">
              {bc.group}
            </span>
            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none m-0 p-0">
              {bc.page}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Active camp pulsing badge tag */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wide bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100">
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
