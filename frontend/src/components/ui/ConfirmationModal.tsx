import * as React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  isDanger?: boolean;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  isDanger = false,
}: ConfirmationModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-xl max-w-sm w-full p-6 overflow-hidden transform transition-all duration-200 ease-out scale-100 z-10 space-y-4">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Warning Icon & Content */}
        <div className="flex gap-4">
          <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 h-10 w-10 ${
            isDanger ? 'bg-rose-50 text-rose-600 border border-rose-100/50' : 'bg-amber-50 text-amber-600 border border-amber-100/50'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          
          <div className="space-y-1.5 min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 leading-none">
              {title}
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-normal">
              {message}
            </p>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer shadow-3xs"
          >
            {cancelLabel}
          </button>
          
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 text-white font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer shadow-3xs border-0 ${
              isDanger 
                ? 'bg-rose-600 hover:bg-rose-700' 
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
