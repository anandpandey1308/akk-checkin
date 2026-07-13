import * as React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-enterprise transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

    const variants = {
      primary: 'bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover active:bg-brand-primary',
      secondary: 'bg-brand-secondary text-white shadow-sm hover:bg-brand-secondary/90 active:bg-brand-secondary',
      outline:
        'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100',
      ghost: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100',
      link: 'text-brand-primary underline-offset-4 hover:underline p-0 bg-transparent shadow-none hover:bg-transparent active:bg-transparent',
    };

    const sizes = {
      sm: 'h-9 px-3 text-sm gap-1.5',
      md: 'h-11 px-5 text-base gap-2',
      lg: 'h-12 px-6 text-lg gap-2.5',
    };

    // Disabled state overrides cursor
    const isDisabled = disabled || isLoading;

    // Destructure conflicting transition/drag/animation handlers to prevent type mismatches with framer-motion
    const {
      onAnimationStart,
      onAnimationIteration,
      onAnimationEnd,
      onTransitionEnd,
      onDrag,
      onDragStart,
      onDragEnd,
      ...cleanProps
    } = props as any;

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        whileHover={isDisabled ? {} : { y: -1, scale: 1.01 }}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...cleanProps}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" aria-hidden="true" />}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span className="truncate">{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
