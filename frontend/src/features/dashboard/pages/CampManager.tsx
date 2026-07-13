import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardService } from '@/services/dashboard.service';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import type { Camp } from '@/services/dashboard.service';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  UserPlus, 
  Copy, 
  ExternalLink, 
  FileSpreadsheet 
} from 'lucide-react';

export function CampManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Camps state
  const [camps, setCamps] = React.useState<Camp[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // New Camp Form
  const [newCampNo, setNewCampNo] = React.useState('');
  const [newCampDate, setNewCampDate] = React.useState('');

  // Manual Doctor form
  const [doctorName, setDoctorName] = React.useState('');
  const [doctorCode, setDoctorCode] = React.useState('');
  const [doctorRosterCampNo, setDoctorRosterCampNo] = React.useState('');

  // Excel Doctor list uploader
  const [doctorExcelFile, setDoctorExcelFile] = React.useState<File | null>(null);
  const [uploaderCampNo, setUploaderCampNo] = React.useState('');
  const [isUploadingRoster, setIsUploadingRoster] = React.useState(false);

  // Notifications
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Load camps data
  const fetchCamps = React.useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await DashboardService.getCampsList();
      setCamps(res.camps);
      
      const active = res.camps.find((c) => c.active === 1);
      if (active) {
        setUploaderCampNo(String(active.camp_no));
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch camp session records.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCamps();
  }, [fetchCamps]);

  // Create new session camp
  const handleCreateCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    if (!isAdmin) return;

    const no = parseInt(newCampNo.trim());
    if (isNaN(no) || no <= 0) {
      setActionError('Please specify a positive camp sequence index.');
      return;
    }

    try {
      await DashboardService.createCamp(no, newCampDate || undefined);

      setActionSuccess(`Camp session #${no} registered successfully.`);
      setNewCampNo('');
      setNewCampDate('');
      fetchCamps();
    } catch (err: any) {
      setActionError(err.message || 'Session creation request failed.');
    }
  };

  // Set active camp session on server
  const handleActivateCamp = async (campNo: number) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await DashboardService.activateCampSession(campNo);
      setActionSuccess(`Camp #${campNo} is now the active camp session!`);
      localStorage.setItem('akk_active_camp_no', String(campNo));
      fetchCamps();
    } catch (err: any) {
      setActionError(err.message || 'Failed to activate camp session.');
    }
  };

  // Export camp check-in logs to Excel
  const handleExportCamp = async (campNo: number) => {
    setActionError(null);
    try {
      window.open(`/api/camps/${campNo}/export`, '_blank');
      setActionSuccess(`Export triggered for Camp #${campNo}. Please check your downloads folder.`);
    } catch (err: any) {
      setActionError(err.message || 'Excel export request failed.');
    }
  };

  // Delete camp permanently
  const handleDeleteCamp = async (campNo: number) => {
    if (!isAdmin) return;
    if (!window.confirm(`Permanently delete Camp #${campNo} and all associated queues logs? This cannot be undone!`)) return;

    setActionError(null);
    setActionSuccess(null);
    try {
      await DashboardService.deleteCamp(campNo);
      setActionSuccess(`Camp #${campNo} deleted successfully.`);
      fetchCamps();
    } catch (err: any) {
      setActionError(err.message || 'Delete operation failed.');
    }
  };

  // Add Manual Doctor
  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    if (!isAdmin) return;

    const code = doctorCode.trim().toUpperCase();
    const name = doctorName.trim();
    const cNo = parseInt(doctorRosterCampNo.trim());

    if (!code || !name) {
      setActionError('Doctor Code and Full Name are required.');
      return;
    }
    if (isNaN(cNo) || cNo <= 0) {
      setActionError('Please specify a valid camp number.');
      return;
    }

    try {
      await DashboardService.addDoctor(code, name);

      setActionSuccess(`Doctor ${name} (${code}) added to Camp #${cNo}.`);
      setDoctorCode('');
      setDoctorName('');
      setDoctorRosterCampNo('');
      fetchCamps();
    } catch (err: any) {
      setActionError(err.message || 'Doctor setup request failed.');
    }
  };

  // Excel Upload doctor roster lists
  const handleDoctorExcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    if (!doctorExcelFile) {
      setActionError('Please select an Excel file containing doctors roster.');
      return;
    }

    const cNo = parseInt(uploaderCampNo.trim());
    if (isNaN(cNo) || cNo <= 0) {
      setActionError('Please specify a target camp session number.');
      return;
    }

    setIsUploadingRoster(true);
    try {
      const res = await DashboardService.importDoctorsExcel(cNo, doctorExcelFile);
      setActionSuccess(`Roster uploaded! Configured ${res.imported} doctors (skipped ${res.skipped}) for Camp #${cNo}.`);
      setDoctorExcelFile(null);
      const fileEl = document.getElementById('doctorExcelInput') as HTMLInputElement;
      if (fileEl) fileEl.value = '';
    } catch (err: any) {
      setActionError(err.message || 'Doctor excel import failed.');
    } finally {
      setIsUploadingRoster(false);
    }
  };

  // Copy TV calling board token link to clipboard
  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/display/${token}`;
    navigator.clipboard.writeText(link);
    setActionSuccess('TV Display link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success" onClose={() => setActionSuccess(null)}>{actionSuccess}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Section: Active Camps log registry */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs min-h-[485px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Camps Registry</h3>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-semibold">Loading camp logs...</p>
                </div>
              ) : camps.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No camp sessions registered yet. Use the sidebar panel to add the first camp.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5">Camp No</th>
                        <th className="py-2.5">Scheduled Date</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5">TV Board Token</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {camps.map((camp) => (
                        <tr key={camp.camp_no} className="hover:bg-slate-50/50 group">
                          <td className="py-3.5 font-bold text-slate-800">Camp #{camp.camp_no}</td>
                          <td className="py-3.5 text-slate-500 font-medium">
                            {camp.camp_date || 'No scheduled date'}
                          </td>
                          <td className="py-3.5">
                            {camp.active === 1 ? (
                              <Badge variant="success" className="text-[9px] font-bold uppercase py-0.5 px-2 rounded-full border border-emerald-250 bg-emerald-50 text-emerald-700">
                                Active Session
                              </Badge>
                            ) : (
                              isAdmin && (
                                <button
                                  onClick={() => handleActivateCamp(camp.camp_no)}
                                  className="text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-100 hover:bg-teal-100 rounded-full px-2.5 py-0.5 uppercase cursor-pointer"
                                >
                                  Activate
                                </button>
                              )
                            )}
                          </td>
                          
                          {/* Display board token copy link */}
                          <td className="py-3.5">
                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                              <span className="font-mono text-[10px] text-slate-400 truncate max-w-[100px]" title={camp.public_token}>
                                {camp.public_token}
                              </span>
                              <button
                                onClick={() => handleCopyLink(camp.public_token)}
                                className="text-slate-400 hover:text-teal-600 p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
                                title="Copy TV Link"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <a
                                href={`/display/${camp.public_token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-teal-600 p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
                                title="Open TV Display Screen"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </td>

                          {/* Export / Delete actions */}
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-85 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleExportCamp(camp.camp_no)}
                                className="text-slate-400 hover:text-teal-600 p-1.5 hover:bg-teal-55 rounded-lg cursor-pointer bg-transparent border-0"
                                title="Export Excel data"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteCamp(camp.camp_no)}
                                  className="text-slate-300 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer bg-transparent border-0"
                                  title="Delete Permanent"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Camp session coordinators setup drawers */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Form: Create new camp session */}
          {isAdmin && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <Plus className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">New Camp Session</h3>
              </div>

              <form onSubmit={handleCreateCamp} className="space-y-4 text-xs">
                
                {/* Camp Sequence Index */}
                <div className="relative">
                  <input
                    id="newCampNoInput"
                    placeholder=" "
                    value={newCampNo}
                    onChange={(e) => setNewCampNo(e.target.value)}
                    className="peer w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent"
                  />
                  <label
                    htmlFor="newCampNoInput"
                    className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                  >
                    Camp Number Index (e.g. 148)
                  </label>
                </div>

                {/* Date Input Selector */}
                <div className="relative">
                  <input
                    id="newCampDateInput"
                    type="date"
                    placeholder=" "
                    value={newCampDate}
                    onChange={(e) => setNewCampDate(e.target.value)}
                    className="peer w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 pt-3.5 text-slate-850 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent"
                  />
                  <label
                    htmlFor="newCampDateInput"
                    className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                  >
                    Scheduled Date
                  </label>
                </div>

                <Button type="submit" variant="primary" className="w-full text-xs py-2 rounded-xl">
                  Create Camp Session
                </Button>
              </form>
            </div>
          )}

          {/* Form: Excel Doctors Roster Import */}
          {isAdmin && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <FileSpreadsheet className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Excel Doctors Roster</h3>
              </div>

              <form onSubmit={handleDoctorExcelSubmit} className="space-y-4 text-xs">
                
                {/* Target Camp Session ID */}
                <div className="relative">
                  <input
                    id="rosterCampNoInput"
                    placeholder=" "
                    value={uploaderCampNo}
                    onChange={(e) => setUploaderCampNo(e.target.value)}
                    className="peer w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent"
                  />
                  <label
                    htmlFor="rosterCampNoInput"
                    className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                  >
                    Target Camp Session
                  </label>
                </div>

                {/* File input container dropzone */}
                <div className="border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-xl p-4 flex flex-col justify-center items-center text-center cursor-pointer transition-colors bg-slate-50/50">
                  <Upload className="h-5 w-5 text-slate-400 mb-2" />
                  <input
                    id="doctorExcelInput"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setDoctorExcelFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="doctorExcelInput" className="text-[10px] font-bold text-teal-700 uppercase tracking-wider cursor-pointer hover:underline">
                    {doctorExcelFile ? doctorExcelFile.name : 'Select Doctors Spreadsheet'}
                  </label>
                  <p className="text-[9px] text-slate-400 mt-1">Supports roster template (.xlsx)</p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                  isLoading={isUploadingRoster}
                  disabled={!doctorExcelFile}
                >
                  <Upload className="h-4 w-4" />
                  Upload Doctors Roster
                </Button>
              </form>
            </div>
          )}

          {/* Form: Manual Doctor additions */}
          {isAdmin && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Manual Doctor addition</h3>
              </div>

              <form onSubmit={handleAddDoctorSubmit} className="space-y-4 text-xs">
                
                {/* Doctor Room Code */}
                <div className="relative">
                  <input
                    id="manualDoctorCode"
                    placeholder=" "
                    value={doctorCode}
                    onChange={(e) => setDoctorCode(e.target.value)}
                    className="peer w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent font-mono"
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
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="peer w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent"
                  />
                  <label
                    htmlFor="manualDoctorName"
                    className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                  >
                    Doctor Full Name
                  </label>
                </div>

                {/* Camp Session Number */}
                <div className="relative">
                  <input
                    id="manualDoctorCampNo"
                    placeholder=" "
                    value={doctorRosterCampNo}
                    onChange={(e) => setDoctorRosterCampNo(e.target.value)}
                    className="peer w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent"
                  />
                  <label
                    htmlFor="manualDoctorCampNo"
                    className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                  >
                    Camp Session Number
                  </label>
                </div>

                <Button type="submit" variant="primary" className="w-full text-xs py-2 rounded-xl">
                  Register Room Doctor
                </Button>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
