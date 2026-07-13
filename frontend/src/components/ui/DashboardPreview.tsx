import { Users, Clock, ClipboardList, Stethoscope, Pill, Microscope, ShieldCheck } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';

export function DashboardPreview() {
  const modules = [
    { name: 'Patient Registration', icon: <ClipboardList className="h-4 w-4 text-teal-600" />, status: 'Active', desc: 'Vitals & ID generation' },
    { name: 'Consultation Queue', icon: <Stethoscope className="h-4 w-4 text-teal-600" />, status: 'Active', desc: 'Auto-routing to rooms' },
    { name: 'Pharmacy Tracking', icon: <Pill className="h-4 w-4 text-teal-600" />, status: 'Active', desc: 'Medicine inventory checks' },
    { name: 'Lab Diagnostic Tests', icon: <Microscope className="h-4 w-4 text-teal-600" />, status: 'Active', desc: 'Instant local reporting' },
  ];

  return (
    <div className="w-full space-y-4 text-left select-none">
      {/* Live Operations Header */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
          </span>
          <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">
            Today's Camp Modules
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          Camp ID: Camp #42
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column - Modules Checklist (7 cols) */}
        <div className="lg:col-span-7 space-y-2">
          {modules.map((mod, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 bg-white border border-slate-200/60 rounded-xl shadow-[0_2px_8px_rgba(15,23,42,0.01)] hover:border-teal-500/30 transition-colors duration-200"
            >
              <div className="flex items-center gap-2.5">
                <div className="bg-teal-50 border border-teal-100/60 p-1.5 rounded-lg text-teal-600">
                  {mod.icon}
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-slate-800 leading-none">{mod.name}</h5>
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">{mod.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success" className="text-[8px] font-bold bg-emerald-50 text-emerald-700 border-emerald-100 px-1.5 py-0">
                  {mod.status}
                </Badge>
                <div className="h-4 w-4 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="h-2.5 w-2.5 stroke-[2.5]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - Stats Summary (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-2.5">
          {/* Patients Registered */}
          <Card className="py-2 px-3 border-slate-200/60 shadow-[0_4px_15px_-4px_rgba(15,23,42,0.03)] rounded-xl flex items-center justify-between">
            <div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Registered</span>
              <h4 className="text-lg font-black text-slate-800 leading-none mt-0.5">148</h4>
            </div>
            <Users className="h-5 w-5 text-teal-600 opacity-60" />
          </Card>

          {/* Consultation Queue */}
          <Card className="py-2 px-3 border-slate-200/60 shadow-[0_4px_15px_-4px_rgba(15,23,42,0.03)] rounded-xl flex items-center justify-between">
            <div>
              <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">In Queue</span>
              <h4 className="text-lg font-black text-slate-800 leading-none mt-0.5">12</h4>
            </div>
            <Clock className="h-5 w-5 text-amber-500 opacity-60" />
          </Card>

          {/* Active Call Queue Display */}
          <Card className="py-2 px-3 border-slate-200/60 shadow-[0_8px_25px_-8px_rgba(15,23,42,0.05)] rounded-xl bg-teal-50/20 border-teal-100/40">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Live Calling</span>
              <Badge variant="success" className="text-[8px] animate-pulse">Counter 1</Badge>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold text-slate-500">Token</span>
              <span className="text-xl font-black text-teal-700 tracking-tight">A102</span>
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">
              Dr. Anand Sharma &bull; Room 1
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
