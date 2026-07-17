import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  PhoneCall, 
  Database, 
  Printer, 
  Stethoscope, 
  Tent,
  LogOut,
  HeartPulse
} from 'lucide-react';
import { motion } from 'framer-motion';

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Check-in Desk', path: '/', icon: LayoutDashboard },
    { name: 'Calling Screen', path: '/calling', icon: PhoneCall },
    { name: 'Database', path: '/database', icon: Database },
    { name: 'Barcodes', path: '/barcodes', icon: Printer },
  ];

  const adminItems = [
    { name: 'Manage Doctors', path: '/doctors', icon: Stethoscope },
    { name: 'Manage Camps', path: '/camps', icon: Tent },
  ];

  return (
    <div className="w-64 h-full glass border-r border-slate-200/50 flex flex-col justify-between bg-white/70">
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200/40">
          <HeartPulse className="h-6 w-6 text-teal-600 mr-2" />
          <span className="font-bold text-slate-800 tracking-tight">AKK Enterprise</span>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 no-scrollbar">
          <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `relative flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`
                }
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTab" 
                    className="absolute left-0 w-1 h-6 bg-teal-500 rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={`h-4.5 w-4.5 mr-3 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                {item.name}
              </NavLink>
            );
          })}

          {user?.role === 'admin' && (
            <>
              <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-8 mb-2">Administration</p>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `relative flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-teal-50 text-teal-700 shadow-sm'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                      }`
                    }
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabAdmin" 
                        className="absolute left-0 w-1 h-6 bg-teal-500 rounded-r-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <Icon className={`h-4.5 w-4.5 mr-3 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                    {item.name}
                  </NavLink>
                );
              })}
            </>
          )}
        </div>

        {/* User Profile / Footer Section */}
        <div className="p-4 border-t border-slate-200/40">
          <div className="flex items-center p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200/50">
            <div className="h-9 w-9 rounded-full bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 font-bold">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.username}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
