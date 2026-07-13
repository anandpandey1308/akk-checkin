import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col text-left">
        <label className="inline-flex items-center cursor-pointer select-none group">
          <div className="relative flex items-center justify-center">
            <input
              type="checkbox"
              id={id}
              ref={ref}
              className={cn(
                'peer sr-only'
              )}
              {...props}
            />
            <div
              className={cn(
                'h-5 w-5 rounded-md border border-slate-300 bg-white transition-all duration-200 flex items-center justify-center text-white',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-primary/20 peer-focus-visible:border-brand-primary',
                'peer-checked:bg-brand-primary peer-checked:border-brand-primary',
                'peer-disabled:bg-slate-100 peer-disabled:border-slate-200 peer-disabled:cursor-not-allowed',
                'group-hover:border-brand-primary/50'
              )}
            >
              <Check className="h-3.5 w-3.5 opacity-0 peer-checked:opacity-100 transition-opacity stroke-[3px]" />
            </div>
          </div>
          {label && (
            <span className="ml-2.5 text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">
              {label}
            </span>
          )}
        </label>
        {error && (
          <p className="mt-1 text-sm text-rose-600 font-medium" id={`${id}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
