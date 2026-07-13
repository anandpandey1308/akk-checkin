import * as React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

// Stateful individual ToastCard to support Pause on Hover
function ToastCard({ t, onRemove }: { t: ToastItem; onRemove: (id: string) => void }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [remaining, setRemaining] = React.useState(4000);
  const startTimeRef = React.useRef(Date.now());
  const timerRef = React.useRef<any>(null);

  const startTimer = React.useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onRemove(t.id);
    }, remaining);
  }, [remaining, t.id, onRemove]);

  const pauseTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const elapsed = Date.now() - startTimeRef.current;
      setRemaining((prev) => Math.max(0, prev - elapsed));
    }
  }, []);

  React.useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    pauseTimer();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    startTimer();
  };

  // Modern clean neutral background with colored icons & accents
  const bgClass = 'bg-white/95 backdrop-blur-md border border-slate-200/80 text-slate-800 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.1)]';
  
  let icon = <Info className="h-5 w-5 text-blue-500 shrink-0" />;
  let title = 'Info';
  let titleColor = 'text-blue-700';
  let progressBg = 'bg-blue-500/50';

  switch (t.type) {
    case 'success':
      icon = <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
      title = 'Success';
      titleColor = 'text-emerald-700';
      progressBg = 'bg-emerald-500/50';
      break;
    case 'error':
      icon = <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />;
      title = 'Error';
      titleColor = 'text-rose-700';
      progressBg = 'bg-rose-500/50';
      break;
    case 'warning':
      icon = <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
      title = 'Warning';
      titleColor = 'text-amber-700';
      progressBg = 'bg-amber-500/50';
      break;
    case 'info':
      icon = <Info className="h-5 w-5 text-blue-500 shrink-0" />;
      title = 'Info';
      titleColor = 'text-blue-700';
      progressBg = 'bg-blue-500/50';
      break;
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-start gap-3.5 p-4 rounded-2xl border pointer-events-auto overflow-hidden animate-toast-spring transition-all duration-300 ${bgClass} ${
        isHovered ? 'scale-[1.01] border-slate-300/80 shadow-[0_16px_40px_-6px_rgba(0,0,0,0.12)]' : 'scale-100'
      }`}
      role="alert"
    >
      {icon}
      
      <div className="flex-1 space-y-0.5 min-w-0 pr-2">
        <h4 className={`text-[10px] font-black tracking-wider uppercase ${titleColor}`}>
          {title}
        </h4>
        <p className="text-[11.5px] font-semibold text-slate-600 leading-snug break-words">
          {t.message}
        </p>
      </div>

      <button
        onClick={() => onRemove(t.id)}
        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-0 bg-transparent shrink-0"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Subtle Progress Shrink Line Accent */}
      <div
        className={`absolute bottom-0 left-0 h-0.75 ${progressBg} animate-toast-progress`}
        style={{
          animationPlayState: isHovered ? 'paused' : 'running',
        }}
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastValue = React.useMemo(() => ({ toast: addToast }), [addToast]);

  return (
    <ToastContext.Provider value={toastValue}>
      {children}

      {/* Snackbar Container (Top Right with Spring Animation) */}
      <div className="fixed top-5 right-5 z-55 flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
        {/* Inline keyframe styles for smooth slide-in and progress bar */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes toastSpringIn {
            0% {
              transform: translateX(120%) scale(0.95);
              opacity: 0;
            }
            70% {
              transform: translateX(-8px) scale(1.01);
            }
            100% {
              transform: translateX(0) scale(1);
              opacity: 1;
            }
          }
          @keyframes toastProgress {
            from { width: 100%; }
            to { width: 0%; }
          }
          .animate-toast-spring {
            animation: toastSpringIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          .animate-toast-progress {
            animation: toastProgress 4s linear forwards;
          }
        `}} />
        
        {toasts.map((t) => (
          <ToastCard key={t.id} t={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
