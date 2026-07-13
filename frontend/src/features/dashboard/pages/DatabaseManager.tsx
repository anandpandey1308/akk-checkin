import * as React from 'react';
import { api } from '@/services/api';
import { DashboardService } from '@/services/dashboard.service';
import type { Patient, Doctor } from '@/services/dashboard.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { SearchInput } from '@/components/ui/SearchInput';
import { 
  Database, 
  Search, 
  Upload, 
  Edit2, 
  X, 
  FileSpreadsheet, 
  Star, 
  User, 
  ListChecks,
  Plus 
} from 'lucide-react';

export function DatabaseManager() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);

  // Editing Patient defaults state
  const [editingPatient, setEditingPatient] = React.useState<Patient | null>(null);
  const [editContact, setEditContact] = React.useState('');
  const [editDoctor, setEditDoctor] = React.useState('');
  const [editComment, setEditComment] = React.useState('');
  const [editPriority, setEditPriority] = React.useState(false);

  // Bulk Excel imports state
  const [excelFile, setExcelFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  // Bulk Priorities Star copy-paste state
  const [bulkPriorityText, setBulkPriorityText] = React.useState('');
  const [isProcessingBulk, setIsProcessingBulk] = React.useState(false);

  // Notifications
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Load doctors list on mount
  React.useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const state = await DashboardService.getState();
        setDoctors(state.doctors);
      } catch (err: any) {
        console.error('Failed to pre-fetch doctors list.', err);
      }
    };
    fetchDoctors();
  }, []);

  // Handle patient lookup query
  const handleSearch = React.useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setPatients([]);
      return;
    }

    setIsSearching(true);
    setActionError(null);
    try {
      const res = await DashboardService.searchPatients(q);
      setPatients(res.patients);
    } catch (err: any) {
      setActionError(err.message || 'Lookup search query failed.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search input changes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Save patient record edits
  const handleStartEditing = (pat: Patient) => {
    setEditingPatient(pat);
    setEditContact(pat.contact || '');
    setEditDoctor(pat.doctor || '');
    setEditComment(pat.comment || '');
    setEditPriority(pat.priority);
  };

  const handleSaveEdits = async () => {
    if (!editingPatient) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await DashboardService.updatePatientDefaults(editingPatient.gk, {
        contact: editContact || undefined,
        doctor: editDoctor || undefined,
        comment: editComment || undefined,
        priority: editPriority,
      });

      setActionSuccess(`Successfully updated default credentials for ${editingPatient.name}!`);
      setEditingPatient(null);
      handleSearch(searchQuery); // Reload list
    } catch (err: any) {
      setActionError(err.message || 'Failed to update patient record.');
    }
  };

  // Excel Bulk Import Patients
  const handleExcelImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    if (!excelFile) {
      setActionError('Please select a valid Excel file (.xlsx or .xls).');
      return;
    }

    const activeCampNoStr = localStorage.getItem('akk_active_camp_no');
    if (!activeCampNoStr) {
      setActionError('No active camp session! Set active camp session first under Camp Sessions.');
      return;
    }
    const campNo = parseInt(activeCampNoStr);

    setIsUploading(true);
    try {
      const res = await DashboardService.importPatientsExcel(campNo, excelFile);
      setActionSuccess(`Import completed! Added ${res.imported} and skipped ${res.skipped} patients.`);
      setExcelFile(null);
      // Clear file inputs
      const fileEl = document.getElementById('excelFileInput') as HTMLInputElement;
      if (fileEl) fileEl.value = '';
    } catch (err: any) {
      setActionError(err.message || 'Excel upload import request failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Bulk priority apply
  const handleBulkPrioritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    const lines = bulkPriorityText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setActionError('Please enter at least one GK card ID number.');
      return;
    }

    setIsProcessingBulk(true);
    try {
      const apiRes = await api.post('/patients/bulk-priority', { gks: lines });
      
      setActionSuccess(
        `Bulk priority applied! Starred ${apiRes.data.marked.length} patients (Not found: ${apiRes.data.notFound.length}).`
      );
      setBulkPriorityText('');
      handleSearch(searchQuery);
    } catch (err: any) {
      setActionError(err.message || 'Bulk priority request failed.');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}
      {actionSuccess && <Alert variant="success" onClose={() => setActionSuccess(null)}>{actionSuccess}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Columns: Directory Lookup list & Inline editor */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col min-h-[500px]">
            
            {/* Search Input bar */}
            <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <Database className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Patient Directory</h3>
              </div>
              
              <SearchInput
                placeholder="Search by name, GK card..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full sm:w-64"
              />
            </div>

            {/* Patients list details grid */}
            <div className="flex-1 overflow-x-auto">
              {!searchQuery ? (
                <div className="h-full flex flex-col justify-center items-center py-16 text-slate-400 text-center">
                  <Search className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-800">Patient lookup database</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Type in a patient's name or GK card number in the search bar above to look up records.
                  </p>
                </div>
              ) : isSearching ? (
                <div className="h-full flex flex-col justify-center items-center py-16 text-slate-400 text-center">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-semibold">Searching patient roster...</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-16 text-slate-400 text-center">
                  <X className="h-8 w-8 text-rose-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-850">No records found matching query</p>
                  <p className="text-[10px] text-slate-400 mt-1">Check spelling or create records via Excel upload.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5">GK Card</th>
                      <th className="py-2.5">Full Name</th>
                      <th className="py-2.5">Default Doctor</th>
                      <th className="py-2.5">Comments / History</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {patients.map((pat) => (
                      <tr key={pat.gk} className="hover:bg-slate-50/50 group">
                        <td className="py-3.5 font-mono font-bold text-teal-700">{pat.gk}</td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{pat.name}</span>
                            {pat.priority && (
                              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          {pat.contact && (
                            <p className="text-[10px] text-slate-400 mt-0.5">{pat.contact}</p>
                          )}
                        </td>
                        <td className="py-3.5 text-slate-600 font-semibold">
                          {pat.doctorName || pat.doctor || 'Unassigned'}
                        </td>
                        <td className="py-3.5 text-slate-500 italic max-w-xs truncate" title={pat.comment}>
                          {pat.comment || 'No comments'}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => handleStartEditing(pat)}
                            className="text-slate-400 hover:text-teal-600 p-1.5 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Defaults"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Columns: Admin tools (Excel Import, Edit Panel, Bulk Priority) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Section: Patient details editor drawer/card */}
          {editingPatient && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 animate-in slide-in-from-right duration-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Edit Record</h4>
                </div>
                <button 
                  onClick={() => setEditingPatient(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200/50 rounded-xl p-3">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">GK Card Number</span>
                    <span className="font-mono font-bold text-slate-700 block mt-0.5">{editingPatient.gk}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Patient Name</span>
                    <span className="font-bold text-slate-850 block mt-0.5">{editingPatient.name}</span>
                  </div>
                </div>

                {/* Contact phone field (Floating label) */}
                <div className="relative">
                  <input
                    id="editContactInput"
                    placeholder=" "
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="peer w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 pt-3.5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-medium placeholder-transparent"
                  />
                  <label
                    htmlFor="editContactInput"
                    className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-1.5 peer-focus:text-[9px]"
                  >
                    Mobile Contact Number
                  </label>
                </div>

                {/* Doctor dropdown field */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-1">Assigned Doctor</label>
                  <select
                    value={editDoctor}
                    onChange={(e) => setEditDoctor(e.target.value)}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-medium focus:bg-white focus:border-teal-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="">Unassigned...</option>
                    {doctors.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                    <option value="NW">New Patient Desk (NW)</option>
                  </select>
                </div>

                {/* Comments box (Floating label) */}
                <div className="relative">
                  <textarea
                    id="editCommentInput"
                    placeholder=" "
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    rows={2}
                    className="peer w-full bg-slate-50 border border-slate-200 rounded-xl px-3 pt-4 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-medium placeholder-transparent resize-none"
                  />
                  <label
                    htmlFor="editCommentInput"
                    className="absolute left-3 top-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-2 peer-focus:text-[9px]"
                  >
                    Consultation Comments
                  </label>
                </div>

                {/* Priority star checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700 px-1">
                  <input
                    type="checkbox"
                    checked={editPriority}
                    onChange={(e) => setEditPriority(e.target.checked)}
                    className="text-teal-600 rounded-md focus:ring-teal-500"
                  />
                  <Star className={`h-4.5 w-4.5 ${editPriority ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                  Set Default Priority
                </label>

                <div className="flex gap-2.5 pt-1">
                  <Button variant="outline" className="flex-1 text-xs py-2 rounded-xl bg-white border-slate-200 text-slate-600" onClick={() => setEditingPatient(null)}>
                    Cancel
                  </Button>
                  <Button variant="primary" className="flex-1 text-xs py-2 rounded-xl" onClick={handleSaveEdits}>
                    Save Defaults
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Section: Bulk Patient Excel Upload */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                <FileSpreadsheet className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Excel Patient Directory</h3>
            </div>

            <form onSubmit={handleExcelImportSubmit} className="space-y-3.5">
              <div className="border-2 border-dashed border-slate-200 hover:border-teal-400 rounded-xl p-4 flex flex-col justify-center items-center text-center cursor-pointer transition-colors bg-slate-50/50">
                <Upload className="h-6 w-6 text-slate-400 mb-2" />
                <input
                  id="excelFileInput"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="excelFileInput" className="text-[10px] font-bold text-teal-700 uppercase tracking-wider cursor-pointer hover:underline">
                  {excelFile ? excelFile.name : 'Select Directory Spreadsheet'}
                </label>
                <p className="text-[9px] text-slate-400 mt-1">Supports bulk rows (.xlsx, .xls)</p>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                isLoading={isUploading}
                disabled={!excelFile}
              >
                <Upload className="h-4 w-4" />
                Import Patient Roster
              </Button>
            </form>
          </div>

          {/* Section: Bulk Star Priorities pasting area */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                <ListChecks className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Bulk Star Priorities</h3>
            </div>

            <form onSubmit={handleBulkPrioritySubmit} className="space-y-3.5">
              <div className="relative">
                <textarea
                  id="bulkPriorityArea"
                  placeholder=" "
                  value={bulkPriorityText}
                  onChange={(e) => setBulkPriorityText(e.target.value)}
                  rows={3}
                  className="peer w-full bg-slate-50 border border-slate-200 rounded-xl px-3 pt-5 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white transition-all text-xs font-medium placeholder-transparent resize-none font-mono"
                />
                <label
                  htmlFor="bulkPriorityArea"
                  className="absolute left-3 top-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3 peer-focus:top-2 peer-focus:text-[9px]"
                >
                  Paste GK Card ID lists (One per line)
                </label>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                isLoading={isProcessingBulk}
                disabled={!bulkPriorityText.trim()}
              >
                <Plus className="h-4 w-4" />
                Apply Star Priority
              </Button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
