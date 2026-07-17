import * as React from 'react';
import { DashboardService } from '@/services/dashboard.service';
import type { LogEntry, Doctor } from '@/services/dashboard.service';
import { toast } from 'sonner';
import { useHotkeys } from '@/hooks/useHotkeys';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Activity,
  Heart,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// Import newly abstracted premium components
import { MetricWidget } from '../components/MetricWidget';
import { PatientScanner } from '../components/PatientScanner';
import { PatientQueue } from '../components/PatientQueue';
import { ActivityChart } from '../components/ActivityChart';

export function CheckinDesk() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Core polled snapshots
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [docStates, setDocStates] = React.useState<Record<string, string>>({});
  const [activeCamp, setActiveCamp] = React.useState<any>(null);

  const scannerRef = React.useRef<{ focus: () => void; reset: () => void }>(null);

  // Fetch combined state
  const fetchData = React.useCallback(async () => {
    try {
      const state = await DashboardService.getState();
      setLog(state.log);
      setDoctors(state.doctors);
      setDocStates(state.docStates);
      setActiveCamp(state.activeCamp);
      
      if (state.activeCamp) {
        localStorage.setItem('akk_active_camp_no', String(state.activeCamp.camp_no));
      } else {
        localStorage.removeItem('akk_active_camp_no');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync server state.');
    }
  }, []);

  // Poll state every 4.5 seconds
  React.useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 4500);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Focus scanner field automatically on mount
  React.useEffect(() => {
    if (scannerRef.current) {
      scannerRef.current.focus();
    }
  }, []);

  // Keyboard Shortcuts hotkey hooks
  useHotkeys({ key: '/' }, () => {
    const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  });

  useHotkeys({ key: 's', altKey: true }, () => {
    if (scannerRef.current) scannerRef.current.reset();
  });
  
  useHotkeys({ key: 'Escape' }, () => {
    if (scannerRef.current) scannerRef.current.reset();
  });

  // Doctor list reordering
  const handleMoveDoctor = async (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= doctors.length) return;

    const reordered = [...doctors];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;

    setDoctors(reordered);
    try {
      await DashboardService.reorderDoctors(reordered.map((d) => d.code));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update doctor order on server.');
      fetchData();
    }
  };

  // Toggle Doctor hide flags
  const handleToggleDoctorFlag = async (code: string, flag: 'display' | 'calling', currentVal: boolean) => {
    if (!isAdmin) return;
    try {
      const updates = flag === 'display' 
        ? { displayHidden: !currentVal } 
        : { callingHidden: !currentVal };
      await DashboardService.toggleDoctorHiddenFlags(code, updates);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update doctor configurations.');
    }
  };

  // Today metrics counters
  const metrics = React.useMemo(() => {
    const total = log.length;
    const waiting = log.filter((e) => e.status === 'waiting').length;
    const completed = log.filter((e) => e.status === 'completed').length;
    const availableDocs = doctors.filter(d => !d.callingHidden).length;
    return { total, waiting, completed, availableDocs };
  }, [log, doctors]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ── Rich Dashboard Metrics Cards Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        <MetricWidget
          title="Registered"
          value={metrics.total}
          subtitle="Patients registered today"
          icon={Users}
          trendIcon={TrendingUp}
          colorScheme="teal"
        />
        <MetricWidget
          title="In Waitlist"
          value={metrics.waiting}
          subtitle="Waiting to see doctor"
          icon={Clock}
          trendIcon={Activity}
          colorScheme="amber"
          pulse
        />
        <MetricWidget
          title="Consulted"
          value={metrics.completed}
          subtitle="Consultations completed"
          icon={CheckCircle}
          trendIcon={CheckCircle}
          colorScheme="emerald"
        />
        <MetricWidget
          title="Doctors On-site"
          value={metrics.availableDocs}
          subtitle="Active rooms dispatch"
          icon={Heart}
          trendIcon={Users}
          colorScheme="blue"
        />
        <div className="hidden xl:block">
          <MetricWidget
            title="Avg Wait Flow"
            value="14 min"
            subtitle="Optimal patient speed"
            icon={Activity}
            trendIcon={Clock}
            colorScheme="indigo"
          />
        </div>
      </div>

      {/* ── Checkin Workspace Layout (Senior UX Optimization Grid) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Quick Scanner & Doctors reference roster */}
        <div className="lg:col-span-4 space-y-6">
          <PatientScanner
            ref={scannerRef as any}
            doctors={doctors}
            activeCamp={activeCamp}
            onSuccess={toast.success}
            onError={toast.error}
            onCheckinComplete={fetchData}
          />

          {/* Card: Doctor availability reference */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-xl text-blue-600">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Volunteering Doctors</h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
              {doctors.length === 0 ? (
                <div className="text-center py-6 text-xs font-medium text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No active doctors loaded today. Import roster or add doctors in Camp Sessions module.
                </div>
              ) : (
                doctors.map((doc, idx) => (
                  <div key={doc.code} className="py-3 flex items-center justify-between text-xs group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="h-9 w-9 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center font-black font-mono text-[10px] shrink-0 border border-slate-200 shadow-sm">
                        {doc.code}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-sm text-slate-800 truncate leading-none">{doc.name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1.5 flex gap-1">
                          Room {idx + 1} <span className="text-slate-300">•</span> <span className={docStates[doc.code] === 'calling' ? 'text-amber-600 font-bold' : 'text-slate-500'}>{docStates[doc.code] || 'idle'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleMoveDoctor(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 rounded-md cursor-pointer transition-colors"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveDoctor(idx, 'down')}
                            disabled={idx === doctors.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 rounded-md cursor-pointer transition-colors"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleDoctorFlag(doc.code, 'display', doc.displayHidden)}
                            className={`p-1 rounded-md cursor-pointer transition-colors ${doc.displayHidden ? 'text-rose-600 bg-rose-50' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'}`}
                            title={doc.displayHidden ? 'Hidden on TV display' : 'Visible on TV display'}
                          >
                            {doc.displayHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Analytics Chart Widget */}
          <ActivityChart log={log} />
        </div>

        {/* Right Section: Patient Queue Logs ── */}
        <div className="lg:col-span-8">
          <PatientQueue 
            log={log} 
            doctors={doctors} 
            onResetScanner={() => {
              if (scannerRef.current) scannerRef.current.reset();
            }} 
          />
        </div>
      </div>
    </div>
  );
}
