import * as React from 'react';
import { DashboardService } from '@/services/dashboard.service';
import type { LogEntry, Doctor, CallQueueEntry } from '@/services/dashboard.service';
import { toast } from 'sonner';
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
import { motion, AnimatePresence } from 'framer-motion';

// Dual-tone synthesizer bell chime (Web Audio API)
function playBellChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Ding (C5) and Dong (G4) chime sound effect
    playTone(523.25, ctx.currentTime, 0.8);
    playTone(392.00, ctx.currentTime + 0.3, 1.2);
  } catch (e) {
    console.error('Failed to play bell chime:', e);
  }
}

// Text-to-speech announcement (SpeechSynthesis API)
function speakText(text: string, voiceName?: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85; // slightly slower for crowded camps
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    if (voiceName) {
      const selected = voices.find(v => v.name === voiceName);
      if (selected) {
        utterance.voice = selected;
      }
    } else {
      const cleanLang = (lang: string) => lang.toLowerCase().replace('_', '-');
      const preferredVoice = 
        voices.find(v => cleanLang(v.lang).includes('en-in')) ||
        voices.find(v => cleanLang(v.lang).includes('hi-in')) ||
        voices.find(v => cleanLang(v.lang).includes('en-us')) ||
        voices[0];
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Speech synthesis failed:', e);
  }
}

export function CallingScreen() {
  const [log, setLog] = React.useState<LogEntry[]>([]);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [docStates, setDocStates] = React.useState<Record<string, 'idle' | 'calling' | 'busy' | 'absent'>>({});
  const [callQueue, setCallQueue] = React.useState<CallQueueEntry[]>([]);

  // Audio & Notification states
  const [isMuted, setIsMuted] = React.useState(false);
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = React.useState<string>('');
  const previousCallQueueRef = React.useRef<CallQueueEntry[]>([]);

  // Trigger audio announcement for any new ringing patient call
  React.useEffect(() => {
    if (isMuted) {
      previousCallQueueRef.current = callQueue;
      return;
    }

    const prevRingingIds = new Set(
      previousCallQueueRef.current
        .filter(c => c.status === 'ringing')
        .map(c => c.id)
    );

    const newRingingCalls = callQueue.filter(
      c => c.status === 'ringing' && !prevRingingIds.has(c.id)
    );

    if (newRingingCalls.length > 0) {
      newRingingCalls.forEach(call => {
        playBellChime();
        setTimeout(() => {
          const docIndex = doctors.findIndex(d => d.code === call.docCode);
          const roomLabel = docIndex !== -1 ? `Room ${docIndex + 1}` : `Room ${call.docCode}`;
          const tokenSpoken = (call.queue || '').replace(/([A-Za-z])/g, '$1 ').replace(/([0-9])/g, ' $1').trim();
          const text = `Token ${tokenSpoken}. ${call.name}. Please proceed to ${roomLabel}.`;
          speakText(text, selectedVoiceName);
        }, 650);
      });
    }

    previousCallQueueRef.current = callQueue;
  }, [callQueue, isMuted, doctors, selectedVoiceName]);

  // Voice engine list initialization
  React.useEffect(() => {
    const updateVoices = () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const allVoices = window.speechSynthesis.getVoices();
      
      const relevantVoices = allVoices.filter(v => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        return lang.startsWith('en') || lang.startsWith('hi');
      });
      setVoices(relevantVoices);

      if (relevantVoices.length > 0) {
        const defaultVoice = 
          relevantVoices.find(v => v.lang.toLowerCase().replace('_', '-').includes('en-in')) ||
          relevantVoices.find(v => v.lang.toLowerCase().replace('_', '-').includes('hi-in')) ||
          relevantVoices.find(v => v.lang.toLowerCase().replace('_', '-').includes('en-us')) ||
          relevantVoices[0];
        
        setSelectedVoiceName(prev => prev || defaultVoice.name);
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Fetch state
  const fetchData = React.useCallback(async () => {
    try {
      const state = await DashboardService.getState();
      setLog(state.log);
      setDoctors(state.doctors);
      setDocStates(state.docStates);
      setCallQueue(state.callQueue);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync caller screen state.');
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
      toast.error(err.message || 'Failed to update doctor attendance.');
    }
  };

  // Dispatch call
  const handleCallPatient = async (docCode: string, patient: LogEntry) => {
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

      toast.success(`Calling token ${patient.queue} (${patient.name}) to Room!`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Call request failed.');
    }
  };

  // Start consultation
  const handleStartConsultation = async (docCode: string, callId: number) => {
    try {
      await DashboardService.updateCallStatus(callId, 'sent');
      await DashboardService.updateDoctorState(docCode, 'busy');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start consultation.');
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
      toast.success(`Room ${docCode} is now idle.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete consultation.');
    }
  };

  const handleClearCalls = async () => {
    if (!window.confirm(`Are you sure you want to clear call entries?`)) return;
    try {
      await DashboardService.clearCallQueue();
      toast.success('Cleared dispatch log.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear logs.');
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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Section: Doctor Consultation Terminals */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-teal-500/10 p-2.5 rounded-xl text-teal-600">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Room Dispatch Board</h3>
                <p className="text-xs text-slate-500 font-medium">{doctors.filter(d => !d.callingHidden).length} Active Rooms Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Live Sync</span>
            </div>
          </div>

          <div className="grid gap-3">
            {doctors.filter(d => !d.callingHidden).map((doc, idx) => {
              const roomNo = idx + 1;
              const currentState = docStates[doc.code] || 'idle';
              const nextPatient = getNextPatientForDoctor(doc.code);

              // Find active ringing or busy call for this doctor
              const activeCall = callQueue.find(
                (c) => c.docCode === doc.code && (c.status === 'ringing' || c.status === 'sent')
              );

              // Style indicators for room presence state (Premium Apple-like pills)
              let badgeStyle = 'bg-white border-slate-200 text-slate-700';
              if (currentState === 'calling') badgeStyle = 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm';
              else if (currentState === 'busy') badgeStyle = 'bg-teal-50 border-teal-200 text-teal-800 shadow-sm';
              else if (currentState === 'absent') badgeStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-70';

              return (
                <div
                  key={doc.code}
                  className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all duration-300 hover:shadow-md ${badgeStyle}`}
                >
                  {/* Doctor Info */}
                  <div className="flex items-center gap-4 min-w-[220px] shrink-0">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm border shrink-0 select-none shadow-sm ${
                      currentState === 'calling' ? 'bg-amber-500 text-white border-amber-600' :
                      currentState === 'busy' ? 'bg-teal-500 text-white border-teal-600' :
                      currentState === 'absent' ? 'bg-slate-200 text-slate-500 border-slate-300' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      R{roomNo}
                    </div>
                    <div className="min-w-0">
                      <h4 className={`font-bold text-sm leading-tight truncate ${currentState === 'absent' ? 'text-slate-500' : 'text-slate-900'}`}>{doc.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                          {doc.code}
                        </span>
                        {/* Presence Toggle */}
                        <button
                          onClick={() => handleToggleDoctorPresence(doc.code, currentState)}
                          className={`text-[10px] font-bold uppercase transition-colors cursor-pointer select-none border-b border-dotted ${
                            currentState === 'absent'
                              ? 'text-teal-600 hover:text-teal-700 border-teal-300'
                              : 'text-slate-500 hover:text-slate-700 border-slate-300'
                            }`}
                        >
                          {currentState === 'absent' ? "Set On-site" : "Set Away"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Patient Queue Detail */}
                  <div className="flex-1 min-w-0 border-l border-slate-200/60 pl-5 py-1">
                    {currentState === 'absent' ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <VolumeX className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Room Closed</span>
                      </div>
                    ) : activeCall ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border select-none ${
                            activeCall.status === 'ringing'
                              ? 'bg-amber-100 border-amber-300 text-amber-800 animate-pulse'
                              : 'bg-teal-100 border-teal-300 text-teal-800'
                            }`}>
                            {activeCall.status === 'ringing' ? 'Calling Now' : 'Consulting'}
                          </span>
                          <span className="font-mono font-black text-xs text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-sm">
                            {activeCall.queue}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold text-sm text-slate-900 truncate">{activeCall.name}</span>
                          {activeCall.priority && <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />}
                        </div>
                      </div>
                    ) : nextPatient ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-0.5 rounded select-none">
                            Next Up
                          </span>
                          <span className="font-mono font-bold text-xs text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-sm">
                            {nextPatient.queue}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-sm text-slate-700 truncate">{nextPatient.name}</span>
                          {nextPatient.priority && <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400">
                        <UserCheck className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Ready for Patients</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Block */}
                  <div className="flex items-center gap-3 shrink-0 sm:justify-end border-l border-slate-200/60 pl-5">
                    <div className="w-[180px] flex justify-end">
                      {currentState === 'absent' ? (
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Unavailable</span>
                      ) : activeCall ? (
                        activeCall.status === 'ringing' ? (
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={() => {
                                const matchingLog = log.find((l) => l.gk === activeCall.gk && l.status === 'called');
                                handleCallPatient(doc.code, {
                                  id: matchingLog?.id,
                                  gk: activeCall.gk,
                                  name: activeCall.name,
                                  queue: activeCall.queue,
                                  priority: activeCall.priority
                                } as any);
                              }}
                              className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-[11px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                            >
                              <Volume2 className="h-4 w-4" /> Recall
                            </button>
                            <button
                              onClick={() => handleStartConsultation(doc.code, activeCall.id)}
                              className="flex-1 bg-teal-600 hover:bg-teal-700 border border-teal-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                            >
                              <Play className="h-4 w-4" /> Treat
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCompleteConsultation(doc.code, activeCall.id, activeCall.gk || '')}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-bold text-[11px] py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Complete Consultation
                          </button>
                        )
                      ) : nextPatient ? (
                        <button
                          onClick={() => handleCallPatient(doc.code, nextPatient)}
                          className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-900 text-white font-bold text-[11px] py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        >
                          <Volume2 className="h-4 w-4 text-teal-400" /> Call Next Patient
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Queue Empty</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Section: TV Dispatch Board */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col min-h-[500px] sticky top-24">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">TV Display</h3>
                  <p className="text-xs text-slate-500 font-medium">Public Dispatch</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer border shadow-sm ${
                    isMuted
                      ? 'text-rose-600 bg-rose-50 border-rose-200'
                      : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                  title={isMuted ? "Unmute voice calls" : "Mute voice calls"}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>

                {callQueue.length > 0 && (
                  <button
                    onClick={() => handleClearCalls()}
                    className="p-2 rounded-xl text-slate-600 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer shadow-sm"
                    title="Clear Log"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Voice select dropdown (sleek) */}
            {voices.length > 0 && !isMuted && (
              <div className="mb-4">
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer shadow-sm"
                >
                  {voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Active Display Calling Queue items list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {callQueue.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-20 text-slate-400 text-center">
                  <VolumeX className="h-12 w-12 text-slate-200 mb-4" />
                  <p className="text-sm font-bold text-slate-700">No active dispatches</p>
                  <p className="text-xs text-slate-500 mt-2 max-w-[200px] leading-relaxed">
                    Tokens will appear here when doctors call patients.
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {[...callQueue].reverse().map((call) => {
                    const isRinging = call.status === 'ringing';
                    const isSent = call.status === 'sent';

                    return (
                      <motion.div
                        key={call.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`rounded-2xl p-4 flex items-center justify-between transition-all border ${
                          isRinging
                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-md ring-1 ring-amber-500/20'
                            : isSent
                              ? 'bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200 shadow-sm'
                              : 'bg-white border-slate-200 shadow-sm opacity-60'
                        }`}
                      >
                        <div className="overflow-hidden min-w-0 flex-1">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <span className={`font-mono font-black text-xs px-2.5 py-0.5 rounded-md border shadow-sm leading-none ${
                              isRinging
                                ? 'bg-white border-amber-300 text-amber-800'
                                : isSent
                                  ? 'bg-white border-teal-300 text-teal-800'
                                  : 'bg-slate-100 border-slate-200 text-slate-500'
                            }`}>
                              {call.queue}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                              Room {call.docCode}
                            </span>
                          </div>
                          <p className={`font-bold text-sm truncate ${isRinging ? 'text-slate-900' : 'text-slate-700'}`}>
                            {call.name}
                          </p>
                        </div>

                        <div className="flex items-center shrink-0 ml-3">
                          {isRinging ? (
                            <div className="flex items-center gap-2">
                              <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                              </span>
                              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                                Ringing
                              </span>
                            </div>
                          ) : isSent ? (
                            <span className="text-[10px] font-bold text-teal-700 bg-teal-500/10 px-2 py-1 rounded-lg uppercase tracking-widest border border-teal-500/20">
                              Inside
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Done
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
