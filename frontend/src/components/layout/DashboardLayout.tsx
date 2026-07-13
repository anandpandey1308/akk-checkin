import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  HeartPulse, 
  LogOut, 
  UserCheck, 
  PhoneCall, 
  Database, 
  Barcode, 
  ChevronLeft, 
  Calendar,
  Menu,
  X
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
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
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
        onClick={() => setIsMobileOpen(false)} // Close sidebar on mobile link select
        className={`relative flex items-center border transition-all duration-200 group ${
          isCollapsed 
            ? 'justify-center p-2.5 rounded-xl' 
            : 'gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold'
        } ${
          isActive 
            ? 'bg-teal-50 border-teal-100 text-teal-900 shadow-xs font-bold' 
            : 'border-transparent text-slate-650 hover:text-slate-900 hover:bg-slate-100/80'
        }`}
        title={isCollapsed ? item.name : undefined}
      >
        <Icon className={`h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
        {!isCollapsed && <span className="truncate">{item.name}</span>}
        {isActive && !isCollapsed && (
          <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-teal-500" />
        )}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-700 font-sans relative overflow-x-hidden">
      
      {/* ── Mobile Drawer Overlay ── */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/25 backdrop-blur-xs z-30 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ── Left Sidebar Navigation (Premium Responsive Layout) ── */}
      <aside 
        className={`bg-slate-50/95 backdrop-blur-md flex flex-col border-r border-slate-200/70 shadow-xs shrink-0
          fixed md:relative top-0 bottom-0 left-0 z-40 transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-18' : 'md:w-64'}
          w-64
        `}
      >
        {/* Sidebar Header branding */}
        <div 
          onClick={() => isCollapsed && setIsCollapsed(false)}
          className={`h-16 flex items-center border-b border-slate-200 bg-slate-50/40 transition-all duration-200 ${
            isCollapsed ? 'justify-center px-0 cursor-pointer hover:bg-slate-100/50' : 'justify-between px-4'
          }`}
          title={isCollapsed ? 'Expand Sidebar' : undefined}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-teal-50 border border-teal-100 text-teal-600 p-2 rounded-xl flex items-center justify-center shadow-xs shrink-0">
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
          
          {/* Collapse toggle button (only visible on desktop when expanded) */}
          {!isCollapsed && (
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Avoid triggering expand onClick on parent wrapper!
                setIsCollapsed(true);
              }}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer md:block hidden"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Close button on mobile */}
          {isMobileOpen && (
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer md:hidden block"
              title="Close Sidebar"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        {/* Sidebar Grouped Menu Items */}
        <nav className={`flex-1 py-4 space-y-5 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {/* Operations group */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                Operations
              </p>
            )}
            {operationsGroup.map(renderNavItem)}
          </div>

          {/* Patients group */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                Patients
              </p>
            )}
            {patientsGroup.map(renderNavItem)}
          </div>

          {/* Administration group */}
          <div className="space-y-1">
            {!isCollapsed && (
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                Administration
              </p>
            )}
            {adminGroup.map(renderNavItem)}
          </div>
        </nav>

        {/* Sidebar Footer User profile info */}
        <div className={`border-t border-slate-200 bg-slate-50 flex items-center justify-center ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {isCollapsed && !isMobileOpen ? (
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-9 w-9 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-100 text-slate-400 hover:text-rose-600 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs group shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
            </button>
          ) : (
            <div className="flex items-center justify-between gap-2.5 bg-white border border-slate-200/80 p-2 rounded-xl shadow-xs w-full">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="h-8 w-8 bg-teal-50 border border-teal-100 text-teal-700 rounded-lg flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {user?.name?.slice(0, 2) || 'US'}
                </div>
                <div className="flex flex-col overflow-hidden select-none">
                  <span className="font-bold text-[11px] text-slate-800 truncate leading-tight">{user?.name}</span>
                  <span className="text-[9px] text-slate-450 font-bold uppercase truncate leading-tight mt-0.5">{user?.role}</span>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 border border-transparent hover:border-rose-100/40"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Canvas Wrapper ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden min-h-screen">
        {/* Top Header telemetry bar */}
        <header className="h-16 bg-white border-b border-slate-200/50 px-4 md:px-6 flex items-center justify-between shadow-xs shrink-0">
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
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 bg-slate-50/40">
          {children}
        </main>
      </div>
    </div>
  );
}
