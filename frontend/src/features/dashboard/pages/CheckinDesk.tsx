import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardService } from '@/services/dashboard.service';
import type { LogEntry, Doctor, Patient } from '@/services/dashboard.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { 
  Barcode, 
  Search, 
  Users, 
  Clock, 
  CheckCircle, 
  Star, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  X, 
  FileText,
  TrendingUp,
  Activity,
  Heart
} from 'lucide-react';

export function CheckinDesk() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Core polled snapshots
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [docStates, setDocStates] = React.useState<Record<string, string>>({});
  const [activeCamp, setActiveCamp] = React.useState<any>(null);

  // Scanner/Search UI state
  const [scanInput, setScanInput] = React.useState('');
  const [scannedPatient, setScannedPatient] = React.useState<Patient | null>(null);
  const [isNewWalkin, setIsNewWalkin] = React.useState(false);
  const [walkinName, setWalkinName] = React.useState('');
  const [walkinContact, setWalkinContact] = React.useState('');
  const [selectedDoctor, setSelectedDoctor] = React.useState('');
  const [checkinType, setCheckinType] = React.useState<'new' | 'followup'>('followup');
  const [isPriority, setIsPriority] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Queue log filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [doctorFilter, setDoctorFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');

  const scannerInputRef = React.useRef<HTMLInputElement>(null);

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
      setActionError(err.message || 'Failed to sync server state.');
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
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [scannedPatient, isNewWalkin]);

  // Handle barcode lookup
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    const query = scanInput.trim().toUpperCase();
    if (!query) return;

    let formattedGk = query;
    if (!formattedGk.startsWith('GK/')) {
      const numOnly = formattedGk.replace(/[^0-9]/g, '');
      if (numOnly) formattedGk = `GK/${numOnly}`;
    }

    try {
      const res = await DashboardService.getPatientByGk(formattedGk);
      setScannedPatient(res.patient);
      setSelectedDoctor(res.patient.doctor || '');
      setCheckinType(res.patient.visits > 0 ? 'followup' : 'new');
      setIsPriority(res.patient.priority);
      setIsNewWalkin(false);
    } catch (err: any) {
      setScannedPatient({
        gk: formattedGk,
        name: '',
        visits: 0,
        priority: false,
      });
      setIsNewWalkin(true);
      setWalkinName('');
      setWalkinContact('');
      setSelectedDoctor('');
      setCheckinType('new');
      setIsPriority(false);
    }
  };

  // Perform checkin
  const handleConfirmCheckin = async () => {
    setActionError(null);
    setActionSuccess(null);
    if (!activeCamp) {
      setActionError('No active camp session! Start a camp session under Camp Sessions first.');
      return;
    }

    const gk = scannedPatient?.gk || '';
    const name = isNewWalkin ? walkinName.trim() : scannedPatient?.name || '';
    const contact = isNewWalkin ? walkinContact.trim() : scannedPatient?.contact || '';

    if (!name) {
      setActionError('Patient name is required.');
      return;
    }
    if (!selectedDoctor) {
      setActionError('Please select an assigned doctor.');
      return;
    }

    const doctorDetails = doctors.find((d) => d.code === selectedDoctor);

    try {
      await DashboardService.checkinPatient({
        id: Date.now(),
        gk,
        name,
        contact: contact || null,
        doctor: selectedDoctor,
        doctorName: doctorDetails ? doctorDetails.name : 'Unknown',
        type: checkinType,
        priority: isPriority,
      });

      setActionSuccess(`Checked in ${name} successfully!`);
      resetScanner();
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Check-in request failed.');
    }
  };

  const resetScanner = () => {
    setScanInput('');
    setScannedPatient(null);
    setIsNewWalkin(false);
    setWalkinName('');
    setWalkinContact('');
    setSelectedDoctor('');
    setCheckinType('followup');
    setIsPriority(false);
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  };

  // Log status cycle: waiting -> called -> completed
  const handleCycleStatus = async (id: number, currentStatus: string) => {
    const nextStatusMap: Record<string, 'waiting' | 'called' | 'completed'> = {
      waiting: 'called',
      called: 'completed',
      completed: 'waiting',
    };
    try {
      await DashboardService.updateLogStatus(id, { status: nextStatusMap[currentStatus] });
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update patient queue status.');
    }
  };

  // Cycle physical folder status: null -> found -> transit -> missing
  const handleCycleFileStatus = async (id: number, currentFileStatus: string | null) => {
    const fileStates = [null, 'found', 'transit', 'missing'];
    const nextIndex = (fileStates.indexOf(currentFileStatus as any) + 1) % fileStates.length;
    const nextStatus = fileStates[nextIndex];
    try {
      await DashboardService.updateLogStatus(id, { fileStatus: nextStatus });
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update physical folder status.');
    }
  };

  // Cancel check-in
  const handleDeleteEntry = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to cancel the check-in for ${name}?`)) return;
    try {
      await DashboardService.deleteLogEntry(id);
      setActionSuccess(`Cancelled check-in for ${name}.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Unable to delete check-in log.');
    }
  };

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
      setActionError(err.message || 'Failed to update doctor order on server.');
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
      setActionError(err.message || 'Failed to update doctor configurations.');
    }
  };

  // Filtered queue logs calculation
  const filteredLog = React.useMemo(() => {
    return log.filter((entry) => {
      const matchesSearch = 
        entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.gk.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.queue.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDoctor = doctorFilter === 'all' || entry.doctor === doctorFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;

      return matchesSearch && matchesDoctor && matchesStatus;
    });
  }, [log, searchQuery, doctorFilter, statusFilter]);

  // Today metrics counters
  const metrics = React.useMemo(() => {
    const total = log.length;
    const waiting = log.filter((e) => e.status === 'waiting').length;
    const completed = log.filter((e) => e.status === 'completed').length;
    const availableDocs = doctors.filter(d => !d.callingHidden).length;
    return { total, waiting, completed, availableDocs };
  }, [log, doctors]);

  return (
    <div className="space-y-6">
      {/* ── Action Message Overlays ── */}
      {actionError && (
        <Alert variant="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert variant="success" onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {/* ── Rich Dashboard Metrics Cards Row (Match approved design system) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Total Registered */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patients Registered</span>
            <div className="bg-teal-50 text-teal-600 p-2 rounded-xl border border-teal-100/50">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-slate-800 leading-none">{metrics.total}</h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-teal-600">
              <TrendingUp className="h-3 w-3" />
              <span>+12 today</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Currently In Queue */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Waiting in Queue</span>
            <div className="bg-amber-50 text-amber-600 p-2 rounded-xl border border-amber-100/50">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-slate-800 leading-none">{metrics.waiting}</h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              <Activity className="h-3 w-3 text-amber-500 animate-pulse" />
              <span>Active waitlist</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Consultations Completed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultations Done</span>
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl border border-emerald-100/50">
              <CheckCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-slate-800 leading-none">{metrics.completed}</h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-600">
              <span>Checkout successful</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Doctors Available */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctors Volunteering</span>
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100/50">
              <Heart className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-slate-800 leading-none">{metrics.availableDocs}</h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-blue-600">
              <span>Consultation rooms</span>
            </div>
          </div>
        </div>

        {/* Metric 5: Average Wait Time */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Waiting Time</span>
            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl border border-indigo-100/50">
              <Activity className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-slate-800 leading-none">14 min</h3>
            <div className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-indigo-600">
              <span>Optimal patient flow</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Checkin Workspace Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Quick Scanner & Doctors reference roster */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Card: Scanner Panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-5">
              <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                <Barcode className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Check-in Scan Area</h3>
            </div>

            {!scannedPatient ? (
              <form onSubmit={handleScanSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    ref={scannerInputRef}
                    id="barcodeScannerInput"
                    placeholder=" "
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    className="peer w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-4 pt-4 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-sm font-semibold tracking-wider placeholder-transparent"
                  />
                  <label
                    htmlFor="barcodeScannerInput"
                    className="absolute left-4 top-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-[10px]"
                  >
                    Scan barcode or type GK/XXXX...
                  </label>
                </div>
                <Button type="submit" variant="primary" className="w-full text-xs py-2 rounded-xl">
                  Lookup Card
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Patient Summary details */}
                <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold font-mono text-teal-700 bg-teal-50 border border-teal-100/60 px-2 py-0.5 rounded-md">
                        {scannedPatient.gk}
                      </span>
                      {isNewWalkin ? (
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mt-1.5">
                          ⚠️ Unregistered Walk-in
                        </p>
                      ) : (
                        <h4 className="text-xs font-bold text-slate-800 mt-1.5 leading-none">{scannedPatient.name}</h4>
                      )}
                    </div>
                    <button 
                      onClick={resetScanner}
                      className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {isNewWalkin ? (
                    <div className="space-y-3 pt-1">
                      <div className="relative">
                        <input
                          id="walkinNameInput"
                          placeholder=" "
                          value={walkinName}
                          onChange={(e) => setWalkinName(e.target.value)}
                          className="peer w-full h-11 bg-white border border-slate-200 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 transition-all text-xs font-medium placeholder-transparent"
                        />
                        <label
                          htmlFor="walkinNameInput"
                          className="absolute left-3 top-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1 peer-focus:text-[9px]"
                        >
                          Patient Full Name
                        </label>
                      </div>

                      <div className="relative">
                        <input
                          id="walkinContactInput"
                          placeholder=" "
                          value={walkinContact}
                          onChange={(e) => setWalkinContact(e.target.value)}
                          className="peer w-full h-11 bg-white border border-slate-200 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 transition-all text-xs font-medium placeholder-transparent"
                        />
                        <label
                          htmlFor="walkinContactInput"
                          className="absolute left-3 top-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1 peer-focus:text-[9px]"
                        >
                          Contact Number (Optional)
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-200/40">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Visits History</span>
                        <span className="font-semibold text-slate-700">{scannedPatient.visits} visit(s)</span>
                      </div>
                      {scannedPatient.expectedTime && (
                        <div>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Expected Arrival</span>
                          <span className="font-semibold text-slate-700">{scannedPatient.expectedTime}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Assigned Doctor selector */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-1">Assigned Doctor</label>
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-medium focus:bg-white focus:border-teal-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="">Select Doctor...</option>
                    {doctors.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                    <option value="NW">New Patient Desk (NW)</option>
                  </select>
                </div>

                {/* Select Type and Priority triggers */}
                <div className="flex gap-4 items-center justify-between text-xs pt-1 px-1">
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-slate-600">
                      <input
                        type="radio"
                        name="checkinType"
                        checked={checkinType === 'followup'}
                        onChange={() => setCheckinType('followup')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      Follow-up
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-slate-600">
                      <input
                        type="radio"
                        name="checkinType"
                        checked={checkinType === 'new'}
                        onChange={() => setCheckinType('new')}
                        className="text-teal-600 focus:ring-teal-500"
                      />
                      New Case
                    </label>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isPriority}
                      onChange={(e) => setIsPriority(e.target.checked)}
                      className="text-teal-600 rounded-md focus:ring-teal-500"
                    />
                    <Star className={`h-4.5 w-4.5 ${isPriority ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                    Priority
                  </label>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <Button variant="outline" className="flex-1 text-xs py-2 rounded-xl bg-white border-slate-200 text-slate-600" onClick={resetScanner}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="flex-1 text-xs py-2 rounded-xl" onClick={handleConfirmCheckin}>
                    Confirm Check-in
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Card: Doctor availability reference */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Volunteering Doctors</h3>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
              {doctors.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No active doctors loaded today. Import roster or add doctors in Camp Sessions module.
                </div>
              ) : (
                doctors.map((doc, idx) => (
                  <div key={doc.code} className="py-2.5 flex items-center justify-between text-xs group">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="h-7 w-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black font-mono text-[10px] shrink-0 border border-teal-100/50">
                        {doc.code}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-slate-700 truncate leading-none">{doc.name}</p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1.5">
                          Room {idx + 1} • <span className={docStates[doc.code] === 'calling' ? 'text-amber-600 font-bold' : 'text-slate-400'}>{docStates[doc.code] || 'idle'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleMoveDoctor(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 text-slate-400 hover:text-teal-600 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveDoctor(idx, 'down')}
                            disabled={idx === doctors.length - 1}
                            className="p-1 text-slate-400 hover:text-teal-600 disabled:opacity-30 rounded hover:bg-slate-100 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleDoctorFlag(doc.code, 'display', doc.displayHidden)}
                            className={`p-1 rounded hover:bg-slate-100 cursor-pointer ${doc.displayHidden ? 'text-rose-500' : 'text-slate-400 hover:text-teal-600'}`}
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

        </div>

        {/* Right Section: Patient Queue Logs Table (Clinical presentation) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col min-h-[500px]">
          
          {/* Filters controls bar */}
          <div className="border-b border-slate-100 pb-4 mb-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Today's Check-in Log</h3>
              </div>
              
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filter log (name, GK, queue)..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200 py-1.5 text-xs rounded-xl focus:bg-white"
                />
              </div>
            </div>

            {/* Quick dropdown selectors */}
            <div className="flex flex-wrap gap-2.5">
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="all">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
                <option value="NW">New Patient Desk</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="waiting">Waiting</option>
                <option value="called">Called</option>
                <option value="completed">Completed</option>
              </select>

              {(searchQuery || doctorFilter !== 'all' || statusFilter !== 'all') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setSearchQuery(''); setDoctorFilter('all'); setStatusFilter('all'); }}
                  className="text-xs text-teal-700 hover:bg-teal-50 flex items-center gap-1 py-1 px-2.5 rounded-xl border border-teal-100/50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Filters
                </Button>
              )}
            </div>
          </div>

          {/* Table display logs queue */}
          <div className="flex-1 overflow-x-auto">
            {filteredLog.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center py-14 text-slate-400 text-center">
                <Search className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-800">No patient records match the filters</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Scan a patient card barcode or clear active search filter parameters to view today's log.
                </p>
                <Button variant="outline" size="sm" className="mt-4 text-xs py-1.5 px-3 rounded-xl border-slate-200 bg-white" onClick={resetScanner}>
                  Reset Log Filters
                </Button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5">Queue</th>
                    <th className="py-2.5">GK Card</th>
                    <th className="py-2.5">Patient Details</th>
                    <th className="py-2.5">Assigned Doctor</th>
                    <th className="py-2.5 text-center">Physical Folder</th>
                    <th className="py-2.5 text-center">Consultation</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLog.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/50 group">
                      <td className="py-3.5">
                        <span className="font-mono font-black text-slate-800 text-sm">{entry.queue}</span>
                      </td>
                      <td className="py-3.5 font-mono text-[10px] text-teal-700 font-bold">{entry.gk}</td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 leading-none">{entry.name}</span>
                          {entry.priority && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div className="flex gap-2 items-center text-[9px] text-slate-400 font-bold uppercase mt-1">
                          <span className={entry.type === 'new' ? 'text-teal-600 bg-teal-50/60 px-1 rounded' : 'text-slate-400'}>
                            {entry.type === 'new' ? 'New Case' : 'Followup'}
                          </span>
                          {entry.contact && <span>• {entry.contact}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 font-semibold text-slate-600">
                        {entry.doctorName || entry.doctor}
                      </td>
                      
                      {/* Folder status toggler */}
                      <td className="py-3.5 text-center">
                        <button
                          onClick={() => handleCycleFileStatus(entry.id, entry.fileStatus)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase cursor-pointer select-none transition-all ${
                            entry.fileStatus === 'found'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-inner'
                              : entry.fileStatus === 'transit'
                              ? 'bg-blue-50 border-blue-100 text-blue-700'
                              : entry.fileStatus === 'missing'
                              ? 'bg-rose-50 border-rose-100 text-rose-700 shadow-inner'
                              : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-600 hover:border-slate-300'
                          }`}
                          title={`Click to cycle status. Current: ${entry.fileStatus || 'Not Found'}`}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {entry.fileStatus || 'None'}
                        </button>
                      </td>

                      {/* Consultation queue status tag */}
                      <td className="py-3.5 text-center">
                        <button
                          onClick={() => handleCycleStatus(entry.id, entry.status)}
                          className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase cursor-pointer select-none transition-all ${
                            entry.status === 'completed'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : entry.status === 'called'
                              ? 'bg-amber-50 border-amber-100 text-amber-700 font-bold border-dashed animate-pulse'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                          }`}
                          title={`Click to cycle status. Current: ${entry.status}`}
                        >
                          {entry.status}
                        </button>
                      </td>

                      {/* Delete Action button */}
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteEntry(entry.id, entry.name)}
                          className="text-slate-300 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          title="Cancel Check-in"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
