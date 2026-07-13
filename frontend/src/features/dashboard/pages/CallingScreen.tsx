import * as React from 'react';
import { DashboardService } from '@/services/dashboard.service';
import type { LogEntry, Doctor, CallQueueEntry } from '@/services/dashboard.service';
import { Alert } from '@/components/ui/Alert';
import { 
  PhoneCall, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Star,
  Activity,
  Play,
  CheckCircle2,
  UserCheck
} from 'lucide-react';

export function CallingScreen() {
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [docStates, setDocStates] = React.useState<Record<string, 'idle' | 'calling' | 'busy' | 'absent'>>({});
  const [callQueue, setCallQueue] = React.useState<CallQueueEntry[]>([]);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Fetch state
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

  // Poll state
  React.useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 4500);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Toggle Doctor Away/On-site Status
  const handleToggleDoctorPresence = async (code: string, currentPresence: 'idle' | 'calling' | 'busy' | 'absent') => {
    try {
      const nextState = currentPresence === 'absent' ? 'idle' : 'absent';
      await DashboardService.updateDoctorState(code, nextState);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update doctor attendance.');
    }
  };

  // Dispatch call
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

  // Start consultation
  const handleStartConsultation = async (docCode: string, callId: number) => {
    try {
      await DashboardService.updateCallStatus(callId, 'sent');
      await DashboardService.updateDoctorState(docCode, 'busy');
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to start consultation.');
    }
  };

  // Complete consultation
  const handleCompleteConsultation = async (docCode: string, callId: number, gkCode: string) => {
    try {
      const matchingLog = log.find((l) => l.gk === gkCode && l.status === 'called');
      
      await DashboardService.updateCallStatus(callId, 'done');
      if (matchingLog) {
        await DashboardService.updateLogStatus(matchingLog.id, { status: 'completed' });
      }
      
      await DashboardService.updateDoctorState(docCode, 'idle');
      setActionSuccess(`Room ${docCode} is now idle.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to complete consultation.');
    }
  };

  const handleClearCalls = async () => {
    if (!window.confirm(`Are you sure you want to clear call entries?`)) return;
    try {
      await DashboardService.clearCallQueue();
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
        
        {/* Left Section: Doctor Consultation Terminals */}
        <div className="xl:col-span-8">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-xl text-teal-600">
                  <PhoneCall className="h-4.5 w-4.5" />
                </div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Room Dispatch Board</h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full select-none">
                    {doctors.filter(d => !d.callingHidden).length} Active Rooms
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200/70 px-2.5 py-1.5 rounded-xl uppercase tracking-wider select-none">
                Live Status
              </span>
            </div>

            {/* List of Room Rows */}
            <div className="divide-y divide-slate-100 flex-1">
              {doctors.filter(d => !d.callingHidden).map((doc, idx) => {
                const roomNo = idx + 1;
                const currentState = docStates[doc.code] || 'idle';
                const nextPatient = getNextPatientForDoctor(doc.code);

                // Find active ringing or busy call for this doctor
                const activeCall = callQueue.find(
                  (c) => c.docCode === doc.code && (c.status === 'ringing' || c.status === 'sent')
                );

                // Style indicators for room presence state
                let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100/80';
                if (currentState === 'calling') badgeColor = 'bg-amber-50 text-amber-700 border-amber-100/80';
                else if (currentState === 'busy') badgeColor = 'bg-teal-50 text-teal-700 border-teal-100';
                else if (currentState === 'absent') badgeColor = 'bg-slate-100 text-slate-450 border-slate-200';

                return (
                  <div 
                    key={doc.code} 
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-slate-50/40 px-3 rounded-xl"
                  >
                    {/* Left Column: Doctor Details & Presence Toggle Switch */}
                    <div className="flex items-center gap-3.5 min-w-[210px] shrink-0">
                      <span className={`h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs border shrink-0 select-none ${badgeColor}`}>
                        R{roomNo}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-800 leading-none truncate">{doc.name}</h4>
                        <div className="flex items-center gap-2 mt-1.5 leading-none">
                          <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">
                            {doc.code}
                          </span>
                          <span className="text-slate-300">•</span>
                          {/* Sleek Presence Toggle Button */}
                          <button
                            onClick={() => handleToggleDoctorPresence(doc.code, currentState)}
                            className={`text-[9px] font-bold uppercase transition-colors cursor-pointer select-none leading-none border-b border-dotted ${
                              currentState === 'absent' 
                                ? 'text-teal-650 hover:text-teal-700 border-teal-300' 
                                : 'text-slate-400 hover:text-slate-600 border-slate-300'
                            }`}
                            title={currentState === 'absent' ? "Click to set Doctor On-site" : "Click to set Doctor Away"}
                          >
                            {currentState === 'absent' ? "Set On-site" : "Set Away"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Middle Column: Current Queue Patient Details */}
                    <div className="flex-1 min-w-0">
                      {currentState === 'absent' ? (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-lg select-none">
                          <VolumeX className="h-3.5 w-3.5" /> Room Closed
                        </span>
                      ) : activeCall ? (
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border select-none ${
                            activeCall.status === 'ringing'
                              ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse'
                              : 'bg-teal-50 border-teal-100 text-teal-800'
                          }`}>
                            {activeCall.status === 'ringing' ? 'Calling' : 'Treating'}
                          </span>
                          <span className="font-mono font-black text-[10px] text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg shadow-3xs leading-none">
                            {activeCall.queue}
                          </span>
                          <span className="font-semibold text-xs text-slate-800 truncate">
                            {activeCall.name}
                          </span>
                          {activeCall.priority && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                      ) : nextPatient ? (
                        <div className="flex items-center gap-2.5">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md select-none">
                            Next
                          </span>
                          <span className="font-mono font-black text-[10px] text-slate-650 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-lg shadow-3xs leading-none">
                            {nextPatient.queue}
                          </span>
                          <span className="font-semibold text-xs text-slate-700 truncate">
                            {nextPatient.name}
                          </span>
                          {nextPatient.priority && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-450 uppercase tracking-wider bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg select-none">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" /> Ready
                        </span>
                      )}
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex items-center gap-3 shrink-0 sm:justify-end">
                      <div className="min-w-[150px] flex justify-end">
                        {currentState === 'absent' ? (
                          <span className="text-[10px] text-slate-400 font-bold uppercase select-none mr-2">Away</span>
                        ) : activeCall ? (
                          activeCall.status === 'ringing' ? (
                            <div className="flex gap-2 w-full">
                              <button
                                onClick={() => handleCallPatient(doc.code, { gk: activeCall.gk, name: activeCall.name, queue: activeCall.queue, priority: activeCall.priority } as any)}
                                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-[10px] py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-3xs"
                              >
                                <Volume2 className="h-3.5 w-3.5 text-slate-450" />
                                Recall
                              </button>
                              <button
                                onClick={() => handleStartConsultation(doc.code, activeCall.id)}
                                className="flex-1 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 font-bold text-[10px] py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-3xs"
                              >
                                <Play className="h-3.5 w-3.5 text-teal-600" />
                                Treat
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCompleteConsultation(doc.code, activeCall.id, activeCall.gk || '')}
                              className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Done
                            </button>
                          )
                        ) : nextPatient ? (
                          <button
                            onClick={() => handleCallPatient(doc.code, nextPatient)}
                            className="w-full bg-white hover:bg-teal-50/40 border border-teal-600 text-teal-750 font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                          >
                            <Volume2 className="h-3.5 w-3.5 text-teal-650" />
                            Call Next
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold select-none mr-2">No Waiting</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Section: TV Dispatch Board */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col min-h-[450px]">
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-xl text-teal-600">
                  <Activity className="h-4.5 w-4.5" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">TV Dispatch Board</h3>
                  {callQueue.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full select-none">
                      {callQueue.filter(c => c.status === 'ringing').length} ringing
                    </span>
                  )}
                </div>
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
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[480px] pr-1">
              {callQueue.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-16 text-slate-405 text-center">
                  <VolumeX className="h-10 w-10 text-slate-350 mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-slate-800">No active tokens dispatched</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Tokens calling rooms will be logged and animated here in real time.
                  </p>
                </div>
              ) : (
                [...callQueue].reverse().map((call) => {
                  const isRinging = call.status === 'ringing';
                  const isSent = call.status === 'sent';

                  return (
                    <div
                      key={call.id}
                      className={`border rounded-2xl p-4 flex items-center justify-between transition-all hover:shadow-xs group ${
                        isRinging
                          ? 'bg-amber-50/20 border-amber-200 shadow-xs'
                          : isSent
                          ? 'bg-teal-50/20 border-teal-100/50 shadow-2xs'
                          : 'bg-slate-50/50 border-slate-200/60'
                      }`}
                    >
                      <div className="overflow-hidden min-w-0 pr-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-black text-[10px] px-2 py-0.5 rounded border leading-none ${
                            isRinging 
                              ? 'bg-amber-50 border-amber-200 text-amber-700' 
                              : isSent
                              ? 'bg-teal-50 border-teal-100 text-teal-800'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}>
                            {call.queue}
                          </span>
                          <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider truncate">
                            Room {call.docCode} • {call.time}
                          </span>
                        </div>
                        <p className="font-bold text-xs text-slate-750 truncate mt-2 leading-none">{call.name}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 select-none">
                        {isRinging ? (
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                            <span className="text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-150 rounded-lg px-2 py-1 uppercase tracking-wider animate-pulse">
                              Ringing
                            </span>
                          </div>
                        ) : isSent ? (
                          <span className="text-[8px] font-bold text-teal-700 bg-teal-50 border border-teal-100/50 rounded-lg px-2 py-1 uppercase tracking-wider">
                            Active
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold text-slate-455 bg-white border border-slate-200 rounded-lg px-2 py-1 uppercase tracking-wider">
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
