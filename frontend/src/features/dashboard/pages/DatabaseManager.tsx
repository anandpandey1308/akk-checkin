import * as React from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { DashboardService } from '@/services/dashboard.service';
import type { Patient, Doctor } from '@/services/dashboard.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { 
  Database, 
  Search, 
  Upload, 
  Edit2, 
  X, 
  FileSpreadsheet, 
  Star, 
  User, 
  Phone, 
  MessageSquare, 
  ListChecks,
  Plus 
} from 'lucide-react';

export function DatabaseManager() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  // Doctors reference list (for default doctor selection options)
  const [doctors, setDoctors] = React.useState<Doctor[]>([]);

  // Editing state
  const [editingPatient, setEditingPatient] = React.useState<Patient | null>(null);
  const [editContact, setEditContact] = React.useState('');
  const [editDoctor, setEditDoctor] = React.useState('');
  const [editComment, setEditComment] = React.useState('');
  const [editPriority, setEditPriority] = React.useState(false);

  // Excel Bulk Uploader state
  const [excelFile, setExcelFile] = React.useState<File | null>(null);
  const [importCampNo, setImportCampNo] = React.useState('');
  const [isUploading, setIsUploading] = React.useState(false);

  // Bulk Priority Textarea state
  const [bulkPriorityText, setBulkPriorityText] = React.useState('');
  const [isProcessingBulk, setIsProcessingBulk] = React.useState(false);

  // Success/Error notifications
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);

  // Initialize: load doctors and active camp sessions
  React.useEffect(() => {
    const init = async () => {
      try {
        const docRes = await DashboardService.getDoctorsList();
        setDoctors(docRes.doctors);
        
        const state = await DashboardService.getState();
        if (state.activeCamp) {
          setImportCampNo(String(state.activeCamp.camp_no));
        }
      } catch (err: any) {
        console.error('Failed to initialize database settings:', err);
      }
    };
    init();
  }, []);

  // Handle live patient searches
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
      setActionError(err.message || 'Patient lookup search failed.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search query changes
  React.useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch(searchQuery);
    }, 350);
    return () => clearTimeout(delayDebounce);
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
  const handleExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    if (!excelFile) {
      setActionError('Please select a patients .xlsx spreadsheet file first.');
      return;
    }
    if (!importCampNo) {
      setActionError('Please specify a camp number to tag these patient records.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await DashboardService.importPatientsExcel(Number(importCampNo), excelFile);
      setActionSuccess(
        `Import complete! Registered ${res.imported} patients (Skipped ${res.skipped} rows).`
      );
      if (res.unknownDoctorCodes.length > 0) {
        setActionError(
          `Skipped rows with unknown doctor codes: ${res.unknownDoctorCodes.join(', ')}`
        );
      }
      setExcelFile(null);
      // Reset file input
      const fileInput = document.getElementById('excelFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setActionError(err.message || 'File upload parsing failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Bulk Priority Textarea Submit
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
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col min-h-[500px]">
            
            {/* Search Input bar */}
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Patient Directory</h3>
              </div>
              
              <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, GK card..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200 py-1.5 text-xs rounded-xl focus:bg-white"
                />
              </div>
            </div>

            {/* Patients list details grid */}
            <div className="flex-1 overflow-x-auto">
              {!searchQuery ? (
                <div className="h-full flex flex-col justify-center items-center py-12 text-slate-400 text-center">
                  <Search className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-sm font-semibold">Patient lookup database</p>
                  <p className="text-xs text-slate-400 mt-1">Type in a patient's name or GK card number above to search</p>
                </div>
              ) : isSearching ? (
                <div className="h-full flex flex-col justify-center items-center py-12 text-slate-400 text-center">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-semibold">Searching patient roster...</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-12 text-slate-400 text-center">
                  <X className="h-8 w-8 text-rose-300 mb-2" />
                  <p className="text-xs font-semibold">No records found matching query</p>
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
                      <tr key={pat.gk} className="hover:bg-slate-50/60 group">
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
                        <td className="py-3.5 text-slate-600 font-medium">
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
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-right duration-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4.5 w-4.5 text-teal-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Edit Record</h4>
                </div>
                <button 
                  onClick={() => setEditingPatient(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">GK Card Number</p>
                  <p className="font-mono font-bold text-slate-700 mt-0.5">{editingPatient.gk}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Patient Name</p>
                  <p className="font-bold text-slate-800 mt-0.5">{editingPatient.name}</p>
                </div>

                {/* Contact phone field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Mobile Contact
                  </label>
                  <Input
                    placeholder="Enter phone..."
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="bg-slate-50 text-xs py-1.5"
                  />
                </div>

                {/* Doctor dropdown field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> Assigned Doctor
                  </label>
                  <select
                    value={editDoctor}
                    onChange={(e) => setEditDoctor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:border-teal-500 focus:outline-none transition-colors"
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

                {/* Comments text block */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> Case History / Comments
                  </label>
                  <textarea
                    placeholder="Describe symptoms, priorities..."
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-teal-500 focus:outline-none transition-colors"
                  />
                </div>

                {/* Priority star checkbox */}
                <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editPriority}
                    onChange={(e) => setEditPriority(e.target.checked)}
                    className="text-teal-600 rounded-md focus:ring-teal-500"
                  />
                  <Star className={`h-4.5 w-4.5 ${editPriority ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                  Set Default Priority status
                </label>

                <Button variant="primary" className="w-full text-xs py-2 rounded-xl mt-2" onClick={handleSaveEdits}>
                  Save Defaults
                </Button>
              </div>
            </div>
          )}

          {/* Section: Bulk Excel Patients spreadsheet imports */}
          {isAdmin && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Excel Data Importer</h3>
              </div>

              <form onSubmit={handleExcelImport} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Camp Number Tag</label>
                  <Input
                    type="number"
                    placeholder="Camp ID e.g. 42"
                    value={importCampNo}
                    onChange={(e) => setImportCampNo(e.target.value)}
                    className="bg-slate-50 text-xs py-1.5"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patients Spreadsheet (.xlsx)</label>
                  <input
                    id="excelFileInput"
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                  isLoading={isUploading}
                >
                  <Upload className="h-4 w-4" />
                  Import Patients Sheet
                </Button>
              </form>
            </div>
          )}

          {/* Section: Bulk priority paste box */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="h-5 w-5 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Bulk Priority Star</h3>
            </div>

            <form onSubmit={handleBulkPrioritySubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pasted GK Card Numbers</label>
                <textarea
                  placeholder="Paste GK card numbers (one card ID per line, e.g. GK/4201)..."
                  value={bulkPriorityText}
                  onChange={(e) => setBulkPriorityText(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:bg-white focus:border-teal-500 focus:outline-none font-mono"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-1.5"
                isLoading={isProcessingBulk}
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
