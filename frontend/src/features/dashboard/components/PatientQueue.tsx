import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Search, RotateCcw } from 'lucide-react';
import type { LogEntry, Doctor } from '@/services/dashboard.service';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/Button';

interface PatientQueueProps {
  log: LogEntry[];
  doctors: Doctor[];
  onResetScanner: () => void;
}

export function PatientQueue({ log, doctors, onResetScanner }: PatientQueueProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [doctorFilter, setDoctorFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');

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

  const resetFilters = () => {
    setSearchQuery('');
    setDoctorFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col h-full min-h-[500px]">
      {/* Filters controls bar */}
      <div className="border-b border-slate-100 pb-4 mb-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-teal-500/10 p-2 rounded-xl text-teal-600">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">Today's Check-in Log</h3>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full select-none">
                {filteredLog.length} patient{filteredLog.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Quick dropdown selectors & Search input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all cursor-pointer shadow-sm"
            >
              <option value="all">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.code} value={d.code}>{d.name}</option>
              ))}
              <option value="NW">New Patient Desk</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all cursor-pointer shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="waiting">Waiting</option>
              <option value="called">Called</option>
              <option value="completed">Completed</option>
            </select>

            {(searchQuery || doctorFilter !== 'all' || statusFilter !== 'all') && (
              <button 
                onClick={resetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-50 border border-rose-100/60 transition-all flex items-center gap-1.5 py-2 px-3.5 rounded-xl cursor-pointer font-bold shadow-sm"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>

          <SearchInput
            placeholder="Search name, GK, queue..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full md:w-64"
          />
        </div>
      </div>

      {/* Clinical layout presentation logs cards */}
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[580px] pr-2 custom-scrollbar">
        {filteredLog.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center py-16 text-slate-400 text-center">
            <Search className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-800">No patient records match</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Scan a patient card or clear search filters to view today's log.
            </p>
            <Button variant="outline" size="sm" className="mt-4 text-xs py-1.5 px-3 rounded-xl border-slate-200 bg-white" onClick={onResetScanner}>
              Reset Scanner
            </Button>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredLog.map((entry) => {
              const isCompleted = entry.status === 'completed';
              const isCalled = entry.status === 'called';
              
              return (
                <motion.div 
                  key={entry.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md group ${
                    isCompleted 
                      ? 'bg-slate-50/50 border-slate-200 opacity-75' 
                      : isCalled 
                      ? 'bg-amber-50/30 border-amber-200 shadow-sm' 
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                
                  {/* Left block: Queue Badge + Patient metadata */}
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`px-3 py-1.5 min-w-[5rem] h-10 rounded-xl font-mono font-black text-xs flex items-center justify-center border shrink-0 shadow-sm select-none whitespace-nowrap tracking-wider ${
                      isCompleted 
                        ? 'bg-slate-100 border-slate-200 text-slate-500' 
                        : isCalled 
                        ? 'bg-amber-100 border-amber-300 text-amber-800 animate-pulse' 
                        : 'bg-teal-50 border-teal-200 text-teal-800'
                    }`}>
                      {entry.queue}
                    </span>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                          {entry.gk}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Room {entry.doctor}
                        </span>
                      </div>
                      <h4 className={`font-bold text-sm truncate mt-1 ${isCompleted ? 'text-slate-600' : 'text-slate-900'}`}>
                        {entry.name}
                      </h4>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isCompleted ? (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-slate-200">
                        Completed
                      </span>
                    ) : isCalled ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-amber-200">
                        Consulting
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-teal-100">
                        Waiting
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
  );
}
