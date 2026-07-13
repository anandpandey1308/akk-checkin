import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardService } from '@/services/dashboard.service';
import { useToast } from '@/context/ToastContext';
import type { Doctor } from '@/services/dashboard.service';
import { 
  UserPlus, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  UserCheck,
  LayoutGrid
} from 'lucide-react';

export function DoctorManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();

  const [doctors, setDoctors] = React.useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Add doctor form state
  const [newCode, setNewCode] = React.useState('');
  const [newName, setNewName] = React.useState('');

  const fetchDoctors = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await DashboardService.getDoctorsList();
      setDoctors(res.doctors);
    } catch (err: any) {
      toast(err.message || 'Failed to fetch doctors list.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const code = newCode.trim().toUpperCase();
    const name = newName.trim();

    if (!code || !name) {
      toast('Doctor code and name are required.', 'warning');
      return;
    }

    try {
      await DashboardService.addDoctor(code, name);
      toast(`Doctor ${name} (${code}) added successfully.`, 'success');
      setNewCode('');
      setNewName('');
      fetchDoctors();
    } catch (err: any) {
      toast(err.message || 'Failed to register doctor.', 'error');
    }
  };

  const handleToggleVisibility = async (code: string, flag: 'callingHidden' | 'displayHidden', currentVal: boolean) => {
    if (!isAdmin) return;
    try {
      const updateData = flag === 'callingHidden' 
        ? { callingHidden: !currentVal }
        : { displayHidden: !currentVal };
        
      await DashboardService.toggleDoctorHiddenFlags(code, updateData);
      toast(`Doctor ${code} visibility updated.`, 'success');
      fetchDoctors();
    } catch (err: any) {
      toast(err.message || 'Failed to update visibility flags.', 'error');
    }
  };

  const handleMoveDoctor = async (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === doctors.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newDoctors = [...doctors];
    const temp = newDoctors[index];
    newDoctors[index] = newDoctors[targetIndex];
    newDoctors[targetIndex] = temp;

    // Optimistically update UI
    setDoctors(newDoctors);

    try {
      const codes = newDoctors.map((d) => d.code);
      await DashboardService.reorderDoctors(codes);
      toast('Doctor priority sequence updated.', 'success');
      fetchDoctors();
    } catch (err: any) {
      toast(err.message || 'Failed to save reorder priority.', 'error');
      fetchDoctors(); // roll back UI
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Section: Doctor Roster list */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs min-h-[485px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <UserCheck className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Doctor Roster Registry</h3>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-semibold">Loading doctor roster...</p>
                </div>
              ) : doctors.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No doctors registered yet. Use the sidebar panel to add your first doctor.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5">Priority</th>
                        <th className="py-2.5">Code</th>
                        <th className="py-2.5">Doctor Full Name</th>
                        <th className="py-2.5">Calling Screen</th>
                        <th className="py-2.5">TV Board</th>
                        {isAdmin && <th className="py-2.5 text-right">Reorder</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {doctors.map((doc, idx) => (
                        <tr key={doc.code} className="hover:bg-slate-50/50 group transition-colors">
                          <td className="py-3.5 font-bold text-slate-400">#{idx + 1}</td>
                          <td className="py-3.5">
                            <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/50 text-[10.5px]">
                              {doc.code}
                            </span>
                          </td>
                          <td className="py-3.5 font-bold text-slate-850">
                            {doc.name}
                          </td>
                          <td className="py-3.5">
                            <button
                              disabled={!isAdmin}
                              onClick={() => handleToggleVisibility(doc.code, 'callingHidden', !!doc.callingHidden)}
                              className={`flex items-center gap-1.5 font-bold text-[9px] px-2.5 py-0.75 rounded-full border cursor-pointer select-none transition-all uppercase ${
                                doc.callingHidden 
                                  ? 'bg-rose-50 border-rose-100 text-rose-600' 
                                  : 'bg-emerald-50 border-emerald-100 text-emerald-650'
                              }`}
                            >
                              {doc.callingHidden ? (
                                <>
                                  <EyeOff className="h-3 w-3" />
                                  Hidden
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3" />
                                  Visible
                                </>
                              )}
                            </button>
                          </td>
                          <td className="py-3.5">
                            <button
                              disabled={!isAdmin}
                              onClick={() => handleToggleVisibility(doc.code, 'displayHidden', !!doc.displayHidden)}
                              className={`flex items-center gap-1.5 font-bold text-[9px] px-2.5 py-0.75 rounded-full border cursor-pointer select-none transition-all uppercase ${
                                doc.displayHidden 
                                  ? 'bg-rose-50 border-rose-100 text-rose-600' 
                                  : 'bg-emerald-50 border-emerald-100 text-emerald-650'
                              }`}
                            >
                              {doc.displayHidden ? (
                                <>
                                  <EyeOff className="h-3 w-3" />
                                  Hidden
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3" />
                                  Visible
                                </>
                              )}
                            </button>
                          </td>
                          {isAdmin && (
                            <td className="py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  disabled={idx === 0}
                                  onClick={() => handleMoveDoctor(idx, 'up')}
                                  className="text-slate-400 hover:text-teal-600 disabled:opacity-30 disabled:hover:text-slate-400 p-1 hover:bg-slate-100 rounded-lg cursor-pointer bg-transparent border-0 transition-colors"
                                  title="Move Up"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  disabled={idx === doctors.length - 1}
                                  onClick={() => handleMoveDoctor(idx, 'down')}
                                  className="text-slate-400 hover:text-teal-600 disabled:opacity-30 disabled:hover:text-slate-400 p-1 hover:bg-slate-100 rounded-lg cursor-pointer bg-transparent border-0 transition-colors"
                                  title="Move Down"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Add Doctor admin sidebar */}
        {isAdmin && (
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-3">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-xl text-teal-600">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add New Doctor</h3>
              </div>

              <form onSubmit={handleAddDoctor} className="space-y-4 text-xs">
                
                {/* Doctor Room Code */}
                <div className="relative">
                  <input
                    id="manualDoctorCode"
                    placeholder=" "
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="peer w-full h-11 bg-slate-50 border border-slate-205 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent font-mono"
                  />
                  <label
                    htmlFor="manualDoctorCode"
                    className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                  >
                    Doctor Unique Code (e.g. ENT, GYN)
                  </label>
                </div>

                {/* Doctor Full Name */}
                <div className="relative">
                  <input
                    id="manualDoctorName"
                    placeholder=" "
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="peer w-full h-11 bg-slate-50 border border-slate-205 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent"
                  />
                  <label
                    htmlFor="manualDoctorName"
                    className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                  >
                    Doctor Full Name
                  </label>
                </div>

                <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer border-0 transition-colors">
                  Register Room Doctor
                </button>
              </form>
            </div>
            
            {/* Quick Note about Sorting */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200/50 flex gap-3">
              <LayoutGrid className="h-4.5 w-4.5 text-slate-450 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-500 leading-normal font-medium">
                <strong>TV Board Sorting:</strong> The vertical layout priority order configured here directly controls display sequence layout on the Public TV Calling Board.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
