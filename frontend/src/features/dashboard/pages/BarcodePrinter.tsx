import * as React from 'react';
import { DashboardService } from '@/services/dashboard.service';
import type { Patient } from '@/services/dashboard.service';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { 
  Barcode, 
  Search, 
  Printer, 
  Trash2, 
  Check, 
  X 
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
      setActionError(err.message || 'Lookup search failed.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const delayDebounce = setTimeout(() => handleSearch(searchQuery), 350);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, handleSearch]);

  // Load all patients on load (up to limit)
  const handleLoadAll = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const res = await DashboardService.getAllPatients();
      setPatients(res.patients);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load master patient directory.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add/Remove from print list
  const handleToggleQueue = (pat: Patient) => {
    const exists = printQueue.some((q) => q.gk === pat.gk);
    if (exists) {
      setPrintQueue(printQueue.filter((q) => q.gk !== pat.gk));
    } else {
      setPrintQueue([...printQueue, pat]);
    }
  };

  const handleAddAllFiltered = () => {
    const uniqueToAdd = patients.filter(
      (pat) => !printQueue.some((q) => q.gk === pat.gk)
    );
    setPrintQueue([...printQueue, ...uniqueToAdd]);
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
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs min-h-[480px] flex flex-col">
            
            {/* Header / Actions bar */}
            <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Select Patients</h3>
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
                  className="text-xs text-teal-700 hover:bg-teal-50 shrink-0"
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
                <div className="h-full flex flex-col justify-center items-center py-12 text-slate-400 text-center">
                  <Search className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">Search or Load All patients</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Select patient cards below to add them to print queue</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {patients.length > 0 && (
                    <div className="flex justify-between items-center px-1 pb-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{patients.length} results</span>
                      <button
                        onClick={handleAddAllFiltered}
                        className="text-[10px] text-teal-600 hover:text-teal-800 font-bold uppercase cursor-pointer"
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
                            ? 'bg-teal-50 border-teal-200'
                            : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-700">{pat.name}</span>
                            <span className="font-mono text-[9px] text-teal-700 bg-white border border-teal-100 px-1.5 py-0.5 rounded-md font-bold">
                              {pat.gk}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">
                            Assigned Doctor: {pat.doctorName || pat.doctor || 'Unassigned'}
                          </p>
                        </div>

                        <div className={`h-6 w-6 rounded-xl border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-teal-600 border-teal-600 text-white' : 'border-slate-200 text-transparent'
                        }`}>
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Print Sheet Queue configuration */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs min-h-[480px] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 mb-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Print Queue</h3>
                </div>
                {printQueue.length > 0 && (
                  <button
                    onClick={handleClearQueue}
                    className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
                    title="Clear Queue"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>

              {/* print layout items list */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {printQueue.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No stickers added to print queue yet. Select cards from list.
                  </div>
                ) : (
                  printQueue.map((pat) => (
                    <div key={pat.gk} className="border border-slate-100 bg-slate-50/50 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-700">{pat.name}</span>
                        <p className="font-mono text-[9px] text-teal-700 font-bold mt-0.5">{pat.gk}</p>
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
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Stickers to print:</span>
                <span className="font-black text-slate-800 text-sm">{printQueue.length} labels</span>
              </div>
              <Button
                variant="primary"
                className="w-full text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                disabled={printQueue.length === 0}
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" />
                Print Sticker Sheet
              </Button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Print Preview Container (Rendered off-screen on desktop, visible in Print dialog) ── */}
      <div className="hidden print-sheet">
        {printQueue.map((pat, idx) => (
          <div key={`${pat.gk}-${idx}`} className="print-sticker">
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0', fontFamily: 'monospace' }}>
              {pat.gk}
            </h2>
            <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 2px 0' }}>{pat.name}</p>
            <p style={{ fontSize: '9px', color: '#666', margin: '0 0 6px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Doc: {pat.doctorName || pat.doctor || 'Unassigned'}
            </p>
            {/* CSS representation of a barcode */}
            <div style={{ display: 'inline-flex', height: '24px', width: '90px', gap: '2px', borderLeft: '1px solid black', borderRight: '2px solid black', opacity: 0.8 }}>
              <div style={{ width: '2px', background: 'black', height: '100%' }} />
              <div style={{ width: '4px', background: 'black', height: '100%' }} />
              <div style={{ width: '1px', background: 'black', height: '100%' }} />
              <div style={{ width: '3px', background: 'black', height: '100%' }} />
              <div style={{ width: '1px', background: 'black', height: '100%' }} />
              <div style={{ width: '4px', background: 'black', height: '100%' }} />
              <div style={{ width: '2px', background: 'black', height: '100%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
