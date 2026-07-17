import * as React from 'react';
import { Barcode, X, UserPlus, Star } from 'lucide-react';
import { DashboardService } from '@/services/dashboard.service';
import type { Patient, Doctor } from '@/services/dashboard.service';
import { Button } from '@/components/ui/Button';

interface PatientScannerProps {
  doctors: Doctor[];
  activeCamp: any;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onCheckinComplete: () => void;
}

export interface PatientScannerRef {
  focus: () => void;
  reset: () => void;
}

export const PatientScanner = React.forwardRef<PatientScannerRef, PatientScannerProps>(
  ({ doctors, activeCamp, onSuccess, onError, onCheckinComplete }, ref) => {
    const [scanInput, setScanInput] = React.useState('');
    const [scannedPatient, setScannedPatient] = React.useState<Patient | null>(null);
    const [isNewWalkin, setIsNewWalkin] = React.useState(false);
    const [walkinName, setWalkinName] = React.useState('');
    const [walkinContact, setWalkinContact] = React.useState('');
    const [selectedDoctor, setSelectedDoctor] = React.useState('');
    const [checkinType, setCheckinType] = React.useState<'new' | 'followup'>('followup');
    const [isPriority, setIsPriority] = React.useState(false);

    const inputRef = React.useRef<HTMLInputElement>(null);

    const resetScanner = React.useCallback(() => {
      setScanInput('');
      setScannedPatient(null);
      setIsNewWalkin(false);
      setWalkinName('');
      setWalkinContact('');
      setSelectedDoctor('');
      setCheckinType('followup');
      setIsPriority(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, []);

    // Expose reset globally if needed by parent
    React.useImperativeHandle(ref, () => ({
      focus: () => {
        if (inputRef.current) inputRef.current.focus();
      },
      reset: resetScanner
    }));

    const handleScanSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
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

    const handleConfirmCheckin = async () => {
      if (!activeCamp) {
        onError('No active camp session! Start a camp session under Camp Sessions first.');
        return;
      }

      const gk = scannedPatient?.gk || '';
      const name = isNewWalkin ? walkinName.trim() : scannedPatient?.name || '';
      const contact = isNewWalkin ? walkinContact.trim() : scannedPatient?.contact || '';

      if (!name) {
        onError('Patient name is required.');
        return;
      }
      if (!selectedDoctor) {
        onError('Please select an assigned doctor.');
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

        onSuccess(`Checked in ${name} successfully!`);
        resetScanner();
        onCheckinComplete();
      } catch (err: any) {
        onError(err.message || 'Check-in request failed.');
      }
    };

    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="bg-teal-500/10 border border-teal-100/50 p-2 rounded-xl text-teal-600">
            <Barcode className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Check-in Scan Area</h3>
        </div>

        {!scannedPatient ? (
          <form onSubmit={handleScanSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                id="barcodeScannerInput"
                placeholder=" "
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className="peer w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-4 pt-4 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all text-sm font-semibold tracking-wider placeholder-transparent shadow-sm"
              />
              <label
                htmlFor="barcodeScannerInput"
                className="absolute left-4 top-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-4 peer-focus:top-2 peer-focus:text-[10px]"
              >
                Scan barcode or type GK/XXXX...
              </label>
            </div>
            <Button type="submit" variant="primary" className="w-full text-sm font-bold py-3 rounded-xl shadow-sm">
              Lookup Card
            </Button>
          </form>
        ) : (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Patient Summary details */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold font-mono text-teal-700 bg-teal-50 border border-teal-100/60 px-2 py-0.5 rounded-md shadow-xs">
                    {scannedPatient.gk}
                  </span>
                  {isNewWalkin ? (
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mt-2 flex items-center gap-1.5">
                      <UserPlus className="h-4 w-4" /> Walk-in Registration
                    </p>
                  ) : (
                    <h4 className="text-sm font-bold text-slate-900 mt-2 leading-none">{scannedPatient.name}</h4>
                  )}
                </div>
                <button 
                  onClick={resetScanner}
                  className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {isNewWalkin ? (
                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <input
                      id="walkinNameInput"
                      placeholder=" "
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      className="peer w-full h-12 bg-white border border-slate-200 rounded-xl px-3 pt-4 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-sm font-semibold placeholder-transparent shadow-sm"
                    />
                    <label
                      htmlFor="walkinNameInput"
                      className="absolute left-3 top-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-[10px]"
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
                      className="peer w-full h-12 bg-white border border-slate-200 rounded-xl px-3 pt-4 text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all text-sm font-semibold placeholder-transparent shadow-sm"
                    />
                    <label
                      htmlFor="walkinContactInput"
                      className="absolute left-3 top-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-focus:top-1.5 peer-focus:text-[10px]"
                    >
                      Contact Number (Optional)
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-slate-200/60 mt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Visits History</span>
                    <span className="font-bold text-slate-700">{scannedPatient.visits} visit(s)</span>
                  </div>
                  {scannedPatient.expectedTime && (
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Expected Arrival</span>
                      <span className="font-bold text-slate-700">{scannedPatient.expectedTime}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Assigned Doctor selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block px-1">Assigned Doctor</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-semibold focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none transition-colors cursor-pointer shadow-sm"
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
            <div className="flex flex-col gap-3 text-sm pt-2 px-1">
              <div className="flex gap-4 p-1">
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-700 hover:text-slate-900">
                  <input
                    type="radio"
                    name="checkinType"
                    checked={checkinType === 'followup'}
                    onChange={() => setCheckinType('followup')}
                    className="text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  Follow-up
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-700 hover:text-slate-900">
                  <input
                    type="radio"
                    name="checkinType"
                    checked={checkinType === 'new'}
                    onChange={() => setCheckinType('new')}
                    className="text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  New Case
                </label>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-slate-700 hover:bg-slate-50 p-2 -ml-2 rounded-xl transition-colors">
                <input
                  type="checkbox"
                  checked={isPriority}
                  onChange={(e) => setIsPriority(e.target.checked)}
                  className="text-teal-600 rounded-md focus:ring-teal-500 h-4 w-4"
                />
                <Star className={`h-5 w-5 ${isPriority ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                Mark as Priority Case
              </label>
            </div>

            <div className="flex gap-3 pt-3">
              <Button variant="outline" className="flex-1 text-sm font-bold py-3 rounded-xl bg-white border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50" onClick={resetScanner}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-[2] text-sm font-bold py-3 rounded-xl shadow-sm bg-teal-600 hover:bg-teal-700" onClick={handleConfirmCheckin}>
                Confirm Check-in
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);
