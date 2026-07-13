import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardService } from '@/services/dashboard.service';
import type { Camp } from '@/services/dashboard.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  UserPlus, 
  Copy, 
  ExternalLink, 
  Users 
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
  const [docCode, setDocCode] = React.useState('');
  const [docName, setDocName] = React.useState('');
  const [isAddingDoc, setIsAddingDoc] = React.useState(false);

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

  // Create a new camp
  const handleCreateCamp = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    if (!newCampNo) {
      setActionError('Camp Number is required.');
      return;
    }

    try {
      await DashboardService.createCamp(Number(newCampNo), newCampDate || undefined);
      setActionSuccess(`Successfully registered Camp #${newCampNo}!`);
      setNewCampNo('');
      setNewCampDate('');
      fetchCamps();
    } catch (err: any) {
      setActionError(err.message || 'Failed to register camp.');
    }
  };

  // Toggle camp activation
  const handleActivateCamp = async (campNo: number) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await DashboardService.activateCampSession(campNo);
      setActionSuccess(`Camp #${campNo} is now active!`);
      // Update local storage so headers sync immediately
      localStorage.setItem('akk_active_camp_no', String(campNo));
      fetchCamps();
    } catch (err: any) {
      setActionError(err.message || 'Failed to activate camp session.');
    }
  };

  // Delete a camp
  const handleDeleteCamp = async (campNo: number) => {
    if (!window.confirm(`WARNING: Deleting Camp #${campNo} is permanent and will delete all patients, check-ins, and counters for this camp! Are you sure?`)) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await DashboardService.deleteCamp(campNo);
      setActionSuccess(`Deleted Camp #${campNo}.`);
      fetchCamps();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete camp session.');
    }
  };

  // Trigger spreadsheet export download
  const handleExportCamp = (campNo: number) => {
    const url = `/api/camps/${campNo}/export`;
    window.open(url, '_blank');
  };

  // Add doctor manually
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    if (!docCode || !docName) {
      setActionError('Doctor Code and Name are required.');
      return;
    }

    setIsAddingDoc(true);
    try {
      await DashboardService.addDoctor(docCode.toUpperCase(), docName);
      setActionSuccess(`Registered Dr. ${docName} (${docCode.toUpperCase()})!`);
      setDocCode('');
      setDocName('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to register doctor.');
    } finally {
      setIsAddingDoc(false);
    }
  };

  // Upload doctor Excel roster
  const handleRosterUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    if (!doctorExcelFile) {
      setActionError('Please select a doctors .xlsx roster spreadsheet file.');
      return;
    }
    if (!uploaderCampNo) {
      setActionError('Please specify a camp number target.');
      return;
    }

    setIsUploadingRoster(true);
    try {
      const res = await DashboardService.importDoctorsExcel(Number(uploaderCampNo), doctorExcelFile);
      setActionSuccess(
        `Roster upload complete! Added ${res.imported} doctors (Skipped ${res.skipped} rows).`
      );
      setDoctorExcelFile(null);
      const fileInput = document.getElementById('doctorExcelFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setActionError(err.message || 'Doctors roster import failed.');
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
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs min-h-[485px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Camps Registry</h3>
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
                        <tr key={camp.camp_no} className="hover:bg-slate-50/60 group">
                          <td className="py-3.5 font-bold text-slate-800">Camp #{camp.camp_no}</td>
                          <td className="py-3.5 text-slate-500 font-medium">
                            {camp.camp_date || 'No scheduled date'}
                          </td>
                          <td className="py-3.5">
                            {camp.active === 1 ? (
                              <Badge variant="success" className="text-[9px] font-bold uppercase py-0.5 px-2 rounded-full">
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
                            <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleExportCamp(camp.camp_no)}
                                className="text-slate-400 hover:text-teal-600 p-1.5 hover:bg-teal-50 rounded-lg cursor-pointer"
                                title="Export Excel data"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteCamp(camp.camp_no)}
                                  className="text-slate-300 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer"
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

        {/* Right Section: Add camp, Add Doctor, Import roster */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card: Register Camp form */}
          {isAdmin && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Register Camp</h3>
              </div>

              <form onSubmit={handleCreateCamp} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Camp ID Number</label>
                  <Input
                    type="number"
                    placeholder="Camp Number e.g. 43"
                    value={newCampNo}
                    onChange={(e) => setNewCampNo(e.target.value)}
                    className="bg-slate-50 text-xs py-1.5"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Date</label>
                  <Input
                    type="date"
                    value={newCampDate}
                    onChange={(e) => setNewCampDate(e.target.value)}
                    className="bg-slate-50 text-xs py-1.5"
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full text-xs py-2 rounded-xl">
                  Register Camp
                </Button>
              </form>
            </div>
          )}

          {/* Card: Add doctor manually */}
          {isAdmin && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Add Volunteering Doctor</h3>
              </div>

              <form onSubmit={handleAddDoctor} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctor Initials / Code</label>
                  <Input
                    placeholder="E.g. AS"
                    value={docCode}
                    onChange={(e) => setDocCode(e.target.value)}
                    maxLength={5}
                    className="bg-slate-50 text-xs py-1.5 font-mono uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctor Name</label>
                  <Input
                    placeholder="Dr. Anand Sharma"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    className="bg-slate-50 text-xs py-1.5"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs py-2 rounded-xl"
                  isLoading={isAddingDoc}
                >
                  Add Doctor
                </Button>
              </form>
            </div>
          )}

          {/* Card: Bulk Import Doctors roster sheet */}
          {isAdmin && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Import Doctor Roster</h3>
              </div>

              <form onSubmit={handleRosterUpload} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctors Spreadsheet (.xlsx)</label>
                  <input
                    id="doctorExcelFileInput"
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setDoctorExcelFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                  isLoading={isUploadingRoster}
                >
                  <Upload className="h-4 w-4" />
                  Upload Doctor Roster
                </Button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
