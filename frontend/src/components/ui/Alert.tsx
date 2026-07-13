import * as React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  onClose?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'error', title, children, onClose, ...props }, ref) => {
    const variants = {
      error: 'bg-rose-50 border-rose-100 text-rose-800',
      warning: 'bg-amber-50 border-amber-100 text-amber-800',
      success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      info: 'bg-slate-50 border-slate-100 text-slate-800',
    };

    const icons = {
      error: <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0" aria-hidden="true" />,
      warning: <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" aria-hidden="true" />,
      success: <AlertCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" aria-hidden="true" />,
      info: <AlertCircle className="h-5 w-5 text-slate-600 flex-shrink-0" aria-hidden="true" />,
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'flex gap-3 p-4 rounded-enterprise border text-sm transition-all duration-200 text-left',
          variants[variant],
          className
        )}
        {...props}
      >
        {icons[variant]}
        <div className="flex-1">
          {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
          <div className="text-slate-600 leading-normal">{children}</div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary/20 cursor-pointer"
            aria-label="Dismiss"
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert };
