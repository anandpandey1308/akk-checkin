import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardService } from '@/services/dashboard.service';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { useToast } from '@/context/ToastContext';
import type { Camp } from '@/services/dashboard.service';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Copy, 
  ExternalLink, 
  FileSpreadsheet 
} from 'lucide-react';

export function CampManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast } = useToast();

  // Camps state
  const [camps, setCamps] = React.useState<Camp[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Confirmation Modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [campToDelete, setCampToDelete] = React.useState<number | null>(null);

  // Active Admin Hub Tab
  const [activeTab, setActiveTab] = React.useState<'camp' | 'excel'>('camp');

  // New Camp Form
  const [newCampNo, setNewCampNo] = React.useState('');
  const [newCampDate, setNewCampDate] = React.useState('');

  // Excel Doctor list uploader
  const [doctorExcelFile, setDoctorExcelFile] = React.useState<File | null>(null);
  const [uploaderCampNo, setUploaderCampNo] = React.useState('');
  const [isUploadingRoster, setIsUploadingRoster] = React.useState(false);

  // Load camps data
  const fetchCamps = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await DashboardService.getCampsList();
      setCamps(res.camps);
      
      const active = res.camps.find((c) => c.active === 1);
      if (active) {
        setUploaderCampNo(String(active.camp_no));
      }
    } catch (err: any) {
      toast(err.message || 'Failed to fetch camp session records.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchCamps();
  }, [fetchCamps]);

  // Create new session camp
  const handleCreateCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const no = parseInt(newCampNo.trim());
    if (isNaN(no) || no <= 0) {
      toast('Please specify a positive camp sequence index.', 'warning');
      return;
    }

    try {
      await DashboardService.createCamp(no, newCampDate || undefined);
      toast(`Camp session #${no} registered successfully.`, 'success');
      setNewCampNo('');
      setNewCampDate('');
      fetchCamps();
    } catch (err: any) {
      toast(err.message || 'Session creation request failed.', 'error');
    }
  };

  // Set active camp session on server
  const handleActivateCamp = async (campNo: number) => {
    try {
      await DashboardService.activateCampSession(campNo);
      toast(`Camp #${campNo} is now the active camp session!`, 'success');
      localStorage.setItem('akk_active_camp_no', String(campNo));
      fetchCamps();
    } catch (err: any) {
      toast(err.message || 'Failed to activate camp session.', 'error');
    }
  };

  // Export camp check-in logs to Excel
  const handleExportCamp = async (campNo: number) => {
    try {
      window.open(`/api/camps/${campNo}/export`, '_blank');
      toast(`Export triggered for Camp #${campNo}. Please check your downloads folder.`, 'success');
    } catch (err: any) {
      toast(err.message || 'Excel export request failed.', 'error');
    }
  };

  // Trigger delete camp confirmation modal
  const handleDeleteCamp = (campNo: number) => {
    if (!isAdmin) return;
    setCampToDelete(campNo);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteCamp = async () => {
    if (campToDelete === null || !isAdmin) return;

    try {
      await DashboardService.deleteCamp(campToDelete);
      toast(`Camp #${campToDelete} deleted successfully.`, 'success');
      fetchCamps();
    } catch (err: any) {
      toast(err.message || 'Delete operation failed.', 'error');
    } finally {
      setCampToDelete(null);
    }
  };

  // Excel Upload doctor roster lists
  const handleDoctorExcelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorExcelFile) {
      toast('Please select an Excel file containing doctors roster.', 'warning');
      return;
    }

    const cNo = parseInt(uploaderCampNo.trim());
    if (isNaN(cNo) || cNo <= 0) {
      toast('Please specify a target camp session number.', 'warning');
      return;
    }

    setIsUploadingRoster(true);
    try {
      const res = await DashboardService.importDoctorsExcel(cNo, doctorExcelFile);
      toast(`Roster uploaded! Configured ${res.imported} doctors (skipped ${res.skipped}) for Camp #${cNo}.`, 'success');
      setDoctorExcelFile(null);
      const fileEl = document.getElementById('doctorExcelInput') as HTMLInputElement;
      if (fileEl) fileEl.value = '';
    } catch (err: any) {
      toast(err.message || 'Doctor excel import failed.', 'error');
    } finally {
      setIsUploadingRoster(false);
    }
  };

  // Copy TV calling board token link to clipboard
  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/display/${token}`;
    navigator.clipboard.writeText(link);
    toast('TV Display link copied to clipboard!', 'info');
  };

  return (
    <div className="space-y-6">
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
                  <p className="text-xs text-slate-405 font-semibold">Loading camp logs...</p>
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
                              <Badge variant="success" className="text-[9px] font-bold uppercase py-0.5 px-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-3xs select-none">
                                Active Session
                              </Badge>
                            ) : (
                              isAdmin && (
                                <button
                                  onClick={() => handleActivateCamp(camp.camp_no)}
                                  className="text-[9.5px] font-bold text-teal-700 bg-teal-50/60 border border-teal-100 hover:bg-teal-100 hover:text-teal-900 rounded-full px-2.5 py-0.5 uppercase cursor-pointer transition-colors"
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
                                className="text-slate-400 hover:text-teal-650 p-1 hover:bg-slate-50 rounded-lg cursor-pointer bg-transparent border-0"
                                title="Copy TV Link"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                              <a
                                href={`/display/${camp.public_token}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-teal-655 p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
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
                                className="text-slate-400 hover:text-teal-650 p-1.5 hover:bg-teal-55 rounded-lg cursor-pointer bg-transparent border-0"
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

        {/* Right Section: Camp session setup administration tabbed hub */}
        {isAdmin && (
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              {/* Segmented Tab Controls */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1 mb-5">
                <button
                  type="button"
                  onClick={() => setActiveTab('camp')}
                  className={`flex-1 text-center py-2 text-[9.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0 ${
                    activeTab === 'camp'
                      ? 'bg-white text-teal-800 shadow-3xs'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  Setup Camp
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('excel')}
                  className={`flex-1 text-center py-2 text-[9.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer border-0 ${
                    activeTab === 'excel'
                      ? 'bg-white text-teal-800 shadow-3xs'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent'
                  }`}
                >
                  Excel Import
                </button>
              </div>

              {/* Tab Content 1: New Camp */}
              {activeTab === 'camp' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-xl text-teal-600">
                      <Plus className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">New Camp Session</h3>
                  </div>

                  <form onSubmit={handleCreateCamp} className="space-y-4 text-xs">
                    <div className="relative">
                      <input
                        id="newCampNoInput"
                        placeholder=" "
                        value={newCampNo}
                        onChange={(e) => setNewCampNo(e.target.value)}
                        className="peer w-full h-11 bg-slate-50 border border-slate-205 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent"
                      />
                      <label
                        htmlFor="newCampNoInput"
                        className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                      >
                        Camp Number Index (e.g. 148)
                      </label>
                    </div>

                    <div className="relative">
                      <input
                        id="newCampDateInput"
                        type="date"
                        placeholder=" "
                        value={newCampDate}
                        onChange={(e) => setNewCampDate(e.target.value)}
                        className="peer w-full h-11 bg-slate-50 border border-slate-205 rounded-xl px-3 pt-3.5 text-slate-850 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent"
                      />
                      <label
                        htmlFor="newCampDateInput"
                        className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                      >
                        Scheduled Date
                      </label>
                    </div>

                    <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer border-0 transition-colors">
                      Create Camp Session
                    </button>
                  </form>
                </div>
              )}

              {/* Tab Content 2: Excel Import */}
              {activeTab === 'excel' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-xl text-teal-600">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Excel Doctor Import</h3>
                  </div>

                  <form onSubmit={handleDoctorExcelSubmit} className="space-y-4 text-xs">
                    <div className="relative">
                      <input
                        id="rosterCampNoInput"
                        placeholder=" "
                        value={uploaderCampNo}
                        onChange={(e) => setUploaderCampNo(e.target.value)}
                        className="peer w-full h-11 bg-slate-50 border border-slate-205 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-semibold placeholder-transparent"
                      />
                      <label
                        htmlFor="rosterCampNoInput"
                        className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                      >
                        Target Camp Session
                      </label>
                    </div>

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

                    <button
                      type="submit"
                      disabled={!doctorExcelFile || isUploadingRoster}
                      className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border-0 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingRoster ? 'Uploading...' : 'Upload Doctors Roster'}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Camp Session"
        message={`Permanently delete Camp #${campToDelete} and all associated queues logs? This cannot be undone!`}
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDeleteCamp}
        onClose={() => {
          setDeleteModalOpen(false);
          setCampToDelete(null);
        }}
        isDanger
      />
    </div>
  );
}
