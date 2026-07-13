import * as React from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      error,
      label,
      leftIcon,
      rightIcon,
      id,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full text-left">
        <div
          className={cn(
            'relative w-full rounded-xl border border-brand-border bg-white shadow-xs transition-all duration-200 h-14 flex items-center',
            'focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/10 focus-within:bg-white focus-within:shadow-[0_0_20px_rgba(15,118,110,0.06)]',
            error && 'border-brand-error ring-2 ring-brand-error/10 focus-within:border-brand-error focus-within:ring-brand-error/10',
            props.disabled && 'bg-slate-50 cursor-not-allowed opacity-80',
            className
          )}
        >
          {/* Left Icon (absolute positioned for stable alignment) */}
          {leftIcon && (
            <div className="absolute left-3.5 flex items-center justify-center text-slate-400 pointer-events-none z-10">
              {leftIcon}
            </div>
          )}

          <div className="relative flex-1 h-full">
            {/* Input Box - peer marked */}
            <input
              id={id}
              type={type}
              ref={ref}
              placeholder=" " // Required for peer-placeholder-shown to function
              className={cn(
                'peer block w-full h-full bg-transparent text-base text-slate-900 focus:outline-none transition-all duration-200',
                label ? 'pt-5 pb-1' : 'py-3.5',
                leftIcon ? 'pl-11' : 'pl-4',
                rightIcon ? 'pr-11' : 'pr-4',
                props.disabled && 'cursor-not-allowed text-slate-500'
              )}
              {...props}
            />

            {/* Floating Label (CSS peer controlled) */}
            {label && (
              <label
                htmlFor={id}
                className={cn(
                  'absolute transition-all duration-200 pointer-events-none select-none text-slate-400 text-base origin-top-left',
                  leftIcon ? 'left-11' : 'left-4',
                  'top-1/2 -translate-y-1/2 scale-100', // resting centered state
                  // Floating state on focus
                  'peer-focus:top-1.5 peer-focus:-translate-y-0 peer-focus:scale-75 peer-focus:text-brand-primary peer-focus:font-bold',
                  // Floating state when text exists (placeholder not shown)
                  'peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-slate-500 peer-[:not(:placeholder-shown)]:font-bold'
                )}
              >
                {label}
              </label>
            )}
          </div>

          {/* Right Icon (absolute positioned) */}
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center justify-center text-slate-400 z-10">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error message mapping */}
        {error && (
          <p
            className="mt-1.5 text-xs text-brand-error font-semibold flex items-center gap-1 pl-1"
            id={`${id}-error`}
            role="alert"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand-error inline-block" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
