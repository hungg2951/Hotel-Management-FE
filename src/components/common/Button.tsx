import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs h-7.5 rounded-lg gap-1.5',
    md: 'px-3.5 py-1.5 text-xs font-semibold h-8.5 rounded-xl gap-2',
    lg: 'px-4 py-2 text-sm font-semibold h-10 rounded-xl gap-2',
  };

  const baseClasses =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none shrink-0';

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-xs shadow-amber-500/20 hover:from-amber-600 hover:to-amber-700 hover:shadow-md hover:shadow-amber-500/30 active:scale-[0.98]',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 active:bg-slate-300',
    outline:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs',
    danger:
      'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-colors',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="animate-spin shrink-0" size={14} />
      ) : (
        leftIcon && <span className="inline-flex items-center shrink-0">{leftIcon}</span>
      )}
      <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap leading-none">
        {children}
      </span>
      {!isLoading && rightIcon && <span className="inline-flex items-center shrink-0">{rightIcon}</span>}
    </button>
  );
};
