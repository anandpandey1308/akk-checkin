import * as React from 'react';
import { DashboardService } from '@/services/dashboard.service';
import type { LogEntry, Doctor, CallQueueEntry } from '@/services/dashboard.service';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { 
  PhoneCall, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Check, 
  Star,
  Activity 
} from 'lucide-react';

export function CallingScreen() {
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [docStates, setDocStates] = React.useState<Record<string, 'idle' | 'calling' | 'busy' | 'absent'>>({});
  const [callQueue, setCallQueue] = React.useState<CallQueueEntry[]>([]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Fetch combined state
  const fetchData = React.useCallback(async () => {
    try {
      const state = await DashboardService.getState();
      setLog(state.log);
      setDoctors(state.doctors);
      setDocStates(state.docStates);
      setCallQueue(state.callQueue);
    } catch (err: any) {
      setActionError(err.message || 'Failed to sync caller screen state.');
    }
  }, []);

  // Poll state every 4.5 seconds
  React.useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 4500);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Update a doctor's active consulting status
  const handleUpdateDoctorState = async (code: string, state: 'idle' | 'calling' | 'busy' | 'absent') => {
    try {
      await DashboardService.updateDoctorState(code, state);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update doctor consulting status.');
    }
  };

  // Dispatch a call command
  const handleCallPatient = async (docCode: string, patient: LogEntry) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      
      await DashboardService.dispatchCall({
        id: Date.now(),
        docCode,
        name: patient.name,
        gk: patient.gk,
        queue: patient.queue,
        time: timeStr,
        status: 'ringing',
        priority: patient.priority,
      });

      await DashboardService.updateLogStatus(patient.id, { status: 'called' });
      await DashboardService.updateDoctorState(docCode, 'calling');

      setActionSuccess(`Calling token ${patient.queue} (${patient.name}) to Room!`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Call request failed.');
    }
  };

  const handleMarkCallDone = async (id: number, logId?: number) => {
    try {
      await DashboardService.updateCallStatus(id, 'done');
      if (logId) {
        await DashboardService.updateLogStatus(logId, { status: 'completed' });
      }
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to clear token.');
    }
  };

  const handleClearCalls = async (status?: string) => {
    if (!window.confirm(`Are you sure you want to clear call entries?`)) return;
    try {
      await DashboardService.clearCallQueue(status);
      setActionSuccess('Cleared dispatch log.');
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to clear logs.');
    }
  };

  const getNextPatientForDoctor = (docCode: string) => {
    const docWaitingList = log.filter(
      (entry) => entry.doctor === docCode && entry.status === 'waiting'
    );
    if (docWaitingList.length === 0) return null;

    return docWaitingList.sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return a.id - b.id;
    })[0];
  };

  return (
    <div className="space-y-6">
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success" onClose={() => setActionSuccess(null)}>{actionSuccess}</Alert>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Section: Doctor Consultation Room Controllers */}
        <div className="xl:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <PhoneCall className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Room Call Dispatcher</h3>
              </div>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Volunteering Roster
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.filter(d => !d.callingHidden).map((doc, idx) => {
                const roomNo = idx + 1;
                const nextPatient = getNextPatientForDoctor(doc.code);
                const currentState = docStates[doc.code] || 'idle';

                return (
                  <div 
                    key={doc.code} 
                    className="border border-slate-200/80 bg-white rounded-2xl p-4.5 space-y-4 flex flex-col justify-between shadow-xs"
                  >
                    {/* Header: Doctor Details & Room */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 leading-none">{doc.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
                          Room {roomNo} ({doc.code})
                        </p>
                      </div>
                      
                      {/* Active Status Badge select */}
                      <select
                        value={currentState}
                        onChange={(e) => handleUpdateDoctorState(doc.code, e.target.value as any)}
                        className={`text-[9px] font-bold uppercase border rounded-full px-2.5 py-1 focus:outline-none transition-colors cursor-pointer ${
                          currentState === 'calling'
                            ? 'bg-amber-50 border-amber-100 text-amber-700 font-black animate-pulse'
                            : currentState === 'busy'
                            ? 'bg-rose-50 border-rose-100 text-rose-700'
                            : currentState === 'absent'
                            ? 'bg-slate-200 border-slate-300 text-slate-500'
                            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        }`}
                      >
                        <option value="idle">Idle</option>
                        <option value="calling">Calling</option>
                        <option value="busy">Busy</option>
                        <option value="absent">Absent</option>
                      </select>
                    </div>

                    {/* Body: Next Waiting Patient info */}
                    <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 flex-1 flex flex-col justify-center">
                      {nextPatient ? (
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Next Patient</span>
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-mono font-black text-slate-800 text-base leading-none">
                                {nextPatient.queue}
                              </span>
                              <span className="text-[10px] text-teal-700 font-bold font-mono ml-2">
                                {nextPatient.gk}
                              </span>
                              <p className="font-bold text-xs text-slate-700 mt-1.5 leading-none">{nextPatient.name}</p>
                            </div>
                            {nextPatient.priority && (
                              <Badge variant="warning" className="text-[8px] font-bold uppercase py-0.5 px-1.5 rounded flex items-center gap-0.5 border border-amber-200 bg-amber-50 text-amber-700">
                                <Star className="h-2.5 w-2.5 fill-current" /> Priority
                              </Badge>
                            )}
                          </div>

                          <Button
                            variant="primary"
                            className="w-full text-xs py-2 rounded-xl mt-2 flex items-center justify-center gap-1.5"
                            onClick={() => handleCallPatient(doc.code, nextPatient)}
                            disabled={currentState === 'absent'}
                          >
                            <Volume2 className="h-4 w-4" />
                            Call Patient Now
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <p className="text-xs font-bold text-slate-400">Queue Empty</p>
                          <p className="text-[9px] text-slate-400 mt-1">No patients waiting for this Room.</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Section: Today's Dispatch Log */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col min-h-[450px]">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">TV Dispatch Board</h3>
              </div>
              
              {callQueue.length > 0 && (
                <button
                  onClick={() => handleClearCalls()}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-200/40 bg-white"
                  title="Clear Dispatch Log"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Active Display Calling Queue items list */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] pr-1">
              {callQueue.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-12 text-slate-400 text-center">
                  <VolumeX className="h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-800">No active tokens dispatched</p>
                  <p className="text-[9px] text-slate-400 mt-1">Tokens calling rooms will be logged here</p>
                </div>
              ) : (
                [...callQueue].reverse().map((call) => {
                  const matchingLog = log.find((l) => l.gk === call.gk && l.status === 'called');
                  const isRinging = call.status === 'ringing';

                  return (
                    <div
                      key={call.id}
                      className={`border rounded-xl p-3 flex items-center justify-between transition-all ${
                        isRinging
                          ? 'bg-amber-50/70 border-amber-200 shadow-xs animate-pulse'
                          : 'bg-slate-50/50 border-slate-100'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-slate-800 text-sm leading-none">
                            {call.queue}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 font-mono">
                            Room {call.docCode} • {call.time}
                          </span>
                        </div>
                        <p className="font-bold text-xs text-slate-700 truncate mt-1.5">{call.name}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isRinging ? (
                          <button
                            onClick={() => handleMarkCallDone(call.id, matchingLog?.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors cursor-pointer shadow-xs border-0"
                            title="Complete Consultation"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2 py-0.5 uppercase">
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
