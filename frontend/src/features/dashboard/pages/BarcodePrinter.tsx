import * as React from 'react';
import { DashboardService } from '@/services/dashboard.service';
import type { Patient } from '@/services/dashboard.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { 
  Barcode, 
  Search, 
  Printer, 
  Trash2, 
  Check, 
  X,
  FileText
} from 'lucide-react';

export function BarcodePrinter() {
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Selected stickers print queue
  const [printQueue, setPrintQueue] = React.useState<Patient[]>([]);

  // Search patients to select from
  const handleSearch = React.useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) {
      setPatients([]);
      return;
    }

    setIsLoading(true);
    setActionError(null);
    try {
      const res = await DashboardService.searchPatients(q);
      setPatients(res.patients);
    } catch (err: any) {
      setActionError(err.message || 'Lookup search query failed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleLoadAll = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await DashboardService.searchPatients('*'); // Custom trigger or empty search
      setPatients(res.patients);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load database.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add/Remove sticker selection queue
  const handleToggleQueue = (pat: Patient) => {
    const exists = printQueue.some((q) => q.gk === pat.gk);
    if (exists) {
      setPrintQueue(printQueue.filter((q) => q.gk !== pat.gk));
    } else {
      setPrintQueue([...printQueue, pat]);
    }
  };

  const handleAddAllFiltered = () => {
    const newItems = patients.filter((p) => !printQueue.some((q) => q.gk === p.gk));
    setPrintQueue([...printQueue, ...newItems]);
  };

  const handleRemoveFromQueue = (gk: string) => {
    setPrintQueue(printQueue.filter((q) => q.gk !== gk));
  };

  const handleClearQueue = () => {
    setPrintQueue([]);
  };

  // Trigger browser print dialog
  const handlePrint = () => {
    if (printQueue.length === 0) return;
    window.print();
  };

  return (
    <div className="space-y-6">
      {actionError && <Alert variant="error" onClose={() => setActionError(null)}>{actionError}</Alert>}

      {/* ── CSS @media print wrapper ── */}
      <style>{`
        @media print {
          /* Hide all UI layout headers & sidebars when printing stickers */
          aside, header, main, nav, .print-hide-controls {
            display: none !important;
          }
          body, html, #root {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-sheet {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 15px !important;
            padding: 10px !important;
            width: 100% !important;
          }
          .print-sticker {
            border: 1px solid #ddd !important;
            padding: 12px !important;
            border-radius: 8px !important;
            text-align: center !important;
            page-break-inside: avoid !important;
            height: auto !important;
          }
        }
      `}</style>

      {/* Primary Desktop view container */}
      <div className="print-hide-controls grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Search & Select patients */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs min-h-[480px] flex flex-col">
            
            {/* Header / Actions bar */}
            <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <Barcode className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Select Patients</h3>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search name, GK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-50 border-slate-200 py-1.5 text-xs rounded-xl focus:bg-white"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLoadAll}
                  className="text-xs text-teal-700 hover:bg-teal-50 shrink-0 bg-white border-slate-200 rounded-xl"
                >
                  Load All
                </Button>
              </div>
            </div>

            {/* List entries */}
            <div className="flex-1 overflow-y-auto max-h-[360px] pr-1">
              {isLoading ? (
                <div className="h-full flex flex-col justify-center items-center py-12 text-slate-400 text-center">
                  <div className="h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs font-semibold">Loading directories...</p>
                </div>
              ) : patients.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-16 text-slate-400 text-center">
                  <Search className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-855">Search or Load All patients</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Select patient cards below to add them to your sticker printing sheet queue.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {patients.length > 0 && (
                    <div className="flex justify-between items-center px-1 pb-1">
                      <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">{patients.length} results</span>
                      <button
                        onClick={handleAddAllFiltered}
                        className="text-[10px] text-teal-700 hover:text-teal-900 font-bold uppercase cursor-pointer hover:underline"
                      >
                        Add All to Sheet
                      </button>
                    </div>
                  )}
                  {patients.map((pat) => {
                    const isSelected = printQueue.some((q) => q.gk === pat.gk);
                    return (
                      <div
                        key={pat.gk}
                        onClick={() => handleToggleQueue(pat)}
                        className={`border rounded-xl p-3 flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 border-teal-100'
                            : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-800 leading-none">{pat.name}</span>
                            {pat.priority && (
                              <Badge variant="warning" className="text-[8px] uppercase px-1 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700">
                                Priority
                              </Badge>
                            )}
                          </div>
                          <span className="font-mono text-[9px] text-teal-750 font-bold mt-1 block">{pat.gk}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {pat.doctorName || pat.doctor || 'Unassigned'}
                          </span>
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'bg-teal-600 border-teal-600 text-white' 
                              : 'border-slate-300 bg-white text-transparent'
                          }`}>
                            <Check className="h-3 w-3 shrink-0" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Print queue layout preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col min-h-[480px]">
            
            <div className="border-b border-slate-100 pb-4 mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="bg-teal-50 border border-teal-100/50 p-2 rounded-lg text-teal-600">
                  <Printer className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Avery Sticker Sheet</h3>
              </div>
              
              {printQueue.length > 0 && (
                <button
                  onClick={handleClearQueue}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-slate-50 border border-slate-200/45 bg-white cursor-pointer"
                  title="Clear Sheet"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* List selected preview */}
            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 mb-4 pr-1">
              {printQueue.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center py-12 text-slate-400 text-center">
                  <FileText className="h-8 w-8 text-slate-350 mb-2" />
                  <p className="text-xs font-semibold text-slate-800">Print queue empty</p>
                  <p className="text-[9px] text-slate-400 mt-1">Select patients from left to load preview queue</p>
                </div>
              ) : (
                printQueue.map((pat) => (
                  <div key={pat.gk} className="border border-slate-150 bg-slate-50/50 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-xs">
                    <div>
                      <span className="font-bold text-slate-700 leading-none block">{pat.name}</span>
                      <span className="font-mono text-[9px] text-teal-700 font-bold mt-1.5 block leading-none">{pat.gk}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFromQueue(pat.gk)}
                      className="text-slate-300 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3 mt-auto">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-550">Stickers to print:</span>
                <span className="font-black text-slate-800 text-sm">{printQueue.length} labels</span>
              </div>
              <Button
                variant="primary"
                className="w-full text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                disabled={printQueue.length === 0}
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Print Stickers Sheet
              </Button>
            </div>

          </div>
        </div>

      </div>

      {/* ── HIDDEN @media print document output (Invisible on UI, formatted for sticker pages) ── */}
      <div className="hidden print:block">
        <div className="print-sheet">
          {printQueue.map((pat) => (
            <div key={pat.gk} className="print-sticker">
              <span style={{ fontSize: '10px', fontWeight: 'bold', display: 'block', textTransform: 'uppercase', color: '#666', borderBottom: '1px solid #eee', paddingBottom: '3px', marginBottom: '4px' }}>
                Asha Ki Kiran
              </span>
              <span style={{ fontSize: '15px', fontWeight: '900', display: 'block', color: '#000', margin: '2px 0' }}>
                {pat.name}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', display: 'block', color: '#0F766E' }}>
                {pat.gk}
              </span>
              <span style={{ fontSize: '9px', display: 'block', color: '#444', marginTop: '3px' }}>
                {pat.doctorName || pat.doctor || 'General Consultation'}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
